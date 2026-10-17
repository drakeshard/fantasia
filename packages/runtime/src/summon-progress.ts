import {
  createSummonPersistenceState,
  type SerializedSummonHistoryEntry,
  type SerializedSummonState,
  serializeSummonPersistenceState,
  type SummonPersistenceState,
} from "@fantasia/game";

export const FANTASIA_SUMMON_SCHEMA_VERSION = 1 as const;

export interface PersistedSummonStateRow {
  readonly schemaVersion: unknown;
  readonly summonDefinitionId: unknown;
  readonly revision: unknown;
  readonly state: unknown;
}

export interface PersistedSummonHistoryRow {
  readonly entryId: unknown;
  readonly schemaVersion: unknown;
  readonly summonDefinitionId: unknown;
  readonly revision: unknown;
  readonly state: unknown;
}

export interface SummonSnapshot {
  readonly schemaVersion: typeof FANTASIA_SUMMON_SCHEMA_VERSION;
  readonly states: readonly SerializedSummonState[];
  readonly history: readonly SerializedSummonHistoryEntry[];
}

export type SummonRestoreResult =
  | Readonly<{
      kind: "restored";
      state: SummonPersistenceState;
      snapshot: SummonSnapshot;
    }>
  | Readonly<{ kind: "rejected"; reason: string }>;

function parseStates(rows: readonly PersistedSummonStateRow[]): readonly SerializedSummonState[] {
  return rows.map((row) => {
    if (row.schemaVersion !== FANTASIA_SUMMON_SCHEMA_VERSION) {
      throw new Error("Unsupported summon state schema version.");
    }
    if (
      typeof row.summonDefinitionId !== "string" ||
      typeof row.revision !== "number" ||
      row.state === null ||
      typeof row.state !== "object" ||
      Array.isArray(row.state)
    ) {
      throw new Error("Malformed persisted summon state.");
    }
    return {
      summonDefinitionId: row.summonDefinitionId,
      revision: row.revision,
      state: row.state,
    } as SerializedSummonState;
  });
}

function parseHistory(
  rows: readonly PersistedSummonHistoryRow[],
): readonly SerializedSummonHistoryEntry[] {
  return rows.map((row) => {
    if (row.schemaVersion !== FANTASIA_SUMMON_SCHEMA_VERSION) {
      throw new Error("Unsupported summon history schema version.");
    }
    if (
      typeof row.entryId !== "string" ||
      typeof row.summonDefinitionId !== "string" ||
      typeof row.revision !== "number" ||
      row.state === null ||
      typeof row.state !== "object" ||
      Array.isArray(row.state)
    ) {
      throw new Error("Malformed persisted summon history entry.");
    }
    return {
      entryId: row.entryId,
      summonDefinitionId: row.summonDefinitionId,
      revision: row.revision,
      state: row.state,
    } as SerializedSummonHistoryEntry;
  });
}

export function restoreSummonState(
  stateRows: readonly PersistedSummonStateRow[],
  historyRows: readonly PersistedSummonHistoryRow[],
  knownSummonDefinitionIds: readonly string[],
): SummonRestoreResult {
  try {
    const state = createSummonPersistenceState(
      knownSummonDefinitionIds,
      parseStates(stateRows),
      parseHistory(historyRows),
    );
    const serialized = serializeSummonPersistenceState(state);
    return {
      kind: "restored",
      state,
      snapshot: {
        schemaVersion: FANTASIA_SUMMON_SCHEMA_VERSION,
        states: serialized.states,
        history: serialized.history,
      },
    };
  } catch (error) {
    return {
      kind: "rejected",
      reason: error instanceof Error ? error.message : "Summon restoration failed.",
    };
  }
}
