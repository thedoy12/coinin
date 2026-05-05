import { eq } from "drizzle-orm";
import { games } from "../db/schema";
import { getDb } from "../api/queries/connection";

async function main() {
  const db = getDb();
  const rows = await db
    .select({
      name: games.name,
      slug: games.slug,
      category: games.category,
    })
    .from(games)
    .where(eq(games.isActive, 1))
    .orderBy(games.name);

  console.table(rows);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
