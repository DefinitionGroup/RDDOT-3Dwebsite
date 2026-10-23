import { describe, expect, it } from "vitest";
import { arrowTarget, tabTarget } from "./keyboard";

describe("arrowTarget", () => {
  it("moves through a row and wraps at both ends", () => {
    expect(arrowTarget("ArrowRight", 0, 3)).toBe(1);
    expect(arrowTarget("ArrowDown", 2, 3)).toBe(0);
    expect(arrowTarget("ArrowLeft", 0, 3)).toBe(2);
    expect(arrowTarget("ArrowUp", 1, 3)).toBe(0);
    expect(arrowTarget("Home", 2, 3)).toBe(0);
    expect(arrowTarget("End", 0, 3)).toBe(2);
  });

  it("leaves other keys and empty rows alone", () => {
    expect(arrowTarget("Tab", 0, 3)).toBeNull();
    expect(arrowTarget("Enter", 0, 3)).toBeNull();
    expect(arrowTarget("ArrowRight", 0, 0)).toBeNull();
  });
});

describe("tabTarget", () => {
  it("wraps past the last and before the first element", () => {
    expect(tabTarget(2, 3, false)).toBe(0);
    expect(tabTarget(0, 3, true)).toBe(2);
  });

  it("lets the browser move between neighbours", () => {
    expect(tabTarget(0, 3, false)).toBeNull();
    expect(tabTarget(2, 3, true)).toBeNull();
  });

  it("pulls focus back in from outside the dialog", () => {
    expect(tabTarget(-1, 3, false)).toBe(0);
    expect(tabTarget(-1, 3, true)).toBe(2);
    expect(tabTarget(-1, 0, false)).toBeNull();
  });
});
