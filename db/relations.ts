import { relations } from "drizzle-orm";
import { auditLogs, users, games, products, providerApiLogs, transactions } from "./schema";

export const usersRelations = relations(users, ({ many }) => ({
  auditLogs: many(auditLogs),
}));

export const gamesRelations = relations(games, ({ many }) => ({
  products: many(products),
  transactions: many(transactions),
}));

export const productsRelations = relations(products, ({ one }) => ({
  game: one(games, {
    fields: [products.gameId],
    references: [games.id],
  }),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  game: one(games, {
    fields: [transactions.gameId],
    references: [games.id],
  }),
  product: one(products, {
    fields: [transactions.productId],
    references: [products.id],
  }),
}));

export const providerApiLogsRelations = relations(providerApiLogs, ({ one }) => ({
  transaction: one(transactions, {
    fields: [providerApiLogs.referenceId],
    references: [transactions.referenceId],
  }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  actor: one(users, {
    fields: [auditLogs.actorUserId],
    references: [users.id],
  }),
}));
