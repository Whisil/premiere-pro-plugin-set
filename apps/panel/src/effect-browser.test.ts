import { describe, expect, it } from "vitest";
import { EFFECT_REGISTRY } from "@moneymoves/contracts";
import {
  isNativeEffectAvailable,
  nextExpandedEffect,
} from "./effect-browser.js";

const installed = EFFECT_REGISTRY.filter(
  (effect) => effect.status === "available",
);

describe("effect browser", () => {
  it("opens one effect and closes it when clicked again", () => {
    expect(nextExpandedEffect(undefined, "com.moneymoves.rgb-shift")).toBe(
      "com.moneymoves.rgb-shift",
    );
    expect(
      nextExpandedEffect(
        "com.moneymoves.rgb-shift",
        "com.moneymoves.rgb-shift",
      ),
    ).toBeUndefined();
    expect(
      nextExpandedEffect(
        "com.moneymoves.rgb-shift",
        "com.moneymoves.frame-gate",
      ),
    ).toBe("com.moneymoves.frame-gate");
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
