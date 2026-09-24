import type { EffectDefinition } from "@moneymoves/contracts";

export function nextExpandedEffect(
  currentMatchName: string | undefined,
  clickedMatchName: string,
): string | undefined {
  return currentMatchName === clickedMatchName ? undefined : clickedMatchName;
}

export function isNativeEffectAvailable(
  effect: EffectDefinition,
  installedMatchNames: readonly string[],
): boolean {
  return installedMatchNames.includes(effect.matchName);
}
