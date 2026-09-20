import {
  EFFECT_REGISTRY,
  type EffectDefinition,
  type EffectParameterDefinition,
} from "@moneymoves/contracts";
import { useEffect, useMemo, useState } from "react";
import {
  applyEffect,
  applyEffectPreset,
  getInstalledMoneyMovesEffects,
  getSelectionSummary,
  inspectEffectSelection,
  removeEffect,
  setEffectParameter,
  subscribeToSelectionChanges,
  type EffectParameterState,
  type EffectSelectionState,
  type SelectionSummary,
} from "./premiere.js";

type Notice = { tone: "info" | "success" | "error"; message: string };

const PANEL_EFFECT_KEY = "moneymoves.panel.effect";

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
}

function EffectParameterControl({
  definition,
  parameter,
  effectState,
  disabled,
  onSetValue,
}: EffectParameterControlProps) {
  const state = parameterState(effectState, parameter);
  const value = displayValue(parameter, state);
  const mixed = state?.mixed ?? false;
  const controlDisabled = disabled || !state;

  function toggleBit(index: number): void {
    onSetValue(parameter, Number(value) ^ (1 << index));
  }

  return (
    <label className="parameter">
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
    </label>
  );
}

export function App() {
  const [notice, setNotice] = useState<Notice>({
    tone: "info",
    message: "",
  });
  const [busy, setBusy] = useState(false);
  const [selectedMatchName, setSelectedMatchName] = useState(
    storedEffectMatchName,
  );
  const [installedMatchNames, setInstalledMatchNames] = useState<string[]>([]);
  const [selection, setSelection] = useState<SelectionSummary>();
  const [effectStates, setEffectStates] = useState<
    Record<string, EffectSelectionState>
  >({});

  const installedEffects = useMemo(() => {
    const available = EFFECT_REGISTRY.filter(
      (effect) => effect.status === "available",
    );
    if (installedMatchNames.length === 0) return available;
    const detected = available.filter((effect) =>
      installedMatchNames.includes(effect.matchName),
    );
    return detected.length > 0 ? detected : available;
  }, [installedMatchNames]);
  const selectedEffect =
    installedEffects.find((effect) => effect.matchName === selectedMatchName) ??
    installedEffects[0];
  const selectedState = selectedEffect
    ? effectStates[selectedEffect.matchName]
    : undefined;
  const selectedIsOn =
    selectedState?.state === "all" || selectedState?.state === "some";

  useEffect(() => {
    if (selectedEffect) persistEffectMatchName(selectedEffect.matchName);
  }, [selectedEffect]);

  useEffect(() => {
    let cancelled = false;
    async function refresh(): Promise<void> {
      try {
        const [nextSelection, installed] = await Promise.all([
          getSelectionSummary().catch(() => undefined),
          getInstalledMoneyMovesEffects().catch((): string[] => []),
        ]);
        if (cancelled) return;
        setSelection(nextSelection);
        setInstalledMatchNames(installed);
        const visible = EFFECT_REGISTRY.filter((effect) => {
          if (effect.status !== "available") return false;
          if (installed.length === 0) return true;
          return installed.includes(effect.matchName);
        });
        const listed =
          visible.length > 0
            ? visible
            : EFFECT_REGISTRY.filter((effect) => effect.status === "available");
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
    return () => {
      cancelled = true;
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
      installedEffects.map(async (effect) => {
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
    const state = effectStates[effect.matchName];
    if (state?.state === "all" || state?.state === "some") {
      setSelectedMatchName(effect.matchName);
      return;
    }
    applyNamed(effect);
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

  return (
    <main className="app-shell">
      <header className="masthead">
        <div>
          <p className="eyebrow">MONEYMOVES</p>
          <h1>Effects</h1>
        </div>
        <p className="selection-state">{selectionCopy(selection)}</p>
      </header>

      {notice.message ? (
        <p className={`notice ${notice.tone}`}>{notice.message}</p>
      ) : null}

      {installedEffects.length === 0 ? (
        <p className="empty-state">
          No MoneyMoves effects are listed yet. Open a Premiere project, then
          try Apply on a selected clip.
        </p>
      ) : (
        <div className="effect-list">
          {installedEffects.map((effect) => {
            const state = effectStates[effect.matchName];
            const isSelected = effect.matchName === selectedEffect?.matchName;
            const isOn = state?.state === "all" || state?.state === "some";
            return (
              <article
                className={isSelected ? "effect-card selected" : "effect-card"}
                key={effect.matchName}
              >
                <div className="effect-row">
                  <button
                    className="effect-name"
                    disabled={busy}
                    onClick={() => chooseEffect(effect)}
                    type="button"
                  >
                    <span>{effect.name}</span>
                    <span className={isOn ? "status on" : "status off"}>
                      {appliedCopy(state)}
                    </span>
                  </button>
                  {isOn ? (
                    <button
                      className="quiet"
                      disabled={busy}
                      onClick={() => removeSelected(effect)}
                      type="button"
                    >
                      Remove
                    </button>
                  ) : null}
                  {state?.state === "some" || !isOn ? (
                    <button
                      disabled={busy || !selection?.videoClips}
                      onClick={() => applyNamed(effect)}
                      type="button"
                    >
                      Apply
                    </button>
                  ) : null}
                </div>

                {isSelected && isOn && effect.parameters.length > 0 ? (
                  <div className="effect-editor">
                    {effect.presets.length > 0 ? (
                      <div className="preset-row">
                        {effect.presets.map((preset) => (
                          <button
                            className="quiet"
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
                    ) : null}
                    {effect.parameters.map((parameter) => (
                      <EffectParameterControl
                        definition={effect}
                        disabled={busy}
                        effectState={state}
                        key={parameter.key}
                        parameter={parameter}
                        onSetValue={(nextParameter, value) =>
                          void run(async () => {
                            await setEffectParameter(
                              effect,
                              nextParameter,
                              value,
                            );
                            await refreshStates();
                            setNotice({ tone: "info", message: "" });
                          })
                        }
                      />
                    ))}
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      )}

      {selectedEffect && !selectedIsOn && selection?.videoClips ? (
        <p className="hint">Click an effect to put it on the selected clips.</p>
      ) : null}
    </main>
  );
}
