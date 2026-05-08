import { describe, expect, it } from "vitest";
import { catalogMarkup, markup } from "./markup";

describe("markup", () => {
  it("uses lean tiered markup for games", () => {
    expect(markup(1900)).toBe(2200);
    expect(markup(10000)).toBe(10300);
    expect(markup(50000)).toBe(51000);
    expect(markup(200000)).toBe(202400);
    expect(markup(500000)).toBe(504000);
    expect(markup(1000000)).toBe(1006000);
    expect(markup(2000000)).toBe(2010000);
  });

  it("keeps digital products tighter than games", () => {
    expect(markup(10000, "digital")).toBe(10200);
    expect(markup(50000, "digital")).toBe(50700);
    expect(markup(100000, "digital")).toBe(101300);
    expect(markup(500000, "digital")).toBe(502000);
  });

  it("uses a slightly stronger game markup for Point Blank", () => {
    expect(catalogMarkup(9700, "game", "Point Blank")).toBe(10200);
    expect(catalogMarkup(48500, "game", "Point Blank")).toBe(50000);
    expect(catalogMarkup(485000, "game", "Point Blank")).toBe(490900);
  });
});
