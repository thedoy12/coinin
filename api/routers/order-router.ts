import { z } from "zod";
import { createRouter, publicQuery } from "../middleware";
import { getDb } from "../queries/connection";
import { transactions, products, games } from "@db/schema";
import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { TRPCError } from "@trpc/server";
import { publicSafeGameFilter, publicSafeProductFilter } from "../lib/catalog-safety";

const referenceIdInput = z.string().trim().regex(/^TRX-[A-Z0-9_-]{8,32}$/);

export const orderRouter = createRouter({
  create: publicQuery
    .input(
      z.object({
        productId: z.number().int().positive(),
        userIdGame: z.string().trim().min(1).max(255),
        zoneId: z.string().trim().max(100).optional(),
      })
    )
    .mutation(async ({ input }) => {
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
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Produk tidak ditemukan",
        });
      }
      if (game.requiresZoneId === 1 && !input.zoneId?.trim()) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Zone ID / Server wajib diisi untuk game ini",
        });
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
    }),

  byReference: publicQuery
    .input(z.object({ referenceId: referenceIdInput }))
    .query(async ({ input }) => {
      const db = getDb();
      const result = await db
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

      if (!result[0]) return null;

      return {
        ...result[0].transaction,
        gameName: result[0].game.name,
        gameSlug: result[0].game.slug,
        category: result[0].game.category,
        productName: result[0].product.name,
        providerCode: result[0].product.providerCode,
      };
    }),
});
