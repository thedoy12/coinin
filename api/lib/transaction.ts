import { products, transactions } from "@db/schema";
import { and, eq, inArray, lt } from "drizzle-orm";
import { getDb } from "../queries/connection";
import { checkPaymentStatus } from "./payment";
import { checkTopupStatus, placeTopupOrder } from "./topup";

type FulfillResult =
  | { success: true; referenceId: string; topupReference?: string | null }
  | { success: false; referenceId: string; error: string };

export async function fulfillPaidTransaction(
  referenceId: string,
  options: { force?: boolean } = {},
): Promise<FulfillResult> {
  const db = getDb();
  const result = await db
    .select({ transaction: transactions, product: products })
    .from(transactions)
    .innerJoin(products, eq(transactions.productId, products.id))
    .where(eq(transactions.referenceId, referenceId))
    .limit(1);

  if (!result[0]) {
    return { success: false, referenceId, error: "Transaction not found" };
  }

  const { transaction: tx, product } = result[0];
  if (tx.status === "success" && tx.topupStatus === "success") {
    return { success: true, referenceId, topupReference: tx.topupReference };
  }
  if (!options.force && tx.status === "processing" && tx.topupStatus === "processing") {
    return { success: true, referenceId, topupReference: tx.topupReference };
  }
  if (options.force && tx.paymentStatus !== "paid") {
    return { success: false, referenceId, error: "Payment is not paid yet" };
  }

  const locked = await db
    .update(transactions)
    .set({
      paymentStatus: "paid",
      status: "processing",
      topupStatus: "processing",
      paidAt: tx.paidAt ?? new Date(),
      updatedAt: new Date(),
      lastError: null,
    })
    .where(
      and(
        eq(transactions.referenceId, referenceId),
        inArray(
          transactions.status,
          options.force ? ["pending", "processing", "failed"] : ["pending", "failed"]
        )
      )
    )
    .returning({ referenceId: transactions.referenceId });

  if (!locked.length) {
    return { success: false, referenceId, error: "Transaction is not retryable" };
  }

  const topupResult = await placeTopupOrder({
    providerCode: product.providerCode,
    userIdGame: tx.userIdGame,
    zoneId: tx.zoneId || undefined,
    referenceId: tx.referenceId,
  });

  if (topupResult.success) {
    const topupReference = extractTopupReference(topupResult.data);
    const topupStatus = extractTopupStatus(topupResult.data);
    if (topupStatus === "failed") {
      await db
        .update(transactions)
        .set({
          topupStatus: "failed",
          topupReference,
          topupResponse: JSON.stringify(topupResult.data),
          status: "failed",
          retryCount: tx.retryCount + 1,
          updatedAt: new Date(),
          lastError: "Top-up failed",
        })
        .where(eq(transactions.referenceId, referenceId));
      return { success: false, referenceId, error: "Top-up failed" };
    }

    if (topupStatus === "processing") {
      await db
        .update(transactions)
        .set({
          topupStatus: "processing",
          topupReference,
          topupResponse: JSON.stringify(topupResult.data),
          status: "processing",
          updatedAt: new Date(),
          lastError: null,
        })
        .where(eq(transactions.referenceId, referenceId));
      return { success: true, referenceId, topupReference };
    }

    await db
      .update(transactions)
      .set({
        topupStatus: "success",
        topupReference,
        topupResponse: JSON.stringify(topupResult.data),
        status: "success",
        completedAt: new Date(),
        updatedAt: new Date(),
        lastError: null,
      })
      .where(eq(transactions.referenceId, referenceId));
    return { success: true, referenceId, topupReference };
  }

  const errorMessage = topupResult.error || "Top-up failed";
  await db
    .update(transactions)
    .set({
      topupStatus: "failed",
      topupResponse: JSON.stringify(topupResult.error),
      status: "failed",
      retryCount: tx.retryCount + 1,
      lastError: errorMessage,
      updatedAt: new Date(),
    })
    .where(eq(transactions.referenceId, referenceId));

  return { success: false, referenceId, error: errorMessage };
}

export async function syncPaymentAndFulfill(referenceId: string) {
  const txResult = await getDb()
    .select({ paymentReference: transactions.paymentReference })
    .from(transactions)
    .where(eq(transactions.referenceId, referenceId))
    .limit(1);
  const providerReference = txResult[0]?.paymentReference || referenceId;
  const payment = await checkPaymentStatus(providerReference);
  if (!payment.success) return payment;

  const status = extractPaymentStatus(payment.data);
  if (status === "PAID") {
    const result = await fulfillPaidTransaction(referenceId);
    return result.success
      ? { success: true, data: payment.data }
      : { success: false, error: result.error };
  }

  if (status === "EXPIRED" || status === "FAILED") {
    await getDb()
      .update(transactions)
      .set({
        paymentStatus: status === "EXPIRED" ? "expired" : "failed",
        status: "failed",
        updatedAt: new Date(),
        lastError: `Payment ${status.toLowerCase()}`,
      })
      .where(eq(transactions.referenceId, referenceId));
  }

  return { success: true, data: payment.data };
}

export async function expireOldTransactions(now = new Date()) {
  const db = getDb();
  const expired = await db
    .update(transactions)
    .set({
      paymentStatus: "expired",
      status: "failed",
      lastError: "Payment expired",
      updatedAt: now,
    })
    .where(
      and(
        lt(transactions.expiresAt, now),
        inArray(transactions.paymentStatus, ["unpaid", "pending"])
      )
    )
    .returning({ referenceId: transactions.referenceId });

  return expired;
}

export async function syncProcessingTopups(limit = 50) {
  const db = getDb();
  const rows = await db
    .select()
    .from(transactions)
    .where(
      and(
        eq(transactions.paymentStatus, "paid"),
        eq(transactions.topupStatus, "processing")
      )
    )
    .limit(limit);

  const results: Array<{ referenceId: string; status: string; error?: string }> = [];
  for (const tx of rows) {
    const response = await checkTopupStatus(tx.referenceId);
    if (!response.success) {
      results.push({
        referenceId: tx.referenceId,
        status: "error",
        error: response.error,
      });
      continue;
    }

    const topupStatus = extractTopupStatus(response.data);
    const update: Partial<typeof transactions.$inferInsert> = {
      topupStatus,
      topupResponse: JSON.stringify(response.data),
      updatedAt: new Date(),
    };
    if (topupStatus === "success") {
      update.status = "success";
      update.completedAt = new Date();
      update.lastError = null;
    } else if (topupStatus === "failed") {
      update.status = "failed";
      update.retryCount = tx.retryCount + 1;
      update.lastError = "Top-up failed";
    } else {
      update.status = "processing";
      update.lastError = null;
    }

    await db
      .update(transactions)
      .set(update)
      .where(eq(transactions.referenceId, tx.referenceId));
    results.push({ referenceId: tx.referenceId, status: topupStatus });
  }

  return results;
}

function extractTopupReference(data: unknown) {
  if (typeof data !== "object" || data === null) return null;
  const root = data as {
    data?: { trxid?: unknown; reference?: unknown; order_id?: unknown };
  };
  const ref = root.data?.trxid ?? root.data?.reference ?? root.data?.order_id;
  return typeof ref === "string" ? ref : null;
}

function extractPaymentStatus(data: unknown) {
  if (typeof data !== "object" || data === null) return "";
  const root = data as { status?: unknown; transaction_status?: unknown; fraud_status?: unknown };
  if (typeof root.transaction_status === "string") {
    const status = root.transaction_status.toLowerCase();
    const fraudStatus = typeof root.fraud_status === "string"
      ? root.fraud_status.toLowerCase()
      : "";
    if (status === "settlement" || (status === "capture" && fraudStatus === "accept")) {
      return "PAID";
    }
    if (status === "pending") return "PENDING";
    if (status === "expire") return "EXPIRED";
    return "FAILED";
  }
  return typeof root.status === "string" ? root.status.toUpperCase() : "";
}

function extractTopupStatus(data: unknown) {
  if (typeof data !== "object" || data === null) return "success";
  const root = data as {
    status?: unknown;
    data?: { status?: unknown };
  };
  const raw = root.data?.status ?? root.status;
  if (typeof raw !== "string") return "success";
  const value = raw.toLowerCase();
  if (["success", "sukses", "berhasil", "completed", "complete"].includes(value)) {
    return "success";
  }
  if (["failed", "gagal", "error", "cancelled", "canceled"].includes(value)) {
    return "failed";
  }
  return "processing";
}
