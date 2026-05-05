import { eq, or } from "drizzle-orm";
import * as schema from "@db/schema";
import type { InsertUser } from "@db/schema";
import { getDb } from "./connection";
import { env } from "../lib/env";

export async function findUserByUnionId(unionId: string) {
  const rows = await getDb()
    .select()
    .from(schema.users)
    .where(eq(schema.users.unionId, unionId))
    .limit(1);
  return rows.at(0);
}

export async function findUserByLogin(login: string) {
  const normalized = login.trim().toLowerCase();
  const rows = await getDb()
    .select()
    .from(schema.users)
    .where(
      or(
        eq(schema.users.username, normalized),
        eq(schema.users.email, normalized)
      )
    )
    .limit(1);
  return rows.at(0);
}

export async function upsertUser(data: InsertUser) {
  const values = { ...data };

  if (
    values.role === undefined &&
    values.unionId &&
    values.unionId === env.ownerUnionId
  ) {
    values.role = "admin";
  }

  // For PostgreSQL, use INSERT with ON CONFLICT
  const updateSet: Partial<InsertUser> = {
    lastSignInAt: new Date(),
    ...data,
  };

  if (values.role !== undefined) {
    updateSet.role = values.role;
  }

  // Perform upsert by checking if user exists and update/insert accordingly
  const existing = await findUserByUnionId(values.unionId!);
  
  if (existing) {
    // Update existing user
    await getDb()
      .update(schema.users)
      .set(updateSet)
      .where(eq(schema.users.unionId, values.unionId!));
  } else {
    // Insert new user
    await getDb()
      .insert(schema.users)
      .values(values);
  }
}
