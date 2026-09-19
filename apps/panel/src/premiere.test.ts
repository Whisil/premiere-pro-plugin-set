import { describe, expect, it } from "vitest";
import { fpsFromTimebase } from "./premiere.js";

describe("Premiere sequence timebase conversion", () => {
  it.each([
    ["10594584000", 23.976],
    ["10160640000", 25],
    ["8475667200", 29.97],
    ["8467200000", 30],
    ["4233600000", 60],
  ])("converts %s ticks per frame to %s fps", (timebase, fps) => {
    expect(fpsFromTimebase(timebase)).toBe(fps);
  });

  it("rejects malformed timebases", () => {
    expect(() => fpsFromTimebase("0")).toThrow(/invalid sequence timebase/);
    expect(() => fpsFromTimebase("not-a-number")).toThrow(
      /invalid sequence timebase/,
    );
  });
});
