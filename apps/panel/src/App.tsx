import {
  EFFECT_REGISTRY,
  SCHEMA_VERSION,
  brandTokens,
  type AsciiTitleJobRequest,
  type EffectDefinition,
  type EffectParameterDefinition,
  type RenderJob,
} from "@moneymoves/contracts";
import { useEffect, useMemo, useState } from "react";
import {
  applyEffect,
  applyEffectPreset,
  getActiveSequenceFormat,
  getInstalledMoneyMovesEffects,
  getSelectionSummary,
  hostDiagnostics,
  importGeneratedFile,
  inspectEffectSelection,
  navigateKeyframe,
  removeEffect,
  setEffectParameter,
  setKeyframeInterpolation,
  setParameterTimeVarying,
  subscribeToSelectionChanges,
  toggleKeyframeAtPlayhead,
  type EffectParameterState,
  type EffectSelectionState,
  type KeyframeInterpolation,
  type SelectionSummary,
} from "./premiere.js";
import {
  cancelRenderJob,
  getRendererToken,
  rendererHealth,
  setRendererToken,
  submitRenderJob,
  waitForRenderJob,
} from "./renderer.js";
import {
  filterEffects,
  isNativeEffectAvailable,
  selectedVisibleEffect,
} from "./effect-browser.js";
import { getRuntimeInfo } from "./runtime-info.js";

type Notice = { tone: "info" | "success" | "error"; message: string };
type PanelView = "effects" | "generate" | "diagnostics";

const PANEL_EFFECT_KEY = "moneymoves.panel.effect";
const PANEL_VIEW_KEY = "moneymoves.panel.view";
const PANEL_PALETTE_KEY = "moneymoves.panel.palette";

function storedValue(key: string, fallback: string): string {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

function storedPanelView(): PanelView {
  const value = storedValue(PANEL_VIEW_KEY, "effects");
  return value === "generate" || value === "diagnostics" ? value : "effects";
}

function storedEffectMatchName(): string {
  try {
    return localStorage.getItem(PANEL_EFFECT_KEY) ?? "com.moneymoves.rgb-shift";
  } catch {
    return "com.moneymoves.rgb-shift";
  }
}

function persistEffectMatchName(matchName: string): void {
  try {
    localStorage.setItem(PANEL_EFFECT_KEY, matchName);
  } catch {
    // Browser preview or a restricted UXP host can still use the panel.
  }
}

function parameterState(
  state: EffectSelectionState | undefined,
  parameter: EffectParameterDefinition,
): EffectParameterState | undefined {
  return state?.parameters.find((candidate) => candidate.key === parameter.key);
}

function displayValue(
  parameter: EffectParameterDefinition,
  state: EffectParameterState | undefined,
): string | number | boolean {
  return state?.value ?? parameter.defaultValue;
}

function bitCount(
  definition: EffectDefinition,
  parameter: EffectParameterDefinition,
  state: EffectSelectionState | undefined,
): number {
  const fallback = Number(
    definition.parameters.find(
      (candidate) => candidate.key === parameter.bitCountParameter,
    )?.defaultValue ?? 5,
  );
  const lengthParameter = definition.parameters.find(
    (candidate) => candidate.key === parameter.bitCountParameter,
  );
  const counted = lengthParameter
    ? parameterState(state, lengthParameter)
    : undefined;
  return Math.max(1, Math.min(12, Number(counted?.value ?? fallback)));
}

function selectionCopy(selection: SelectionSummary | undefined): string {
  if (!selection || selection.videoClips === 0) return "Select a video clip";
  if (selection.videoClips === 1) return "1 clip selected";
  return `${selection.videoClips} clips selected`;
}

function appliedCopy(state: EffectSelectionState | undefined): string {
  if (!state || state.selectedClips === 0 || state.state === "none") {
    return "Off";
  }
  if (state.state === "all") return "On";
  return `On ${state.appliedClips}/${state.selectedClips}`;
}

interface EffectParameterControlProps {
  definition: EffectDefinition;
  parameter: EffectParameterDefinition;
  effectState: EffectSelectionState | undefined;
  disabled: boolean;
  onSetValue: (
    parameter: EffectParameterDefinition,
    value: string | number | boolean,
  ) => void;
  onToggleAnimation: (
    parameter: EffectParameterDefinition,
    enabled: boolean,
  ) => void;
  onToggleKeyframe: (parameter: EffectParameterDefinition) => void;
  onNavigateKeyframe: (
    parameter: EffectParameterDefinition,
    direction: "previous" | "next",
  ) => void;
  onSetInterpolation: (
    parameter: EffectParameterDefinition,
    interpolation: KeyframeInterpolation,
  ) => void;
}

function EffectParameterControl({
  definition,
  parameter,
  effectState,
  disabled,
  onSetValue,
  onToggleAnimation,
  onToggleKeyframe,
  onNavigateKeyframe,
  onSetInterpolation,
}: EffectParameterControlProps) {
  const state = parameterState(effectState, parameter);
  const value = displayValue(parameter, state);
  const mixed = state?.mixed ?? false;
  const controlDisabled = disabled || !state;

  function toggleBit(index: number): void {
    onSetValue(parameter, Number(value) ^ (1 << index));
  }

  return (
    <div className="parameter">
      <span className="parameter-label">
        {parameter.label}
        {mixed ? <span className="mixed">Mixed</span> : null}
      </span>

      {parameter.type === "select" && (
        <select
          disabled={controlDisabled}
          value={
            mixed
              ? ""
              : (parameter.options?.find(
                  (candidate) => candidate.value === value,
                )?.id ?? String(value))
          }
          onChange={(event) => {
            const option = parameter.options?.find(
              (candidate) => candidate.id === event.target.value,
            );
            if (option) onSetValue(parameter, option.value);
          }}
        >
          {mixed && <option value="">Mixed values</option>}
          {parameter.options?.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      )}

      {parameter.type === "boolean" && (
        <input
          type="checkbox"
          disabled={controlDisabled}
          checked={Boolean(value)}
          onChange={(event) => onSetValue(parameter, event.target.checked)}
        />
      )}

      {parameter.type === "color" && (
        <input
          type="color"
          disabled={controlDisabled}
          value={mixed ? "#000000" : String(value)}
          onChange={(event) => onSetValue(parameter, event.target.value)}
        />
      )}

      {parameter.type === "number" && (
        <span className="number-control">
          <input
            type="range"
            disabled={controlDisabled}
            min={parameter.min}
            max={parameter.max}
            step={parameter.step}
            value={Number(value)}
            onChange={(event) =>
              onSetValue(parameter, Number(event.target.value))
            }
          />
          <input
            type="number"
            disabled={controlDisabled}
            min={parameter.min}
            max={parameter.max}
            step={parameter.step}
            value={mixed ? "" : Number(value)}
            placeholder={mixed ? "Mixed" : undefined}
            onChange={(event) =>
              onSetValue(parameter, Number(event.target.value))
            }
          />
          {parameter.unit ? (
            <span className="unit">{parameter.unit}</span>
          ) : null}
        </span>
      )}

      {parameter.type === "bitmask" && (
        <span className="pattern-control">
          {Array.from(
            { length: bitCount(definition, parameter, effectState) },
            (_, index) => {
              const visible = (Number(value) & (1 << index)) !== 0;
              return (
                <button
                  className={visible ? "frame enabled" : "frame"}
                  disabled={controlDisabled}
                  key={index}
                  onClick={() => toggleBit(index)}
                  type="button"
                >
                  {index + 1}
                </button>
              );
            },
          )}
        </span>
      )}

      {parameter.keyframeable && state ? (
        <span className="keyframe-row">
          <button
            className={
              state.timeVarying ? "animate-button active" : "animate-button"
            }
            disabled={controlDisabled}
            onClick={() => onToggleAnimation(parameter, !state.timeVarying)}
            title={
              state.timeVarying
                ? "Stop animating this parameter"
                : "Enable animation for this parameter"
            }
            type="button"
          >
            <span aria-hidden="true">{state.timeVarying ? "◆" : "◇"}</span>
            {state.timeVarying ? "Animated" : "Animate"}
          </button>
          {state.timeVarying ? (
            <>
              <button
                className="keyframe-button"
                disabled={controlDisabled || state.keyframeCount === 0}
                onClick={() => onNavigateKeyframe(parameter, "previous")}
                title="Go to previous keyframe"
                type="button"
              >
                ‹
              </button>
              <button
                className="keyframe-button keyframe-toggle"
                disabled={controlDisabled}
                onClick={() => onToggleKeyframe(parameter)}
                title="Add or remove a keyframe at the playhead"
                type="button"
              >
                ◆ {state.keyframeCount}
              </button>
              <button
                className="keyframe-button"
                disabled={controlDisabled || state.keyframeCount === 0}
                onClick={() => onNavigateKeyframe(parameter, "next")}
                title="Go to next keyframe"
                type="button"
              >
                ›
              </button>
              <select
                aria-label={`${parameter.label} keyframe interpolation`}
                className="interpolation-select"
                defaultValue="linear"
                disabled={controlDisabled || state.keyframeCount === 0}
                onChange={(event) =>
                  onSetInterpolation(
                    parameter,
                    event.target.value as KeyframeInterpolation,
                  )
                }
                title="Interpolation at the current keyframe"
              >
                <option value="linear">Linear</option>
                <option value="hold">Hold</option>
                <option value="bezier">Bezier</option>
              </select>
            </>
          ) : null}
        </span>
      ) : null}
    </div>
  );
}

export function App() {
  const runtimeInfo = useMemo(() => getRuntimeInfo(), []);
  const [notice, setNotice] = useState<Notice>({
    tone: "info",
    message: "",
  });
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState<PanelView>(storedPanelView);
  const [rendererOnline, setRendererOnline] = useState(false);
  const [jobs, setJobs] = useState<RenderJob[]>([]);
  const [asciiText, setAsciiText] = useState("MONEY MOVES");
  const [asciiFont, setAsciiFont] =
    useState<AsciiTitleJobRequest["font"]>("Standard");
  const [asciiAnimation, setAsciiAnimation] =
    useState<AsciiTitleJobRequest["animation"]>("reveal");
  const [paletteId, setPaletteId] = useState(() =>
    storedValue(PANEL_PALETTE_KEY, "moneymoves-core"),
  );
  const [width, setWidth] = useState(3840);
  const [height, setHeight] = useState(2160);
  const [fps, setFps] = useState(30);
  const [durationSeconds, setDurationSeconds] = useState(3);
  const [sequenceName, setSequenceName] = useState("Manual output");
  const [token, setToken] = useState(getRendererToken);
  const [selectedMatchName, setSelectedMatchName] = useState(
    storedEffectMatchName,
  );
  const [effectQuery, setEffectQuery] = useState("");
  const [installedMatchNames, setInstalledMatchNames] = useState<string[]>([]);
  const [nativeDetection, setNativeDetection] = useState<
    "checking" | "ready" | "error"
  >("checking");
  const [diagnostics, setDiagnostics] = useState<Record<string, string>>({});
  const [selection, setSelection] = useState<SelectionSummary>();
  const [effectStates, setEffectStates] = useState<
    Record<string, EffectSelectionState>
  >({});

  const listedEffects = useMemo(
    () => EFFECT_REGISTRY.filter((effect) => effect.status === "available"),
    [],
  );
  const filteredEffects = useMemo(() => {
    return filterEffects(listedEffects, effectQuery);
  }, [effectQuery, listedEffects]);
  const selectedEffect = selectedVisibleEffect(
    filteredEffects,
    selectedMatchName,
  );
  const selectedIsInstalled = selectedEffect
    ? isNativeEffectAvailable(selectedEffect, installedMatchNames)
    : false;
  const selectedState = selectedEffect
    ? effectStates[selectedEffect.matchName]
    : undefined;
  const selectedIsOn =
    selectedState?.state === "all" || selectedState?.state === "some";

  useEffect(() => {
    if (selectedEffect) persistEffectMatchName(selectedEffect.matchName);
  }, [selectedEffect]);

  useEffect(() => {
    try {
      localStorage.setItem(PANEL_VIEW_KEY, view);
      localStorage.setItem(PANEL_PALETTE_KEY, paletteId);
    } catch {
      // Persistence is optional in restricted previews.
    }
  }, [view, paletteId]);

  useEffect(() => {
    let cancelled = false;
    void rendererHealth().then((online) => {
      if (!cancelled) setRendererOnline(online);
    });
    void getActiveSequenceFormat()
      .then((format) => {
        if (cancelled) return;
        setWidth(format.width);
        setHeight(format.height);
        setFps(format.fps);
        setSequenceName(format.name);
      })
      .catch(() => undefined);
    void hostDiagnostics().then((details) => {
      if (!cancelled) setDiagnostics(details);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    let lastSelectionSignature = "";
    async function refresh(): Promise<void> {
      try {
        const [nextSelection, detection] = await Promise.all([
          getSelectionSummary().catch(() => undefined),
          getInstalledMoneyMovesEffects()
            .then((names) => ({ names, failed: false }))
            .catch(() => ({ names: [] as string[], failed: true })),
        ]);
        if (cancelled) return;
        const installed = detection.names;
        setSelection(nextSelection);
        lastSelectionSignature = nextSelection
          ? `${nextSelection.selectedItems}:${nextSelection.videoClips}:${nextSelection.nonVideoItems}`
          : "unavailable";
        setInstalledMatchNames(installed);
        setNativeDetection(detection.failed ? "error" : "ready");
        const listed = EFFECT_REGISTRY.filter(
          (effect) =>
            effect.status === "available" &&
            installed.includes(effect.matchName),
        );
        const nextStates = await Promise.all(
          listed.map(async (effect) => {
            try {
              return [
                effect.matchName,
                await inspectEffectSelection(effect),
              ] as const;
            } catch {
              return [
                effect.matchName,
                {
                  selectedClips: 0,
                  appliedClips: 0,
                  state: "none" as const,
                  parameters: [],
                },
              ] as const;
            }
          }),
        );
        if (cancelled) return;
        setEffectStates(Object.fromEntries(nextStates));
      } catch {
        if (cancelled) return;
        setSelection(undefined);
        setNativeDetection("error");
      }
    }
    void refresh();
    let unsubscribe: () => void = () => undefined;
    void subscribeToSelectionChanges(() => void refresh()).then(
      (nextUnsubscribe) => {
        if (cancelled) nextUnsubscribe();
        else unsubscribe = nextUnsubscribe;
      },
    );
    const pollSelection = window.setInterval(() => {
      void getSelectionSummary()
        .then((nextSelection) => {
          if (cancelled) return;
          const signature = `${nextSelection.selectedItems}:${nextSelection.videoClips}:${nextSelection.nonVideoItems}`;
          if (signature !== lastSelectionSignature) void refresh();
          else setSelection(nextSelection);
        })
        .catch(() => undefined);
    }, 1200);
    return () => {
      cancelled = true;
      window.clearInterval(pollSelection);
      unsubscribe();
    };
  }, []);

  async function run(action: () => Promise<void>): Promise<void> {
    setBusy(true);
    try {
      await action();
    } catch (error) {
      setNotice({
        tone: "error",
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setBusy(false);
    }
  }

  async function refreshStates(): Promise<void> {
    const nextSelection = await getSelectionSummary();
    setSelection(nextSelection);
    const nextStates = await Promise.all(
      listedEffects
        .filter((effect) =>
          isNativeEffectAvailable(effect, installedMatchNames),
        )
        .map(async (effect) => {
          try {
            return [
              effect.matchName,
              await inspectEffectSelection(effect),
            ] as const;
          } catch {
            return [
              effect.matchName,
              {
                selectedClips: 0,
                appliedClips: 0,
                state: "none" as const,
                parameters: [],
              },
            ] as const;
          }
        }),
    );
    setEffectStates(Object.fromEntries(nextStates));
  }

  function applyNamed(effect: EffectDefinition): void {
    setSelectedMatchName(effect.matchName);
    if (!isNativeEffectAvailable(effect, installedMatchNames)) {
      setNotice({
        tone: "error",
        message: `${effect.name} is not detected by Premiere. Reinstall the native effects, then restart Premiere.`,
      });
      return;
    }
    if (!selection?.videoClips) {
      setNotice({ tone: "info", message: "Select a video clip first." });
      return;
    }
    void run(async () => {
      const count = await applyEffect(effect.matchName, effect.name);
      await refreshStates();
      setNotice({
        tone: "success",
        message: `${effect.name} on ${count} clip${count === 1 ? "" : "s"}.`,
      });
    });
  }

  function chooseEffect(effect: EffectDefinition): void {
    setSelectedMatchName(effect.matchName);
  }

  function removeSelected(effect: EffectDefinition): void {
    void run(async () => {
      const count = await removeEffect(effect.matchName, effect.name);
      await refreshStates();
      setNotice({
        tone: "success",
        message: `Removed ${effect.name} from ${count} clip${count === 1 ? "" : "s"}.`,
      });
    });
  }

  async function syncOutputToSequence(): Promise<void> {
    const format = await getActiveSequenceFormat();
    setWidth(format.width);
    setHeight(format.height);
    setFps(format.fps);
    setSequenceName(format.name);
    setNotice({
      tone: "success",
      message: `Output matched ${format.name}: ${format.width}×${format.height} at ${format.fps} fps.`,
    });
  }

  async function refreshDiagnostics(): Promise<void> {
    try {
      const [installed, details, online] = await Promise.all([
        getInstalledMoneyMovesEffects(),
        hostDiagnostics(),
        rendererHealth(),
      ]);
      setInstalledMatchNames(installed);
      setNativeDetection("ready");
      setDiagnostics(details);
      setRendererOnline(online);
    } catch (error) {
      setNativeDetection("error");
      throw error;
    }
  }

  async function renderAsciiTitle(): Promise<void> {
    const created = await submitRenderJob({
      schemaVersion: SCHEMA_VERSION,
      kind: "ascii-title",
      text: asciiText.trim(),
      font: asciiFont,
      animation: asciiAnimation,
      paletteId,
      width,
      height,
      fps,
      durationSeconds,
      outputName:
        asciiAnimation === "static"
          ? "moneymoves-ascii.png"
          : "moneymoves-ascii.mov",
    });
    setJobs((current) => [created, ...current]);
    const completed = await waitForRenderJob(created, (updated) => {
      setJobs((current) => [
        updated,
        ...current.filter((job) => job.id !== updated.id),
      ]);
    });
    if (!completed.outputPath) {
      throw new Error("ASCII renderer completed without an output file.");
    }
    await importGeneratedFile(completed.outputPath);
    setNotice({
      tone: "success",
      message: `ASCII title imported: ${completed.outputPath}`,
    });
  }

  return (
    <main className="app-shell">
      <header className="masthead">
        <div>
          <p className="eyebrow">MONEYMOVES</p>
          <h1>
            {view === "effects"
              ? "Effects"
              : view === "generate"
                ? "Generate"
                : "Diagnostics"}
          </h1>
        </div>
        {view === "effects" ? (
          <div className="selection-tools">
            <span
              className={
                selection?.videoClips
                  ? "selection-pill ready"
                  : "selection-pill"
              }
            >
              <span className="selection-dot" />
              {selectionCopy(selection)}
            </span>
            <button
              aria-label="Refresh timeline selection"
              className="selection-refresh"
              uxp-variant="action"
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  await refreshStates();
                  setNotice({ tone: "info", message: "" });
                })
              }
              title="Refresh timeline selection"
              type="button"
            >
              ↻
            </button>
          </div>
        ) : (
          <p className="selection-state">
            {rendererOnline ? "Renderer online" : "Renderer offline"}
          </p>
        )}
      </header>

      <nav className="workspace-nav" aria-label="MoneyMoves workspace">
        <button
          className={view === "effects" ? "active" : "quiet"}
          uxp-variant="action"
          onClick={() => setView("effects")}
          type="button"
        >
          Effects
        </button>
        <button
          className={view === "generate" ? "active" : "quiet"}
          uxp-variant="action"
          onClick={() => setView("generate")}
          type="button"
        >
          Generate
        </button>
        <button
          className={view === "diagnostics" ? "active" : "quiet"}
          uxp-variant="action"
          onClick={() => setView("diagnostics")}
          type="button"
        >
          Diagnostics
        </button>
      </nav>

      {notice.message ? (
        <p className={`notice ${notice.tone}`}>{notice.message}</p>
      ) : null}

      {view === "effects" ? (
        <section className="effects-workspace">
          {listedEffects.length === 0 ? (
            <p className="empty-state">
              No MoneyMoves effects are listed yet. Open a Premiere project,
              then try Apply on a selected clip.
            </p>
          ) : (
            <>
              <div className="effect-search">
                <span aria-hidden="true">⌕</span>
                <input
                  aria-label="Search effects"
                  placeholder="Search effects"
                  type="search"
                  value={effectQuery}
                  onChange={(event) => setEffectQuery(event.target.value)}
                />
                <span className="effect-count">{filteredEffects.length}</span>
              </div>

              {nativeDetection === "checking" ? (
                <p className="notice">Checking native effects in Premiere…</p>
              ) : null}
              {nativeDetection === "error" ? (
                <p className="notice error">
                  The panel could not check Premiere's native effects. Restart
                  Premiere, then reopen MoneyMoves Toolkit.
                </p>
              ) : null}
              {nativeDetection === "ready" &&
              installedMatchNames.length === 0 ? (
                <p className="notice error">
                  Premiere has not reported any MoneyMoves native effects. The
                  library is shown for reference, but Apply is unavailable.
                  Install the native bundles and restart Premiere.
                </p>
              ) : null}

              {!selection?.videoClips ? (
                <div className="selection-help">
                  <span className="selection-help-icon">1</span>
                  <div>
                    <strong>Select one or more video clips</strong>
                    <p>
                      Choose clips in the timeline, then press refresh if the
                      panel does not update immediately.
                    </p>
                  </div>
                </div>
              ) : null}

              <div className="effect-layout">
                <aside className="effect-browser" aria-label="Effect library">
                  {filteredEffects.map((effect) => {
                    const state = effectStates[effect.matchName];
                    const isSelected =
                      effect.matchName === selectedEffect?.matchName;
                    const isOn =
                      state?.state === "all" || state?.state === "some";
                    const installed = isNativeEffectAvailable(
                      effect,
                      installedMatchNames,
                    );
                    return (
                      <button
                        className={
                          isSelected
                            ? "effect-list-item selected"
                            : "effect-list-item"
                        }
                        uxp-variant="action"
                        disabled={busy}
                        onClick={() => chooseEffect(effect)}
                        key={effect.matchName}
                        type="button"
                      >
                        <span className={isOn ? "state-dot on" : "state-dot"} />
                        <span className="effect-list-copy">
                          <strong>{effect.name}</strong>
                          <small>{effect.category}</small>
                        </span>
                        <span
                          className={
                            installed
                              ? isOn
                                ? "mini-status on"
                                : "mini-status"
                              : nativeDetection === "ready"
                                ? "mini-status missing"
                                : "mini-status"
                          }
                        >
                          {installed
                            ? appliedCopy(state)
                            : nativeDetection === "checking"
                              ? "Checking"
                              : nativeDetection === "error"
                                ? "Unknown"
                                : "Missing"}
                        </span>
                      </button>
                    );
                  })}
                  {filteredEffects.length === 0 ? (
                    <p className="no-results">No matching effects.</p>
                  ) : null}
                </aside>

                {selectedEffect ? (
                  <article className="effect-inspector">
                    <header className="inspector-heading">
                      <div>
                        <span className="category-label">
                          {selectedEffect.category}
                        </span>
                        <h2>{selectedEffect.name}</h2>
                        <p>{selectedEffect.description}</p>
                      </div>
                      <span
                        className={
                          !selectedIsInstalled && nativeDetection === "ready"
                            ? "status-chip missing"
                            : selectedIsOn
                              ? "status-chip on"
                              : "status-chip"
                        }
                      >
                        {selectedIsInstalled
                          ? appliedCopy(selectedState)
                          : nativeDetection === "checking"
                            ? "Checking"
                            : nativeDetection === "error"
                              ? "Unknown"
                              : "Not installed"}
                      </span>
                    </header>

                    <div className="inspector-actions">
                      {selectedIsInstalled && selectedIsOn ? (
                        <button
                          className="button-danger"
                          disabled={busy}
                          onClick={() => removeSelected(selectedEffect)}
                          type="button"
                        >
                          Remove from selection
                        </button>
                      ) : (
                        <button
                          className="button-primary"
                          disabled={
                            busy ||
                            !selection?.videoClips ||
                            !selectedIsInstalled
                          }
                          onClick={() => applyNamed(selectedEffect)}
                          type="button"
                        >
                          Apply to {selection?.videoClips ?? 0} clip
                          {selection?.videoClips === 1 ? "" : "s"}
                        </button>
                      )}
                      {selectedIsInstalled &&
                      selectedState?.state === "some" ? (
                        <button
                          className="button-secondary"
                          disabled={busy}
                          onClick={() => applyNamed(selectedEffect)}
                          type="button"
                        >
                          Apply to missing clips
                        </button>
                      ) : null}
                    </div>

                    {!selectedIsInstalled && nativeDetection === "ready" ? (
                      <p className="inspector-missing">
                        Premiere does not report this native effect. Reinstall
                        the MoneyMoves native bundles and restart Premiere.
                      </p>
                    ) : null}

                    {selectedIsInstalled &&
                    selectedIsOn &&
                    selectedEffect.parameters.length > 0 ? (
                      <div className="effect-editor">
                        {selectedEffect.presets.length > 0 ? (
                          <section className="inspector-section">
                            <h3>Presets</h3>
                            <div className="preset-row">
                              {selectedEffect.presets.map((preset) => (
                                <button
                                  className="preset-button"
                                  disabled={busy}
                                  key={preset.id}
                                  onClick={() =>
                                    void run(async () => {
                                      await applyEffectPreset(preset);
                                      await refreshStates();
                                      setNotice({
                                        tone: "success",
                                        message: `${preset.name} applied.`,
                                      });
                                    })
                                  }
                                  type="button"
                                >
                                  {preset.name}
                                </button>
                              ))}
                            </div>
                          </section>
                        ) : null}
                        <section className="inspector-section">
                          <h3>Controls</h3>
                          {selectedEffect.parameters.map((parameter) => (
                            <EffectParameterControl
                              definition={selectedEffect}
                              disabled={busy}
                              effectState={selectedState}
                              key={parameter.key}
                              parameter={parameter}
                              onSetValue={(nextParameter, value) =>
                                void run(async () => {
                                  await setEffectParameter(
                                    selectedEffect,
                                    nextParameter,
                                    value,
                                  );
                                  await refreshStates();
                                  setNotice({ tone: "info", message: "" });
                                })
                              }
                              onToggleAnimation={(nextParameter, enabled) =>
                                void run(async () => {
                                  await setParameterTimeVarying(
                                    selectedEffect,
                                    nextParameter,
                                    enabled,
                                  );
                                  await refreshStates();
                                  setNotice({
                                    tone: "success",
                                    message: enabled
                                      ? `${nextParameter.label} animation enabled.`
                                      : `${nextParameter.label} animation disabled.`,
                                  });
                                })
                              }
                              onToggleKeyframe={(nextParameter) =>
                                void run(async () => {
                                  const result = await toggleKeyframeAtPlayhead(
                                    selectedEffect,
                                    nextParameter,
                                  );
                                  await refreshStates();
                                  setNotice({
                                    tone: "success",
                                    message: `${nextParameter.label} keyframe ${result}.`,
                                  });
                                })
                              }
                              onNavigateKeyframe={(nextParameter, direction) =>
                                void run(async () => {
                                  const moved = await navigateKeyframe(
                                    selectedEffect,
                                    nextParameter,
                                    direction,
                                  );
                                  setNotice({
                                    tone: moved ? "info" : "error",
                                    message: moved
                                      ? ""
                                      : `No ${direction} ${nextParameter.label} keyframe.`,
                                  });
                                })
                              }
                              onSetInterpolation={(
                                nextParameter,
                                interpolation,
                              ) =>
                                void run(async () => {
                                  await setKeyframeInterpolation(
                                    selectedEffect,
                                    nextParameter,
                                    interpolation,
                                  );
                                  setNotice({
                                    tone: "success",
                                    message: `${nextParameter.label} keyframe set to ${interpolation}.`,
                                  });
                                })
                              }
                            />
                          ))}
                        </section>
                      </div>
                    ) : selectedIsInstalled ? (
                      <div className="inspector-empty">
                        <span aria-hidden="true">＋</span>
                        <p>
                          Apply this effect to unlock its presets and controls.
                        </p>
                      </div>
                    ) : null}
                  </article>
                ) : null}
              </div>
            </>
          )}
        </section>
      ) : view === "generate" ? (
        <div className="generate-workspace">
          <section className="generator-card">
            <div className="section-heading">
              <div>
                <p className="eyebrow">ASCII TITLE</p>
                <h2>Text to transparent media</h2>
              </div>
              <span className={rendererOnline ? "status on" : "status off"}>
                {rendererOnline ? "Online" : "Offline"}
              </span>
            </div>

            <label className="field">
              <span>Text</span>
              <textarea
                maxLength={160}
                value={asciiText}
                onChange={(event) => setAsciiText(event.target.value)}
              />
            </label>

            <div className="field-grid">
              <label className="field">
                <span>FIGlet style</span>
                <select
                  value={asciiFont}
                  onChange={(event) =>
                    setAsciiFont(
                      event.target.value as AsciiTitleJobRequest["font"],
                    )
                  }
                >
                  {(
                    ["Standard", "Slant", "Big", "Small", "Block"] as const
                  ).map((font) => (
                    <option key={font} value={font}>
                      {font}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Animation</span>
                <select
                  value={asciiAnimation}
                  onChange={(event) =>
                    setAsciiAnimation(
                      event.target.value as AsciiTitleJobRequest["animation"],
                    )
                  }
                >
                  {(["static", "reveal", "flicker", "scramble"] as const).map(
                    (animation) => (
                      <option key={animation} value={animation}>
                        {animation}
                      </option>
                    ),
                  )}
                </select>
              </label>
            </div>

            <label className="field">
              <span>Palette</span>
              <select
                value={paletteId}
                onChange={(event) => setPaletteId(event.target.value)}
              >
                {brandTokens.palettes.map((palette) => (
                  <option key={palette.id} value={palette.id}>
                    {palette.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="swatches">
              {brandTokens.palettes
                .find((palette) => palette.id === paletteId)
                ?.colors.map((color) => (
                  <span key={color} style={{ backgroundColor: color }} />
                ))}
            </div>

            <div className="field-grid output-grid">
              <label className="field">
                <span>Width</span>
                <input
                  max={7680}
                  min={320}
                  type="number"
                  value={width}
                  onChange={(event) => setWidth(Number(event.target.value))}
                />
              </label>
              <label className="field">
                <span>Height</span>
                <input
                  max={4320}
                  min={180}
                  type="number"
                  value={height}
                  onChange={(event) => setHeight(Number(event.target.value))}
                />
              </label>
              <label className="field">
                <span>FPS</span>
                <input
                  max={120}
                  min={1}
                  step={0.001}
                  type="number"
                  value={fps}
                  onChange={(event) => setFps(Number(event.target.value))}
                />
              </label>
              <label className="field">
                <span>Seconds</span>
                <input
                  max={60}
                  min={0.1}
                  step={0.1}
                  type="number"
                  value={durationSeconds}
                  onChange={(event) =>
                    setDurationSeconds(Number(event.target.value))
                  }
                />
              </label>
            </div>

            <div className="generator-actions">
              <button
                className="quiet"
                disabled={busy}
                onClick={() => void run(syncOutputToSequence)}
                type="button"
              >
                Match active sequence
              </button>
              <span className="hint">{sequenceName}</span>
              <button
                disabled={
                  busy || !rendererOnline || asciiText.trim().length === 0
                }
                onClick={() => void run(renderAsciiTitle)}
                type="button"
              >
                Render &amp; Import
              </button>
            </div>
          </section>

          <section className="generator-card">
            <p className="eyebrow">RENDERER CONNECTION</p>
            <label className="field">
              <span>Local renderer token</span>
              <input
                type="password"
                value={token}
                onChange={(event) => setToken(event.target.value)}
              />
            </label>
            <button
              className="quiet"
              onClick={() => {
                setRendererToken(token);
                void rendererHealth().then(setRendererOnline);
              }}
              type="button"
            >
              Save &amp; reconnect
            </button>
          </section>

          {jobs.length > 0 ? (
            <section className="generator-card">
              <p className="eyebrow">RENDER QUEUE</p>
              {jobs.map((job) => (
                <div className="job" key={job.id}>
                  <span>{job.kind}</span>
                  <span>{job.state}</span>
                  <span>{Math.round(job.progress * 100)}%</span>
                  {job.state === "queued" || job.state === "running" ? (
                    <button
                      className="quiet"
                      onClick={() => void cancelRenderJob(job.id)}
                      type="button"
                    >
                      Cancel
                    </button>
                  ) : null}
                </div>
              ))}
            </section>
          ) : null}
        </div>
      ) : (
        <div className="diagnostics-workspace">
          <section className="generator-card">
            <div className="section-heading">
              <div>
                <p className="eyebrow">HOST STATUS</p>
                <h2>Installation health</h2>
              </div>
              <button
                className="quiet"
                disabled={busy}
                onClick={() => void run(refreshDiagnostics)}
                type="button"
              >
                Refresh
              </button>
            </div>
            <div className="diagnostic-row">
              <span>Panel</span>
              <strong>{runtimeInfo.panelVersion}</strong>
            </div>
            <div className="diagnostic-row">
              <span>Host</span>
              <strong>{runtimeInfo.host}</strong>
            </div>
            <div className="diagnostic-row">
              <span>UXP</span>
              <strong>{runtimeInfo.uxpVersion}</strong>
            </div>
            <div className="diagnostic-row">
              <span>Platform</span>
              <strong>{runtimeInfo.platform}</strong>
            </div>
            <div className="diagnostic-row">
              <span>Project</span>
              <strong>{diagnostics.project ?? "Checking…"}</strong>
            </div>
            <div className="diagnostic-row">
              <span>Sequence</span>
              <strong>{diagnostics.sequence ?? "Checking…"}</strong>
            </div>
            <div className="diagnostic-row">
              <span>Native effects</span>
              <strong>
                {nativeDetection === "checking"
                  ? "Checking…"
                  : nativeDetection === "error"
                    ? "Detection failed"
                    : `${installedMatchNames.length}/${listedEffects.length} detected`}
              </strong>
            </div>
            <div className="diagnostic-row">
              <span>Local renderer</span>
              <strong>{rendererOnline ? "Online" : "Offline"}</strong>
            </div>
            {nativeDetection === "ready" &&
            installedMatchNames.length < listedEffects.length ? (
              <p className="diagnostic-warning">
                Some native effects are missing. Reinstall the MoneyMoves
                bundles and restart Premiere before applying them.
              </p>
            ) : null}
          </section>
          <section className="generator-card">
            <p className="eyebrow">DETECTED EFFECTS</p>
            {installedMatchNames.length > 0 ? (
              <p className="diagnostic-names">
                {installedMatchNames.join(" · ")}
              </p>
            ) : (
              <p className="hint">No native match names reported yet.</p>
            )}
          </section>
          <section className="generator-card">
            <p className="eyebrow">PHASE 0 HOST CHECKS</p>
            <p className="hint">
              Still to verify in Premiere: one-step Undo for a 20-clip apply and
              removal, CPU/Metal image agreement, and transparent ProRes import
              through AME export. Automated tests do not close these host
              checks.
            </p>
          </section>
        </div>
      )}
    </main>
  );
}
