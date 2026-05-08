import { Hono } from "hono";
import type { Context } from "hono";
import type { HttpBindings } from "@hono/node-server";
import { TRPCError } from "@trpc/server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { nanoid } from "nanoid";
import { appRouter } from "./router";
import { createContext } from "./context";
import { env } from "./lib/env";
import { getDb } from "./queries/connection";
import { games, products, transactions, users } from "@db/schema";
import { and, eq, sql } from "drizzle-orm";
import { createQrisPayment, parsePaymentNotification, verifyPaymentCallback } from "./lib/payment";
import { expireOldTransactions, fulfillPaidTransaction, syncProcessingTopups } from "./lib/transaction";
import { rateLimit } from "./lib/rate-limit";
import { authenticateRequest } from "./lib/session-auth";
import { findUserByLogin } from "./queries/users";
import { hashPassword, verifyPassword } from "./lib/password";
import { signSessionToken } from "./lib/session";
import { appendClearSessionCookie, appendSessionCookie } from "./lib/cookies";
import { publicSafeGameFilter, publicSafeProductFilter } from "./lib/catalog-safety";

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
    .select({ slug: games.slug, updatedAt: games.updatedAt })
    .from(games)
    .where(eq(games.isActive, 1));
  const now = new Date().toISOString();
  const urls = [
    { loc: `${env.appUrl}/`, priority: "1.0", changefreq: "daily", lastmod: now },
    { loc: `${env.appUrl}/games`, priority: "0.9", changefreq: "daily", lastmod: now },
    { loc: `${env.appUrl}/top-up-game`, priority: "0.95", changefreq: "weekly", lastmod: now },
    { loc: `${env.appUrl}/status`, priority: "0.5", changefreq: "weekly", lastmod: now },
    { loc: `${env.appUrl}/tentang-kami`, priority: "0.55", changefreq: "monthly", lastmod: now },
    { loc: `${env.appUrl}/kontak`, priority: "0.5", changefreq: "monthly", lastmod: now },
    { loc: `${env.appUrl}/kebijakan-privasi`, priority: "0.3", changefreq: "yearly", lastmod: now },
    { loc: `${env.appUrl}/ketentuan-layanan`, priority: "0.3", changefreq: "yearly", lastmod: now },
    ...activeGames.map((game) => ({
      loc: `${env.appUrl}/game/${game.slug}`,
      priority: "0.85",
      changefreq: "daily",
      lastmod: game.updatedAt?.toISOString?.() ?? now,
    })),
  ];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((url) => `  <url><loc>${url.loc}</loc><lastmod>${url.lastmod}</lastmod><changefreq>${url.changefreq}</changefreq><priority>${url.priority}</priority></url>`).join("\n")}
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

app.get("/api/order/create", async (c) => {
  try {
    const input = createOrderInput.parse({
      productId: Number(c.req.header("x-coinin-product-id") || c.req.query("productId")),
      userIdGame: c.req.header("x-coinin-user-id-game") || c.req.query("userIdGame"),
      zoneId: c.req.header("x-coinin-zone-id") || c.req.query("zoneId") || undefined,
    });
    return c.json(await createOrderApi(input));
  } catch (error) {
    return handlePublicApiError(c, error, "Gagal membuat order");
  }
});

app.post("/api/order/create", async (c) => {
  try {
    const body = await c.req.json().catch(() => null);
    const input = createOrderInput.parse(body);
    const db = getDb();
    const referenceId = `TRX-${nanoid(10).toUpperCase()}`;
    const productResult = await db
      .select({ product: products, game: games })
      .from(products)
      .innerJoin(games, eq(products.gameId, games.id))
      .where(and(
        eq(products.id, input.productId),
        eq(products.isActive, 1),
        eq(games.isActive, 1),
        publicSafeGameFilter(),
        publicSafeProductFilter(),
      ))
      .limit(1);

    const product = productResult[0]?.product;
    const game = productResult[0]?.game;
    if (!product || !game) {
      return c.json({ error: "Produk tidak ditemukan" }, 404);
    }
    if (game.requiresZoneId === 1 && !input.zoneId?.trim()) {
      return c.json({ error: "Zone ID / Server wajib diisi untuk game ini" }, 400);
    }

    await db.insert(transactions).values({
      referenceId,
      gameId: product.gameId,
      productId: input.productId,
      userIdGame: input.userIdGame.trim(),
      zoneId: input.zoneId || null,
      price: product.priceSell,
      status: "pending",
      paymentStatus: "unpaid",
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    });

    return c.json({ referenceId, status: "pending", price: product.priceSell });
  } catch (error) {
    return handlePublicApiError(c, error, "Gagal membuat order");
  }
});

app.get("/api/payment/create-qris", async (c) => {
  try {
    const input = createPaymentInput.parse({
      referenceId: c.req.header("x-coinin-reference-id") || c.req.query("referenceId"),
      customerName: c.req.header("x-coinin-customer-name") || c.req.query("customerName"),
      customerEmail: c.req.header("x-coinin-customer-email") || c.req.query("customerEmail"),
      customerPhone: c.req.header("x-coinin-customer-phone") || c.req.query("customerPhone"),
    });
    return c.json(await createPaymentApi(input));
  } catch (error) {
    return handlePublicApiError(c, error, "Gagal membuat pembayaran");
  }
});

app.post("/api/payment/create-qris", async (c) => {
  try {
    const body = await c.req.json().catch(() => null);
    const input = createPaymentInput.parse(body);
    const db = getDb();

    const transactionResult = await db
      .select({
        transaction: transactions,
        game: games,
        product: products,
      })
      .from(transactions)
      .where(eq(transactions.referenceId, input.referenceId))
      .innerJoin(games, eq(transactions.gameId, games.id))
      .innerJoin(products, eq(transactions.productId, products.id))
      .limit(1);

    if (!transactionResult[0]) {
      return c.json({ error: "Transaksi tidak ditemukan" }, 404);
    }

    const { transaction: tx, game, product } = transactionResult[0];
    if (tx.paymentStatus === "paid" || tx.status === "success") {
      return c.json({ error: "Transaksi sudah dibayar" }, 400);
    }
    if (tx.expiresAt && tx.expiresAt.getTime() < Date.now()) {
      await db
        .update(transactions)
        .set({
          paymentStatus: "expired",
          status: "failed",
          lastError: "Payment expired",
          updatedAt: new Date(),
        })
        .where(eq(transactions.referenceId, input.referenceId));
      return c.json({ error: "Transaksi sudah kadaluarsa. Silakan buat order baru." }, 400);
    }

    const paymentResult = await createQrisPayment({
      referenceId: input.referenceId,
      amount: tx.price,
      customerName: input.customerName,
      customerEmail: input.customerEmail.toLowerCase(),
      customerPhone: normalizePhone(input.customerPhone),
      items: [
        {
          name: `${game.name} - ${product.name}`,
          price: tx.price,
          quantity: 1,
        },
      ],
    });

    if (paymentResult.success && paymentResult.data) {
      await db
        .update(transactions)
        .set({
          customerName: input.customerName,
          customerEmail: input.customerEmail.toLowerCase(),
          customerPhone: normalizePhone(input.customerPhone),
          paymentMethod: "Pembayaran Online",
          paymentReference: paymentResult.data.reference,
          paymentStatus: "pending",
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
          updatedAt: new Date(),
        })
        .where(eq(transactions.referenceId, input.referenceId));
    }

    return c.json(paymentResult);
  } catch (error) {
    return handlePublicApiError(c, error, "Gagal membuat pembayaran");
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

app.get("/api/auth/register", async (c) => {
  try {
    const input = authRegisterInput.parse({
      username: c.req.header("x-coinin-username") || c.req.query("username"),
      name: c.req.header("x-coinin-name") || c.req.query("name"),
      email: c.req.header("x-coinin-email") || c.req.query("email"),
      password: c.req.header("x-coinin-password") || c.req.query("password"),
    });
    return performDirectRegister(c, input);
  } catch (error) {
    return handlePublicApiError(c, error, "Gagal membuat akun");
  }
});

app.get("/api/auth/logout", (c) => {
  const headers = new Headers();
  appendClearSessionCookie(headers, c.req.raw.headers);
  return c.json({ success: true }, 200, Object.fromEntries(headers.entries()));
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

app.get("/api/admin/action", async (c) => {
  c.header("Cache-Control", "no-store");
  try {
    const user = await authenticateRequest(c.req.raw.headers).catch(() => null);
    if (!user) {
      return c.json({ error: "Unauthorized" }, 401);
    }
    if (user.role !== "admin") {
      return c.json({ error: "Forbidden" }, 403);
    }

    const action = c.req.header("x-coinin-admin-action") || "";
    const input = parseAdminActionInput(c.req.header("x-coinin-admin-input"));
    const caller = appRouter.createCaller({
      req: c.req.raw,
      resHeaders: new Headers(),
      user,
    });

    const result = await runAdminAction(caller, action, input);
    return c.json(result);
  } catch (error) {
    return handlePublicApiError(c, error, "Aksi admin gagal");
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
  return c.json({ success: true, user: toSafeUser(user) }, 200, Object.fromEntries(headers.entries()));
}

async function performDirectRegister(c: Context, input: z.infer<typeof authRegisterInput>) {
  const username = input.username.trim().toLowerCase();
  const email = input.email.trim().toLowerCase();
  const existing = await findUserByLogin(username) || await findUserByLogin(email);
  if (existing) {
    return c.json({ error: "Username atau email sudah digunakan" }, 409);
  }

  const inserted = await getDb()
    .insert(users)
    .values({
      unionId: `local:${username}`,
      username,
      name: input.name.trim(),
      email,
      passwordHash: hashPassword(input.password),
      authProvider: "local",
      role: username === env.ownerUnionId || email === env.ownerUnionId ? "admin" : "user",
      lastSignInAt: new Date(),
    })
    .returning();

  const user = inserted[0];
  const token = await signSessionToken({
    unionId: user.unionId,
    clientId: "local",
  });
  const headers = new Headers();
  appendSessionCookie(headers, c.req.raw.headers, token);

  return c.json({
    success: true,
    user: toSafeUser(user),
  }, 200, Object.fromEntries(headers.entries()));
}

function toSafeUser(user: typeof users.$inferSelect) {
  return {
    id: user.id,
    unionId: user.unionId,
    username: user.username,
    name: user.name,
    email: user.email,
    avatar: user.avatar,
    authProvider: user.authProvider,
    role: user.role,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    lastSignInAt: user.lastSignInAt,
  };
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

const referenceIdInput = z.string().trim().regex(/^TRX-[A-Z0-9_-]{8,32}$/);
const phoneInput = z
  .string()
  .trim()
  .min(8)
  .max(20)
  .regex(/^\+?[0-9][0-9\s-]{6,18}[0-9]$/, "Nomor WhatsApp tidak valid");

const createOrderInput = z.object({
  productId: z.number().int().positive(),
  userIdGame: z.string().trim().min(1).max(255),
  zoneId: z.string().trim().max(100).optional(),
});

const createPaymentInput = z.object({
  referenceId: referenceIdInput,
  customerName: z.string().trim().min(1).max(255),
  customerEmail: z.string().trim().email(),
  customerPhone: phoneInput,
});

const authRegisterInput = z.object({
  username: z.string().trim().min(3).max(100),
  name: z.string().trim().min(1).max(255),
  email: z.string().trim().email(),
  password: z.string().min(8).max(100),
});

function normalizePhone(value: string) {
  return value.replace(/[\s-]/g, "");
}

async function createOrderApi(input: z.infer<typeof createOrderInput>) {
  const db = getDb();
  const referenceId = `TRX-${nanoid(10).toUpperCase()}`;
  const productResult = await db
    .select({ product: products, game: games })
    .from(products)
    .innerJoin(games, eq(products.gameId, games.id))
    .where(and(
      eq(products.id, input.productId),
      eq(products.isActive, 1),
      eq(games.isActive, 1),
      publicSafeGameFilter(),
      publicSafeProductFilter(),
    ))
    .limit(1);

  const product = productResult[0]?.product;
  const game = productResult[0]?.game;
  if (!product || !game) {
    throw new PublicApiError("Produk tidak ditemukan", 404);
  }
  if (game.requiresZoneId === 1 && !input.zoneId?.trim()) {
    throw new PublicApiError("Zone ID / Server wajib diisi untuk game ini", 400);
  }

  await db.insert(transactions).values({
    referenceId,
    gameId: product.gameId,
    productId: input.productId,
    userIdGame: input.userIdGame.trim(),
    zoneId: input.zoneId || null,
    price: product.priceSell,
    status: "pending",
    paymentStatus: "unpaid",
    expiresAt: new Date(Date.now() + 60 * 60 * 1000),
  });

  return { referenceId, status: "pending", price: product.priceSell };
}

async function createPaymentApi(input: z.infer<typeof createPaymentInput>) {
  const db = getDb();
  const transactionResult = await db
    .select({
      transaction: transactions,
      game: games,
      product: products,
    })
    .from(transactions)
    .where(eq(transactions.referenceId, input.referenceId))
    .innerJoin(games, eq(transactions.gameId, games.id))
    .innerJoin(products, eq(transactions.productId, products.id))
    .limit(1);

  if (!transactionResult[0]) {
    throw new PublicApiError("Transaksi tidak ditemukan", 404);
  }

  const { transaction: tx, game, product } = transactionResult[0];
  if (tx.paymentStatus === "paid" || tx.status === "success") {
    throw new PublicApiError("Transaksi sudah dibayar", 400);
  }
  if (tx.expiresAt && tx.expiresAt.getTime() < Date.now()) {
    await db
      .update(transactions)
      .set({
        paymentStatus: "expired",
        status: "failed",
        lastError: "Payment expired",
        updatedAt: new Date(),
      })
      .where(eq(transactions.referenceId, input.referenceId));
    throw new PublicApiError("Transaksi sudah kadaluarsa. Silakan buat order baru.", 400);
  }

  const normalizedPhone = normalizePhone(input.customerPhone);
  const normalizedEmail = input.customerEmail.toLowerCase();
  const paymentResult = await createQrisPayment({
    referenceId: input.referenceId,
    amount: tx.price,
    customerName: input.customerName,
    customerEmail: normalizedEmail,
    customerPhone: normalizedPhone,
    items: [
      {
        name: `${game.name} - ${product.name}`,
        price: tx.price,
        quantity: 1,
      },
    ],
  });

  if (paymentResult.success && paymentResult.data) {
    await db
      .update(transactions)
      .set({
        customerName: input.customerName,
        customerEmail: normalizedEmail,
        customerPhone: normalizedPhone,
        paymentMethod: "Pembayaran Online",
        paymentReference: paymentResult.data.reference,
        paymentStatus: "pending",
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        updatedAt: new Date(),
      })
      .where(eq(transactions.referenceId, input.referenceId));
  }

  return paymentResult;
}

function handlePublicApiError(c: Context, error: unknown, fallback: string) {
  if (error instanceof PublicApiError) {
    return c.json({ error: error.message }, error.status);
  }
  if (error instanceof TRPCError) {
    const status = trpcErrorStatus(error.code);
    return c.json({ error: error.message }, status);
  }
  if (error instanceof z.ZodError) {
    return c.json({ error: error.issues[0]?.message || "Input tidak valid" }, 400);
  }
  console.error(`${fallback}:`, error);
  return c.json({ error: fallback }, 500);
}

class PublicApiError extends Error {
  constructor(
    message: string,
    public readonly status: 400 | 404
  ) {
    super(message);
  }
}

function trpcErrorStatus(code: TRPCError["code"]) {
  switch (code) {
    case "BAD_REQUEST":
    case "PARSE_ERROR":
      return 400;
    case "UNAUTHORIZED":
      return 401;
    case "FORBIDDEN":
      return 403;
    case "NOT_FOUND":
      return 404;
    case "CONFLICT":
      return 409;
    case "TOO_MANY_REQUESTS":
      return 429;
    default:
      return 500;
  }
}

function parseAdminActionInput(value: string | undefined) {
  if (!value) return undefined;
  try {
    return JSON.parse(decodeURIComponent(value)) as unknown;
  } catch {
    throw new PublicApiError("Input admin tidak valid", 400);
  }
}

async function runAdminAction(
  caller: ReturnType<typeof appRouter.createCaller>,
  action: string,
  input: unknown
) {
  const admin = caller.admin;
  switch (action) {
    case "updateStatus":
      return admin.updateStatus(input as never);
    case "syncPayment":
      return admin.syncPayment(input as never);
    case "retryTopup":
      return admin.retryTopup(input as never);
    case "expireOld":
      return admin.expireOld();
    case "syncTopups":
      return admin.syncTopups();
    case "syncCatalog":
      return admin.syncCatalog();
    case "updatePopupSettings":
      return admin.updatePopupSettings(input as never);
    case "cleanupDatabase":
      return admin.cleanupDatabase(input as never);
    case "updateUserRole":
      return admin.updateUserRole(input as never);
    case "resetUserPassword":
      return admin.resetUserPassword(input as never);
    case "updateProduct":
      return admin.updateProduct(input as never);
    case "createProduct":
      return admin.createProduct(input as never);
    case "importProducts":
      return admin.importProducts(input as never);
    case "createGame":
      return admin.createGame(input as never);
    case "updateGame":
      return admin.updateGame(input as never);
    default:
      throw new PublicApiError("Aksi admin tidak dikenal", 400);
  }
}
