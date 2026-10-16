import {
  createRosterState,
  type RosterState,
  type SerializedUnitInstance,
  serializeRosterState,
} from "@fantasia/game";

export const FANTASIA_ROSTER_SCHEMA_VERSION = 1 as const;

export interface PersistedUnitInstanceRow {
  readonly instanceId: unknown;
  readonly schemaVersion: unknown;
  readonly characterDefinitionId: unknown;
}

export interface RosterSnapshot {
  readonly schemaVersion: typeof FANTASIA_ROSTER_SCHEMA_VERSION;
  readonly units: readonly SerializedUnitInstance[];
}

export type RosterRestoreResult =
  | Readonly<{ kind: "restored"; state: RosterState; snapshot: RosterSnapshot }>
  | Readonly<{ kind: "rejected"; reason: string }>;

function parsePersistedRows(
  rows: readonly PersistedUnitInstanceRow[],
): readonly SerializedUnitInstance[] {
  return rows.map((row) => {
    if (row.schemaVersion !== FANTASIA_ROSTER_SCHEMA_VERSION) {
      throw new Error("Unsupported roster unit-instance schema version.");
    }
    if (typeof row.instanceId !== "string" || typeof row.characterDefinitionId !== "string") {
      throw new Error("Malformed persisted roster unit instance.");
    }
    return {
      instanceId: row.instanceId,
      characterDefinitionId: row.characterDefinitionId,
    };
  });
}

export function restoreRosterUnitInstances(
  rows: readonly PersistedUnitInstanceRow[],
  knownCharacterDefinitionIds: readonly string[],
): RosterRestoreResult {
  try {
    const state = createRosterState(knownCharacterDefinitionIds, parsePersistedRows(rows));
    return {
      kind: "restored",
      state,
      snapshot: {
        schemaVersion: FANTASIA_ROSTER_SCHEMA_VERSION,
        units: serializeRosterState(state),
      },
    };
  } catch (error) {
    return {
      kind: "rejected",
      reason: error instanceof Error ? error.message : "Roster restoration failed.",
    };
  }
}
