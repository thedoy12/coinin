import { eq, sql } from "drizzle-orm";
import { games, products } from "../db/schema";
import { getDb } from "../api/queries/connection";

async function main() {
  const db = getDb();
  const [activeGames] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(games)
    .where(eq(games.isActive, 1));
  const [activeProducts] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(products)
    .where(eq(products.isActive, 1));
  const pointBlank = await db
    .select({
      id: games.id,
      name: games.name,
      slug: games.slug,
      isActive: games.isActive,
    })
    .from(games)
    .where(sql`
      lower(${games.name}) like '%point%blank%'
      or lower(${games.slug}) like '%point-blank%'
      or lower(${games.slug}) like '%pointblank%'
    `);
  const utilities = await db
    .select({ name: games.name, slug: games.slug })
    .from(games)
    .where(sql`
      ${games.isActive} = 1
      and (
        lower(${games.name}) like '%pulsa%'
        or lower(${games.name}) like '%pln%'
        or lower(${games.name}) like '%token%'
      )
    `)
    .orderBy(games.name);

  console.log(JSON.stringify({
    activeGames: activeGames?.count ?? 0,
    activeProducts: activeProducts?.count ?? 0,
    pointBlank,
    utilities: utilities.length,
    utilitySample: utilities.slice(0, 10),
  }, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
