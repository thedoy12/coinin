import { drizzle } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";
import { Pool } from "pg";
import { env } from "../lib/env";
import * as schema from "@db/schema";
import * as relations from "@db/relations";

const fullSchema = { ...schema, ...relations };

let instance: ReturnType<typeof drizzle<typeof fullSchema>>;
let runtimeSchemaPromise: Promise<unknown> | null = null;

export function getDb() {
  if (!instance) {
    const pool = new Pool({
      connectionString: env.databaseUrl,
      connectionTimeoutMillis: 5_000,
      idleTimeoutMillis: 30_000,
      max: env.isProduction ? 3 : 10,
    });
    instance = drizzle(pool, {
      schema: fullSchema,
    });
  }
  return instance;
}

export async function ensureRuntimeSchema() {
  runtimeSchemaPromise ??= getDb()
    .execute(sql`alter table "transactions" add column if not exists "paymentCheckoutUrl" varchar(1000)`)
    .catch((error) => {
      runtimeSchemaPromise = null;
      throw error;
    });
  await runtimeSchemaPromise;
}
