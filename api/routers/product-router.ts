import { z } from "zod";
import { createRouter, publicQuery } from "../middleware";
import { getDb } from "../queries/connection";
import { products, games } from "@db/schema";
import { and, eq, getTableColumns } from "drizzle-orm";
import { publicSafeGameFilter, publicSafeProductFilter } from "../lib/catalog-safety";

const productColumns = getTableColumns(products);

export const productRouter = createRouter({
  byGame: publicQuery
    .input(z.object({ gameId: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      return db
        .select(productColumns)
        .from(products)
        .innerJoin(games, eq(products.gameId, games.id))
        .where(and(
          eq(products.gameId, input.gameId),
          eq(products.isActive, 1),
          eq(games.isActive, 1),
          publicSafeGameFilter(),
          publicSafeProductFilter(),
        ))
        .orderBy(products.productType, products.priceSell);
    }),

  byGameSlug: publicQuery
    .input(z.object({ slug: z.string() }))
    .query(async ({ input }) => {
      const db = getDb();
      const gameResult = await db
        .select(productColumns)
        .from(games)
        .where(and(eq(games.slug, input.slug), eq(games.isActive, 1), publicSafeGameFilter()))
        .limit(1);

      if (!gameResult[0]) return [];

      return db
        .select()
        .from(products)
        .where(and(eq(products.gameId, gameResult[0].id), eq(products.isActive, 1), publicSafeProductFilter()))
        .orderBy(products.productType, products.priceSell);
    }),

  byId: publicQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      const result = await db
        .select()
        .from(products)
        .innerJoin(games, eq(products.gameId, games.id))
        .where(and(
          eq(products.id, input.id),
          eq(products.isActive, 1),
          eq(games.isActive, 1),
          publicSafeGameFilter(),
          publicSafeProductFilter(),
        ))
        .limit(1);
      return result[0] ?? null;
    }),
});
