import { afterEach, describe, expect, it, vi } from "vitest";
import { getEffectDefinition } from "@moneymoves/contracts";
import {
  applyEffect,
  fpsFromTimebase,
  frameGateTimingFromTicks,
  getSelectionSummary,
  inspectEffectSelection,
  removeEffect,
  setEffectParameter,
  setPremiereProviderForTesting,
  subscribeToSelectionChanges,
} from "./premiere.js";

afterEach(() => {
  setPremiereProviderForTesting(undefined);
  vi.unstubAllGlobals();
});

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

  it("converts clip timing into Frame Gate render metadata", () => {
    expect(
      frameGateTimingFromTicks("254016000000", "1270080000000", "10160640000"),
    ).toEqual({
      clipStartSeconds: 1,
      sequenceFps: 25,
      totalFrames: 125,
    });
  });
});

describe("Premiere effect transactions", () => {
  it("appends RGB Shift to 20 clips in one undo transaction", async () => {
    const host = createPremiereMock(20);
    setPremiereProviderForTesting(() => host.ppro);

    await expect(
      applyEffect("com.moneymoves.rgb-shift", "RGB Shift"),
    ).resolves.toBe(20);
    expect(host.executeTransaction).toHaveBeenCalledTimes(1);
    expect(host.executeTransaction).toHaveBeenCalledWith(
      expect.any(Function),
      "Apply RGB Shift",
    );
    expect(host.addAction).toHaveBeenCalledTimes(20);
    expect(host.createComponent).toHaveBeenCalledTimes(20);
  });

  it("removes RGB Shift from 20 clips in one undo transaction", async () => {
    const host = createPremiereMock(20, true);
    setPremiereProviderForTesting(() => host.ppro);

    await expect(
      removeEffect("com.moneymoves.rgb-shift", "RGB Shift"),
    ).resolves.toBe(20);
    expect(host.executeTransaction).toHaveBeenCalledTimes(1);
    expect(host.executeTransaction).toHaveBeenCalledWith(
      expect.any(Function),
      "Remove RGB Shift",
    );
    expect(host.addAction).toHaveBeenCalledTimes(20);
  });

  it("applies Frame Gate and clip timing in one undo transaction", async () => {
    const host = createPremiereMock(1);
    setPremiereProviderForTesting(() => host.ppro);

    await expect(
      applyEffect("com.moneymoves.frame-gate", "Frame Gate"),
    ).resolves.toBe(1);
    expect(host.executeTransaction).toHaveBeenCalledTimes(1);
    expect(host.executeTransaction).toHaveBeenCalledWith(
      expect.any(Function),
      "Apply Frame Gate",
    );
    expect(host.addAction).toHaveBeenCalledTimes(4);
  });

  it("reports mixed RGB Shift values across selected clips", async () => {
    const host = createPremiereMock(2, true, [12, 24]);
    setPremiereProviderForTesting(() => host.ppro);
    const rgbShift = getEffectDefinition("com.moneymoves.rgb-shift")!;

    await expect(getSelectionSummary()).resolves.toEqual({
      selectedItems: 2,
      videoClips: 2,
      nonVideoItems: 0,
    });
    const state = await inspectEffectSelection(rgbShift);
    expect(state).toMatchObject({
      selectedClips: 2,
      appliedClips: 2,
      state: "all",
    });
    expect(
      state.parameters.find((parameter) => parameter.key === "amount"),
    ).toMatchObject({
      mixed: true,
      value: undefined,
    });
    expect(
      state.parameters.find((parameter) => parameter.key === "direction"),
    ).toMatchObject({ mixed: false, value: 0 });
  });

  it("sets an effect parameter on every applied selected clip in one undo", async () => {
    const host = createPremiereMock(2, true);
    setPremiereProviderForTesting(() => host.ppro);
    const rgbShift = getEffectDefinition("com.moneymoves.rgb-shift")!;
    const amount = rgbShift.parameters[0]!;

    await expect(setEffectParameter(rgbShift, amount, 42)).resolves.toBe(2);
    expect(host.executeTransaction).toHaveBeenCalledTimes(1);
    expect(host.executeTransaction).toHaveBeenCalledWith(
      expect.any(Function),
      "Set RGB Shift Amount",
    );
    expect(host.addAction).toHaveBeenCalledTimes(2);
  });

  it("cleans up a Premiere selection listener", async () => {
    const host = createPremiereMock(1);
    const addEventListener = vi.fn();
    const removeEventListener = vi.fn();
    (host.ppro as any).EventManager = { addEventListener, removeEventListener };
    (host.ppro as any).Constants = {
      SequenceEvent: { SELECTION_CHANGED: "selectionChanged" },
    };
    setPremiereProviderForTesting(() => host.ppro);
    const listener = vi.fn();

    const unsubscribe = await subscribeToSelectionChanges(listener);
    expect(addEventListener).toHaveBeenCalledWith(
      expect.anything(),
      "selectionChanged",
      listener,
      false,
    );
    unsubscribe();
    expect(removeEventListener).toHaveBeenCalledWith(
      expect.anything(),
      "selectionChanged",
      listener,
      false,
    );
  });
});

function createPremiereMock(
  clipCount: number,
  withAppliedEffect = false,
  amounts: number[] = [],
) {
  const appendAction = Symbol("append");
  const removeAction = Symbol("remove");
  const addAction = vi.fn();
  const parameterAction = Symbol("parameter");

  function createComponentForClip(
    amount = 12,
    matchName = "com.moneymoves.rgb-shift",
  ) {
    const values =
      matchName === "com.moneymoves.frame-gate"
        ? [3, 5, 21, 5, 21, 0, 30, 300]
        : [amount, 0, 1, 0, -1, 1];
    const params = values.map((value) => ({
      getValueAtTime: vi.fn(async () => value),
      isTimeVarying: vi.fn(async () => false),
      areKeyframesSupported: vi.fn(async () => true),
      getKeyframeListAsTickTimes: vi.fn(async () => []),
      createKeyframe: vi.fn((nextValue) => ({ value: nextValue })),
      createSetValueAction: vi.fn(() => parameterAction),
      createAddKeyframeAction: vi.fn(() => parameterAction),
      createSetTimeVaryingAction: vi.fn(() => parameterAction),
      createRemoveKeyframeAction: vi.fn(() => parameterAction),
      createSetInterpolationAtKeyframeAction: vi.fn(() => parameterAction),
      findPreviousKeyframe: vi.fn(async () => undefined),
      findNextKeyframe: vi.fn(async () => undefined),
    }));
    return {
      getMatchName: vi.fn(async () => matchName),
      getParam: vi.fn((index: number) => params[index - 1]),
    };
  }

  const createComponent = vi.fn((matchName: string) =>
    createComponentForClip(12, matchName),
  );

  class VideoClipTrackItem {
    private readonly component: ReturnType<typeof createComponentForClip>;

    private readonly chain: {
      createAppendComponentAction: ReturnType<typeof vi.fn>;
      createRemoveComponentAction: ReturnType<typeof vi.fn>;
      getComponentCount: ReturnType<typeof vi.fn>;
      getComponentAtIndex: ReturnType<typeof vi.fn>;
    };

    constructor(index: number) {
      this.component = createComponentForClip(amounts[index] ?? 12);
      this.chain = {
        createAppendComponentAction: vi.fn(() => appendAction),
        createRemoveComponentAction: vi.fn(() => removeAction),
        getComponentCount: vi.fn(() => (withAppliedEffect ? 1 : 0)),
        getComponentAtIndex: vi.fn(() => this.component),
      };
    }

    getComponentChain = vi.fn(async () => this.chain);
    getStartTime = vi.fn(async () => ({ ticks: "254016000000" }));
    getDuration = vi.fn(async () => ({ ticks: "1270080000000" }));
  }

  const clips = Array.from(
    { length: clipCount },
    (_, index) => new VideoClipTrackItem(index),
  );
  const executeTransaction = vi.fn(
    (callback: (compoundAction: { addAction: typeof addAction }) => void) => {
      callback({ addAction });
      return true;
    },
  );
  const project = {
    getActiveSequence: vi.fn(async () => sequence),
    lockedAccess: vi.fn((callback: () => void) => callback()),
    executeTransaction,
  };
  const sequence = {
    getSelection: vi.fn(async () => ({
      getTrackItems: vi.fn(async () => clips),
    })),
    getPlayerPosition: vi.fn(async () => ({ ticks: "0" })),
    getTimebase: vi.fn(async () => "10160640000"),
  };
  const ppro = {
    Project: { getActiveProject: vi.fn(async () => project) },
    VideoClipTrackItem,
    VideoFilterFactory: { createComponent },
  };

  return { ppro, addAction, createComponent, executeTransaction };
}
