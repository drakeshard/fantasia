import {
  createAccountTalentState,
  deserializeAccountTalentState,
  LANCER_CLASS_TALENT_SCAFFOLD,
  serializeAccountTalentState,
  type AccountTalentState,
  type SerializedAccountTalentState,
  type TalentTreeDefinition,
} from "@fantasia/game";

export const FANTASIA_TALENT_PROGRESS_SCHEMA_VERSION = 1 as const;

const FANTASIA_TALENT_CATALOG: readonly TalentTreeDefinition[] = [LANCER_CLASS_TALENT_SCAFFOLD];

export interface TalentProgressSnapshot {
  readonly schemaVersion: typeof FANTASIA_TALENT_PROGRESS_SCHEMA_VERSION;
  readonly state: SerializedAccountTalentState;
}

export type TalentProgressRestoreResult =
  | Readonly<{ kind: "restored"; state: AccountTalentState; snapshot: TalentProgressSnapshot }>
  | Readonly<{ kind: "rejected"; reason: string }>;

export function emptyTalentProgressSnapshot(): TalentProgressSnapshot {
  return {
    schemaVersion: FANTASIA_TALENT_PROGRESS_SCHEMA_VERSION,
    state: serializeAccountTalentState(createAccountTalentState()),
  };
}

function isSerializedTalentState(value: unknown): value is SerializedAccountTalentState {
  if (value === null || typeof value !== "object") return false;
  const trees = (value as { trees?: unknown }).trees;
  if (!Array.isArray(trees)) return false;
  return trees.every((tree) => {
    if (tree === null || typeof tree !== "object") return false;
    const candidate = tree as { treeId?: unknown; nodes?: unknown };
    if (typeof candidate.treeId !== "string" || !Array.isArray(candidate.nodes)) return false;
    return candidate.nodes.every((node) => {
      if (node === null || typeof node !== "object") return false;
      const investment = node as { nodeId?: unknown; rank?: unknown };
      return typeof investment.nodeId === "string" && typeof investment.rank === "number";
    });
  });
}

export function restoreTalentProgress(
  schemaVersion: unknown,
  state: unknown,
): TalentProgressRestoreResult {
  if (schemaVersion !== FANTASIA_TALENT_PROGRESS_SCHEMA_VERSION) {
    return { kind: "rejected", reason: "Unsupported Talent progress schema version." };
  }
  if (!isSerializedTalentState(state)) {
    return { kind: "rejected", reason: "Malformed serialized Talent progress." };
  }

  try {
    const restored = deserializeAccountTalentState(FANTASIA_TALENT_CATALOG, state);
    return {
      kind: "restored",
      state: restored,
      snapshot: {
        schemaVersion: FANTASIA_TALENT_PROGRESS_SCHEMA_VERSION,
        state: serializeAccountTalentState(restored),
      },
    };
  } catch (error) {
    return {
      kind: "rejected",
      reason: error instanceof Error ? error.message : "Talent progress restoration failed.",
    };
  }
}
