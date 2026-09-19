import {
  EFFECT_REGISTRY,
  FRAME_GATE_PRESETS,
  SCHEMA_VERSION,
  brandTokens,
  type AsciiTitleJobRequest,
  type EffectDefinition,
  type EffectParameterDefinition,
  type MapJobRequest,
  type RenderJob,
} from "@moneymoves/contracts";
import { useEffect, useMemo, useState } from "react";
import {
  applyEffect,
  applyEffectPreset,
  chooseAndInsertMogrt,
  getActiveSequenceFormat,
  getInstalledMoneyMovesEffects,
  getSelectionSummary,
  hostDiagnostics,
  importGeneratedFile,
  inspectEffectSelection,
  navigateKeyframe,
  removeEffect,
  setEffectParameter,
  setEffectParameters,
  setKeyframeInterpolation,
  setParameterTimeVarying,
  subscribeToSelectionChanges,
  toggleKeyframeAtPlayhead,
  type EffectParameterState,
  type EffectSelectionState,
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

type Notice = { tone: "info" | "success" | "error"; message: string };
type PanelView = "home" | "effects" | "generate" | "diagnostics";

const PANEL_VIEW_KEY = "moneymoves.panel.view";
const PANEL_EFFECT_KEY = "moneymoves.panel.effect";
const PANEL_PALETTE_KEY = "moneymoves.panel.palette";

function storedValue<T extends string>(key: string, fallback: T): T {
  try {
    return (localStorage.getItem(key) as T | null) ?? fallback;
  } catch {
    return fallback;
  }
}

function persistValue(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // A browser preview or restricted UXP build can still use the panel.
  }
}

function stateLabel(state: EffectSelectionState | undefined): string {
  if (!state || state.selectedClips === 0) return "Select video clips";
  if (state.state === "all")
    return `On all ${state.selectedClips} selected clips`;
  if (state.state === "some") {
    return `On ${state.appliedClips} of ${state.selectedClips} selected clips`;
  }
  return "Not applied";
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

interface EffectParameterControlProps {
  definition: EffectDefinition;
  parameter: EffectParameterDefinition;
  state: EffectParameterState | undefined;
  disabled: boolean;
  onSetValue: (
    parameter: EffectParameterDefinition,
    value: string | number | boolean,
  ) => void;
  onSetTimeVarying: (
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
    interpolation: number,
  ) => void;
}

function EffectParameterControl({
  definition,
  parameter,
  state,
  disabled,
  onSetValue,
  onSetTimeVarying,
  onToggleKeyframe,
  onNavigateKeyframe,
  onSetInterpolation,
}: EffectParameterControlProps) {
  const value = displayValue(parameter, state);
  const mixed = state?.mixed ?? false;
  const controlDisabled = disabled || !state;

  function toggleBit(index: number): void {
    const current = Number(value);
    onSetValue(parameter, current ^ (1 << index));
  }

  return (
    <div className="parameter-control">
      <div className="parameter-heading">
        <label htmlFor={`${definition.id}-${parameter.key}`}>
          {parameter.label}
        </label>
        {mixed && <span className="mixed">Mixed</span>}
      </div>

      {parameter.type === "select" && (
        <select
          id={`${definition.id}-${parameter.key}`}
          disabled={controlDisabled}
          value={mixed ? "" : String(value)}
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
        <label className="check compact">
          <input
            id={`${definition.id}-${parameter.key}`}
            type="checkbox"
            disabled={controlDisabled}
            checked={Boolean(value)}
            onChange={(event) => onSetValue(parameter, event.target.checked)}
          />
          Enabled
        </label>
      )}

      {parameter.type === "color" && (
        <input
          id={`${definition.id}-${parameter.key}`}
          type="color"
          disabled={controlDisabled}
          value={mixed ? "#000000" : String(value)}
          onChange={(event) => onSetValue(parameter, event.target.value)}
        />
      )}

      {parameter.type === "number" && (
        <div className="number-control">
          <input
            id={`${definition.id}-${parameter.key}`}
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
            aria-label={`${parameter.label} value`}
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
          {parameter.unit && <span className="unit">{parameter.unit}</span>}
        </div>
      )}

      {parameter.type === "bitmask" && (
        <div className="pattern-control" aria-label={parameter.label}>
          {Array.from(
            {
              length: Math.max(
                1,
                Math.min(
                  12,
                  Number(
                    definition.parameters.find(
                      (candidate) =>
                        candidate.key === parameter.bitCountParameter,
                    )?.defaultValue ?? 5,
                  ),
                ),
              ),
            },
            (_, index) => {
              const visible = (Number(value) & (1 << index)) !== 0;
              return (
                <button
                  className={visible ? "frame enabled" : "frame"}
                  disabled={controlDisabled}
                  key={index}
                  onClick={() => toggleBit(index)}
                  title={`Frame ${index + 1}: ${visible ? "visible" : "transparent"}`}
                  type="button"
                >
                  {index + 1}
                </button>
              );
            },
          )}
        </div>
      )}

      {parameter.keyframeable && (
        <div className="keyframe-controls">
          <label className="check compact">
            <input
              type="checkbox"
              disabled={controlDisabled}
              checked={state?.timeVarying ?? false}
              onChange={(event) =>
                onSetTimeVarying(parameter, event.target.checked)
              }
            />
            Animate
          </label>
          <button
            className="quiet"
            disabled={controlDisabled || !state?.timeVarying}
            onClick={() => onToggleKeyframe(parameter)}
            type="button"
          >
            Key
          </button>
          <button
            aria-label={`Previous ${parameter.label} keyframe`}
            className="quiet icon-button"
            disabled={controlDisabled || !state?.keyframeCount}
            onClick={() => onNavigateKeyframe(parameter, "previous")}
            type="button"
          >
            ‹
          </button>
          <button
            aria-label={`Next ${parameter.label} keyframe`}
            className="quiet icon-button"
            disabled={controlDisabled || !state?.keyframeCount}
            onClick={() => onNavigateKeyframe(parameter, "next")}
            type="button"
          >
            ›
          </button>
          <select
            aria-label={`${parameter.label} interpolation`}
            disabled={controlDisabled || !state?.keyframeCount}
            defaultValue="0"
            onChange={(event) =>
              onSetInterpolation(parameter, Number(event.target.value))
            }
          >
            <option value="0">Linear</option>
            <option value="1">Hold</option>
          </select>
        </div>
      )}
    </div>
  );
}

export function App() {
  const [notice, setNotice] = useState<Notice>({
    tone: "info",
    message: "Ready.",
  });
  const [busy, setBusy] = useState(false);
  const [view, setView] = useState<PanelView>(() =>
    storedValue<PanelView>(PANEL_VIEW_KEY, "home"),
  );
  const [search, setSearch] = useState("");
  const [selectedEffectMatchName, setSelectedEffectMatchName] =
    useState<string>(() =>
      storedValue(PANEL_EFFECT_KEY, "com.moneymoves.rgb-shift"),
    );
  const [rendererOnline, setRendererOnline] = useState(false);
  const [jobs, setJobs] = useState<RenderJob[]>([]);
  const [country, setCountry] = useState("USA");
  const [asciiText, setAsciiText] = useState("MONEY MOVES");
  const [asciiFont, setAsciiFont] =
    useState<AsciiTitleJobRequest["font"]>("Standard");
  const [asciiAnimation, setAsciiAnimation] =
    useState<AsciiTitleJobRequest["animation"]>("reveal");
  const [mapAnimation, setMapAnimation] =
    useState<MapJobRequest["animation"]>("fly-to");
  const [labels, setLabels] = useState(true);
  const [width, setWidth] = useState(3840);
  const [height, setHeight] = useState(2160);
  const [fps, setFps] = useState(30);
  const [sequenceName, setSequenceName] = useState("Manual settings");
  const [paletteId, setPaletteId] = useState<string>(() =>
    storedValue(PANEL_PALETTE_KEY, "moneymoves-core"),
  );
  const [token, setToken] = useState(getRendererToken());
  const [diagnostics, setDiagnostics] = useState<Record<string, string>>({});
  const [installedEffectMatchNames, setInstalledEffectMatchNames] = useState<
    string[]
  >([]);
  const [selection, setSelection] = useState<SelectionSummary>();
  const [effectState, setEffectState] = useState<EffectSelectionState>();

  const selectedEffect =
    EFFECT_REGISTRY.find(
      (effect) => effect.matchName === selectedEffectMatchName,
    ) ?? EFFECT_REGISTRY[1]!;
  const filteredEffects = useMemo(
    () =>
      EFFECT_REGISTRY.filter((effect) =>
        effect.name.toLowerCase().includes(search.toLowerCase().trim()),
      ),
    [search],
  );
  const mapCountries = useMemo(
    () =>
      country
        .split(",")
        .map((code) => code.trim())
        .filter((code) => /^[A-Z]{3}$/.test(code)),
    [country],
  );
  const selectedEffectInstalled =
    selectedEffect.status === "available" &&
    installedEffectMatchNames.includes(selectedEffect.matchName);

  useEffect(() => persistValue(PANEL_VIEW_KEY, view), [view]);
  useEffect(
    () => persistValue(PANEL_EFFECT_KEY, selectedEffect.matchName),
    [selectedEffect.matchName],
  );
  useEffect(() => persistValue(PANEL_PALETTE_KEY, paletteId), [paletteId]);

  useEffect(() => {
    let cancelled = false;
    async function refreshSelection(): Promise<void> {
      try {
        const [nextSelection, nextEffectState] = await Promise.all([
          getSelectionSummary(),
          inspectEffectSelection(selectedEffect),
        ]);
        if (cancelled) return;
        setSelection(nextSelection);
        setEffectState(nextEffectState);
      } catch {
        if (cancelled) return;
        setSelection(undefined);
        setEffectState(undefined);
      }
    }
    void refreshSelection();
    let unsubscribe: () => void = () => undefined;
    void subscribeToSelectionChanges(() => void refreshSelection()).then(
      (nextUnsubscribe) => {
        if (cancelled) nextUnsubscribe();
        else unsubscribe = nextUnsubscribe;
      },
    );
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [selectedEffect]);

  useEffect(() => {
    void refreshDiagnostics();
    void syncOutputToSequence(true);
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

  async function refreshDiagnostics(): Promise<void> {
    const [online, host, installedEffects] = await Promise.all([
      rendererHealth(),
      hostDiagnostics(),
      getInstalledMoneyMovesEffects().catch(() => []),
    ]);
    setRendererOnline(online);
    setDiagnostics(host);
    setInstalledEffectMatchNames(installedEffects);
  }

  async function refreshEffectState(): Promise<void> {
    const [nextSelection, nextEffectState] = await Promise.all([
      getSelectionSummary(),
      inspectEffectSelection(selectedEffect),
    ]);
    setSelection(nextSelection);
    setEffectState(nextEffectState);
  }

  async function syncOutputToSequence(silent = false): Promise<void> {
    try {
      const format = await getActiveSequenceFormat();
      setWidth(format.width);
      setHeight(format.height);
      setFps(format.fps);
      setSequenceName(format.name);
      if (!silent) {
        setNotice({
          tone: "success",
          message: `Output matched ${format.name}: ${format.width}×${format.height} at ${format.fps} fps.`,
        });
      }
    } catch (error) {
      if (!silent) throw error;
    }
  }

  async function renderAndImport(
    request: MapJobRequest | AsciiTitleJobRequest,
  ): Promise<void> {
    const created = await submitRenderJob(request);
    setJobs((current) => [
      created,
      ...current.filter((job) => job.id !== created.id),
    ]);
    const completed = await waitForRenderJob(created, (updated) => {
      setJobs((current) => [
        updated,
        ...current.filter((job) => job.id !== updated.id),
      ]);
    });
    if (!completed.outputPath) {
      throw new Error("Renderer completed without an output path.");
    }
    await importGeneratedFile(completed.outputPath);
    setNotice({
      tone: "success",
      message: `Rendered and imported ${completed.outputPath}`,
    });
  }

  function selectEffect(effect: EffectDefinition): void {
    setSelectedEffectMatchName(effect.matchName);
    setView("effects");
  }

  function renderHome(): JSX.Element {
    const frameGate = EFFECT_REGISTRY.find(
      (effect) => effect.id === "frame-gate",
    )!;
    const rgbShift = EFFECT_REGISTRY.find(
      (effect) => effect.id === "rgb-shift",
    )!;
    const rgbShiftInstalled = installedEffectMatchNames.includes(
      rgbShift.matchName,
    );
    return (
      <>
        <section className="context-card">
          <div>
            <p className="eyebrow">ACTIVE CONTEXT</p>
            <h2>{diagnostics.sequence ?? "No active sequence"}</h2>
          </div>
          <p className="hint">
            {selection
              ? `${selection.videoClips} video clip(s), ${selection.nonVideoItems} other item(s) selected.`
              : "Open a project and select video clips to begin."}
          </p>
          <div className="actions">
            <button
              className="quiet"
              onClick={() => void run(refreshEffectState)}
            >
              Refresh selection
            </button>
            <button className="quiet" onClick={() => setView("effects")}>
              Open Effects
            </button>
          </div>
        </section>

        <section>
          <div className="section-heading">
            <div>
              <h2>Quick Actions</h2>
              <p className="hint">
                Frame Gate is the next native bundle in the roadmap.
              </p>
            </div>
            <span className="status planned">Planned</span>
          </div>
          <div className="button-grid">
            {FRAME_GATE_PRESETS.map((preset) => (
              <button
                className="quiet"
                disabled
                key={preset.id}
                onClick={() => undefined}
                title={`${frameGate.name} has not been installed yet.`}
              >
                {preset.name}
              </button>
            ))}
          </div>
        </section>

        <section>
          <div className="section-heading">
            <div>
              <h2>Ready now</h2>
              <p className="hint">
                RGB Shift is the current host-validation effect.
              </p>
            </div>
            <span
              className={
                rgbShiftInstalled ? "status available" : "status planned"
              }
            >
              {rgbShiftInstalled ? "Installed" : "Missing bundle"}
            </span>
          </div>
          <button onClick={() => selectEffect(rgbShift)}>Open RGB Shift</button>
        </section>

        <section className="health-card">
          <div>
            <h2>Renderer</h2>
            <p className="hint">
              {rendererOnline
                ? "Local map and ASCII renderer is online."
                : "Renderer is offline. Check Diagnostics before generating media."}
            </p>
          </div>
          <button className="quiet" onClick={() => setView("generate")}>
            Generate media
          </button>
        </section>
      </>
    );
  }

  function renderEffects(): JSX.Element {
    const controlsDisabled = busy || !selectedEffectInstalled;
    return (
      <div className="effects-layout">
        <section className="effect-browser">
          <div className="section-heading">
            <div>
              <h2>Effects</h2>
              <p className="hint">
                Installed effects are immediately usable; later effects stay
                visible.
              </p>
            </div>
          </div>
          <input
            className="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search MoneyMoves effects"
          />
          <div className="effect-list">
            {filteredEffects.map((effect) => (
              <button
                className={
                  effect.matchName === selectedEffect.matchName
                    ? "effect-row selected"
                    : "effect-row"
                }
                key={effect.matchName}
                onClick={() => selectEffect(effect)}
                type="button"
              >
                <span>{effect.name}</span>
                <span
                  className={
                    effect.status === "planned"
                      ? "status planned"
                      : installedEffectMatchNames.includes(effect.matchName)
                        ? "status available"
                        : "status planned"
                  }
                >
                  {effect.status === "planned"
                    ? "Planned"
                    : installedEffectMatchNames.includes(effect.matchName)
                      ? "Installed"
                      : "Missing"}
                </span>
              </button>
            ))}
          </div>
        </section>

        <section className="effect-inspector">
          <div className="section-heading">
            <div>
              <p className="eyebrow">{selectedEffect.category}</p>
              <h2>{selectedEffect.name}</h2>
              <p className="hint">{selectedEffect.description}</p>
            </div>
            <span
              className={
                selectedEffect.status === "planned"
                  ? "status planned"
                  : selectedEffectInstalled
                    ? "status available"
                    : "status planned"
              }
            >
              {selectedEffect.status === "planned"
                ? "Planned"
                : selectedEffectInstalled
                  ? "Installed"
                  : "Missing bundle"}
            </span>
          </div>

          {selectedEffect.status !== "available" ? (
            <p className="empty-state">
              This effect’s panel contract is reserved, but its native bundle is
              not installed yet. It will become actionable in its roadmap phase.
            </p>
          ) : !selectedEffectInstalled ? (
            <p className="empty-state">
              This effect is implemented but its native bundle was not detected.
              Install or restart Premiere, then use Diagnostics to refresh host
              health.
            </p>
          ) : (
            <>
              <p className="selection-state">{stateLabel(effectState)}</p>
              <div className="actions inspector-actions">
                <button
                  disabled={busy || !selection?.videoClips}
                  onClick={() =>
                    void run(async () => {
                      const count = await applyEffect(
                        selectedEffect.matchName,
                        selectedEffect.name,
                      );
                      await refreshEffectState();
                      setNotice({
                        tone: "success",
                        message: `${selectedEffect.name} is ready on ${count} selected clip(s).`,
                      });
                    })
                  }
                >
                  {effectState?.state === "some" ? "Add to missing" : "Apply"}
                </button>
                <button
                  className="quiet"
                  disabled={busy || effectState?.state === "none"}
                  onClick={() =>
                    void run(async () => {
                      const count = await removeEffect(
                        selectedEffect.matchName,
                        selectedEffect.name,
                      );
                      await refreshEffectState();
                      setNotice({
                        tone: "success",
                        message: `${selectedEffect.name} removed from ${count} clip(s).`,
                      });
                    })
                  }
                >
                  Remove
                </button>
                <button
                  className="quiet"
                  disabled={controlsDisabled || effectState?.state === "none"}
                  onClick={() =>
                    void run(async () => {
                      const values = Object.fromEntries(
                        selectedEffect.parameters.map((parameter) => [
                          parameter.key,
                          parameter.defaultValue,
                        ]),
                      );
                      await setEffectParameters(selectedEffect, values);
                      await refreshEffectState();
                      setNotice({
                        tone: "success",
                        message: `${selectedEffect.name} reset.`,
                      });
                    })
                  }
                >
                  Reset
                </button>
              </div>

              {selectedEffect.presets.length > 0 && (
                <div className="preset-row">
                  {selectedEffect.presets.map((preset) => (
                    <button
                      className="quiet"
                      disabled={controlsDisabled || !selection?.videoClips}
                      key={preset.id}
                      onClick={() =>
                        void run(async () => {
                          await applyEffectPreset(preset);
                          await refreshEffectState();
                          setNotice({
                            tone: "success",
                            message: `${preset.name} applied.`,
                          });
                        })
                      }
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>
              )}

              {effectState?.state !== "none" &&
                selectedEffect.parameters.length > 0 && (
                  <div className="parameter-list">
                    {selectedEffect.parameters.map((parameter) => (
                      <EffectParameterControl
                        definition={selectedEffect}
                        disabled={controlsDisabled}
                        key={parameter.key}
                        parameter={parameter}
                        state={parameterState(effectState, parameter)}
                        onNavigateKeyframe={(nextParameter, direction) =>
                          void run(async () => {
                            const found = await navigateKeyframe(
                              selectedEffect,
                              nextParameter,
                              direction,
                            );
                            if (!found) {
                              setNotice({
                                tone: "info",
                                message: "No keyframe in that direction.",
                              });
                            }
                          })
                        }
                        onSetInterpolation={(nextParameter, interpolation) =>
                          void run(async () => {
                            await setKeyframeInterpolation(
                              selectedEffect,
                              nextParameter,
                              interpolation,
                            );
                            await refreshEffectState();
                          })
                        }
                        onSetTimeVarying={(nextParameter, enabled) =>
                          void run(async () => {
                            await setParameterTimeVarying(
                              selectedEffect,
                              nextParameter,
                              enabled,
                            );
                            await refreshEffectState();
                          })
                        }
                        onSetValue={(nextParameter, value) =>
                          void run(async () => {
                            await setEffectParameter(
                              selectedEffect,
                              nextParameter,
                              value,
                            );
                            await refreshEffectState();
                          })
                        }
                        onToggleKeyframe={(nextParameter) =>
                          void run(async () => {
                            const action = await toggleKeyframeAtPlayhead(
                              selectedEffect,
                              nextParameter,
                            );
                            await refreshEffectState();
                            setNotice({
                              tone: "success",
                              message: `Keyframe ${action}.`,
                            });
                          })
                        }
                      />
                    ))}
                  </div>
                )}
            </>
          )}
        </section>
      </div>
    );
  }

  function renderPalette(): JSX.Element {
    return (
      <section>
        <div className="section-heading">
          <div>
            <h2>Palette</h2>
            <p className="hint">
              Shared by generated media and future palette-aware effects.
            </p>
          </div>
        </div>
        <select
          value={paletteId}
          onChange={(event) => setPaletteId(event.target.value)}
        >
          {brandTokens.palettes.map((palette) => (
            <option value={palette.id} key={palette.id}>
              {palette.name}
            </option>
          ))}
        </select>
        <div className="swatches">
          {brandTokens.palettes
            .find((palette) => palette.id === paletteId)
            ?.colors.map((color) => (
              <span
                key={color}
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
        </div>
      </section>
    );
  }

  function renderGenerate(): JSX.Element {
    return (
      <>
        {renderPalette()}
        <section>
          <div className="section-heading">
            <div>
              <h2>Output</h2>
              <p className="hint">
                Use the active sequence to avoid scale or frame-rate surprises.
              </p>
            </div>
          </div>
          <div className="field-grid">
            <label>
              Width
              <input
                type="number"
                min="320"
                max="7680"
                value={width}
                onChange={(event) => setWidth(Number(event.target.value))}
              />
            </label>
            <label>
              Height
              <input
                type="number"
                min="180"
                max="4320"
                value={height}
                onChange={(event) => setHeight(Number(event.target.value))}
              />
            </label>
            <label>
              FPS
              <input
                type="number"
                min="1"
                max="120"
                step="0.001"
                value={fps}
                onChange={(event) => setFps(Number(event.target.value))}
              />
            </label>
          </div>
          <div className="actions output-actions">
            <button
              className="quiet"
              disabled={busy}
              onClick={() => void run(() => syncOutputToSequence())}
            >
              Use Active Sequence
            </button>
            <span className="hint">{sequenceName}</span>
          </div>
        </section>

        <section>
          <h2>ASCII Title</h2>
          <label>
            Text
            <textarea
              value={asciiText}
              onChange={(event) => setAsciiText(event.target.value)}
              maxLength={160}
            />
          </label>
          <div className="field-grid two">
            <label>
              FIGlet style
              <select
                value={asciiFont}
                onChange={(event) =>
                  setAsciiFont(
                    event.target.value as AsciiTitleJobRequest["font"],
                  )
                }
              >
                {(["Standard", "Slant", "Big", "Small", "Block"] as const).map(
                  (font) => (
                    <option key={font}>{font}</option>
                  ),
                )}
              </select>
            </label>
            <label>
              Animation
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
                    <option key={animation}>{animation}</option>
                  ),
                )}
              </select>
            </label>
          </div>
          <sp-button
            variant="accent"
            disabled={busy || !rendererOnline || asciiText.trim().length === 0}
            onClick={() =>
              void run(() =>
                renderAndImport({
                  schemaVersion: SCHEMA_VERSION,
                  kind: "ascii-title",
                  text: asciiText,
                  font: asciiFont,
                  animation: asciiAnimation,
                  paletteId,
                  width,
                  height,
                  fps,
                  durationSeconds: 3,
                  outputName: "moneymoves-ascii.mov",
                }),
              )
            }
          >
            Render &amp; Import
          </sp-button>
        </section>

        <section>
          <h2>Map</h2>
          <label>
            Country codes (ISO-3, comma separated)
            <input
              value={country}
              onChange={(event) => setCountry(event.target.value.toUpperCase())}
            />
          </label>
          <div className="field-grid two">
            <label>
              Animation
              <select
                value={mapAnimation}
                onChange={(event) =>
                  setMapAnimation(
                    event.target.value as MapJobRequest["animation"],
                  )
                }
              >
                {(
                  [
                    "fly-to",
                    "pan-between",
                    "border-draw",
                    "fill-reveal",
                    "pulse-highlight",
                  ] as const
                ).map((animation) => (
                  <option key={animation}>{animation}</option>
                ))}
              </select>
            </label>
            <label className="check">
              <input
                type="checkbox"
                checked={labels}
                onChange={(event) => setLabels(event.target.checked)}
              />
              Labels
            </label>
          </div>
          <sp-button
            variant="accent"
            disabled={busy || !rendererOnline || mapCountries.length === 0}
            onClick={() =>
              void run(() =>
                renderAndImport({
                  schemaVersion: SCHEMA_VERSION,
                  kind: "map",
                  countries: mapCountries,
                  animation: mapAnimation,
                  projection: "natural-earth",
                  labels,
                  transparent: true,
                  paletteId,
                  width,
                  height,
                  fps,
                  durationSeconds: 5,
                  outputName: `moneymoves-map-${mapCountries.join("-").toLowerCase()}.mov`,
                }),
              )
            }
          >
            Render &amp; Import
          </sp-button>
        </section>

        <section className="deferred-card">
          <div>
            <h2>Graphics</h2>
            <p className="hint">
              Charts are deferred. The frozen MOGRT prototype can still be
              inserted at the playhead.
            </p>
          </div>
          <sp-button
            variant="secondary"
            disabled={busy}
            onClick={() =>
              void run(async () => {
                const path = await chooseAndInsertMogrt();
                setNotice({ tone: "success", message: `Inserted ${path}` });
              })
            }
          >
            Insert MOGRT
          </sp-button>
        </section>

        {jobs.length > 0 && (
          <section>
            <h2>Render Queue</h2>
            {jobs.map((job) => (
              <div className="job" key={job.id}>
                <span>{job.kind}</span>
                <span>{job.state}</span>
                <span>{Math.round(job.progress * 100)}%</span>
                {(job.state === "queued" || job.state === "running") && (
                  <button
                    className="quiet"
                    onClick={() => void cancelRenderJob(job.id)}
                  >
                    Cancel
                  </button>
                )}
              </div>
            ))}
          </section>
        )}
      </>
    );
  }

  function renderDiagnostics(): JSX.Element {
    return (
      <>
        <section>
          <div className="section-heading">
            <div>
              <h2>Host health</h2>
              <p className="hint">
                Live information from the active Premiere host and renderer.
              </p>
            </div>
            <button className="quiet" onClick={() => void refreshDiagnostics()}>
              Refresh
            </button>
          </div>
          <dl>
            {Object.entries(diagnostics).map(([key, value]) => (
              <div key={key}>
                <dt>{key}</dt>
                <dd>{value}</dd>
              </div>
            ))}
            <div>
              <dt>renderer</dt>
              <dd>{rendererOnline ? "Online" : "Offline"}</dd>
            </div>
            <div>
              <dt>schema</dt>
              <dd>{SCHEMA_VERSION}</dd>
            </div>
          </dl>
          <label>
            Renderer token
            <input
              value={token}
              type="password"
              onChange={(event) => setToken(event.target.value)}
            />
          </label>
          <button
            onClick={() => {
              setRendererToken(token);
              void refreshDiagnostics();
              setNotice({ tone: "success", message: "Renderer token saved." });
            }}
          >
            Save token
          </button>
        </section>

        <section>
          <h2>Phase 0 host gates</h2>
          <ol className="validation-list">
            <li>
              <span className="status planned">Manual</span> Select 20 video
              clips, apply and remove RGB Shift, then verify each action is one
              Undo.
            </li>
            <li>
              <span className="status planned">Manual</span> Compare RGB Shift
              CPU fallback and Metal output in Premiere.
            </li>
            <li>
              <span className="status planned">Manual</span> Import and export
              the ten-frame transparent ProRes alpha artifact through AME.
            </li>
          </ol>
          <p className="hint">
            Record the exact project, artifact, timing, and result in the Phase
            0 validation document before advancing to Frame Gate.
          </p>
        </section>
      </>
    );
  }

  return (
    <main className="app-shell">
      <header className="masthead">
        <div>
          <p className="eyebrow">PREMIERE TOOLKIT</p>
          <h1>MoneyMoves</h1>
        </div>
        <span
          className={`health ${rendererOnline ? "online" : "offline"}`}
          title={rendererOnline ? "Renderer online" : "Renderer offline"}
        />
      </header>

      <nav aria-label="MoneyMoves workspace" className="workspace-nav">
        {(
          [
            ["home", "Home"],
            ["effects", "Effects"],
            ["generate", "Generate"],
            ["diagnostics", "Diagnostics"],
          ] as const
        ).map(([nextView, label]) => (
          <button
            className={view === nextView ? "active" : "quiet"}
            key={nextView}
            onClick={() => setView(nextView)}
            type="button"
          >
            {label}
          </button>
        ))}
      </nav>

      <div aria-live="polite" className={`notice ${notice.tone}`}>
        {notice.message}
      </div>

      <div className="workspace-content">
        {view === "home" && renderHome()}
        {view === "effects" && renderEffects()}
        {view === "generate" && renderGenerate()}
        {view === "diagnostics" && renderDiagnostics()}
      </div>
    </main>
  );
}
