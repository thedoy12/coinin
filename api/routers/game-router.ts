import { z } from "zod";
import { createRouter, publicQuery } from "../middleware";
import { getDb } from "../queries/connection";
import { games } from "@db/schema";
import { and, eq, inArray, sql } from "drizzle-orm";
import { getPublicCatalogThumbnail, publicSafeGameFilter } from "../lib/catalog-safety";

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
      .orderBy(catalogGroupOrder(), games.name)
      .then(withPublicThumbnails);
  }),

  featured: publicQuery.query(async () => {
    const db = getDb();
    return db
      .select()
      .from(games)
      .where(and(eq(games.isActive, 1), inArray(games.slug, featuredGameSlugs), publicSafeGameFilter()))
      .orderBy(sql`array_position(ARRAY[${sql.join(featuredGameSlugs.map((slug) => sql`${slug}`), sql`, `)}], ${games.slug})`)
      .then(withPublicThumbnails);
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
      return result[0] ? withPublicThumbnail(result[0]) : null;
    }),
});

function catalogGroupOrder() {
  return sql`
    case
      when ${games.slug} like 'pulsa-%'
        or ${games.slug} like 'paket-data-%'
        or ${games.slug} like 'saldo-%'
        or ${games.slug} in ('pln', 'token-pln', 'k-vision-dan-gol', 'pertamina-gas')
        or ${games.category} = 'Digital'
        then 2
      when ${games.category} = 'Voucher' then 1
      else 0
    end
  `;
}

function withPublicThumbnails<T extends { slug: string; thumbnail: string | null }>(rows: T[]) {
  return rows.map(withPublicThumbnail);
}

function withPublicThumbnail<T extends { slug: string; thumbnail: string | null }>(game: T) {
  return {
    ...game,
    thumbnail: getPublicCatalogThumbnail(game.slug, game.thumbnail),
  };
}
