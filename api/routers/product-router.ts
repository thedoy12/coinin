import { z } from "zod";
import { createRouter, publicQuery } from "../middleware";
import { getDb } from "../queries/connection";
import { products, games } from "@db/schema";
import { and, eq } from "drizzle-orm";

export const productRouter = createRouter({
  byGame: publicQuery
    .input(z.object({ gameId: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      return db
        .select()
        .from(products)
        .where(and(eq(products.gameId, input.gameId), eq(products.isActive, 1)))
        .orderBy(products.productType, products.priceSell);
    }),

  byGameSlug: publicQuery
    .input(z.object({ slug: z.string() }))
    .query(async ({ input }) => {
      const db = getDb();
      const gameResult = await db
        .select()
        .from(games)
        .where(eq(games.slug, input.slug))
        .limit(1);

      if (!gameResult[0]) return [];

      return db
        .select()
        .from(products)
        .where(and(eq(products.gameId, gameResult[0].id), eq(products.isActive, 1)))
        .orderBy(products.productType, products.priceSell);
    }),

  byId: publicQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      const result = await db
        .select()
        .from(products)
        .where(eq(products.id, input.id))
        .limit(1);
      return result[0] ?? null;
    }),
});
