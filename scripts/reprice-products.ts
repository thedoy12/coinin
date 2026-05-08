import { eq } from "drizzle-orm";
import { games, products } from "../db/schema";
import { getDb } from "../api/queries/connection";
import { catalogMarkup } from "../api/lib/markup";

const db = getDb();

const rows = await db
  .select({
    productId: products.id,
    productName: products.name,
    gameName: games.name,
    gameCategory: games.category,
    priceModal: products.priceModal,
    priceSell: products.priceSell,
  })
  .from(products)
  .innerJoin(games, eq(products.gameId, games.id));

let changed = 0;
let lowered = 0;
let raised = 0;

for (const row of rows) {
  const category = row.gameCategory === "Digital" ? "digital" : "game";
  const nextPriceSell = catalogMarkup(row.priceModal, category, row.gameName);

  if (nextPriceSell === row.priceSell) continue;

  await db
    .update(products)
    .set({ priceSell: nextPriceSell, updatedAt: new Date() })
    .where(eq(products.id, row.productId));

  changed += 1;
  if (nextPriceSell < row.priceSell) lowered += 1;
  if (nextPriceSell > row.priceSell) raised += 1;
}

console.log(
  `Repriced ${changed} of ${rows.length} products. Lowered: ${lowered}. Raised: ${raised}.`,
);
