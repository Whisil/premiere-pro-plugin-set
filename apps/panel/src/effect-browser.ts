import type { EffectDefinition } from "@moneymoves/contracts";

export function filterEffects(
  effects: EffectDefinition[],
  query: string,
): EffectDefinition[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return effects;
  return effects.filter((effect) =>
    `${effect.name} ${effect.category} ${effect.description}`
      .toLowerCase()
      .includes(normalized),
  );
}

export function selectedVisibleEffect(
  effects: EffectDefinition[],
  selectedMatchName: string,
): EffectDefinition | undefined {
  return (
    effects.find((effect) => effect.matchName === selectedMatchName) ??
    effects[0]
  );
}
