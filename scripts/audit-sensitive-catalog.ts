import { eq, inArray, sql } from "drizzle-orm";
import { games, products, transactions } from "../db/schema";
import { getDb } from "../api/queries/connection";
import { sensitiveCatalogPattern } from "../api/lib/catalog-safety";

const shouldApply = process.argv.includes("--apply");

async function main() {
  const db = getDb();
  const rows = await db
    .select({
      gameId: games.id,
      productId: products.id,
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
        ${games.name} ~* ${sensitiveCatalogPattern}
        or ${games.slug} ~* ${sensitiveCatalogPattern}
        or ${products.name} ~* ${sensitiveCatalogPattern}
        or ${products.providerCode} ~* ${sensitiveCatalogPattern}
      )
    `)
    .orderBy(games.name, products.name);

  if (shouldApply && rows.length > 0) {
    const productIds = rows.map((row) => row.productId);
    const referencedRows = await db
      .select({ productId: transactions.productId })
      .from(transactions)
      .where(inArray(transactions.productId, productIds));
    const referencedProductIds = new Set(referencedRows.map((row) => row.productId));
    const productsToDeactivate = productIds.filter((id) => referencedProductIds.has(id));
    const productsToDelete = productIds.filter((id) => !referencedProductIds.has(id));

    if (productsToDeactivate.length > 0) {
      await db
        .update(products)
        .set({ isActive: 0, updatedAt: new Date() })
        .where(inArray(products.id, productsToDeactivate));
    }

    if (productsToDelete.length > 0) {
      await db.delete(products).where(inArray(products.id, productsToDelete));
    }

    const gameIds = Array.from(new Set(rows.map((row) => row.gameId)));
    const remainingProducts = await db
      .select({ gameId: products.gameId })
      .from(products)
      .where(inArray(products.gameId, gameIds));
    const gamesWithProducts = new Set(remainingProducts.map((row) => row.gameId));
    const gamesToDeactivate = gameIds.filter((id) => !gamesWithProducts.has(id));

    if (gamesToDeactivate.length > 0) {
      await db
        .update(games)
        .set({ isActive: 0, updatedAt: new Date() })
        .where(inArray(games.id, gamesToDeactivate));
    }

    console.log(JSON.stringify({
      mode: "apply",
      matched: rows.length,
      productsDeleted: productsToDelete.length,
      productsDeactivated: productsToDeactivate.length,
      gamesDeactivated: gamesToDeactivate.length,
    }, null, 2));
    return;
  }

  console.log(JSON.stringify({
    mode: shouldApply ? "apply" : "dry-run",
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
