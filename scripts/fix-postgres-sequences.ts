import "dotenv/config";
import pg from "pg";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

const client = new pg.Client({ connectionString: databaseUrl });

await client.connect();
try {
  await client.query(`
    SELECT setval(
      pg_get_serial_sequence('"games"', 'id'),
      COALESCE((SELECT MAX("id") FROM "games"), 1),
      (SELECT COUNT(*) > 0 FROM "games")
    );
    SELECT setval(
      pg_get_serial_sequence('"products"', 'id'),
      COALESCE((SELECT MAX("id") FROM "products"), 1),
      (SELECT COUNT(*) > 0 FROM "products")
    );
    SELECT setval(
      pg_get_serial_sequence('"users"', 'id'),
      COALESCE((SELECT MAX("id") FROM "users"), 1),
      (SELECT COUNT(*) > 0 FROM "users")
    );
    SELECT setval(
      pg_get_serial_sequence('"transactions"', 'id'),
      COALESCE((SELECT MAX("id") FROM "transactions"), 1),
      (SELECT COUNT(*) > 0 FROM "transactions")
    );
  `);
  console.log("Postgres sequences fixed.");
} finally {
  await client.end();
}
