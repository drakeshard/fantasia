import { describe, expect, it } from "vitest";
import {
  type ActorRpgDefinition,
  actorId,
  createActorRpgState,
  createBattlefieldState,
  createEncounterState,
  type DirectAttackDefinition,
  deserializeActorIdentityState,
  developmentGrayboxDamagePolicy,
  type EncounterDefinition,
  placeActorOnBattlefield,
  serializeActorId,
  serializeEncounterState,
} from "../../packages/game/src/index.ts";
import {
  createFantasiaEncounterSavePayload,
  createFantasiaSaveService,
  type EncounterRuntimeInput,
  EncounterRuntimeRunner,
  FANTASIA_DATA_SCHEMA_VERSION,
  FANTASIA_SAVE_FORMAT_VERSION,
  loadFantasiaEncounter,
  saveFantasiaEncounter,
} from "../../packages/runtime/src/index.ts";

class MemorySaveStorage {
  readonly records = new Map<string, string>();

  async read(slotId: string) {
    return { ok: true as const, value: this.records.get(slotId) ?? null };
  }

  async write(slotId: string, serialized: string) {
    this.records.set(slotId, serialized);
    return { ok: true as const, value: undefined };
  }

  async delete(slotId: string) {
    return { ok: true as const, value: this.records.delete(slotId) };
  }

  async list() {
    return { ok: true as const, value: [...this.records.keys()].sort() };
  }
}

const scoutId = actorId("i07:scout");
const heroId = actorId("i07:hero");
const lancerId = actorId("i07:lancer");

const rpgDefinitions: readonly ActorRpgDefinition[] = [
  {
    actorId: scoutId,
    classes: ["Archer"],
    initialClass: "Archer",
    attributes: {
      physicalPower: 10,
      magicalPower: 6,
      defense: 6,
      resistance: 7,
      speed: 12,
      stability: 7,
    },
    hp: { current: 80, capacity: 80 },
  },
  {
    actorId: heroId,
    classes: ["Infantry"],
    initialClass: "Infantry",
    attributes: {
      physicalPower: 12,
      magicalPower: 5,
      defense: 10,
      resistance: 7,
      speed: 8,
      stability: 10,
    },
    hp: { current: 100, capacity: 100 },
  },
  {
    actorId: lancerId,
    classes: ["Lancer"],
    initialClass: "Lancer",
    attributes: {
      physicalPower: 13,
      magicalPower: 4,
      defense: 5,
      resistance: 6,
      speed: 7,
      stability: 12,
    },
    hp: { current: 60, capacity: 60 },
  },
];

const probabilisticAttack: DirectAttackDefinition = {
  reference: "i07-basic",
  scaling: "physical-power",
  coefficient: 2,
  damageCategory: "physical",
  horizontalRange: { min: 1, max: 1 },
  horizontalRangeMetric: "manhattan",
  elevationReach: { upward: 1, downward: 1 },
  hitChance: 0.65,
  criticalChance: 0.25,
  criticalMultiplier: 1.5,
};

const fixedStep = { stepMs: 50, maxFrameDeltaMs: 250, maxStepsPerFrame: 5 } as const;
const gameVersion = "0.1.0-dev";
const contentVersion = "i07-content-v1";

function fixture() {
  const identities = deserializeActorIdentityState({
    associations: [
      { actorId: serializeActorId(scoutId), tacticalEntityId: "i07-tactical:scout" },
      { actorId: serializeActorId(heroId), tacticalEntityId: "i07-tactical:hero" },
      { actorId: serializeActorId(lancerId), tacticalEntityId: "i07-tactical:lancer" },
    ],
  });
  const rpg = createActorRpgState(rpgDefinitions);
  let battlefield = createBattlefieldState(
    { minX: 0, maxX: 3, minY: 0, maxY: 2 },
    [],
    [
      { coord: { x: 1, y: 1 }, level: 1 },
      { coord: { x: 2, y: 1 }, level: 1 },
    ],
  );
  for (const [id, coord] of [
    [scoutId, { x: 0, y: 1 }],
    [heroId, { x: 0, y: 0 }],
    [lancerId, { x: 2, y: 1 }],
  ] as const) {
    const placed = placeActorOnBattlefield(battlefield, identities, id, coord);
    if (placed.kind !== "placed") throw new Error("I07 fixture placement failed");
    battlefield = placed.state;
  }

  const definition: EncounterDefinition = {
    participants: [
      { actorId: scoutId, side: "player", sameSideTiePriority: 0, movementAllowance: 5 },
      { actorId: heroId, side: "player", sameSideTiePriority: 1, movementAllowance: 4 },
      { actorId: lancerId, side: "enemy", sameSideTiePriority: 0, movementAllowance: 4 },
    ],
    traversalRules: { moveCost: 1, maxClimb: 1, maxDrop: 1 },
    attacks: { [probabilisticAttack.reference]: probabilisticAttack },
  };

  return {
    identities,
    definition,
    state: createEncounterState(definition, rpg, battlefield),
  };
}

function runner(seed = 0x1234_5678) {
  const encounter = fixture();
  return {
    ...encounter,
    runner: new EncounterRuntimeRunner({
      runtime: { fixedStep, random: { kind: "seed", seed } },
      definition: encounter.definition,
      identities: encounter.identities,
      initialState: encounter.state,
      damagePolicy: developmentGrayboxDamagePolicy,
    }),
  };
}

function runInputs(runtime: EncounterRuntimeRunner, inputs: readonly EncounterRuntimeInput[]) {
  for (const input of inputs) {
    runtime.enqueue(input);
    runtime.advance(50);
  }
}

function authoritativeSnapshot(runtime: EncounterRuntimeRunner) {
  const snapshot = runtime.snapshot();
  return {
    runtime: snapshot.runtime,
    state: serializeEncounterState(snapshot.state),
    pendingInputs: snapshot.pendingInputs,
  };
}

function mutateStoredPayload(
  storage: MemorySaveStorage,
  slotId: string,
  mutation: (payload: Record<string, unknown>) => void,
) {
  const serialized = storage.records.get(slotId);
  if (serialized === undefined) throw new Error("Expected stored save envelope");
  const envelope = JSON.parse(serialized) as Record<string, unknown>;
  const payload = envelope.payload;
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    throw new Error("Expected object payload in stored envelope");
  }
  mutation(payload as Record<string, unknown>);
  storage.records.set(slotId, JSON.stringify(envelope));
}

describe("GAME-I07 aggregate persistence and compatibility", () => {
  it("save-load-reloads a mid-encounter aggregate and continues identically to uninterrupted play", async () => {
    const uninterrupted = runner();
    const reloadPath = runner();
    const prefix: readonly EncounterRuntimeInput[] = [
      { kind: "move", actorId: scoutId, goal: { x: 1, y: 1 } },
      {
        kind: "direct-attack",
        actorId: scoutId,
        defenderId: lancerId,
        attackReference: probabilisticAttack.reference,
      },
      { kind: "end-turn", actorId: scoutId },
    ];
    const suffix: readonly EncounterRuntimeInput[] = [
      { kind: "end-turn", actorId: heroId },
      {
        kind: "direct-attack",
        actorId: lancerId,
        defenderId: scoutId,
        attackReference: probabilisticAttack.reference,
      },
      { kind: "end-turn", actorId: lancerId },
      {
        kind: "direct-attack",
        actorId: scoutId,
        defenderId: lancerId,
        attackReference: probabilisticAttack.reference,
      },
    ];

    runInputs(uninterrupted.runner, prefix);
    runInputs(reloadPath.runner, prefix);
    expect(authoritativeSnapshot(reloadPath.runner)).toEqual(
      authoritativeSnapshot(uninterrupted.runner),
    );

    const checkpoint = reloadPath.runner.snapshot();
    expect(checkpoint.pendingInputs).toEqual([]);
    expect(serializeActorId(checkpoint.state.turn.activeActorId)).toBe("i07:hero");
    expect(checkpoint.state.turn.movementRemaining).toBe(4);
    expect(checkpoint.state.turn.mainActAvailable).toBe(true);

    const storage = new MemorySaveStorage();
    const saves = createFantasiaSaveService({
      storage,
      gameVersion,
      contentVersion,
      now: () => "2026-10-08T10:10:00.000Z",
    });
    expect(
      await saveFantasiaEncounter(saves, "encounter-a", checkpoint, reloadPath.identities, {
        gameVersion,
        contentVersion,
      }),
    ).toEqual({ kind: "success", value: undefined });

    const rawEnvelope = JSON.parse(storage.records.get("encounter-a") ?? "{}") as Record<
      string,
      unknown
    >;
    expect(rawEnvelope).toMatchObject({
      gameId: "fantasia",
      saveFormatVersion: FANTASIA_SAVE_FORMAT_VERSION,
      gameVersion,
      contentVersion,
      payload: {
        dataSchemaVersion: FANTASIA_DATA_SCHEMA_VERSION,
        producerGameVersion: gameVersion,
        contentVersion,
      },
    });

    const loaded = await loadFantasiaEncounter(saves, "encounter-a", {
      fixedStep,
      definition: reloadPath.definition,
      rpgDefinitions,
      damagePolicy: developmentGrayboxDamagePolicy,
      contentVersion,
    });
    expect(loaded.kind).toBe("success");
    if (loaded.kind !== "success" || loaded.value === null) {
      throw new Error("Expected restored encounter runtime");
    }

    expect(authoritativeSnapshot(loaded.value.runner)).toEqual(
      authoritativeSnapshot(reloadPath.runner),
    );
    expect(loaded.value.runner.snapshot().events).toEqual([]);

    runInputs(uninterrupted.runner, suffix);
    runInputs(loaded.value.runner, suffix);
    expect(JSON.stringify(authoritativeSnapshot(loaded.value.runner))).toBe(
      JSON.stringify(authoritativeSnapshot(uninterrupted.runner)),
    );
  });

  it("rejects save creation while future runtime inputs are still queued", () => {
    const encounter = runner();
    encounter.runner.enqueue({ kind: "end-turn", actorId: scoutId });

    expect(
      createFantasiaEncounterSavePayload(encounter.runner.snapshot(), encounter.identities, {
        gameVersion,
        contentVersion,
      }),
    ).toMatchObject({ kind: "rejected", reason: "pending-runtime-inputs" });
  });

  it("rejects unsupported data schema and incompatible content versions explicitly", async () => {
    const encounter = runner();
    const storage = new MemorySaveStorage();
    const saves = createFantasiaSaveService({
      storage,
      gameVersion,
      contentVersion,
      now: () => "2026-10-08T10:10:00.000Z",
    });
    const saved = await saveFantasiaEncounter(
      saves,
      "compatibility",
      encounter.runner.snapshot(),
      encounter.identities,
      { gameVersion, contentVersion },
    );
    expect(saved.kind).toBe("success");

    expect(
      await loadFantasiaEncounter(saves, "compatibility", {
        fixedStep,
        definition: encounter.definition,
        rpgDefinitions,
        damagePolicy: developmentGrayboxDamagePolicy,
        contentVersion: "different-content",
      }),
    ).toMatchObject({ kind: "rejected", reason: "incompatible-content" });

    mutateStoredPayload(storage, "compatibility", (payload) => {
      payload.dataSchemaVersion = 2;
    });
    expect(
      await loadFantasiaEncounter(saves, "compatibility", {
        fixedStep,
        definition: encounter.definition,
        rpgDefinitions,
        damagePolicy: developmentGrayboxDamagePolicy,
        contentVersion,
      }),
    ).toMatchObject({ kind: "rejected", reason: "unsupported-data-schema" });
  });

  it("rejects malformed turn state and outcome before constructing a runtime", async () => {
    const encounter = runner();
    const storage = new MemorySaveStorage();
    const saves = createFantasiaSaveService({
      storage,
      gameVersion,
      contentVersion,
      now: () => "2026-10-08T10:10:00.000Z",
    });
    await saveFantasiaEncounter(
      saves,
      "malformed",
      encounter.runner.snapshot(),
      encounter.identities,
      { gameVersion, contentVersion },
    );

    mutateStoredPayload(storage, "malformed", (payload) => {
      const encounterPayload = payload.encounter as Record<string, unknown>;
      const turn = encounterPayload.turn as Record<string, unknown>;
      turn.pendingActorIds = [];
    });
    expect(
      await loadFantasiaEncounter(saves, "malformed", {
        fixedStep,
        definition: encounter.definition,
        rpgDefinitions,
        damagePolicy: developmentGrayboxDamagePolicy,
        contentVersion,
      }),
    ).toMatchObject({ kind: "rejected", reason: "invalid-payload" });

    await saveFantasiaEncounter(
      saves,
      "malformed",
      encounter.runner.snapshot(),
      encounter.identities,
      { gameVersion, contentVersion },
    );
    mutateStoredPayload(storage, "malformed", (payload) => {
      const encounterPayload = payload.encounter as Record<string, unknown>;
      encounterPayload.outcome = "player-victory";
    });
    expect(
      await loadFantasiaEncounter(saves, "malformed", {
        fixedStep,
        definition: encounter.definition,
        rpgDefinitions,
        damagePolicy: developmentGrayboxDamagePolicy,
        contentVersion,
      }),
    ).toMatchObject({ kind: "rejected", reason: "invalid-payload" });
  });
});
