import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import type { HttpBindings } from "@hono/node-server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { appRouter } from "./router";
import { createContext } from "./context";
import { env } from "./lib/env";
import { getDb } from "./queries/connection";
import { games, transactions } from "@db/schema";
import { eq } from "drizzle-orm";
import { parsePaymentNotification, verifyPaymentCallback } from "./lib/payment";
import { expireOldTransactions, fulfillPaidTransaction, syncProcessingTopups } from "./lib/transaction";
import { rateLimit } from "./lib/rate-limit";
import { authenticateRequest } from "./lib/session-auth";

const app = new Hono<{ Bindings: HttpBindings }>();

app.use(bodyLimit({ maxSize: 5 * 1024 * 1024 }));
app.use("/api/trpc/*", rateLimit({ windowMs: 60_000, max: 120, keyPrefix: "trpc" }));
app.use("/api/status/*", rateLimit({ windowMs: 60_000, max: 60, keyPrefix: "status" }));

app.get("/robots.txt", (c) => c.text(`User-agent: *
Allow: /

Sitemap: ${env.appUrl}/sitemap.xml
`));

app.get("/sitemap.xml", async (c) => {
  const activeGames = await getDb()
    .select({ slug: games.slug })
    .from(games)
    .where(eq(games.isActive, 1));
  const urls = [
    { loc: `${env.appUrl}/`, priority: "1.0" },
    { loc: `${env.appUrl}/status`, priority: "0.6" },
    { loc: `${env.appUrl}/tentang-kami`, priority: "0.5" },
    { loc: `${env.appUrl}/kontak`, priority: "0.5" },
    { loc: `${env.appUrl}/kebijakan-privasi`, priority: "0.4" },
    { loc: `${env.appUrl}/ketentuan-layanan`, priority: "0.4" },
    ...activeGames.map((game) => ({
      loc: `${env.appUrl}/game/${game.slug}`,
      priority: "0.8",
    })),
  ];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((url) => `  <url><loc>${url.loc}</loc><priority>${url.priority}</priority></url>`).join("\n")}
</urlset>`;
  return c.text(xml, 200, { "Content-Type": "application/xml; charset=utf-8" });
});

// Payment callback endpoint (HTTP, not tRPC)
app.post("/api/callback", async (c) => {
  try {
    const rawBody = await c.req.text();
    const body = JSON.parse(rawBody) as { signature_key?: string };
    const signature = body.signature_key || "";

    // Verify callback signature
    if (!verifyPaymentCallback(rawBody, signature)) {
      return c.json({ error: "Invalid signature" }, 400);
    }

    const notification = parsePaymentNotification(rawBody);
    const referenceId = notification?.referenceId;
    const status = notification?.status;

    if (!referenceId) {
      return c.json({ error: "Missing reference" }, 400);
    }
    if (!status || !["PAID", "PENDING", "EXPIRED", "FAILED"].includes(status)) {
      return c.json({ error: "Invalid status" }, 400);
    }

    const db = getDb();
    const txResult = await db
      .select()
      .from(transactions)
      .where(eq(transactions.referenceId, referenceId))
      .limit(1);

    if (!txResult[0]) {
      return c.json({ error: "Transaction not found" }, 404);
    }

    const tx = txResult[0];
    if (tx.status === "success" && tx.paymentStatus === "paid") {
      return c.json({ success: true, idempotent: true });
    }

    if (status === "PAID") {
      await fulfillPaidTransaction(referenceId);
    } else if (status === "PENDING") {
      await db
        .update(transactions)
        .set({
          paymentStatus: "pending",
          updatedAt: new Date(),
        })
        .where(eq(transactions.referenceId, referenceId));
    } else if (status === "EXPIRED" || status === "FAILED") {
      await db
        .update(transactions)
        .set({
          paymentStatus: status === "EXPIRED" ? "expired" : "failed",
          status: "failed",
          updatedAt: new Date(),
        })
        .where(eq(transactions.referenceId, referenceId));
    }

    return c.json({ success: true });
  } catch (error) {
    console.error("Callback error:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

app.post("/api/admin/game-thumbnail", async (c) => {
  try {
    const user = await authenticateRequest(c.req.raw.headers);
    if (user.role !== "admin") {
      return c.json({ error: "Forbidden" }, 403);
    }

    const body = await c.req.parseBody();
    const gameId = Number(body.gameId);
    const file = body.file;
    if (!Number.isInteger(gameId) || gameId <= 0) {
      return c.json({ error: "Invalid game" }, 400);
    }
    if (!(file instanceof File)) {
      return c.json({ error: "Missing image file" }, 400);
    }
    if (!file.type.startsWith("image/")) {
      return c.json({ error: "File harus berupa gambar" }, 400);
    }
    if (file.size > 2 * 1024 * 1024) {
      return c.json({ error: "Ukuran gambar maksimal 2MB" }, 400);
    }

    const existing = await getDb()
      .select()
      .from(games)
      .where(eq(games.id, gameId))
      .limit(1);
    if (!existing[0]) {
      return c.json({ error: "Game tidak ditemukan" }, 404);
    }

    const ext = extensionFromMime(file.type);
    const fileName = `${existing[0].slug}-${Date.now()}${ext}`;
    const relativeUrl = `/uploads/game-thumbnails/${fileName}`;
    const bytes = Buffer.from(await file.arrayBuffer());
    await writeUploadFile(path.resolve("public/uploads/game-thumbnails", fileName), bytes);
    await writeUploadFile(path.resolve("dist/public/uploads/game-thumbnails", fileName), bytes).catch(() => undefined);

    await getDb()
      .update(games)
      .set({ thumbnail: relativeUrl, updatedAt: new Date() })
      .where(eq(games.id, gameId));

    return c.json({ success: true, thumbnail: relativeUrl });
  } catch (error) {
    console.error("Game thumbnail upload error:", error);
    return c.json({ error: "Gagal upload thumbnail" }, 500);
  }
});

// Public status check endpoint
app.get("/api/status/:referenceId", async (c) => {
  const referenceId = c.req.param("referenceId");
  const db = getDb();

  const txResult = await db
    .select()
    .from(transactions)
    .where(eq(transactions.referenceId, referenceId))
    .limit(1);

  if (!txResult[0]) {
    return c.json({ error: "Not found" }, 404);
  }

  return c.json({
    referenceId: txResult[0].referenceId,
    status: txResult[0].status,
    paymentStatus: txResult[0].paymentStatus,
    topupStatus: txResult[0].topupStatus,
    price: txResult[0].price,
    createdAt: txResult[0].createdAt,
    updatedAt: txResult[0].updatedAt,
  });
});

app.use("/api/trpc/*", async (c) => {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req: c.req.raw,
    router: appRouter,
    createContext,
  });
});
app.all("/api/*", (c) => c.json({ error: "Not Found" }, 404));

export default app;

if (env.isProduction) {
  const { serve } = await import("@hono/node-server");
  const { serveStaticFiles } = await import("./lib/vite");
  serveStaticFiles(app);

  const port = parseInt(process.env.PORT || "3000");
  serve({ fetch: app.fetch, port }, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });

  if (process.env.AUTO_SYNC_JOBS !== "false") {
    setInterval(() => {
      expireOldTransactions().catch((error) => console.error("Expire job failed:", error));
      syncProcessingTopups().catch((error) => console.error("Top-up sync job failed:", error));
    }, 60_000);
  }
}

async function writeUploadFile(targetPath: string, bytes: Buffer) {
  await mkdir(path.dirname(targetPath), { recursive: true });
  await writeFile(targetPath, bytes);
}

function extensionFromMime(mime: string) {
  if (mime === "image/png") return ".png";
  if (mime === "image/webp") return ".webp";
  if (mime === "image/gif") return ".gif";
  return ".jpg";
}
