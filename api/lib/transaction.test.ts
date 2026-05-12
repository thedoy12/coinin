import { describe, expect, it } from "vitest";
import { extractPaymentStatus } from "./transaction";

describe("extractPaymentStatus", () => {
  it("treats UNPAID status messages as pending", () => {
    expect(extractPaymentStatus({ message: "Status transaksi saat ini UNPAID" })).toBe("PENDING");
  });

  it("treats PAID status messages as paid", () => {
    expect(extractPaymentStatus({ message: "Status transaksi saat ini PAID" })).toBe("PAID");
  });
});
