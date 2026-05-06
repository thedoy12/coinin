import { describe, expect, it } from "vitest";
import { markup } from "./markup";

describe("markup", () => {
  it("uses tiered markup for games with stronger high-price margins", () => {
    expect(markup(1900)).toBe(2600);
    expect(markup(10000)).toBe(10700);
    expect(markup(50000)).toBe(52000);
    expect(markup(200000)).toBe(207000);
    expect(markup(500000)).toBe(515000);
    expect(markup(1000000)).toBe(1030000);
    expect(markup(2000000)).toBe(2050000);
  });

  it("keeps digital products tighter than games", () => {
    expect(markup(10000, "digital")).toBe(10500);
    expect(markup(50000, "digital")).toBe(51300);
    expect(markup(100000, "digital")).toBe(102500);
    expect(markup(500000, "digital")).toBe(510000);
  });
});
