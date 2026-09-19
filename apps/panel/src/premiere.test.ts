import { afterEach, describe, expect, it, vi } from "vitest";
import {
  applyEffect,
  fpsFromTimebase,
  removeEffect,
  setPremiereProviderForTesting,
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
});

function createPremiereMock(clipCount: number, withAppliedEffect = false) {
  const appendAction = Symbol("append");
  const removeAction = Symbol("remove");
  const addAction = vi.fn();
  const createComponent = vi.fn(() => ({ getParam: vi.fn() }));

  class VideoClipTrackItem {
    private readonly component = {
      getMatchName: vi.fn(async () => "com.moneymoves.rgb-shift"),
    };

    private readonly chain = {
      createAppendComponentAction: vi.fn(() => appendAction),
      createRemoveComponentAction: vi.fn(() => removeAction),
      getComponentCount: vi.fn(() => (withAppliedEffect ? 1 : 0)),
      getComponentAtIndex: vi.fn(() => this.component),
    };

    getComponentChain = vi.fn(async () => this.chain);
  }

  const clips = Array.from(
    { length: clipCount },
    () => new VideoClipTrackItem(),
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
  };
  const ppro = {
    Project: { getActiveProject: vi.fn(async () => project) },
    VideoClipTrackItem,
    VideoFilterFactory: { createComponent },
  };

  return { ppro, addAction, createComponent, executeTransaction };
}
