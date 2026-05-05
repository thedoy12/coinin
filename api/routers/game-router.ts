import { z } from "zod";
import { createRouter, publicQuery } from "../middleware";
import { getDb } from "../queries/connection";
import { games } from "@db/schema";
import { and, eq, inArray, sql } from "drizzle-orm";
import { publicSafeGameFilter } from "../lib/catalog-safety";

const featuredGameSlugs = [
  "mobile-legends",
  "free-fire",
  "pubg-mobile",
  "genshin-impact",
  "valorant",
  "call-of-duty-mobile",
  "honor-of-kings",
  "honkai-star-rail",
  "roblox",
  "arena-of-valor",
  "fc-mobile",
  "efootball",
];

export const gameRouter = createRouter({
  list: publicQuery.query(async () => {
    const db = getDb();
    return db
      .select()
      .from(games)
      .where(and(eq(games.isActive, 1), publicSafeGameFilter()))
      .orderBy(games.name);
  }),

  featured: publicQuery.query(async () => {
    const db = getDb();
    return db
      .select()
      .from(games)
      .where(and(eq(games.isActive, 1), inArray(games.slug, featuredGameSlugs), publicSafeGameFilter()))
      .orderBy(sql`array_position(ARRAY[${sql.join(featuredGameSlugs.map((slug) => sql`${slug}`), sql`, `)}], ${games.slug})`);
  }),

  bySlug: publicQuery
    .input(z.object({ slug: z.string() }))
    .query(async ({ input }) => {
      const db = getDb();
      const result = await db
        .select()
        .from(games)
        .where(and(eq(games.slug, input.slug), eq(games.isActive, 1), publicSafeGameFilter()))
        .limit(1);
      return result[0] ?? null;
    }),
});
