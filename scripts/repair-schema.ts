import "dotenv/config";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const statements = [
  `ALTER TABLE "games" ADD COLUMN IF NOT EXISTS "instructions" text`,
  `ALTER TABLE "games" ADD COLUMN IF NOT EXISTS "requiresZoneId" integer DEFAULT 0 NOT NULL`,
  `ALTER TABLE "games" ADD COLUMN IF NOT EXISTS "isActive" integer DEFAULT 1 NOT NULL`,
  `ALTER TABLE "games" ADD COLUMN IF NOT EXISTS "updatedAt" timestamp DEFAULT now() NOT NULL`,
  `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "isActive" integer DEFAULT 1 NOT NULL`,
  `ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "updatedAt" timestamp DEFAULT now() NOT NULL`,
  `ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "customerName" varchar(255)`,
  `ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "customerEmail" varchar(320)`,
  `ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "customerPhone" varchar(20)`,
  `ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "retryCount" integer DEFAULT 0 NOT NULL`,
  `ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "lastError" text`,
  `ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "expiresAt" timestamp`,
  `ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "paidAt" timestamp`,
  `ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "completedAt" timestamp`,
  `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "username" varchar(100)`,
  `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "passwordHash" text`,
  `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "authProvider" varchar(30) DEFAULT 'kimi' NOT NULL`,
  `CREATE TABLE IF NOT EXISTS "audit_logs" (
    "id" serial PRIMARY KEY NOT NULL,
    "actorUserId" integer,
    "action" varchar(100) NOT NULL,
    "entityType" varchar(50) NOT NULL,
    "entityId" varchar(100) NOT NULL,
    "before" text,
    "after" text,
    "createdAt" timestamp DEFAULT now() NOT NULL
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "users_username_unique" ON "users" ("username")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "products_game_provider_unique" ON "products" ("gameId", "providerCode")`,
  `CREATE INDEX IF NOT EXISTS "audit_entity_idx" ON "audit_logs" ("entityType", "entityId")`,
  `CREATE INDEX IF NOT EXISTS "audit_actor_idx" ON "audit_logs" ("actorUserId")`,
];

async function main() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const statement of statements) {
      await client.query(statement);
    }
    await client.query("COMMIT");
    console.log("Schema repair complete.");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error(error);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();
