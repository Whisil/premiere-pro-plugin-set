import type { EffectPreset } from "@moneymoves/contracts";

const FRAME_GATE_PARAM_INDEX: Record<string, number> = {
  mode: 1,
  headLength: 2,
  headMask: 3,
  tailLength: 4,
  tailMask: 5,
};

const MODE_VALUE: Record<string, number> = { head: 1, tail: 2, both: 3 };

function getPremiere(): any {
  if (typeof require !== "function") {
    throw new Error(
      "Premiere APIs are only available when the panel is loaded in UXP.",
    );
  }
  return require("premierepro");
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

async function selectedVideoClips(ppro: any, sequence: any): Promise<any[]> {
  const selection = await sequence.getSelection();
  const items = await selection.getTrackItems();
  return items.filter((item: any) => {
    try {
      return item instanceof ppro.VideoClipTrackItem;
    } catch {
      return (
        typeof item?.getComponentChain === "function" &&
        typeof item?.getMediaType === "function"
      );
    }
  });
}

function normalizePresetValue(
  name: string,
  value: string | number | boolean,
): string | number | boolean {
  if (name === "mode" && typeof value === "string")
    return MODE_VALUE[value] ?? 3;
  return value;
}

export async function applyEffectPreset(preset: EffectPreset): Promise<number> {
  const { ppro, project, sequence } = await getContext();
  const clips = await selectedVideoClips(ppro, sequence);
  if (clips.length === 0) throw new Error("Select at least one video clip.");

  const prepared = await Promise.all(
    clips.map(async (clip) => ({
      chain: await clip.getComponentChain(),
      component: await ppro.VideoFilterFactory.createComponent(
        preset.matchName,
      ),
    })),
  );

  let success = false;
  project.lockedAccess(() => {
    success = project.executeTransaction((compoundAction: any) => {
      for (const { chain, component } of prepared) {
        compoundAction.addAction(chain.createAppendComponentAction(component));
        if (preset.matchName === "com.moneymoves.frame-gate") {
          for (const [name, rawValue] of Object.entries(preset.parameters)) {
            const index = FRAME_GATE_PARAM_INDEX[name];
            if (index === undefined) continue;
            const param = component.getParam(index);
            const keyframe = param.createKeyframe(
              normalizePresetValue(name, rawValue),
            );
            compoundAction.addAction(
              param.createSetValueAction(keyframe, true),
            );
          }
        }
      }
    }, `Apply ${preset.name}`);
  });

  if (!success)
    throw new Error(`Premiere rejected the ${preset.name} transaction.`);
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
    for (let index = chain.getComponentCount() - 1; index >= 0; index -= 1) {
      const component = chain.getComponentAtIndex(index);
      if ((await component.getMatchName()) === matchName) {
        removals.push({ chain, component });
        break;
      }
    }
  }
  if (removals.length === 0)
    throw new Error(`${displayName} is not applied to the selection.`);

  let success = false;
  project.lockedAccess(() => {
    success = project.executeTransaction((compoundAction: any) => {
      for (const { chain, component } of removals) {
        compoundAction.addAction(chain.createRemoveComponentAction(component));
      }
    }, `Remove ${displayName}`);
  });
  if (!success)
    throw new Error(`Premiere rejected the remove ${displayName} transaction.`);
  return removals.length;
}

export async function importGeneratedFile(path: string): Promise<void> {
  const { project } = await getContext();
  const targetBin = await project.getInsertionBin();
  const imported = await project.importFiles([path], true, targetBin, false);
  if (!imported)
    throw new Error("Premiere could not import the generated media.");
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
  if (typeof require !== "function")
    throw new Error("File selection is only available in UXP.");
  const file = await require("uxp").storage.localFileSystem.getFileForOpening({
    types: ["mogrt"],
  });
  if (!file) throw new Error("No MOGRT selected.");
  const path = file.nativePath ?? file.path;
  if (!path)
    throw new Error("UXP did not return a native path for the selected MOGRT.");
  await insertMogrt(path);
  return path;
}

export async function hostDiagnostics(): Promise<Record<string, string>> {
  try {
    const ppro = getPremiere();
    const project = await ppro.Project.getActiveProject();
    return {
      host: "Premiere Pro",
      project: project?.name ?? "No active project",
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
