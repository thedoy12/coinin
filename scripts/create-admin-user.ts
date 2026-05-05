import "dotenv/config";
import { eq, or } from "drizzle-orm";
import { users } from "../db/schema";
import { hashPassword } from "../api/lib/password";
import { getDb } from "../api/queries/connection";

const username = required("ADMIN_USERNAME").trim().toLowerCase();
const email = required("ADMIN_EMAIL").trim().toLowerCase();
const password = required("ADMIN_PASSWORD");
const name = process.env.ADMIN_NAME?.trim() || "CoinIn Admin";

if (password.length < 8) {
  throw new Error("ADMIN_PASSWORD must be at least 8 characters");
}

const db = getDb();
const existing = await db
  .select()
  .from(users)
  .where(or(eq(users.username, username), eq(users.email, email)))
  .limit(1);

if (existing[0]) {
  await db
    .update(users)
    .set({
      username,
      email,
      name,
      passwordHash: hashPassword(password),
      authProvider: "local",
      role: "admin",
      updatedAt: new Date(),
    })
    .where(eq(users.id, existing[0].id));
  console.log(`Updated admin user: ${username}`);
} else {
  await db.insert(users).values({
    unionId: `local:${username}`,
    username,
    email,
    name,
    passwordHash: hashPassword(password),
    authProvider: "local",
    role: "admin",
    lastSignInAt: new Date(),
  });
  console.log(`Created admin user: ${username}`);
}

process.exit(0);

function required(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}
