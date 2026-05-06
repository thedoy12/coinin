import { describe, expect, it } from "vitest";
import { markup } from "./markup";

describe("markup", () => {
  it("uses percentage markup for games with floor and cap", () => {
    expect(markup(1900)).toBe(2300);
    expect(markup(10000)).toBe(10400);
    expect(markup(50000)).toBe(52000);
    expect(markup(500000)).toBe(503000);
  });

  it("keeps digital products tighter with floor and cap", () => {
    expect(markup(10000, "digital")).toBe(10300);
    expect(markup(50000, "digital")).toBe(51300);
    expect(markup(100000, "digital")).toBe(101800);
    expect(markup(500000, "digital")).toBe(501800);
  });
});
