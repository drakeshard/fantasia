declare const unitInstanceIdBrand: unique symbol;
declare const characterDefinitionIdBrand: unique symbol;

/** Stable identity for one account-owned unit instance. */
export type UnitInstanceId = string & {
  readonly [unitInstanceIdBrand]: "UnitInstanceId";
};

/** Stable repository-owned character definition reference. */
export type CharacterDefinitionId = string & {
  readonly [characterDefinitionIdBrand]: "CharacterDefinitionId";
};

export interface SerializedUnitInstance {
  readonly instanceId: string;
  readonly characterDefinitionId: string;
}

export interface UnitInstance {
  readonly instanceId: UnitInstanceId;
  readonly characterDefinitionId: CharacterDefinitionId;
}

export interface RosterState {
  readonly units: readonly UnitInstance[];
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isDefinitionId(value: string): boolean {
  return value.length > 0 && value.length <= 128 && value === value.trim();
}

export function unitInstanceId(value: string): UnitInstanceId {
  if (!UUID_PATTERN.test(value)) throw new Error("Unit instance ID must be a canonical UUID.");
  return value.toLowerCase() as UnitInstanceId;
}

export function characterDefinitionId(value: string): CharacterDefinitionId {
  if (!isDefinitionId(value)) {
    throw new Error(
      "Character definition ID must be a trimmed non-empty string up to 128 characters.",
    );
  }
  return value as CharacterDefinitionId;
}

export function createRosterState(
  knownCharacterDefinitionIds: readonly string[],
  units: readonly SerializedUnitInstance[],
): RosterState {
  const known = new Set(knownCharacterDefinitionIds.map((id) => characterDefinitionId(id)));
  const instanceIds = new Set<string>();
  const restored = units.map((unit) => {
    const instanceId = unitInstanceId(unit.instanceId);
    const definitionId = characterDefinitionId(unit.characterDefinitionId);
    if (instanceIds.has(instanceId))
      throw new Error("Roster contains a duplicate unit instance ID.");
    if (!known.has(definitionId)) {
      throw new Error("Roster references an unknown character definition.");
    }
    instanceIds.add(instanceId);
    return { instanceId, characterDefinitionId: definitionId };
  });

  return { units: restored };
}

export function serializeRosterState(state: RosterState): readonly SerializedUnitInstance[] {
  return [...state.units]
    .sort((left, right) => left.instanceId.localeCompare(right.instanceId))
    .map((unit) => ({
      instanceId: unit.instanceId,
      characterDefinitionId: unit.characterDefinitionId,
    }));
}
