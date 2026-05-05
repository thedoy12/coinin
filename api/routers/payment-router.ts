import { z } from "zod";
import { createRouter, publicQuery } from "../middleware";
import { getDb } from "../queries/connection";
import { games, products, transactions } from "@db/schema";
import { eq } from "drizzle-orm";
import { createQrisPayment } from "../lib/payment";
import { TRPCError } from "@trpc/server";

const referenceIdInput = z.string().trim().regex(/^TRX-[A-Z0-9_-]{8,32}$/);
const phoneInput = z
  .string()
  .trim()
  .min(8)
  .max(20)
  .regex(/^\+?[0-9][0-9\s-]{6,18}[0-9]$/, "Nomor WhatsApp tidak valid");

export const paymentRouter = createRouter({
  createQris: publicQuery
    .input(
      z.object({
        referenceId: referenceIdInput,
        customerName: z.string().trim().min(1).max(255),
        customerEmail: z.string().trim().email(),
        customerPhone: phoneInput,
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();

      const transactionResult = await db
        .select({
          transaction: transactions,
          game: games,
          product: products,
        })
        .from(transactions)
        .where(eq(transactions.referenceId, input.referenceId))
        .innerJoin(games, eq(transactions.gameId, games.id))
        .innerJoin(products, eq(transactions.productId, products.id))
        .limit(1);

      if (!transactionResult[0]) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Transaksi tidak ditemukan",
        });
      }

      const { transaction: tx, game, product } = transactionResult[0];
      if (tx.paymentStatus === "paid" || tx.status === "success") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Transaksi sudah dibayar",
        });
      }
      if (tx.expiresAt && tx.expiresAt.getTime() < Date.now()) {
        await db
          .update(transactions)
          .set({
            paymentStatus: "expired",
            status: "failed",
            lastError: "Payment expired",
            updatedAt: new Date(),
          })
          .where(eq(transactions.referenceId, input.referenceId));
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Transaksi sudah kadaluarsa. Silakan buat order baru.",
        });
      }

      const paymentResult = await createQrisPayment({
        referenceId: input.referenceId,
        amount: tx.price,
        customerName: input.customerName,
        customerEmail: input.customerEmail.toLowerCase(),
        customerPhone: normalizePhone(input.customerPhone),
        items: [
          {
            name: `${game.name} - ${product.name}`,
            price: tx.price,
            quantity: 1,
          },
        ],
      });

      if (paymentResult.success && paymentResult.data) {
        await db
          .update(transactions)
          .set({
            customerName: input.customerName,
            customerEmail: input.customerEmail.toLowerCase(),
            customerPhone: normalizePhone(input.customerPhone),
            paymentMethod: "Midtrans",
            paymentReference: paymentResult.data.reference,
            paymentStatus: "pending",
            expiresAt: new Date(Date.now() + 60 * 60 * 1000),
            updatedAt: new Date(),
          })
          .where(eq(transactions.referenceId, input.referenceId));
      }

      return paymentResult;
    }),
});

function normalizePhone(value: string) {
  return value.replace(/[\s-]/g, "");
}
