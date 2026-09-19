import {
  getEffectDefinition,
  type EffectDefinition,
  type EffectParameterDefinition,
  type EffectPreset,
} from "@moneymoves/contracts";

const PREMIERE_TICKS_PER_SECOND = 254_016_000_000;
let premiereProvider: (() => any) | undefined;

export interface SequenceFormat {
  name: string;
  width: number;
  height: number;
  fps: number;
}

export interface SelectionSummary {
  selectedItems: number;
  videoClips: number;
  nonVideoItems: number;
}

export interface EffectParameterState {
  key: string;
  value: string | number | boolean | undefined;
  mixed: boolean;
  timeVarying: boolean;
  keyframeCount: number;
}

export interface EffectSelectionState {
  selectedClips: number;
  appliedClips: number;
  state: "none" | "some" | "all";
  parameters: EffectParameterState[];
}

export function fpsFromTimebase(timebase: string): number {
  const ticksPerFrame = Number(timebase);
  const fps = PREMIERE_TICKS_PER_SECOND / ticksPerFrame;
  if (!Number.isFinite(fps) || fps < 1 || fps > 120) {
    throw new Error(
      `Premiere returned an invalid sequence timebase: ${timebase}`,
    );
  }
  return Math.round(fps * 1000) / 1000;
}

function getPremiere(): any {
  if (premiereProvider) return premiereProvider();
  if (typeof require !== "function") {
    throw new Error(
      "Premiere APIs are only available when the panel is loaded in UXP.",
    );
  }
  return require("premierepro");
}

export function setPremiereProviderForTesting(
  provider: (() => any) | undefined,
): void {
  premiereProvider = provider;
}

async function getContext(): Promise<{
  ppro: any;
  project: any;
  sequence: any;
}> {
  const ppro = getPremiere();
  const project = await ppro.Project.getActiveProject();
  if (!project) throw new Error("Open a Premiere project first.");
  const sequence = await project.getActiveSequence();
  if (!sequence) throw new Error("Open a sequence first.");
  return { ppro, project, sequence };
}

export async function getActiveSequenceFormat(): Promise<SequenceFormat> {
  const { sequence } = await getContext();
  const [frameSize, timebase] = await Promise.all([
    sequence.getFrameSize(),
    sequence.getTimebase(),
  ]);
  const width = Math.round(Number(frameSize.width));
  const height = Math.round(Number(frameSize.height));
  if (width < 1 || height < 1) {
    throw new Error("Premiere returned an invalid active-sequence frame size.");
  }
  return {
    name: sequence.name ?? "Active sequence",
    width,
    height,
    fps: fpsFromTimebase(String(timebase)),
  };
}

async function selectedItems(sequence: any): Promise<any[]> {
  const selection = await sequence.getSelection();
  return selection.getTrackItems();
}

function isVideoClip(ppro: any, item: any): boolean {
  try {
    return item instanceof ppro.VideoClipTrackItem;
  } catch {
    return (
      typeof item?.getComponentChain === "function" &&
      typeof item?.getMediaType === "function"
    );
  }
}

async function selectedVideoClips(ppro: any, sequence: any): Promise<any[]> {
  const items = await selectedItems(sequence);
  return items.filter((item: any) => isVideoClip(ppro, item));
}

async function findComponent(
  chain: any,
  matchName: string,
): Promise<any | undefined> {
  for (let index = chain.getComponentCount() - 1; index >= 0; index -= 1) {
    const component = chain.getComponentAtIndex(index);
    if ((await component.getMatchName()) === matchName) return component;
  }
  return undefined;
}

function valuesMatch(
  values: Array<string | number | boolean | undefined>,
): boolean {
  if (values.length < 2) return true;
  return values.every((value) => value === values[0]);
}

function runTransaction(project: any, label: string, actions: any[]): void {
  let success = false;
  project.lockedAccess(() => {
    success = project.executeTransaction((compoundAction: any) => {
      for (const action of actions) compoundAction.addAction(action);
    }, label);
  });
  if (!success) throw new Error(`Premiere rejected the ${label} transaction.`);
}

function resolvePresetValue(
  definition: EffectDefinition,
  key: string,
  value: string | number | boolean,
): string | number | boolean {
  const parameter = definition.parameters.find(
    (candidate) => candidate.key === key,
  );
  if (!parameter || typeof value !== "string") return value;
  return (
    parameter.options?.find((option) => option.id === value)?.value ?? value
  );
}

async function createSetValueActions(
  components: any[],
  definition: EffectDefinition,
  parameters: Record<string, string | number | boolean>,
): Promise<any[]> {
  const actions: any[] = [];
  for (const component of components) {
    for (const [key, rawValue] of Object.entries(parameters)) {
      const parameter = definition.parameters.find(
        (candidate) => candidate.key === key,
      );
      if (!parameter) continue;
      const param = component.getParam(parameter.index);
      const keyframe = param.createKeyframe(
        resolvePresetValue(definition, key, rawValue),
      );
      actions.push(param.createSetValueAction(keyframe, true));
    }
  }
  return actions;
}

async function getAppliedComponents(
  ppro: any,
  sequence: any,
  definition: EffectDefinition,
): Promise<{ clips: any[]; components: any[] }> {
  const clips = await selectedVideoClips(ppro, sequence);
  const components = (
    await Promise.all(
      clips.map(async (clip) =>
        findComponent(await clip.getComponentChain(), definition.matchName),
      ),
    )
  ).filter(Boolean);
  return { clips, components };
}

export async function getSelectionSummary(): Promise<SelectionSummary> {
  const { ppro, sequence } = await getContext();
  const items = await selectedItems(sequence);
  const videoClips = items.filter((item: any) =>
    isVideoClip(ppro, item),
  ).length;
  return {
    selectedItems: items.length,
    videoClips,
    nonVideoItems: items.length - videoClips,
  };
}

export async function inspectEffectSelection(
  definition: EffectDefinition,
): Promise<EffectSelectionState> {
  const { ppro, sequence } = await getContext();
  const { clips, components } = await getAppliedComponents(
    ppro,
    sequence,
    definition,
  );
  if (clips.length === 0) {
    return { selectedClips: 0, appliedClips: 0, state: "none", parameters: [] };
  }
  const playhead = await sequence.getPlayerPosition();
  const parameters = await Promise.all(
    definition.parameters.map(async (definitionParameter) => {
      const params = components.map((component) =>
        component.getParam(definitionParameter.index),
      );
      const values = await Promise.all(
        params.map((param) => param.getValueAtTime(playhead)),
      );
      const timeVarying = await Promise.all(
        params.map((param) => param.isTimeVarying()),
      );
      const keyframeCounts = await Promise.all(
        params.map(async (param) => {
          if (!(await param.areKeyframesSupported())) return 0;
          return (await param.getKeyframeListAsTickTimes()).length;
        }),
      );
      return {
        key: definitionParameter.key,
        value: valuesMatch(values) ? values[0] : undefined,
        mixed: !valuesMatch(values),
        timeVarying: timeVarying.some(Boolean),
        keyframeCount: Math.max(0, ...keyframeCounts),
      };
    }),
  );
  const appliedClips = components.length;
  return {
    selectedClips: clips.length,
    appliedClips,
    state:
      appliedClips === 0
        ? "none"
        : appliedClips === clips.length
          ? "all"
          : "some",
    parameters,
  };
}

export async function subscribeToSelectionChanges(
  listener: () => void,
): Promise<() => void> {
  try {
    const { ppro, sequence } = await getContext();
    const manager = ppro.EventManager;
    const eventName = ppro.Constants?.SequenceEvent?.SELECTION_CHANGED;
    if (!manager || !eventName) return () => undefined;
    manager.addEventListener(sequence, eventName, listener, false);
    return () =>
      manager.removeEventListener(sequence, eventName, listener, false);
  } catch {
    return () => undefined;
  }
}

export async function applyEffectPreset(preset: EffectPreset): Promise<number> {
  const { ppro, project, sequence } = await getContext();
  const clips = await selectedVideoClips(ppro, sequence);
  if (clips.length === 0) throw new Error("Select at least one video clip.");

  const definition = getEffectDefinition(preset.matchName);
  if (!definition)
    throw new Error(`Unknown MoneyMoves effect: ${preset.matchName}`);
  if (definition.status !== "available") {
    throw new Error(`${definition.name} is not installed yet.`);
  }

  const prepared = await Promise.all(
    clips.map(async (clip) => {
      const chain = await clip.getComponentChain();
      const existing = await findComponent(chain, preset.matchName);
      const component =
        existing ??
        (await ppro.VideoFilterFactory.createComponent(preset.matchName));
      return { chain, component, existing };
    }),
  );
  const appendActions = prepared
    .filter(({ existing }) => !existing)
    .map(({ chain, component }) =>
      chain.createAppendComponentAction(component),
    );
  const parameterActions = await createSetValueActions(
    prepared.map(({ component }) => component),
    definition,
    preset.parameters,
  );
  runTransaction(project, `Apply ${preset.name}`, [
    ...appendActions,
    ...parameterActions,
  ]);
  return clips.length;
}

export async function applyEffect(
  matchName: string,
  displayName: string,
): Promise<number> {
  return applyEffectPreset({
    id: displayName.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
    name: displayName,
    matchName,
    parameters: {},
  });
}

export async function setEffectParameter(
  definition: EffectDefinition,
  parameter: EffectParameterDefinition,
  value: string | number | boolean,
): Promise<number> {
  return setEffectParameters(definition, { [parameter.key]: value });
}

export async function setEffectParameters(
  definition: EffectDefinition,
  values: Record<string, string | number | boolean>,
): Promise<number> {
  const { ppro, project, sequence } = await getContext();
  const { components } = await getAppliedComponents(ppro, sequence, definition);
  if (components.length === 0) {
    throw new Error(`Apply ${definition.name} before changing its controls.`);
  }
  const actions: any[] = [];
  for (const component of components) {
    for (const [key, value] of Object.entries(values)) {
      const parameter = definition.parameters.find(
        (candidate) => candidate.key === key,
      );
      if (!parameter) continue;
      const param = component.getParam(parameter.index);
      const keyframe = param.createKeyframe(value);
      if (parameter.keyframeable && (await param.isTimeVarying())) {
        actions.push(param.createAddKeyframeAction(keyframe));
      } else {
        actions.push(param.createSetValueAction(keyframe, true));
      }
    }
  }
  const label =
    Object.keys(values).length === 1
      ? `Set ${definition.name} ${definition.parameters.find((parameter) => parameter.key === Object.keys(values)[0])?.label ?? "parameter"}`
      : `Reset ${definition.name}`;
  runTransaction(project, label, actions);
  return components.length;
}

export async function setParameterTimeVarying(
  definition: EffectDefinition,
  parameter: EffectParameterDefinition,
  enabled: boolean,
): Promise<number> {
  const { ppro, project, sequence } = await getContext();
  const { components } = await getAppliedComponents(ppro, sequence, definition);
  if (components.length === 0)
    throw new Error(`Apply ${definition.name} first.`);
  const actions = components.map((component) =>
    component.getParam(parameter.index).createSetTimeVaryingAction(enabled),
  );
  runTransaction(
    project,
    `${enabled ? "Animate" : "Stop animating"} ${definition.name} ${parameter.label}`,
    actions,
  );
  return components.length;
}

export async function toggleKeyframeAtPlayhead(
  definition: EffectDefinition,
  parameter: EffectParameterDefinition,
): Promise<"added" | "removed"> {
  const { ppro, project, sequence } = await getContext();
  const { components } = await getAppliedComponents(ppro, sequence, definition);
  if (components.length === 0)
    throw new Error(`Apply ${definition.name} first.`);
  const playhead = await sequence.getPlayerPosition();
  const params = components.map((component) =>
    component.getParam(parameter.index),
  );
  const keyTimes = await Promise.all(
    params.map((param) => param.getKeyframeListAsTickTimes()),
  );
  const remove = keyTimes.every((times) =>
    times.some((time: any) => time.ticks === playhead.ticks),
  );
  const actions: any[] = [];
  for (const param of params) {
    if (remove) {
      actions.push(param.createRemoveKeyframeAction(playhead, true));
    } else {
      const value = await param.getValueAtTime(playhead);
      actions.push(param.createAddKeyframeAction(param.createKeyframe(value)));
    }
  }
  runTransaction(
    project,
    `${remove ? "Remove" : "Add"} ${definition.name} ${parameter.label} keyframe`,
    actions,
  );
  return remove ? "removed" : "added";
}

export async function setKeyframeInterpolation(
  definition: EffectDefinition,
  parameter: EffectParameterDefinition,
  interpolation: number,
): Promise<number> {
  const { ppro, project, sequence } = await getContext();
  const { components } = await getAppliedComponents(ppro, sequence, definition);
  if (components.length === 0)
    throw new Error(`Apply ${definition.name} first.`);
  const playhead = await sequence.getPlayerPosition();
  const actions = components.map((component) =>
    component
      .getParam(parameter.index)
      .createSetInterpolationAtKeyframeAction(playhead, interpolation, true),
  );
  runTransaction(
    project,
    `Set ${definition.name} ${parameter.label} interpolation`,
    actions,
  );
  return components.length;
}

export async function navigateKeyframe(
  definition: EffectDefinition,
  parameter: EffectParameterDefinition,
  direction: "previous" | "next",
): Promise<boolean> {
  const { ppro, sequence } = await getContext();
  const { components } = await getAppliedComponents(ppro, sequence, definition);
  const component = components[0];
  if (!component) return false;
  const playhead = await sequence.getPlayerPosition();
  const param = component.getParam(parameter.index);
  const keyframe =
    direction === "previous"
      ? await param.findPreviousKeyframe(playhead)
      : await param.findNextKeyframe(playhead);
  if (!keyframe?.position) return false;
  return sequence.setPlayerPosition(keyframe.position);
}

export async function removeEffect(
  matchName: string,
  displayName: string,
): Promise<number> {
  const { ppro, project, sequence } = await getContext();
  const clips = await selectedVideoClips(ppro, sequence);
  if (clips.length === 0) throw new Error("Select at least one video clip.");

  const removals: Array<{ chain: any; component: any }> = [];
  for (const clip of clips) {
    const chain = await clip.getComponentChain();
    const component = await findComponent(chain, matchName);
    if (component) removals.push({ chain, component });
  }
  if (removals.length === 0) {
    throw new Error(`${displayName} is not applied to the selection.`);
  }
  runTransaction(
    project,
    `Remove ${displayName}`,
    removals.map(({ chain, component }) =>
      chain.createRemoveComponentAction(component),
    ),
  );
  return removals.length;
}

export async function importGeneratedFile(path: string): Promise<void> {
  const { project } = await getContext();
  const targetBin = await project.getInsertionBin();
  const imported = await project.importFiles([path], true, targetBin, false);
  if (!imported) {
    throw new Error("Premiere could not import the generated media.");
  }
}

export async function insertMogrt(path: string): Promise<void> {
  const { ppro, sequence } = await getContext();
  const editor = ppro.SequenceEditor.getEditor(sequence);
  const playhead = await sequence.getPlayerPosition();
  const videoTrackCount = await sequence.getVideoTrackCount();
  await editor.insertMogrtFromPath(
    path,
    playhead,
    Math.max(0, videoTrackCount - 1),
    0,
  );
}

export async function chooseAndInsertMogrt(): Promise<string> {
  if (typeof require !== "function") {
    throw new Error("File selection is only available in UXP.");
  }
  const file = await require("uxp").storage.localFileSystem.getFileForOpening({
    types: ["mogrt"],
  });
  if (!file) throw new Error("No MOGRT selected.");
  const path = file.nativePath ?? file.path;
  if (!path) {
    throw new Error("UXP did not return a native path for the selected MOGRT.");
  }
  await insertMogrt(path);
  return path;
}

export async function hostDiagnostics(): Promise<Record<string, string>> {
  try {
    const ppro = getPremiere();
    const project = await ppro.Project.getActiveProject();
    const sequence = await project?.getActiveSequence();
    const moneyMovesEffects = await getInstalledMoneyMovesEffects();
    return {
      host: "Premiere Pro",
      project: project?.name ?? "No active project",
      sequence: sequence?.name ?? "No active sequence",
      nativeEffects: `${moneyMovesEffects.length}/15`,
      installedEffects: moneyMovesEffects.join(", ") || "None detected",
      api: "Available",
    };
  } catch (error) {
    return {
      host: "Browser preview",
      project: "Unavailable",
      api: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function getInstalledMoneyMovesEffects(): Promise<string[]> {
  const ppro = getPremiere();
  const availableEffects = await ppro.VideoFilterFactory.getMatchNames();
  return availableEffects.filter((name: string) =>
    name.startsWith("com.moneymoves."),
  );
}
