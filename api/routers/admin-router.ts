import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter, adminQuery } from "../middleware";
import { getDb } from "../queries/connection";
import { auditLogs, transactions, games, products, providerApiLogs, users, popupSettings } from "@db/schema";
import { and, asc, desc, eq, sql, count, ilike, lt, ne, or } from "drizzle-orm";
import { writeAuditLog } from "../lib/audit";
import { hashPassword, verifyPassword } from "../lib/password";
import {
  isSensitiveCatalogText,
  publicSafeGameFilter,
  publicSafeProductFilter,
} from "../lib/catalog-safety";
import { catalogMarkup } from "../lib/markup";
import {
  expireOldTransactions,
  fulfillPaidTransaction,
  syncProcessingTopups,
  syncPaymentAndFulfill,
} from "../lib/transaction";
import { syncCatalogFromProvider } from "../lib/catalog-sync";
import { defaultPopupSettings, getPopupSettingsOrDefault, isMissingPopupSettingsTable } from "../lib/popup-settings";

const transactionStatus = z.enum(["pending", "processing", "success", "failed"]);
const productType = z.enum(["general", "membership"]);
const userRole = z.enum(["user", "admin"]);
const cleanupTarget = z.enum([
  "staleTransactions",
  "providerApiLogs",
  "auditLogs",
  "inactiveUsers",
]);
const gameInput = z.object({
  name: z.string().min(1).max(255),
  slug: z.string().min(1).max(255),
  thumbnail: z.string().max(500).optional(),
  category: z.string().max(100).optional(),
  instructions: z.string().optional(),
  requiresZoneId: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

const importProductRow = z.object({
  code: z.string().min(1).max(100),
  name: z.string().min(1).max(255),
  hargaRupiah: z.number().positive(),
  priceUnit: z.string().max(100).optional(),
  gameName: z.string().max(255).optional(),
  category: z.string().max(100).optional(),
  thumbnail: z.string().max(500).optional(),
  instructions: z.string().optional(),
  requiresZoneId: z.boolean().optional(),
  productType: productType.optional(),
});

const popupSettingsInput = z.object({
  isActive: z.boolean(),
  title: z.string().trim().max(120),
  description: z.string().trim().max(600),
  imageUrl: z.string().trim().max(500).optional(),
  buttonText: z.string().trim().min(1).max(60),
  buttonUrl: z.string().trim().min(1).max(500),
  displayDelayMs: z.number().int().min(0).max(10000),
});

const pageInput = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(25),
});

const searchPageInput = pageInput.extend({
  search: z.string().trim().max(100).default(""),
});

export const adminRouter = createRouter({
  stats: adminQuery.query(async () => {
    const db = getDb();

    const [
      totalTransactions,
      totalRevenue,
      pendingTransactions,
      paidTransactions,
      totalProfit,
      activeProducts,
      activeGames,
      recentTransactions,
    ] = await Promise.all([
      db.select({ count: count() }).from(transactions),
      db
        .select({ total: sql<number>`SUM(${transactions.price})` })
        .from(transactions)
        .where(eq(transactions.paymentStatus, "paid")),
      db
        .select({ count: count() })
        .from(transactions)
        .where(eq(transactions.status, "pending")),
      db
        .select({ count: count() })
        .from(transactions)
        .where(eq(transactions.paymentStatus, "paid")),
      db
        .select({
          total: sql<number>`COALESCE(SUM(${transactions.price} - ${products.priceModal}), 0)`,
        })
        .from(transactions)
        .innerJoin(products, eq(transactions.productId, products.id))
        .where(eq(transactions.paymentStatus, "paid")),
      db
        .select({ count: count() })
        .from(products)
        .innerJoin(games, eq(products.gameId, games.id))
        .where(and(
          eq(products.isActive, 1),
          eq(games.isActive, 1),
          publicSafeGameFilter(),
          publicSafeProductFilter(),
        )),
      db
        .select({ count: count() })
        .from(games)
        .where(and(eq(games.isActive, 1), publicSafeGameFilter())),
      db
        .select({
          transaction: transactions,
          game: games,
          product: products,
        })
        .from(transactions)
        .innerJoin(games, eq(transactions.gameId, games.id))
        .innerJoin(products, eq(transactions.productId, products.id))
        .orderBy(desc(transactions.createdAt))
        .limit(20),
    ]);

    return {
      totalTransactions: totalTransactions[0]?.count ?? 0,
      totalRevenue: totalRevenue[0]?.total ?? 0,
      totalProfit: totalProfit[0]?.total ?? 0,
      pendingTransactions: pendingTransactions[0]?.count ?? 0,
      paidTransactions: paidTransactions[0]?.count ?? 0,
      activeProducts: activeProducts[0]?.count ?? 0,
      activeGames: activeGames[0]?.count ?? 0,
      recentTransactions: recentTransactions.map((r) => ({
        ...r.transaction,
        gameName: r.game.name,
        productName: r.product.name,
        providerCode: r.product.providerCode,
      })),
    };
  }),

  catalog: adminQuery.input(searchPageInput).query(async ({ input }) => {
    const db = getDb();
    const keyword = input.search.trim();
    const filter = and(
      publicSafeGameFilter(),
      publicSafeProductFilter(),
      keyword
        ? or(
          ilike(products.name, `%${keyword}%`),
          ilike(products.providerCode, `%${keyword}%`),
          ilike(products.productType, `%${keyword}%`),
          ilike(games.name, `%${keyword}%`),
          ilike(games.slug, `%${keyword}%`),
        )
        : undefined,
    );

    const [rows, totals] = await Promise.all([
      db
      .select({
        product: products,
        game: games,
      })
      .from(products)
      .innerJoin(games, eq(products.gameId, games.id))
      .where(filter)
      .orderBy(asc(games.name), asc(products.priceSell))
      .limit(input.pageSize)
      .offset((input.page - 1) * input.pageSize),
      db
        .select({ total: count() })
        .from(products)
        .innerJoin(games, eq(products.gameId, games.id))
        .where(filter),
    ]);

    return {
      rows: rows.map((row) => ({
      ...row.product,
      gameName: row.game.name,
      gameSlug: row.game.slug,
      })),
      total: totals[0]?.total ?? 0,
    };
  }),

  games: adminQuery.input(pageInput).query(async ({ input }) => {
    const db = getDb();
    const [rows, totals] = await Promise.all([
      db
        .select()
        .from(games)
        .where(publicSafeGameFilter())
        .orderBy(asc(games.name))
        .limit(input.pageSize)
        .offset((input.page - 1) * input.pageSize),
      db
        .select({ total: count() })
        .from(games)
        .where(publicSafeGameFilter()),
    ]);
    return { rows, total: totals[0]?.total ?? 0 };
  }),

  users: adminQuery.input(pageInput).query(async ({ input }) => {
    const db = getDb();
    const [rows, totals] = await Promise.all([
      db
        .select({
          id: users.id,
          username: users.username,
          name: users.name,
          email: users.email,
          authProvider: users.authProvider,
          role: users.role,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
          lastSignInAt: users.lastSignInAt,
        })
        .from(users)
        .orderBy(desc(users.createdAt))
        .limit(input.pageSize)
        .offset((input.page - 1) * input.pageSize),
      db.select({ total: count() }).from(users),
    ]);
    return { rows, total: totals[0]?.total ?? 0 };
  }),

  customers: adminQuery.input(pageInput).query(async ({ input }) => {
    const db = getDb();
    const rows = await db
      .select({
        customerName: transactions.customerName,
        customerEmail: transactions.customerEmail,
        customerPhone: transactions.customerPhone,
        totalOrders: count(),
        totalSpent: sql<number>`COALESCE(SUM(CASE WHEN ${transactions.paymentStatus} = 'paid' THEN ${transactions.price} ELSE 0 END), 0)`,
        lastOrderAt: sql<Date>`MAX(${transactions.createdAt})`,
      })
      .from(transactions)
      .groupBy(
        transactions.customerName,
        transactions.customerEmail,
        transactions.customerPhone
      )
      .orderBy(sql`MAX(${transactions.createdAt}) DESC`)
      .limit(input.pageSize)
      .offset((input.page - 1) * input.pageSize);

    const totalRows = await db
      .select({ total: count() })
      .from(
        db
          .select({
            customerName: transactions.customerName,
            customerEmail: transactions.customerEmail,
            customerPhone: transactions.customerPhone,
          })
          .from(transactions)
          .groupBy(
            transactions.customerName,
            transactions.customerEmail,
            transactions.customerPhone
          )
          .as("customer_groups")
      );

    return {
      rows: rows.filter(
      (row) => row.customerName || row.customerEmail || row.customerPhone
      ),
      total: totalRows[0]?.total ?? 0,
    };
  }),

  auditLogs: adminQuery.input(pageInput).query(async ({ input }) => {
    const db = getDb();
    const [rows, totals] = await Promise.all([
      db
        .select()
        .from(auditLogs)
        .orderBy(desc(auditLogs.createdAt))
        .limit(input.pageSize)
        .offset((input.page - 1) * input.pageSize),
      db.select({ total: count() }).from(auditLogs),
    ]);
    return { rows, total: totals[0]?.total ?? 0 };
  }),

  providerApiLogs: adminQuery.input(searchPageInput).query(async ({ input }) => {
    const db = getDb();
    const keyword = input.search.trim();
    const filter = keyword
      ? or(
        ilike(providerApiLogs.provider, `%${keyword}%`),
        ilike(providerApiLogs.referenceId, `%${keyword}%`),
        ilike(providerApiLogs.method, `%${keyword}%`),
        ilike(providerApiLogs.endpoint, `%${keyword}%`),
        ilike(providerApiLogs.error, `%${keyword}%`),
        sql`cast(${providerApiLogs.statusCode} as text) ilike ${`%${keyword}%`}`,
      )
      : undefined;
    const [rows, totals] = await Promise.all([
      db
      .select({
        id: providerApiLogs.id,
        provider: providerApiLogs.provider,
        referenceId: providerApiLogs.referenceId,
        method: providerApiLogs.method,
        endpoint: providerApiLogs.endpoint,
        requestPayload: providerApiLogs.requestPayload,
        responsePayload: providerApiLogs.responsePayload,
        statusCode: providerApiLogs.statusCode,
        success: providerApiLogs.success,
        error: providerApiLogs.error,
        durationMs: providerApiLogs.durationMs,
        createdAt: providerApiLogs.createdAt,
      })
      .from(providerApiLogs)
      .where(filter)
      .orderBy(desc(providerApiLogs.createdAt))
      .limit(input.pageSize)
      .offset((input.page - 1) * input.pageSize),
      db.select({ total: count() }).from(providerApiLogs).where(filter),
    ]);
    return {
      rows: rows.map((row) => ({
      ...row,
      requestPayload: truncatePayload(row.requestPayload),
      responsePayload: truncatePayload(row.responsePayload),
      error: truncatePayload(row.error),
      })),
      total: totals[0]?.total ?? 0,
    };
  }),

  popupSettings: adminQuery.query(async () => {
    return getPopupSettingsOrDefault();
  }),

  allTransactions: adminQuery.input(searchPageInput).query(async ({ input }) => {
    const db = getDb();
    const keyword = input.search.trim();
    const filter = keyword
      ? or(
        ilike(transactions.referenceId, `%${keyword}%`),
        ilike(transactions.customerName, `%${keyword}%`),
        ilike(transactions.customerEmail, `%${keyword}%`),
        ilike(transactions.customerPhone, `%${keyword}%`),
        ilike(transactions.paymentStatus, `%${keyword}%`),
        ilike(transactions.status, `%${keyword}%`),
        ilike(transactions.topupStatus, `%${keyword}%`),
        ilike(games.name, `%${keyword}%`),
        ilike(products.name, `%${keyword}%`),
      )
      : undefined;

    const [rows, totals] = await Promise.all([
      db
      .select({
        transaction: transactions,
        game: games,
        product: products,
      })
      .from(transactions)
      .innerJoin(games, eq(transactions.gameId, games.id))
      .innerJoin(products, eq(transactions.productId, products.id))
      .where(filter)
      .orderBy(desc(transactions.createdAt))
      .limit(input.pageSize)
      .offset((input.page - 1) * input.pageSize),
      db
        .select({ total: count() })
        .from(transactions)
        .innerJoin(games, eq(transactions.gameId, games.id))
        .innerJoin(products, eq(transactions.productId, products.id))
        .where(filter),
    ]);

    return {
      rows: rows.map((row) => ({
      ...row.transaction,
      gameName: row.game.name,
      gameSlug: row.game.slug,
      productName: row.product.name,
      providerCode: row.product.providerCode,
      priceModal: row.product.priceModal,
      profit: row.transaction.paymentStatus === "paid"
        ? row.transaction.price - row.product.priceModal
        : 0,
      })),
      total: totals[0]?.total ?? 0,
    };
  }),

  updateStatus: adminQuery
    .input(
      z.object({
        referenceId: z.string(),
        status: transactionStatus,
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const before = await db
        .select()
        .from(transactions)
        .where(eq(transactions.referenceId, input.referenceId))
        .limit(1);

      if (!before[0]) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Transaksi tidak ditemukan",
        });
      }

      const update = buildManualTransactionStatusUpdate(before[0], input.status);
      await db
        .update(transactions)
        .set(update)
        .where(eq(transactions.referenceId, input.referenceId));
      await writeAuditLog({
        actorUserId: ctx.user.id,
        action: "transaction.update_status",
        entityType: "transaction",
        entityId: input.referenceId,
        before: before[0],
        after: update,
      });
      return { success: true };
    }),

  syncPayment: adminQuery
    .input(z.object({ referenceId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const result = await syncPaymentAndFulfill(input.referenceId);
      await writeAuditLog({
        actorUserId: ctx.user.id,
        action: "transaction.sync_payment",
        entityType: "transaction",
        entityId: input.referenceId,
        after: result,
      });
      return result;
    }),

  retryTopup: adminQuery
    .input(z.object({ referenceId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const result = await fulfillPaidTransaction(input.referenceId, { force: true });
      await writeAuditLog({
        actorUserId: ctx.user.id,
        action: "transaction.retry_topup",
        entityType: "transaction",
        entityId: input.referenceId,
        after: result,
      });
      return result;
    }),

  expireOld: adminQuery.mutation(async ({ ctx }) => {
    const expired = await expireOldTransactions();
    await writeAuditLog({
      actorUserId: ctx.user.id,
      action: "transaction.expire_old",
      entityType: "transaction",
      entityId: "bulk",
      after: expired,
    });
    return { success: true, count: expired.length };
  }),

  syncTopups: adminQuery.mutation(async ({ ctx }) => {
    const results = await syncProcessingTopups();
    await writeAuditLog({
      actorUserId: ctx.user.id,
      action: "transaction.sync_topups",
      entityType: "transaction",
      entityId: "bulk",
      after: results,
    });
    return { success: true, count: results.length, results };
  }),

  syncCatalog: adminQuery.mutation(async ({ ctx }) => {
    const result = await syncCatalogFromProvider({ apply: true, onlyActive: true, prune: true });
    await writeAuditLog({
      actorUserId: ctx.user.id,
      action: "catalog.sync_provider",
      entityType: "catalog",
      entityId: "topup_provider",
      after: result,
    });
    return { success: true, ...result };
  }),

  updatePopupSettings: adminQuery
    .input(popupSettingsInput)
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const existing = await getPopupSettingsOrDefault();
      const values = {
        id: 1,
        isActive: input.isActive ? 1 : 0,
        title: input.title,
        description: input.description,
        imageUrl: input.imageUrl || null,
        buttonText: input.buttonText,
        buttonUrl: input.buttonUrl,
        displayDelayMs: input.displayDelayMs,
        updatedAt: new Date(),
      };

      try {
        await db
          .insert(popupSettings)
          .values(values)
          .onConflictDoUpdate({
            target: popupSettings.id,
            set: values,
          });
      } catch (error) {
        if (isMissingPopupSettingsTable(error)) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "Tabel popup_settings belum ada di database. Jalankan migration terbaru terlebih dahulu.",
          });
        }
        throw error;
      }

      await writeAuditLog({
        actorUserId: ctx.user.id,
        action: "popup.update",
        entityType: "popup_settings",
        entityId: "1",
        before: existing.id === defaultPopupSettings.id ? undefined : existing,
        after: values,
      });

      return { success: true };
    }),

  cleanupDatabase: adminQuery
    .input(
      z.object({
        target: cleanupTarget,
        olderThanDays: z.number().int().min(1).max(3650),
        password: z.string().min(1).max(100),
        confirmation: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (input.confirmation !== "HAPUS") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Ketik HAPUS untuk konfirmasi.",
        });
      }

      await assertAdminPassword(ctx.user.id, input.password);

      const cutoff = new Date(Date.now() - input.olderThanDays * 24 * 60 * 60 * 1000);
      const result = await runCleanup(input.target, cutoff);

      await writeAuditLog({
        actorUserId: ctx.user.id,
        action: "database.cleanup",
        entityType: "database",
        entityId: input.target,
        after: {
          target: input.target,
          olderThanDays: input.olderThanDays,
          cutoff,
          deleted: result.deleted,
        },
      });

      return result;
    }),

  updateUserRole: adminQuery
    .input(z.object({ userId: z.number().int().positive(), role: userRole }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const before = await db.select().from(users).where(eq(users.id, input.userId)).limit(1);
      if (!before[0]) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Akun tidak ditemukan" });
      }
      const adminCount = await db
        .select({ count: count() })
        .from(users)
        .where(eq(users.role, "admin"));
      if (before[0].role === "admin" && input.role !== "admin" && adminCount[0].count <= 1) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Tidak bisa menurunkan role admin terakhir",
        });
      }

      const update = { role: input.role, updatedAt: new Date() };
      await db.update(users).set(update).where(eq(users.id, input.userId));
      await writeAuditLog({
        actorUserId: ctx.user.id,
        action: "user.update_role",
        entityType: "user",
        entityId: input.userId.toString(),
        before: { id: before[0].id, role: before[0].role },
        after: update,
      });
      return { success: true };
    }),

  resetUserPassword: adminQuery
    .input(
      z.object({
        userId: z.number().int().positive(),
        password: z.string().min(8).max(100),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const before = await db.select().from(users).where(eq(users.id, input.userId)).limit(1);
      if (!before[0]) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Akun tidak ditemukan" });
      }
      await db
        .update(users)
        .set({
          passwordHash: hashPassword(input.password),
          authProvider: "local",
          updatedAt: new Date(),
        })
        .where(eq(users.id, input.userId));
      await writeAuditLog({
        actorUserId: ctx.user.id,
        action: "user.reset_password",
        entityType: "user",
        entityId: input.userId.toString(),
        before: { id: before[0].id, username: before[0].username, email: before[0].email },
        after: { passwordReset: true },
      });
      return { success: true };
    }),

  updateProduct: adminQuery
    .input(
      z.object({
        productId: z.number(),
        priceSell: z.number().positive().optional(),
        priceModal: z.number().positive().optional(),
        providerCode: z.string().min(1).max(100).optional(),
        productType: productType.optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const before = await db
        .select()
        .from(products)
        .where(eq(products.id, input.productId))
        .limit(1);
      if (!before[0]) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Produk tidak ditemukan",
        });
      }

      const update: Partial<typeof products.$inferInsert> = {
        updatedAt: new Date(),
      };
      if (input.priceSell !== undefined) update.priceSell = input.priceSell;
      if (input.priceModal !== undefined) update.priceModal = input.priceModal;
      if (input.providerCode !== undefined) update.providerCode = input.providerCode;
      if (input.productType !== undefined) update.productType = input.productType;
      if (input.isActive !== undefined) update.isActive = input.isActive ? 1 : 0;

      if (
        isSensitiveCatalogText(
          input.providerCode ?? before[0]?.providerCode,
          before[0]?.name,
        )
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Produk terkait judi, porno, atau crypto tidak diizinkan.",
        });
      }

      await db.update(products).set(update).where(eq(products.id, input.productId));
      await writeAuditLog({
        actorUserId: ctx.user.id,
        action: "product.update",
        entityType: "product",
        entityId: input.productId.toString(),
        before: before[0],
        after: update,
      });

      return { success: true };
    }),

  createProduct: adminQuery
    .input(
      z.object({
        gameId: z.number(),
        providerCode: z.string().min(1).max(100),
        name: z.string().min(1).max(255),
        priceModal: z.number().positive(),
        priceSell: z.number().positive(),
        productType: productType.optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const targetGame = await db
        .select()
        .from(games)
        .where(and(eq(games.id, input.gameId), publicSafeGameFilter()))
        .limit(1);
      if (!targetGame[0]) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Game tidak tersedia di katalog publik.",
        });
      }
      if (isSensitiveCatalogText(input.name, input.providerCode, targetGame[0].name, targetGame[0].slug)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Produk terkait judi, porno, atau crypto tidak diizinkan.",
        });
      }
      const inserted = await db
        .insert(products)
        .values({
          gameId: input.gameId,
          providerCode: input.providerCode,
          name: input.name,
          productType: input.productType ?? "general",
          priceModal: input.priceModal,
          priceSell: input.priceSell,
          isActive: input.isActive === false ? 0 : 1,
        })
        .returning();

      await writeAuditLog({
        actorUserId: ctx.user.id,
        action: "product.create",
        entityType: "product",
        entityId: inserted[0]?.id.toString() ?? "unknown",
        after: inserted[0],
      });

      return { success: true, product: inserted[0] };
    }),

  importProducts: adminQuery
    .input(
      z.object({
        rows: z.array(importProductRow).min(1).max(10000),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      let created = 0;
      let updated = 0;
      let gamesCreated = 0;
      const gamesUsed = new Map<string, number>();
      const skipped: Array<{ code: string; reason: string }> = [];

      for (const row of input.rows) {
        const gameInfo = detectGame(row);
        if (!gameInfo) {
          skipped.push({ code: row.code, reason: "Game tidak dikenali" });
          continue;
        }
        if (isSensitiveCatalogText(gameInfo.name, gameInfo.slug, row.name, row.code)) {
          skipped.push({ code: row.code, reason: "Produk sensitif tidak diizinkan" });
          continue;
        }

        const priceModal = normalizeImportPrice(row.hargaRupiah);
        const priceSell = catalogMarkup(priceModal, gameInfo.category === "Digital" ? "digital" : "game", gameInfo.name);
        const existingGame = await db
          .select()
          .from(games)
          .where(eq(games.slug, gameInfo.slug))
          .limit(1);

        const gameValues = buildImportedGameValues(gameInfo);
        const game = existingGame[0] ?? (await db
          .insert(games)
          .values(gameValues)
          .returning())[0];
        if (existingGame[0]) {
          const update = buildImportedGameUpdate(existingGame[0], gameInfo);
          if (Object.keys(update).length > 1) {
            await db.update(games).set(update).where(eq(games.id, existingGame[0].id));
          }
        } else {
          gamesCreated += 1;
        }
        gamesUsed.set(game.name, (gamesUsed.get(game.name) ?? 0) + 1);

        const existingProduct = await db
          .select()
          .from(products)
          .where(and(
            eq(products.gameId, game.id),
            eq(products.providerCode, row.code.trim())
          ))
          .limit(1);

        if (existingProduct[0]) {
          await db
            .update(products)
            .set({
              gameId: game.id,
              name: cleanImportedName(row.name),
              productType: row.productType ?? inferImportedProductType(row.name),
              priceModal,
              priceSell,
              isActive: 1,
              updatedAt: new Date(),
            })
            .where(eq(products.id, existingProduct[0].id));
          updated += 1;
        } else {
          await db.insert(products).values({
            gameId: game.id,
            providerCode: row.code.trim(),
            name: cleanImportedName(row.name),
            productType: row.productType ?? inferImportedProductType(row.name),
            priceModal,
            priceSell,
            isActive: 1,
          });
          created += 1;
        }
      }

      await writeAuditLog({
        actorUserId: ctx.user.id,
        action: "product.import",
        entityType: "product",
        entityId: "bulk",
        after: {
          created,
          updated,
          skipped: skipped.length,
          gamesCreated,
          gamesUsed: Array.from(gamesUsed.entries()),
          pricingPolicy: "coinin-tiered",
        },
      });

      return {
        success: true,
        created,
        updated,
        gamesCreated,
        gamesUsed: Array.from(gamesUsed.entries()).map(([name, count]) => ({ name, count })),
        skipped,
        total: input.rows.length,
      };
    }),

  createGame: adminQuery.input(gameInput).mutation(async ({ input, ctx }) => {
    const db = getDb();
    const slug = normalizeSlug(input.slug);
    if (isSensitiveCatalogText(input.name, slug, input.category)) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Game terkait judi, porno, atau crypto tidak diizinkan.",
      });
    }
    const inserted = await db
      .insert(games)
      .values({
        name: input.name,
        slug,
        thumbnail: input.thumbnail || null,
        category: input.category || null,
        instructions: input.instructions || null,
        requiresZoneId: input.requiresZoneId ? 1 : 0,
        isActive: input.isActive === false ? 0 : 1,
      })
      .returning();

    await writeAuditLog({
      actorUserId: ctx.user.id,
      action: "game.create",
      entityType: "game",
      entityId: inserted[0]?.id.toString() ?? "unknown",
      after: inserted[0],
    });

    return { success: true, game: inserted[0] };
  }),

  updateGame: adminQuery
    .input(gameInput.partial().extend({ gameId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const before = await db
        .select()
        .from(games)
        .where(eq(games.id, input.gameId))
        .limit(1);
      if (!before[0]) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Game tidak ditemukan",
        });
      }

      const update: Partial<typeof games.$inferInsert> = {
        updatedAt: new Date(),
      };
      if (input.name !== undefined) update.name = input.name;
      if (input.slug !== undefined) update.slug = normalizeSlug(input.slug);
      if (input.thumbnail !== undefined) update.thumbnail = input.thumbnail || null;
      if (input.category !== undefined) update.category = input.category || null;
      if (input.instructions !== undefined) {
        update.instructions = input.instructions || null;
      }
      if (input.requiresZoneId !== undefined) {
        update.requiresZoneId = input.requiresZoneId ? 1 : 0;
      }
      if (input.isActive !== undefined) update.isActive = input.isActive ? 1 : 0;

      if (
        isSensitiveCatalogText(
          update.name ?? before[0]?.name,
          update.slug ?? before[0]?.slug,
          update.category ?? before[0]?.category,
        )
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Game terkait judi, porno, atau crypto tidak diizinkan.",
        });
      }

      await db.update(games).set(update).where(eq(games.id, input.gameId));
      await writeAuditLog({
        actorUserId: ctx.user.id,
        action: "game.update",
        entityType: "game",
        entityId: input.gameId.toString(),
        before: before[0],
        after: update,
      });

      return { success: true };
    }),
});

async function assertAdminPassword(userId: number, password: string) {
  const db = getDb();
  const currentUser = await db
    .select({
      id: users.id,
      passwordHash: users.passwordHash,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!currentUser[0] || !verifyPassword(password, currentUser[0].passwordHash)) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Password admin salah.",
    });
  }
}

async function runCleanup(target: z.infer<typeof cleanupTarget>, cutoff: Date) {
  const db = getDb();

  if (target === "staleTransactions") {
    const deleted = await db
      .delete(transactions)
      .where(and(
        lt(transactions.createdAt, cutoff),
        or(
          eq(transactions.status, "failed"),
          eq(transactions.paymentStatus, "expired"),
          eq(transactions.paymentStatus, "failed"),
          eq(transactions.paymentStatus, "unpaid"),
        )
      ))
      .returning({ id: transactions.id });
    return { success: true, deleted: deleted.length };
  }

  if (target === "providerApiLogs") {
    const deleted = await db
      .delete(providerApiLogs)
      .where(lt(providerApiLogs.createdAt, cutoff))
      .returning({ id: providerApiLogs.id });
    return { success: true, deleted: deleted.length };
  }

  if (target === "auditLogs") {
    const deleted = await db
      .delete(auditLogs)
      .where(lt(auditLogs.createdAt, cutoff))
      .returning({ id: auditLogs.id });
    return { success: true, deleted: deleted.length };
  }

  const deleted = await db
    .delete(users)
    .where(and(
      lt(users.lastSignInAt, cutoff),
      ne(users.role, "admin"),
    ))
    .returning({ id: users.id });
  return { success: true, deleted: deleted.length };
}

function buildManualTransactionStatusUpdate(
  tx: typeof transactions.$inferSelect,
  status: z.infer<typeof transactionStatus>,
): Partial<typeof transactions.$inferInsert> {
  const now = new Date();
  if (status === "success") {
    return {
      status: "success",
      paymentStatus: "paid",
      topupStatus: "success",
      paidAt: tx.paidAt ?? now,
      completedAt: tx.completedAt ?? now,
      lastError: null,
      updatedAt: now,
    };
  }

  if (status === "failed") {
    return {
      status: "failed",
      paymentStatus: tx.paymentStatus === "paid" ? "paid" : "failed",
      topupStatus: tx.paymentStatus === "paid" ? "failed" : tx.topupStatus,
      lastError: "Manually marked failed by admin",
      updatedAt: now,
    };
  }

  if (status === "processing") {
    return {
      status: "processing",
      topupStatus: tx.paymentStatus === "paid" ? "processing" : tx.topupStatus,
      updatedAt: now,
    };
  }

  return {
    status: "pending",
    topupStatus: null,
    lastError: null,
    updatedAt: now,
  };
}

function normalizeSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeImportPrice(value: number) {
  return Math.round(value < 1000 ? value * 1000 : value);
}

function cleanImportedName(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function inferImportedProductType(name: string): "general" | "membership" {
  return /membership|member|weekly|monthly|pass|subscription|langganan|welkin|battle pass|season pass|starlight|twilight|growth plan/i.test(name)
    ? "membership"
    : "general";
}

type ImportProductRow = z.infer<typeof importProductRow>;

type ImportedGameInfo = {
  name: string;
  slug: string;
  category: string;
  requiresZoneId: boolean;
  thumbnail?: string;
  instructions?: string;
};

function buildImportedGameValues(gameInfo: ImportedGameInfo): typeof games.$inferInsert {
  return {
    name: gameInfo.name,
    slug: gameInfo.slug,
    category: gameInfo.category,
    thumbnail: gameInfo.thumbnail || null,
    instructions: gameInfo.instructions || null,
    requiresZoneId: gameInfo.requiresZoneId ? 1 : 0,
    isActive: 1,
  };
}

function buildImportedGameUpdate(
  existingGame: typeof games.$inferSelect,
  gameInfo: ImportedGameInfo,
): Partial<typeof games.$inferInsert> {
  const update: Partial<typeof games.$inferInsert> = { updatedAt: new Date() };
  if (existingGame.name !== gameInfo.name) update.name = gameInfo.name;
  if (gameInfo.category && existingGame.category !== gameInfo.category) update.category = gameInfo.category;
  if (gameInfo.thumbnail && existingGame.thumbnail !== gameInfo.thumbnail) update.thumbnail = gameInfo.thumbnail;
  if (gameInfo.instructions && existingGame.instructions !== gameInfo.instructions) {
    update.instructions = gameInfo.instructions;
  }
  const requiresZoneId = gameInfo.requiresZoneId ? 1 : 0;
  if (existingGame.requiresZoneId !== requiresZoneId) update.requiresZoneId = requiresZoneId;
  if (existingGame.isActive !== 1) update.isActive = 1;
  return update;
}

function detectGame(row: ImportProductRow): ImportedGameInfo | undefined {
  if (row.gameName?.trim()) {
    const normalizedName = cleanImportedName(row.gameName);
    return {
      name: normalizedName,
      slug: normalizeSlug(normalizedName),
      category: row.category || "Top Up",
      requiresZoneId: row.requiresZoneId ?? /mobile legends?|genshin|honkai/i.test(normalizedName),
      thumbnail: row.thumbnail,
      instructions: row.instructions,
    };
  }

  const text = row.name.toLowerCase();
  const normalizedCode = row.code.trim().toUpperCase();
  const startsWithAny = (prefixes: string[]) =>
    prefixes.some((prefix) => normalizedCode.startsWith(prefix));
  const gameInfo: ImportedGameInfo | undefined = [
    {
      test: text.includes("free fire") || startsWithAny(["FF", "UPF", "DGF", "DGHF"]),
      name: "Free Fire",
      slug: "free-fire",
      category: "Battle Royale",
      requiresZoneId: false,
    },
    {
      test: text.includes("mobile legend") || startsWithAny(["ML", "MBL", "UPMBL", "UPMYMBL", "DGHMBL"]),
      name: "Mobile Legends",
      slug: "mobile-legends",
      category: "MOBA",
      requiresZoneId: true,
    },
    {
      test: text.includes("call of duty") || startsWithAny(["CODM", "COD"]),
      name: "Call of Duty Mobile",
      slug: "call-of-duty-mobile",
      category: "FPS",
      requiresZoneId: false,
    },
    {
      test: text.includes("pubg") || startsWithAny(["PUBG"]),
      name: "PUBG Mobile",
      slug: "pubg-mobile",
      category: "Battle Royale",
      requiresZoneId: false,
    },
    {
      test: text.includes("arena of valor") || startsWithAny(["AOV"]),
      name: "Arena of Valor",
      slug: "arena-of-valor",
      category: "MOBA",
      requiresZoneId: false,
    },
    {
      test: text.includes("hago") || startsWithAny(["HAGO"]),
      name: "Hago",
      slug: "hago",
      category: "Casual",
      requiresZoneId: false,
    },
    {
      test: text.includes("sausage man") || startsWithAny(["SM", "GPSM"]),
      name: "Sausage Man",
      slug: "sausage-man",
      category: "Battle Royale",
      requiresZoneId: false,
    },
    {
      test: text.includes("google play") || startsWithAny(["GPLAY"]),
      name: "Google Play",
      slug: "google-play",
      category: "Voucher",
      requiresZoneId: false,
    },
    {
      test: text.includes("garena shell") || startsWithAny(["GS", "GARENA"]),
      name: "Garena Shell",
      slug: "garena-shell",
      category: "Voucher",
      requiresZoneId: false,
    },
    {
      test: text.includes("valorant") || startsWithAny(["VAL"]),
      name: "Valorant",
      slug: "valorant",
      category: "FPS",
      requiresZoneId: false,
    },
    {
      test:
        text.includes("genshin") ||
        text.includes("genesis crystal") ||
        text.includes("welkin moon") ||
        startsWithAny(["GI", "GENSHIN", "UPMYGI"]),
      name: "Genshin Impact",
      slug: "genshin-impact",
      category: "RPG",
      requiresZoneId: true,
    },
    {
      test: text.includes("dragon raja") || startsWithAny(["DR", "UPMYDR"]),
      name: "Dragon Raja",
      slug: "dragon-raja",
      category: "RPG",
      requiresZoneId: false,
    },
    {
      test: text.includes("honkai star rail") || text.includes("star rail") || startsWithAny(["HSR"]),
      name: "Honkai Star Rail",
      slug: "honkai-star-rail",
      category: "RPG",
      requiresZoneId: true,
    },
    {
      test: text.includes("roblox") || startsWithAny(["RBX", "ROBLOX"]),
      name: "Roblox",
      slug: "roblox",
      category: "Platform",
      requiresZoneId: false,
    },
    {
      test: text.includes("minecraft") || startsWithAny(["MC", "MINECRAFT"]),
      name: "Minecraft",
      slug: "minecraft",
      category: "Sandbox",
      requiresZoneId: false,
    },
    {
      test: text.includes("fc mobile") || text.includes("fifa mobile") || startsWithAny(["FCM", "FIFA"]),
      name: "FC Mobile",
      slug: "fc-mobile",
      category: "Sports",
      requiresZoneId: false,
    },
  ].find((game) => game.test);

  if (gameInfo) {
    return {
      ...gameInfo,
      category: row.category || gameInfo.category,
      requiresZoneId: row.requiresZoneId ?? gameInfo.requiresZoneId,
      thumbnail: row.thumbnail,
      instructions: row.instructions,
    };
  }

  return undefined;
}

function truncatePayload(value: string | null, maxLength = 8000) {
  if (!value || value.length <= maxLength) {
    return value;
  }

  return `${value.slice(0, maxLength)}\n\n...[truncated ${value.length - maxLength} chars]`;
}
