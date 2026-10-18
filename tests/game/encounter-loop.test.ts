import { describe, expect, it } from "vitest";
import {
  type ActorRpgDefinition,
  actorId,
  actorRpgProfile,
  applyEncounterCommand,
  createActorRpgState,
  createBattlefieldState,
  createEncounterState,
  type DirectAttackDefinition,
  deserializeActorIdentityState,
  developmentGrayboxDamagePolicy,
  type EncounterDefinition,
  placeActorOnBattlefield,
  serializeActorId,
} from "../../packages/game/src/index.ts";
import { EncounterRuntimeRunner } from "../../packages/runtime/src/index.ts";

const scoutId = actorId("i06:scout");
const heroId = actorId("i06:hero");
const lancerId = actorId("i06:lancer");

const actorDefinitions: readonly ActorRpgDefinition[] = [
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
    hp: { current: 25, capacity: 25 },
  },
];

const basicAttack: DirectAttackDefinition = {
  reference: "i06-basic",
  scaling: "physical-power",
  coefficient: 2,
  damageCategory: "physical",
  horizontalRange: { min: 1, max: 1 },
  horizontalRangeMetric: "manhattan",
  elevationReach: { upward: 1, downward: 1 },
  hitChance: 1,
  criticalChance: 0,
  criticalMultiplier: 1.5,
};

const probabilisticAttack: DirectAttackDefinition = {
  ...basicAttack,
  reference: "i06-probabilistic",
  hitChance: 0.5,
};

function fixture(attack: DirectAttackDefinition = basicAttack) {
  const identities = deserializeActorIdentityState({
    associations: [
      { actorId: serializeActorId(scoutId), tacticalEntityId: "i06-tactical:scout" },
      { actorId: serializeActorId(heroId), tacticalEntityId: "i06-tactical:hero" },
      { actorId: serializeActorId(lancerId), tacticalEntityId: "i06-tactical:lancer" },
    ],
  });
  const rpg = createActorRpgState(actorDefinitions);
  let battlefield = createBattlefieldState(
    { minX: 0, maxX: 3, minY: 0, maxY: 2 },
    [],
    [
      { coord: { x: 1, y: 1 }, level: 1 },
      { coord: { x: 2, y: 1 }, level: 1 },
    ],
  );
  for (const [actorIdValue, coord] of [
    [scoutId, { x: 0, y: 1 }],
    [heroId, { x: 0, y: 0 }],
    [lancerId, { x: 2, y: 1 }],
  ] as const) {
    const placed = placeActorOnBattlefield(battlefield, identities, actorIdValue, coord);
    if (placed.kind !== "placed") throw new Error("I06 fixture placement failed");
    battlefield = placed.state;
  }

  const definition: EncounterDefinition = {
    participants: [
      { actorId: scoutId, side: "player", sameSideTiePriority: 0, movementAllowance: 5 },
      { actorId: heroId, side: "player", sameSideTiePriority: 1, movementAllowance: 4 },
      { actorId: lancerId, side: "enemy", sameSideTiePriority: 0, movementAllowance: 4 },
    ],
    traversalRules: { moveCost: 1, maxClimb: 1, maxDrop: 1 },
    attacks: { [attack.reference]: attack },
  };

  return {
    definition,
    identities,
    state: createEncounterState(definition, rpg, battlefield),
  };
}

function applyOrThrow(
  input: ReturnType<typeof fixture>,
  command: Parameters<typeof applyEncounterCommand>[4],
) {
  const result = applyEncounterCommand(
    input.state,
    input.definition,
    input.identities,
    developmentGrayboxDamagePolicy,
    command,
  );
  expect(result.kind).toBe("applied");
  if (result.kind !== "applied") throw new Error(`Encounter command rejected: ${result.reason}`);
  input.state = result.state;
  return result.state;
}

describe("GAME-I06 deterministic tactical-RPG encounter", () => {
  it("runs multiple actors through movement, combat, round progression, and elimination victory", () => {
    const encounter = fixture();
    expect(serializeActorId(encounter.state.turn.activeActorId)).toBe("i06:scout");
    expect(encounter.state.turn.round).toBe(1);

    let state = applyOrThrow(encounter, { kind: "move", actorId: scoutId, goal: { x: 1, y: 1 } });
    expect(state.turn.movementRemaining).toBe(4);
    expect(state.events.at(-1)).toMatchObject({ kind: "actor-moved", pathCost: 1 });

    state = applyOrThrow(encounter, {
      kind: "direct-attack",
      actorId: scoutId,
      defenderId: lancerId,
      attackReference: basicAttack.reference,
      rolls: { hit: 0.5, critical: 0.5 },
    });
    expect(actorRpgProfile(state.rpg, lancerId)?.hp.current).toBe(10);
    expect(state.turn.mainActAvailable).toBe(false);
    expect(state.outcome).toBe("ongoing");

    state = applyOrThrow(encounter, { kind: "end-turn", actorId: scoutId });
    expect(serializeActorId(state.turn.activeActorId)).toBe("i06:hero");
    state = applyOrThrow(encounter, { kind: "end-turn", actorId: heroId });
    expect(serializeActorId(state.turn.activeActorId)).toBe("i06:lancer");

    state = applyOrThrow(encounter, {
      kind: "direct-attack",
      actorId: lancerId,
      defenderId: scoutId,
      attackReference: basicAttack.reference,
      rolls: { hit: 0.5, critical: 0.5 },
    });
    expect(actorRpgProfile(state.rpg, scoutId)?.hp.current).toBe(60);
    state = applyOrThrow(encounter, { kind: "end-turn", actorId: lancerId });
    expect(state.turn.round).toBe(2);
    expect(serializeActorId(state.turn.activeActorId)).toBe("i06:scout");
    expect(state.turn.movementRemaining).toBe(5);
    expect(state.turn.mainActAvailable).toBe(true);

    state = applyOrThrow(encounter, {
      kind: "direct-attack",
      actorId: scoutId,
      defenderId: lancerId,
      attackReference: basicAttack.reference,
      rolls: { hit: 0.5, critical: 0.5 },
    });
    expect(actorRpgProfile(state.rpg, lancerId)?.hp.current).toBe(0);
    expect(state.outcome).toBe("player-victory");
    expect(state.events.at(-1)).toEqual({ kind: "encounter-ended", outcome: "player-victory" });

    const rejected = applyEncounterCommand(
      state,
      encounter.definition,
      encounter.identities,
      developmentGrayboxDamagePolicy,
      { kind: "end-turn", actorId: scoutId },
    );
    expect(rejected).toMatchObject({ kind: "rejected", reason: "encounter-ended" });
  });

  it("replays the same ordered inputs, RNG seed, ticks, and policy to an identical authoritative snapshot", () => {
    const inputs = [
      { kind: "move", actorId: scoutId, goal: { x: 1, y: 1 } },
      {
        kind: "direct-attack",
        actorId: scoutId,
        defenderId: lancerId,
        attackReference: basicAttack.reference,
      },
      { kind: "end-turn", actorId: scoutId },
      { kind: "end-turn", actorId: heroId },
      {
        kind: "direct-attack",
        actorId: lancerId,
        defenderId: scoutId,
        attackReference: basicAttack.reference,
      },
      { kind: "end-turn", actorId: lancerId },
      {
        kind: "direct-attack",
        actorId: scoutId,
        defenderId: lancerId,
        attackReference: basicAttack.reference,
      },
    ] as const;

    function run() {
      const encounter = fixture();
      const runner = new EncounterRuntimeRunner({
        runtime: {
          fixedStep: { stepMs: 50, maxFrameDeltaMs: 250, maxStepsPerFrame: 5 },
          random: { kind: "seed", seed: 123456 },
        },
        definition: encounter.definition,
        identities: encounter.identities,
        initialState: encounter.state,
        damagePolicy: developmentGrayboxDamagePolicy,
      });
      runner.enqueueAll(inputs);
      for (let index = 0; index < inputs.length; index += 1) runner.advance(50);
      return runner.snapshot();
    }

    expect(JSON.stringify(run())).toBe(JSON.stringify(run()));
    expect(run().state.outcome).toBe("player-victory");
  });

  it("uses the RNG stream only for processed attacks and permits different streams to change a probabilistic result", () => {
    const outcomes = new Set<number>();

    for (let seed = 0; seed < 64; seed += 1) {
      const encounter = fixture(probabilisticAttack);
      const runner = new EncounterRuntimeRunner({
        runtime: {
          fixedStep: { stepMs: 50, maxFrameDeltaMs: 250, maxStepsPerFrame: 5 },
          random: { kind: "seed", seed },
        },
        definition: encounter.definition,
        identities: encounter.identities,
        initialState: encounter.state,
        damagePolicy: developmentGrayboxDamagePolicy,
      });
      runner.enqueueAll([
        { kind: "move", actorId: scoutId, goal: { x: 1, y: 1 } },
        {
          kind: "direct-attack",
          actorId: scoutId,
          defenderId: lancerId,
          attackReference: probabilisticAttack.reference,
        },
      ]);
      runner.advance(50);
      const afterMove = runner.snapshot();
      runner.advance(50);
      const afterAttack = runner.snapshot();

      expect(afterMove.runtime.random).toEqual(
        new EncounterRuntimeRunner({
          runtime: {
            fixedStep: { stepMs: 50, maxFrameDeltaMs: 250, maxStepsPerFrame: 5 },
            random: { kind: "seed", seed },
          },
          definition: encounter.definition,
          identities: encounter.identities,
          initialState: encounter.state,
          damagePolicy: developmentGrayboxDamagePolicy,
        }).snapshot().runtime.random,
      );
      outcomes.add(actorRpgProfile(afterAttack.state.rpg, lancerId)?.hp.current ?? -1);
    }

    expect(outcomes.has(25)).toBe(true);
    expect(outcomes.has(10)).toBe(true);
  });
});
