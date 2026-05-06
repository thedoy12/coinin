import { createHmac } from "crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

describe("verifyPaymentCallback", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.PAYMENT_SECRET_KEY = "test-private-key";
  });

  it("accepts a valid raw body signature", async () => {
    const { verifyPaymentCallback } = await import("./payment");
    const body = {
      reference: "T500080000000001",
      merchant_ref: "TRX-123",
      status: "PAID",
    };
    const rawBody = JSON.stringify(body);
    const signature = createHmac("sha256", "test-private-key")
      .update(rawBody)
      .digest("hex");

    expect(verifyPaymentCallback(rawBody, signature)).toBe(true);
  });

  it("rejects an invalid signature", async () => {
    const { verifyPaymentCallback } = await import("./payment");
    const rawBody = JSON.stringify({
      reference: "T500080000000001",
      merchant_ref: "TRX-123",
      status: "PAID",
    });

    expect(verifyPaymentCallback(rawBody, "bad-signature")).toBe(false);
  });
});
