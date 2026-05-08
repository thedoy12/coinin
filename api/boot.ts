import { Hono } from "hono";
import type { Context } from "hono";
import type { HttpBindings } from "@hono/node-server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { createHmac, timingSafeEqual } from "node:crypto";
import { appRouter } from "./router";
import { createContext } from "./context";
import { env } from "./lib/env";
import { getDb } from "./queries/connection";
import { games, transactions, users } from "@db/schema";
import { eq, sql } from "drizzle-orm";
import { parsePaymentNotification, verifyPaymentCallback } from "./lib/payment";
import { expireOldTransactions, fulfillPaidTransaction, syncProcessingTopups } from "./lib/transaction";
import { rateLimit } from "./lib/rate-limit";
import { authenticateRequest } from "./lib/session-auth";
import { findUserByLogin } from "./queries/users";
import { verifyPassword } from "./lib/password";
import { signSessionToken } from "./lib/session";
import { appendSessionCookie } from "./lib/cookies";

const app = new Hono<{ Bindings: HttpBindings }>();

app.onError((error, c) => {
  console.error("Unhandled API error:", error);
  return c.json({ error: "Internal server error" }, 500);
});

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

app.get("/api/health", async (c) => {
  try {
    await getDb().execute(sql`select 1`);
    return c.json({
      ok: true,
      database: "ok",
      appUrl: env.appUrl,
      vercel: process.env.VERCEL === "1",
      commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return c.json({ ok: false, database: "error", message }, 500);
  }
});

app.post("/api/auth/login", async (c) => {
  try {
    const body = await c.req.json().catch(() => null);
    const login = typeof body?.login === "string" ? body.login : "";
    const password = typeof body?.password === "string" ? body.password : "";
    return performDirectLogin(c, login, password);
  } catch (error) {
    console.error("Direct login error:", error);
    return c.json({ error: "Gagal login" }, 500);
  }
});

app.get("/api/auth/login", async (c) => {
  try {
    const login = c.req.header("x-coinin-login") || "";
    const password = c.req.header("x-coinin-password") || "";
    return performDirectLogin(c, login, password);
  } catch (error) {
    console.error("Direct login header error:", error);
    return c.json({ error: "Gagal login" }, 500);
  }
});

// Payment callback endpoint (HTTP, not tRPC)
app.get("/api/callback", (c) =>
  c.json({
    ok: true,
    endpoint: "CoinIn payment callback",
    method: "POST",
  })
);

app.post("/api/callback", async (c) => {
  try {
    const rawBody = await c.req.text();
    const signature = c.req.header("x-callback-signature") || "";
    const event = c.req.header("x-callback-event") || "";

    // Verify callback signature
    if (!verifyPaymentCallback(rawBody, signature)) {
      return c.json({ error: "Invalid signature" }, 400);
    }
    if (event !== "payment_status") {
      return c.json({ error: "Invalid callback event" }, 400);
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

app.get("/api/provider-callback", (c) =>
  c.json({
    ok: true,
    endpoint: "CoinIn provider callback",
    provider: "topup_provider",
    method: "POST",
  })
);

app.post("/api/provider-callback", async (c) => {
  try {
    const rawBody = await c.req.text();
    const event = c.req.header("x-provider-event") || "";
    const signature = c.req.header("x-hub-signature") || "";

    if (!verifyTopupProviderWebhook(rawBody, signature)) {
      return c.json({ error: "Invalid provider signature" }, 400);
    }

    const payload = parseTopupProviderWebhook(rawBody);
    if (!payload?.referenceId) {
      return c.json({ error: "Missing provider reference" }, 400);
    }

    const db = getDb();
    const txResult = await db
      .select()
      .from(transactions)
      .where(eq(transactions.referenceId, payload.referenceId))
      .limit(1);

    if (!txResult[0]) {
      return c.json({ error: "Transaction not found" }, 404);
    }

    const update: Partial<typeof transactions.$inferInsert> = {
      topupReference: payload.topupReference,
      topupResponse: rawBody,
      updatedAt: new Date(),
      lastError: payload.status === "failed" ? payload.message || "Top-up failed" : null,
    };

    if (payload.status === "success") {
      update.topupStatus = "success";
      update.status = "success";
      update.completedAt = new Date();
    } else if (payload.status === "failed") {
      update.topupStatus = "failed";
      update.status = "failed";
    } else {
      update.topupStatus = "processing";
      update.status = "processing";
    }

    await db
      .update(transactions)
      .set(update)
      .where(eq(transactions.referenceId, payload.referenceId));

    return c.json({ success: true, event: event || "update" });
  } catch (error) {
    console.error("Provider callback error:", error);
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
    onError({ error, path }) {
      console.error(`tRPC error${path ? ` on ${path}` : ""}:`, error);
    },
  });
});
app.all("/api/*", (c) => c.json({ error: "Not Found" }, 404));

export default app;

if (env.isProduction && process.env.VERCEL !== "1") {
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

async function performDirectLogin(c: Context, login: string, password: string) {
  if (!login || !password) {
    return c.json({ error: "Username/email dan password wajib diisi" }, 400);
  }

  const user = await findUserByLogin(login);
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return c.json({ error: "Username/email atau password salah" }, 401);
  }

  await getDb()
    .update(users)
    .set({ lastSignInAt: new Date(), updatedAt: new Date() })
    .where(eq(users.id, user.id));

  const token = await signSessionToken({
    unionId: user.unionId,
    clientId: "local",
  });
  const headers = new Headers();
  appendSessionCookie(headers, c.req.raw.headers, token);
  const { passwordHash: _passwordHash, ...safeUser } = user;

  return c.json({ success: true, user: safeUser }, 200, Object.fromEntries(headers.entries()));
}

function extensionFromMime(mime: string) {
  if (mime === "image/png") return ".png";
  if (mime === "image/webp") return ".webp";
  if (mime === "image/gif") return ".gif";
  return ".jpg";
}

function verifyTopupProviderWebhook(rawBody: string, signature: string) {
  if (!env.topupWebhookSecret) {
    return true;
  }
  if (!signature.startsWith("sha1=")) return false;
  const expected = `sha1=${createHmac("sha1", env.topupWebhookSecret).update(rawBody).digest("hex")}`;
  try {
    const actualBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);
    return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
  } catch {
    return false;
  }
}

function parseTopupProviderWebhook(rawBody: string): {
  referenceId: string;
  status: "success" | "processing" | "failed";
  topupReference: string | null;
  message: string | null;
} | null {
  try {
    const parsed = JSON.parse(rawBody) as {
      data?: {
        ref_id?: unknown;
        status?: unknown;
        sn?: unknown;
        message?: unknown;
        rc?: unknown;
      };
    };
    const referenceId = typeof parsed.data?.ref_id === "string" ? parsed.data.ref_id : null;
    if (!referenceId) return null;
    const rawStatus = typeof parsed.data?.status === "string" ? parsed.data.status.toLowerCase() : "";
    const rc = typeof parsed.data?.rc === "string" ? parsed.data.rc : "";
    const status =
      rc === "00" || rawStatus === "sukses" || rawStatus === "success"
        ? "success"
        : rc === "03" || rawStatus === "pending"
          ? "processing"
          : "failed";
    return {
      referenceId,
      status,
      topupReference: typeof parsed.data?.sn === "string" && parsed.data.sn ? parsed.data.sn : referenceId,
      message: typeof parsed.data?.message === "string" ? parsed.data.message : null,
    };
  } catch {
    return null;
  }
}
