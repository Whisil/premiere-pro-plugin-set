import { describe, expect, it } from "vitest";
import { EFFECT_REGISTRY } from "@moneymoves/contracts";
import {
  filterEffects,
  isNativeEffectAvailable,
  selectedVisibleEffect,
} from "./effect-browser.js";

const installed = EFFECT_REGISTRY.filter(
  (effect) => effect.status === "available",
);

describe("effect browser", () => {
  it("filters the visible list by name", () => {
    const visible = filterEffects(installed, "ASCII");
    expect(visible.map((effect) => effect.name)).toEqual(["ASCII"]);
  });

  it("shows the filtered result in the inspector", () => {
    const visible = filterEffects(installed, "ASCII");
    expect(
      selectedVisibleEffect(visible, "com.moneymoves.rgb-shift")?.name,
    ).toBe("ASCII");
  });

  it("does not show an unrelated inspector for no results", () => {
    expect(
      selectedVisibleEffect(
        filterEffects(installed, "not an effect"),
        "com.moneymoves.rgb-shift",
      ),
    ).toBeUndefined();
  });

  it("does not treat the registry as proof that native effects are installed", () => {
    const rgbShift = installed.find(
      (effect) => effect.matchName === "com.moneymoves.rgb-shift",
    )!;
    expect(isNativeEffectAvailable(rgbShift, [])).toBe(false);
    expect(
      isNativeEffectAvailable(rgbShift, ["com.moneymoves.frame-gate"]),
    ).toBe(false);
    expect(isNativeEffectAvailable(rgbShift, [rgbShift.matchName])).toBe(true);
  });
});
