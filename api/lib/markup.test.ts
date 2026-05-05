import { describe, expect, it } from "vitest";
import { markup } from "./markup";

describe("markup", () => {
  it("uses percentage markup from 2% to 5%", () => {
    expect(markup(10000)).toBe(10500);
    expect(markup(50000)).toBe(52000);
    expect(markup(100000)).toBe(103000);
  });

  it("uses lower percentage markup for higher value products", () => {
    expect(markup(200000)).toBe(204000);
    expect(markup(500000)).toBe(510000);
  });
});
