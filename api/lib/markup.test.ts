import { describe, expect, it } from "vitest";
import { markup } from "./markup";

describe("markup", () => {
  it("uses tiered markup for games with stronger high-price margins", () => {
    expect(markup(1900)).toBe(2500);
    expect(markup(10000)).toBe(10600);
    expect(markup(50000)).toBe(51800);
    expect(markup(200000)).toBe(206000);
    expect(markup(500000)).toBe(512500);
    expect(markup(1000000)).toBe(1025000);
    expect(markup(2000000)).toBe(2040000);
  });

  it("keeps digital products tighter than games", () => {
    expect(markup(10000, "digital")).toBe(10400);
    expect(markup(50000, "digital")).toBe(51200);
    expect(markup(100000, "digital")).toBe(102300);
    expect(markup(500000, "digital")).toBe(508000);
  });
});
