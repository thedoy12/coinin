import { eq, sql } from "drizzle-orm";
import { games, products } from "../db/schema";
import { getDb } from "../api/queries/connection";

const sensitivePattern = [
  "judi",
  "slot",
  "casino",
  "poker",
  "togel",
  "\\mbet\\b",
  "betting",
  "domino",
  "gaple",
  "capsa",
  "qiu",
  "qq",
  "8\\s*ball",
  "billiard",
  "sex",
  "sexy",
  "porn",
  "porno",
  "dewasa",
  "crypto",
  "kripto",
  "bitcoin",
  "binance",
  "usdt",
  "wallet",
  "trading",
  "forex",
].join("|");

async function main() {
  const db = getDb();
  const rows = await db
    .select({
      game: games.name,
      slug: games.slug,
      product: products.name,
      providerCode: products.providerCode,
    })
    .from(products)
    .innerJoin(games, eq(products.gameId, games.id))
    .where(sql`
      ${games.isActive} = 1
      and ${products.isActive} = 1
      and (
        ${games.name} ~* ${sensitivePattern}
        or ${games.slug} ~* ${sensitivePattern}
        or ${products.name} ~* ${sensitivePattern}
        or ${products.providerCode} ~* ${sensitivePattern}
      )
    `)
    .orderBy(games.name, products.name);

  console.log(JSON.stringify({
    count: rows.length,
    matches: rows.slice(0, 200),
  }, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
