import { describe, expect, it } from "vitest";
import { markup } from "./markup";

describe("markup", () => {
  it("uses lean tiered markup for games", () => {
    expect(markup(1900)).toBe(2200);
    expect(markup(10000)).toBe(10300);
    expect(markup(50000)).toBe(51000);
    expect(markup(200000)).toBe(203000);
    expect(markup(500000)).toBe(506000);
    expect(markup(1000000)).toBe(1012000);
    expect(markup(2000000)).toBe(2020000);
  });

  it("keeps digital products tighter than games", () => {
    expect(markup(10000, "digital")).toBe(10200);
    expect(markup(50000, "digital")).toBe(50700);
    expect(markup(100000, "digital")).toBe(101300);
    expect(markup(500000, "digital")).toBe(504000);
  });
});
