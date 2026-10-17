declare const summonDefinitionIdBrand: unique symbol;
declare const summonHistoryEntryIdBrand: unique symbol;

/** Stable repository-owned summon-system definition reference. */
export type SummonDefinitionId = string & {
  readonly [summonDefinitionIdBrand]: "SummonDefinitionId";
};

/** Stable identity for one immutable summon-state history entry. */
export type SummonHistoryEntryId = string & {
  readonly [summonHistoryEntryIdBrand]: "SummonHistoryEntryId";
};

export type SummonJsonValue =
  | null
  | boolean
  | number
  | string
  | readonly SummonJsonValue[]
  | Readonly<{ [key: string]: SummonJsonValue }>;

export interface SerializedSummonState {
  readonly summonDefinitionId: string;
  readonly revision: number;
  readonly state: Readonly<{ [key: string]: SummonJsonValue }>;
}

export interface SerializedSummonHistoryEntry {
  readonly entryId: string;
  readonly summonDefinitionId: string;
  readonly revision: number;
  readonly state: Readonly<{ [key: string]: SummonJsonValue }>;
}

export interface SummonState {
  readonly summonDefinitionId: SummonDefinitionId;
  readonly revision: number;
  readonly state: Readonly<{ [key: string]: SummonJsonValue }>;
}

export interface SummonHistoryEntry {
  readonly entryId: SummonHistoryEntryId;
  readonly summonDefinitionId: SummonDefinitionId;
  readonly revision: number;
  readonly state: Readonly<{ [key: string]: SummonJsonValue }>;
}

export interface SummonPersistenceState {
  readonly states: readonly SummonState[];
  readonly history: readonly SummonHistoryEntry[];
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function assertPositiveSafeInteger(value: number, label: string): void {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`${label} must be a positive safe integer.`);
  }
}

export function summonDefinitionId(value: string): SummonDefinitionId {
  if (value.length === 0 || value.length > 128 || value !== value.trim()) {
    throw new Error(
      "Summon definition ID must be a trimmed non-empty string up to 128 characters.",
    );
  }
  return value as SummonDefinitionId;
}

export function summonHistoryEntryId(value: string): SummonHistoryEntryId {
  if (!UUID_PATTERN.test(value)) {
    throw new Error("Summon history entry ID must be a canonical UUID.");
  }
  return value.toLowerCase() as SummonHistoryEntryId;
}

function canonicalizeJsonValue(value: unknown, path: string): SummonJsonValue {
  if (value === null || typeof value === "boolean" || typeof value === "string") return value;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) throw new Error(`${path} contains a non-finite number.`);
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item, index) => canonicalizeJsonValue(item, `${path}[${index}]`));
  }
  if (typeof value === "object") {
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new Error(`${path} must contain only plain JSON objects.`);
    }
    const source = value as Record<string, unknown>;
    const result: Record<string, SummonJsonValue> = {};
    for (const key of Object.keys(source).sort()) {
      result[key] = canonicalizeJsonValue(source[key], `${path}.${key}`);
    }
    return result;
  }
  throw new Error(`${path} contains a non-JSON value.`);
}

function canonicalizeState(
  value: unknown,
  label: string,
): Readonly<{ [key: string]: SummonJsonValue }> {
  const canonical = canonicalizeJsonValue(value, label);
  if (canonical === null || Array.isArray(canonical) || typeof canonical !== "object") {
    throw new Error(`${label} must be a JSON object.`);
  }
  return canonical;
}

export function createSummonPersistenceState(
  knownSummonDefinitionIds: readonly string[],
  states: readonly SerializedSummonState[],
  history: readonly SerializedSummonHistoryEntry[],
): SummonPersistenceState {
  const known = new Set(knownSummonDefinitionIds.map((id) => summonDefinitionId(id)));
  const stateIds = new Set<SummonDefinitionId>();
  const restoredStates = states.map((item) => {
    const definitionId = summonDefinitionId(item.summonDefinitionId);
    if (!known.has(definitionId)) {
      throw new Error("Summon state references an unknown summon definition.");
    }
    if (stateIds.has(definitionId)) {
      throw new Error("Summon persistence contains duplicate current state.");
    }
    assertPositiveSafeInteger(item.revision, "Summon state revision");
    stateIds.add(definitionId);
    return {
      summonDefinitionId: definitionId,
      revision: item.revision,
      state: canonicalizeState(item.state, "Summon state"),
    };
  });

  const historyIds = new Set<SummonHistoryEntryId>();
  const latestByDefinition = new Map<SummonDefinitionId, SummonHistoryEntry>();
  const restoredHistory = history
    .map((item) => {
      const entryId = summonHistoryEntryId(item.entryId);
      const definitionId = summonDefinitionId(item.summonDefinitionId);
      if (!known.has(definitionId)) {
        throw new Error("Summon history references an unknown summon definition.");
      }
      if (historyIds.has(entryId)) {
        throw new Error("Summon persistence contains duplicate history entry ID.");
      }
      assertPositiveSafeInteger(item.revision, "Summon history revision");
      historyIds.add(entryId);
      return {
        entryId,
        summonDefinitionId: definitionId,
        revision: item.revision,
        state: canonicalizeState(item.state, "Summon history state"),
      };
    })
    .sort((left, right) => {
      const definitionOrder = left.summonDefinitionId.localeCompare(right.summonDefinitionId);
      if (definitionOrder !== 0) return definitionOrder;
      return left.revision - right.revision;
    });

  for (const entry of restoredHistory) {
    const previous = latestByDefinition.get(entry.summonDefinitionId);
    const expectedRevision = previous ? previous.revision + 1 : 1;
    if (entry.revision !== expectedRevision) {
      throw new Error("Summon history revisions must be contiguous from revision 1.");
    }
    latestByDefinition.set(entry.summonDefinitionId, entry);
  }

  const statesByDefinition = new Map(
    restoredStates.map((item) => [item.summonDefinitionId, item] as const),
  );
  if (statesByDefinition.size !== latestByDefinition.size) {
    throw new Error("Summon current state and history do not describe the same definitions.");
  }
  for (const [definitionId, latest] of latestByDefinition) {
    const current = statesByDefinition.get(definitionId);
    if (
      !current ||
      current.revision !== latest.revision ||
      JSON.stringify(current.state) !== JSON.stringify(latest.state)
    ) {
      throw new Error("Summon current state does not match the latest history entry.");
    }
  }

  return { states: restoredStates, history: restoredHistory };
}

export function serializeSummonPersistenceState(
  state: SummonPersistenceState,
): Readonly<{
  states: readonly SerializedSummonState[];
  history: readonly SerializedSummonHistoryEntry[];
}> {
  return {
    states: [...state.states]
      .sort((left, right) => left.summonDefinitionId.localeCompare(right.summonDefinitionId))
      .map((item) => ({
        summonDefinitionId: item.summonDefinitionId,
        revision: item.revision,
        state: item.state,
      })),
    history: [...state.history]
      .sort((left, right) => {
        const definitionOrder = left.summonDefinitionId.localeCompare(right.summonDefinitionId);
        if (definitionOrder !== 0) return definitionOrder;
        return left.revision - right.revision;
      })
      .map((item) => ({
        entryId: item.entryId,
        summonDefinitionId: item.summonDefinitionId,
        revision: item.revision,
        state: item.state,
      })),
  };
}
