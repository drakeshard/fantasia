import {
  createEquipmentInventoryState,
  type EquipmentInventoryState,
  type SerializedEquipmentInstance,
  serializeEquipmentInventoryState,
} from "@fantasia/game";

export const FANTASIA_EQUIPMENT_SCHEMA_VERSION = 1 as const;

export interface PersistedEquipmentInstanceRow {
  readonly instanceId: unknown;
  readonly schemaVersion: unknown;
  readonly equipmentDefinitionId: unknown;
}

export interface EquipmentSnapshot {
  readonly schemaVersion: typeof FANTASIA_EQUIPMENT_SCHEMA_VERSION;
  readonly equipment: readonly SerializedEquipmentInstance[];
}

export type EquipmentRestoreResult =
  | Readonly<{
      kind: "restored";
      state: EquipmentInventoryState;
      snapshot: EquipmentSnapshot;
    }>
  | Readonly<{ kind: "rejected"; reason: string }>;

function parsePersistedRows(
  rows: readonly PersistedEquipmentInstanceRow[],
): readonly SerializedEquipmentInstance[] {
  return rows.map((row) => {
    if (row.schemaVersion !== FANTASIA_EQUIPMENT_SCHEMA_VERSION) {
      throw new Error("Unsupported equipment instance schema version.");
    }
    if (typeof row.instanceId !== "string" || typeof row.equipmentDefinitionId !== "string") {
      throw new Error("Malformed persisted equipment instance.");
    }
    return {
      instanceId: row.instanceId,
      equipmentDefinitionId: row.equipmentDefinitionId,
    };
  });
}

export function restoreEquipmentInstances(
  rows: readonly PersistedEquipmentInstanceRow[],
  knownEquipmentDefinitionIds: readonly string[],
): EquipmentRestoreResult {
  try {
    const state = createEquipmentInventoryState(
      knownEquipmentDefinitionIds,
      parsePersistedRows(rows),
    );
    return {
      kind: "restored",
      state,
      snapshot: {
        schemaVersion: FANTASIA_EQUIPMENT_SCHEMA_VERSION,
        equipment: serializeEquipmentInventoryState(state),
      },
    };
  } catch (error) {
    return {
      kind: "rejected",
      reason: error instanceof Error ? error.message : "Equipment restoration failed.",
    };
  }
}
