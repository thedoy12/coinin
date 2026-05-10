import {
  pgTable,
  serial,
  varchar,
  text,
  timestamp,
  integer,
  index,
  uniqueIndex,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  unionId: varchar("unionId", { length: 255 }).notNull().unique(),
  username: varchar("username", { length: 100 }).unique(),
  name: varchar("name", { length: 255 }),
  email: varchar("email", { length: 320 }),
  avatar: text("avatar"),
  passwordHash: text("passwordHash"),
  authProvider: varchar("authProvider", { length: 30 }).default("local").notNull(),
  role: varchar("role", { length: 20 }).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
  lastSignInAt: timestamp("lastSignInAt").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const games = pgTable("games", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  thumbnail: varchar("thumbnail", { length: 500 }),
  category: varchar("category", { length: 100 }),
  instructions: text("instructions"),
  requiresZoneId: integer("requiresZoneId").default(0).notNull(),
  isActive: integer("isActive").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export type Game = typeof games.$inferSelect;
export type InsertGame = typeof games.$inferInsert;

export const products = pgTable(
  "products",
  {
    id: serial("id").primaryKey(),
    gameId: integer("gameId")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    providerCode: varchar("providerCode", { length: 100 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    productType: varchar("productType", { length: 20 }).default("general").notNull(),
    priceModal: integer("priceModal").notNull(),
    priceSell: integer("priceSell").notNull(),
    isActive: integer("isActive").default(1).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt")
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("gameId_idx").on(table.gameId),
    uniqueIndex("products_game_provider_unique").on(
      table.gameId,
      table.providerCode
    ),
  ]
);

export type Product = typeof products.$inferSelect;
export type InsertProduct = typeof products.$inferInsert;

export const transactions = pgTable(
  "transactions",
  {
    id: serial("id").primaryKey(),
    referenceId: varchar("referenceId", { length: 100 }).notNull().unique(),
    gameId: integer("gameId")
      .notNull()
      .references(() => games.id, { onDelete: "restrict" }),
    productId: integer("productId")
      .notNull()
      .references(() => products.id, { onDelete: "restrict" }),
    userIdGame: varchar("userIdGame", { length: 255 }).notNull(),
    zoneId: varchar("zoneId", { length: 100 }),
    customerName: varchar("customerName", { length: 255 }),
    customerEmail: varchar("customerEmail", { length: 320 }),
    customerPhone: varchar("customerPhone", { length: 20 }),
    price: integer("price").notNull(),
    status: varchar("status", { length: 50 }).default("pending").notNull(),
    paymentStatus: varchar("paymentStatus", { length: 50 }).default("unpaid").notNull(),
    paymentMethod: varchar("paymentMethod", { length: 50 }),
    paymentReference: varchar("paymentReference", { length: 255 }),
    paymentCheckoutUrl: varchar("paymentCheckoutUrl", { length: 1000 }),
    topupStatus: varchar("topupStatus", { length: 50 }),
    topupReference: varchar("topupReference", { length: 255 }),
    topupResponse: text("topupResponse"),
    retryCount: integer("retryCount").default(0).notNull(),
    lastError: text("lastError"),
    expiresAt: timestamp("expiresAt"),
    paidAt: timestamp("paidAt"),
    completedAt: timestamp("completedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt")
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    index("referenceId_idx").on(table.referenceId),
    index("status_idx").on(table.status),
    check(
      "transactions_status_check",
      sql`${table.status} in ('pending', 'processing', 'success', 'failed')`
    ),
    check(
      "transactions_payment_status_check",
      sql`${table.paymentStatus} in ('unpaid', 'pending', 'paid', 'expired', 'failed')`
    ),
  ]
);

export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = typeof transactions.$inferInsert;

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: serial("id").primaryKey(),
    actorUserId: integer("actorUserId").references(() => users.id, {
      onDelete: "set null",
    }),
    action: varchar("action", { length: 100 }).notNull(),
    entityType: varchar("entityType", { length: 50 }).notNull(),
    entityId: varchar("entityId", { length: 100 }).notNull(),
    before: text("before"),
    after: text("after"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [
    index("audit_entity_idx").on(table.entityType, table.entityId),
    index("audit_actor_idx").on(table.actorUserId),
  ]
);

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;

export const providerApiLogs = pgTable(
  "provider_api_logs",
  {
    id: serial("id").primaryKey(),
    provider: varchar("provider", { length: 50 }).notNull(),
    referenceId: varchar("referenceId", { length: 100 }),
    method: varchar("method", { length: 10 }).notNull(),
    endpoint: varchar("endpoint", { length: 255 }).notNull(),
    requestPayload: text("requestPayload"),
    responsePayload: text("responsePayload"),
    statusCode: integer("statusCode"),
    success: integer("success").default(0).notNull(),
    error: text("error"),
    durationMs: integer("durationMs").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [
    index("provider_api_logs_provider_idx").on(table.provider),
    index("provider_api_logs_reference_idx").on(table.referenceId),
    index("provider_api_logs_created_idx").on(table.createdAt),
  ]
);

export type ProviderApiLog = typeof providerApiLogs.$inferSelect;
export type InsertProviderApiLog = typeof providerApiLogs.$inferInsert;

export const popupSettings = pgTable("popup_settings", {
  id: serial("id").primaryKey(),
  isActive: integer("isActive").default(0).notNull(),
  title: varchar("title", { length: 120 }).default("").notNull(),
  description: text("description").default("").notNull(),
  imageUrl: varchar("imageUrl", { length: 500 }),
  buttonText: varchar("buttonText", { length: 60 }).default("Lihat Promo").notNull(),
  buttonUrl: varchar("buttonUrl", { length: 500 }).default("#game-store").notNull(),
  displayDelayMs: integer("displayDelayMs").default(1200).notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export type PopupSettings = typeof popupSettings.$inferSelect;
export type InsertPopupSettings = typeof popupSettings.$inferInsert;
