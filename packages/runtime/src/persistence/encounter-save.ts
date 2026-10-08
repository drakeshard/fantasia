import type { FixedStepConfig } from "@drakeshard/foundation/time";
import type {
  JsonValue,
  PersistenceFailure,
  SaveService,
  SaveSlotId,
} from "@drakeshard/foundation/storage";
import {
  type ActorIdentityState,
  type ActorRpgDefinition,
  battlefieldReadModel,
  deserializeActorIdentityState,
  deserializeEncounterState,
  type DamagePolicy,
  type EncounterDefinition,
  type SerializedActorIdentityState,
  type SerializedEncounterState,
  serializeActorIdentityState,
  serializeActorId,
  serializeEncounterState,
} from "@fantasia/game";
import type { DeterministicRngState } from "@drakeshard/foundation/random";
import {
  EncounterRuntimeRunner,
  type EncounterRuntimeSnapshot,
} from "../encounter-runner.js";

export const FANTASIA_DATA_SCHEMA_VERSION = 1 as const;

export interface FantasiaEncounterSavePayload {
  readonly dataSchemaVersion: typeof FANTASIA_DATA_SCHEMA_VERSION;
  readonly producerGameVersion: string;
  readonly contentVersion: string;
  readonly runtime: Readonly<{
    tick: number;
    random: DeterministicRngState;
  }>;
  readonly identities: SerializedActorIdentityState;
  readonly encounter: SerializedEncounterState;
}

export type EncounterSaveCompatibilityRejection =
  | "pending-runtime-inputs"
  | "invalid-payload"
  | "unsupported-data-schema"
  | "incompatible-content";

export type EncounterSaveResult<TValue> =
  | Readonly<{ kind: "success"; value: TValue }>
  | Readonly<{
      kind: "persistence-failure";
      error: PersistenceFailure;
    }>
  | Readonly<{
      kind: "rejected";
      reason: EncounterSaveCompatibilityRejection;
      diagnostic?: string;
    }>;

export interface RestoreEncounterRuntimeOptions {
  readonly fixedStep: FixedStepConfig;
  readonly definition: EncounterDefinition;
  readonly rpgDefinitions: readonly ActorRpgDefinition[];
  readonly damagePolicy: DamagePolicy;
  readonly contentVersion: string;
}

export interface RestoredEncounterRuntime {
  readonly runner: EncounterRuntimeRunner;
  readonly identities: ActorIdentityState;
  readonly producerGameVersion: string;
  readonly contentVersion: string;
}

function isRecord(value: JsonValue): value is { readonly [key: string]: JsonValue } {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asNonNegativeSafeInteger(value: JsonValue | undefined): number | undefined {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : undefined;
}

function asString(value: JsonValue | undefined): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function decodeRuntimeSnapshot(value: JsonValue | undefined): FantasiaEncounterSavePayload["runtime"] {
  if (value === undefined || !isRecord(value)) throw new RangeError("runtime must be an object");
  const tick = asNonNegativeSafeInteger(value.tick);
  if (tick === undefined) throw new RangeError("runtime.tick must be a non-negative safe integer");
  if (!isRecord(value.random)) throw new RangeError("runtime.random must be an object");
  const algorithm = asString(value.random.algorithm);
  const rawState = value.random.state;
  if (
    algorithm === undefined ||
    !Array.isArray(rawState) ||
    rawState.length !== 4 ||
    rawState.some(
      (entry) =>
        typeof entry !== "number" ||
        !Number.isInteger(entry) ||
        entry < 0 ||
        entry > 0xffff_ffff,
    )
  ) {
    throw new RangeError("runtime.random is invalid");
  }

  return {
    tick,
    random: {
      algorithm: algorithm as DeterministicRngState["algorithm"],
      state: rawState as unknown as DeterministicRngState["state"],
    },
  };
}

function jsonPayload(payload: FantasiaEncounterSavePayload): JsonValue {
  return payload as unknown as JsonValue;
}

export function createFantasiaEncounterSavePayload(
  snapshot: EncounterRuntimeSnapshot,
  identities: ActorIdentityState,
  versions: Readonly<{ gameVersion: string; contentVersion: string }>,
): EncounterSaveResult<FantasiaEncounterSavePayload> {
  if (snapshot.pendingInputs.length !== 0) {
    return { kind: "rejected", reason: "pending-runtime-inputs" };
  }
  if (versions.gameVersion.length === 0 || versions.contentVersion.length === 0) {
    return {
      kind: "rejected",
      reason: "invalid-payload",
      diagnostic: "gameVersion and contentVersion must be non-empty",
    };
  }

  return {
    kind: "success",
    value: {
      dataSchemaVersion: FANTASIA_DATA_SCHEMA_VERSION,
      producerGameVersion: versions.gameVersion,
      contentVersion: versions.contentVersion,
      runtime: {
        tick: snapshot.runtime.tick,
        random: {
          algorithm: snapshot.runtime.random.algorithm,
          state: [...snapshot.runtime.random.state] as DeterministicRngState["state"],
        },
      },
      identities: serializeActorIdentityState(identities),
      encounter: serializeEncounterState(snapshot.state),
    },
  };
}

function decodePayload(
  raw: JsonValue,
  options: RestoreEncounterRuntimeOptions,
): EncounterSaveResult<{
  payload: FantasiaEncounterSavePayload;
  identities: ActorIdentityState;
  state: ReturnType<typeof deserializeEncounterState>;
}> {
  if (!isRecord(raw)) return { kind: "rejected", reason: "invalid-payload" };

  const schemaVersion = raw.dataSchemaVersion;
  if (schemaVersion !== FANTASIA_DATA_SCHEMA_VERSION) {
    return { kind: "rejected", reason: "unsupported-data-schema" };
  }
  const producerGameVersion = asString(raw.producerGameVersion);
  const contentVersion = asString(raw.contentVersion);
  if (producerGameVersion === undefined || producerGameVersion.length === 0 || contentVersion === undefined) {
    return { kind: "rejected", reason: "invalid-payload" };
  }
  if (contentVersion !== options.contentVersion) {
    return { kind: "rejected", reason: "incompatible-content" };
  }
  if (!isRecord(raw.identities) || !isRecord(raw.encounter)) {
    return { kind: "rejected", reason: "invalid-payload" };
  }

  try {
    const runtime = decodeRuntimeSnapshot(raw.runtime);
    const identities = deserializeActorIdentityState(
      raw.identities as unknown as SerializedActorIdentityState,
    );
    const state = deserializeEncounterState(
      raw.encounter as unknown as SerializedEncounterState,
      options.definition,
      options.rpgDefinitions,
    );

    const battlefield = battlefieldReadModel(state.battlefield, identities);
    for (const participant of options.definition.participants) {
      const id = serializeActorId(participant.actorId);
      if (!battlefield.cells.some((cell) => cell.actorId !== undefined && serializeActorId(cell.actorId) === id)) {
        throw new RangeError(`Encounter participant is not placed on restored battlefield: ${id}`);
      }
    }

    return {
      kind: "success",
      value: {
        payload: {
          dataSchemaVersion: FANTASIA_DATA_SCHEMA_VERSION,
          producerGameVersion,
          contentVersion,
          runtime,
          identities: raw.identities as unknown as SerializedActorIdentityState,
          encounter: raw.encounter as unknown as SerializedEncounterState,
        },
        identities,
        state,
      },
    };
  } catch (error) {
    return {
      kind: "rejected",
      reason: "invalid-payload",
      diagnostic: error instanceof Error ? error.message : "Unknown aggregate save validation error",
    };
  }
}

export async function saveFantasiaEncounter(
  saves: SaveService<JsonValue>,
  slotId: SaveSlotId,
  snapshot: EncounterRuntimeSnapshot,
  identities: ActorIdentityState,
  versions: Readonly<{ gameVersion: string; contentVersion: string }>,
): Promise<EncounterSaveResult<void>> {
  const created = createFantasiaEncounterSavePayload(snapshot, identities, versions);
  if (created.kind !== "success") return created;

  const saved = await saves.save(slotId, jsonPayload(created.value));
  if (!saved.ok) return { kind: "persistence-failure", error: saved.error };
  return { kind: "success", value: undefined };
}

export async function loadFantasiaEncounter(
  saves: SaveService<JsonValue>,
  slotId: SaveSlotId,
  options: RestoreEncounterRuntimeOptions,
): Promise<EncounterSaveResult<RestoredEncounterRuntime | null>> {
  const loaded = await saves.load(slotId);
  if (!loaded.ok) return { kind: "persistence-failure", error: loaded.error };
  if (loaded.value === null) return { kind: "success", value: null };

  const decoded = decodePayload(loaded.value, options);
  if (decoded.kind !== "success") return decoded;

  const restored = decoded.value;
  try {
    return {
      kind: "success",
      value: {
        runner: new EncounterRuntimeRunner({
          runtime: {
            fixedStep: options.fixedStep,
            random: { kind: "state", state: restored.payload.runtime.random },
            initialTick: restored.payload.runtime.tick,
          },
          definition: options.definition,
          identities: restored.identities,
          initialState: restored.state,
          damagePolicy: options.damagePolicy,
        }),
        identities: restored.identities,
        producerGameVersion: restored.payload.producerGameVersion,
        contentVersion: restored.payload.contentVersion,
      },
    };
  } catch (error) {
    return {
      kind: "rejected",
      reason: "invalid-payload",
      diagnostic: error instanceof Error ? error.message : "Unable to restore runtime",
    };
  }
}
