import { createHash } from "crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

describe("verifyPaymentCallback", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.PAYMENT_SECRET_KEY = "test-secret";
  });

  it("accepts a valid raw body signature", async () => {
    const { verifyPaymentCallback } = await import("./payment");
    const body = {
      order_id: "TRX-123",
      transaction_status: "settlement",
      status_code: "200",
      gross_amount: "10000.00",
    };
    const rawBody = JSON.stringify(body);
    const signature = createHash("sha512")
      .update(`${body.order_id}${body.status_code}${body.gross_amount}test-secret`)
      .digest("hex");

    expect(verifyPaymentCallback(rawBody, signature)).toBe(true);
  });

  it("rejects an invalid signature", async () => {
    const { verifyPaymentCallback } = await import("./payment");
    const rawBody = JSON.stringify({
      order_id: "TRX-123",
      transaction_status: "settlement",
      status_code: "200",
      gross_amount: "10000.00",
    });

    expect(verifyPaymentCallback(rawBody, "bad-signature")).toBe(false);
  });
});
