declare const equipmentInstanceIdBrand: unique symbol;
declare const equipmentDefinitionIdBrand: unique symbol;

/** Stable identity for one account-owned equipment instance. */
export type EquipmentInstanceId = string & {
  readonly [equipmentInstanceIdBrand]: "EquipmentInstanceId";
};

/** Stable repository-owned equipment definition reference. */
export type EquipmentDefinitionId = string & {
  readonly [equipmentDefinitionIdBrand]: "EquipmentDefinitionId";
};

export interface SerializedEquipmentInstance {
  readonly instanceId: string;
  readonly equipmentDefinitionId: string;
}

export interface EquipmentInstance {
  readonly instanceId: EquipmentInstanceId;
  readonly equipmentDefinitionId: EquipmentDefinitionId;
}

export interface EquipmentInventoryState {
  readonly equipment: readonly EquipmentInstance[];
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isDefinitionId(value: string): boolean {
  return value.length > 0 && value.length <= 128 && value === value.trim();
}

export function equipmentInstanceId(value: string): EquipmentInstanceId {
  if (!UUID_PATTERN.test(value)) {
    throw new Error("Equipment instance ID must be a canonical UUID.");
  }
  return value.toLowerCase() as EquipmentInstanceId;
}

export function equipmentDefinitionId(value: string): EquipmentDefinitionId {
  if (!isDefinitionId(value)) {
    throw new Error(
      "Equipment definition ID must be a trimmed non-empty string up to 128 characters.",
    );
  }
  return value as EquipmentDefinitionId;
}

export function createEquipmentInventoryState(
  knownEquipmentDefinitionIds: readonly string[],
  equipment: readonly SerializedEquipmentInstance[],
): EquipmentInventoryState {
  const known = new Set(knownEquipmentDefinitionIds.map((id) => equipmentDefinitionId(id)));
  const instanceIds = new Set<string>();
  const restored = equipment.map((item) => {
    const instanceId = equipmentInstanceId(item.instanceId);
    const definitionId = equipmentDefinitionId(item.equipmentDefinitionId);
    if (instanceIds.has(instanceId)) {
      throw new Error("Equipment inventory contains a duplicate equipment instance ID.");
    }
    if (!known.has(definitionId)) {
      throw new Error("Equipment inventory references an unknown equipment definition.");
    }
    instanceIds.add(instanceId);
    return { instanceId, equipmentDefinitionId: definitionId };
  });

  return { equipment: restored };
}

export function serializeEquipmentInventoryState(
  state: EquipmentInventoryState,
): readonly SerializedEquipmentInstance[] {
  return [...state.equipment]
    .sort((left, right) => left.instanceId.localeCompare(right.instanceId))
    .map((item) => ({
      instanceId: item.instanceId,
      equipmentDefinitionId: item.equipmentDefinitionId,
    }));
}
