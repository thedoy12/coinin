import { and, eq } from "drizzle-orm";
import { games, products } from "../db/schema";
import { getDb } from "../api/queries/connection";

async function main() {
  const db = getDb();
  const rows = await db.select().from(games);
  const secondGames = rows.filter((game) => /\s+(second|2nd)\b/i.test(game.name));
  let renamed = 0;
  let merged = 0;
  let movedProducts = 0;
  let skippedProducts = 0;

  for (const game of secondGames) {
    const cleanName = cleanServiceName(game.name);
    const cleanSlug = normalizeSlug(cleanName);
    const target = rows.find((item) => item.slug === cleanSlug && item.id !== game.id);

    if (!target) {
      await db
        .update(games)
        .set({
          name: cleanName,
          slug: cleanSlug,
          instructions: cleanInstructions(game.instructions, cleanName),
          updatedAt: new Date(),
        })
        .where(eq(games.id, game.id));
      renamed += 1;
      continue;
    }

    const sourceProducts = await db
      .select()
      .from(products)
      .where(eq(products.gameId, game.id));
    for (const product of sourceProducts) {
      const existingTargetProduct = await db
        .select()
        .from(products)
        .where(and(
          eq(products.gameId, target.id),
          eq(products.providerCode, product.providerCode),
        ))
        .limit(1);

      if (existingTargetProduct[0]) {
        await db
          .update(products)
          .set({
            name: cleanServiceName(product.name),
            priceModal: product.priceModal,
            priceSell: product.priceSell,
            isActive: product.isActive,
            updatedAt: new Date(),
          })
          .where(eq(products.id, existingTargetProduct[0].id));
        await db
          .update(products)
          .set({ isActive: 0, updatedAt: new Date() })
          .where(eq(products.id, product.id));
        skippedProducts += 1;
      } else {
        await db
          .update(products)
          .set({
            gameId: target.id,
            name: cleanServiceName(product.name),
            updatedAt: new Date(),
          })
          .where(eq(products.id, product.id));
        movedProducts += 1;
      }
    }

    await db
      .update(games)
      .set({ isActive: 0, updatedAt: new Date() })
      .where(eq(games.id, game.id));
    merged += 1;
  }

  console.table({
    secondGames: secondGames.length,
    renamed,
    merged,
    movedProducts,
    skippedProducts,
  });
  process.exit(0);
}

function cleanServiceName(value: string) {
  return value
    .replace(/\s+(second|2nd)\b/gi, "")
    .replace(/\s+powered by google play\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function cleanInstructions(value: string | null, cleanName: string) {
  if (!value) return null;
  return cleanServiceName(value).replace(/User ID .+ dengan benar\./, `User ID ${cleanName} dengan benar.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
