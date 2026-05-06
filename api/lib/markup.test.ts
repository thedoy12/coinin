import { describe, expect, it } from "vitest";
import { markup } from "./markup";

describe("markup", () => {
  it("uses flatter markup for games", () => {
    expect(markup(1900)).toBe(2200);
    expect(markup(10000)).toBe(10700);
    expect(markup(50000)).toBe(51200);
  });

  it("keeps digital products tighter", () => {
    expect(markup(10000, "digital")).toBe(10200);
    expect(markup(50000, "digital")).toBe(50500);
    expect(markup(100000, "digital")).toBe(101000);
    expect(markup(500000, "digital")).toBe(501500);
  });
});
