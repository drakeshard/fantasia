import { describe, expect, it } from "vitest";
import {
  actorId,
  combatEffectiveness,
  createActorRpgState,
  createBattlefieldState,
  createEncounterTurnState,
  damageActorHp,
  deserializeActorIdentityState,
  type DirectAttackDefinition,
  placeActorOnBattlefield,
  resolveDirectAttack,
  serializeActorId,
  type ActorRpgDefinition,
  type CombatParticipant,
  type DamagePolicyInput,
} from "../../packages/game/src/index.ts";

const attackerId = actorId("combat:attacker");
const defenderId = actorId("combat:defender");

function definition(
  id: ReturnType<typeof actorId>,
  initialClass: string,
  speed: number,
  overrides: Partial<ActorRpgDefinition["attributes"]> = {},
): ActorRpgDefinition {
  return {
    actorId: id,
    classes: [initialClass],
    initialClass,
    attributes: {
      physicalPower: 20,
      magicalPower: 18,
      defense: 8,
      resistance: 6,
      speed,
      stability: 10,
      ...overrides,
    },
    hp: { current: 100, capacity: 100 },
  };
}

const baseAttack: DirectAttackDefinition = {
  reference: "test-strike",
  scaling: "physical-power",
  coefficient: 1,
  damageCategory: "physical",
  horizontalRange: { min: 1, max: 1 },
  horizontalRangeMetric: "manhattan",
  elevationReach: { upward: 1, downward: 1 },
  hitChance: 1,
  criticalChance: 0,
  criticalMultiplier: 1.5,
};

function combatFixture() {
  const definitions = [
    definition(attackerId, "Holy", 12),
    definition(defenderId, "Demon", 8, { defense: 9, resistance: 4 }),
  ] as const;
  const rpg = createActorRpgState(definitions);
  const identities = deserializeActorIdentityState({
    associations: [
      { actorId: serializeActorId(attackerId), tacticalEntityId: "combat:tactical:attacker" },
      { actorId: serializeActorId(defenderId), tacticalEntityId: "combat:tactical:defender" },
    ],
  });
  let battlefield = createBattlefieldState({ minX: 0, maxX: 2, minY: 0, maxY: 0 });
  const attackerPlaced = placeActorOnBattlefield(battlefield, identities, attackerId, { x: 0, y: 0 });
  if (attackerPlaced.kind !== "placed") throw new Error("Failed to place combat attacker fixture");
  battlefield = attackerPlaced.state;
  const defenderPlaced = placeActorOnBattlefield(battlefield, identities, defenderId, { x: 1, y: 0 });
  if (defenderPlaced.kind !== "placed") throw new Error("Failed to place combat defender fixture");
  battlefield = defenderPlaced.state;
  const participants: readonly CombatParticipant[] = [
    { actorId: attackerId, side: "player" },
    { actorId: defenderId, side: "enemy" },
  ];
  return { definitions, rpg, identities, battlefield, participants };
}

describe("GAME-I05 combat effectiveness", () => {
  it("combines approved class/category/element modifier portions additively", () => {
    expect(combatEffectiveness("Lancer", "Infantry", "physical", "fire")).toEqual({
      classMultiplier: 0.8,
      damageCategoryMultiplier: 1,
      elementalMultiplier: 1.25,
      combinedMultiplier: 1.05,
    });
    expect(combatEffectiveness("Archer", "Aquatic", "magical", "lightning").combinedMultiplier).toBeCloseTo(1.35);
    expect(combatEffectiveness("Archer", "Flyer", "magical", "wind").combinedMultiplier).toBeCloseTo(1.6);
    expect(combatEffectiveness("Holy", "Demon", "magical", "light").combinedMultiplier).toBeCloseTo(2.25);
    expect(combatEffectiveness("Demon", "Holy", "physical", "dark")).toEqual({
      classMultiplier: 0.5,
      damageCategoryMultiplier: 1,
      elementalMultiplier: 1.25,
      combinedMultiplier: 0.75,
    });
    expect(combatEffectiveness("Sorcerer", "Holy", "magical", "light").elementalMultiplier).toBe(0.9);
  });
});

describe("GAME-I05 direct attack resolution", () => {
  it("selects Defense, Resistance, or no ordinary mitigation from the damage category", () => {
    const fixture = combatFixture();
    const captured: DamagePolicyInput[] = [];
    const policy = (input: DamagePolicyInput) => {
      captured.push(input);
      return 1;
    };

    const categories = ["physical", "magical", "piercing"] as const;
    for (const damageCategory of categories) {
      const outcome = resolveDirectAttack({
        definition: { ...baseAttack, damageCategory },
        attackerId,
        defenderId,
        participants: fixture.participants,
        rpg: fixture.rpg,
        battlefield: fixture.battlefield,
        identities: fixture.identities,
        rolls: { hit: 0, critical: 0.99 },
        damagePolicy: policy,
      });
      expect(outcome.kind).toBe("resolved");
    }

    expect(captured.map((input) => input.mitigation)).toEqual([
      { kind: "defense", value: 9 },
      { kind: "resistance", value: 4 },
      null,
    ]);
  });

  it("uses explicit hit/critical rolls and clamps RPG HP transitions at zero", () => {
    const fixture = combatFixture();
    const missed = resolveDirectAttack({
      definition: { ...baseAttack, hitChance: 0.5 },
      attackerId,
      defenderId,
      participants: fixture.participants,
      rpg: fixture.rpg,
      battlefield: fixture.battlefield,
      identities: fixture.identities,
      rolls: { hit: 0.75, critical: 0 },
      damagePolicy: () => 999,
    });
    expect(missed.kind).toBe("missed");

    let criticalMultiplier = 0;
    const resolved = resolveDirectAttack({
      definition: { ...baseAttack, criticalChance: 0.5 },
      attackerId,
      defenderId,
      participants: fixture.participants,
      rpg: fixture.rpg,
      battlefield: fixture.battlefield,
      identities: fixture.identities,
      rolls: { hit: 0.25, critical: 0.25 },
      damagePolicy: (input) => {
        criticalMultiplier = input.criticalMultiplier;
        return 150;
      },
    });
    expect(resolved.kind).toBe("resolved");
    if (resolved.kind !== "resolved") return;
    expect(criticalMultiplier).toBe(1.5);
    expect(resolved.event.requestedDamage).toBe(150);
    expect(resolved.event.appliedDamage).toBe(100);
    expect(resolved.event.hpAfter).toBe(0);
  });

  it("rejects friendly fire, range violations, and malformed rolls without mutation", () => {
    const fixture = combatFixture();
    const sameSide = resolveDirectAttack({
      definition: baseAttack,
      attackerId,
      defenderId,
      participants: fixture.participants.map((participant) => ({ ...participant, side: "player" })),
      rpg: fixture.rpg,
      battlefield: fixture.battlefield,
      identities: fixture.identities,
      rolls: { hit: 0, critical: 0 },
      damagePolicy: () => 10,
    });
    expect(sameSide).toMatchObject({ kind: "rejected", reason: "same-side-target" });

    const range = resolveDirectAttack({
      definition: { ...baseAttack, horizontalRange: { min: 2, max: 3 } },
      attackerId,
      defenderId,
      participants: fixture.participants,
      rpg: fixture.rpg,
      battlefield: fixture.battlefield,
      identities: fixture.identities,
      rolls: { hit: 0, critical: 0 },
      damagePolicy: () => 10,
    });
    expect(range).toMatchObject({ kind: "rejected", reason: "out-of-range" });

    const rolls = resolveDirectAttack({
      definition: baseAttack,
      attackerId,
      defenderId,
      participants: fixture.participants,
      rpg: fixture.rpg,
      battlefield: fixture.battlefield,
      identities: fixture.identities,
      rolls: { hit: 1, critical: 0 },
      damagePolicy: () => 10,
    });
    expect(rolls).toMatchObject({ kind: "rejected", reason: "invalid-rolls" });
  });
});

describe("GAME-I05 encounter turn skeleton", () => {
  it("orders by Speed, favors player on opposing-side ties, and uses explicit same-side priority", () => {
    const playerFast = actorId("turn:player-fast");
    const playerPeer = actorId("turn:player-peer");
    const enemyPeer = actorId("turn:enemy-peer");
    const rpg = createActorRpgState([
      definition(playerFast, "Archer", 12),
      definition(playerPeer, "Infantry", 10),
      definition(enemyPeer, "Lancer", 10),
    ]);
    const turn = createEncounterTurnState(
      [
        { actorId: enemyPeer, side: "enemy", sameSideTiePriority: 0, movementAllowance: 4 },
        { actorId: playerPeer, side: "player", sameSideTiePriority: 1, movementAllowance: 4 },
        { actorId: playerFast, side: "player", sameSideTiePriority: 0, movementAllowance: 5 },
      ],
      rpg,
    );

    expect(turn.pendingActorIds.map(serializeActorId)).toEqual([
      "turn:player-fast",
      "turn:player-peer",
      "turn:enemy-peer",
    ]);
    expect(turn.movementRemaining).toBe(5);
    expect(turn.mainActAvailable).toBe(true);
  });

  it("rejects ambiguous same-side equal-Speed ties instead of freezing an implicit rule", () => {
    const left = actorId("turn:left");
    const right = actorId("turn:right");
    const rpg = createActorRpgState([
      definition(left, "Infantry", 10),
      definition(right, "Archer", 10),
    ]);

    expect(() =>
      createEncounterTurnState(
        [
          { actorId: left, side: "player", sameSideTiePriority: 0, movementAllowance: 4 },
          { actorId: right, side: "player", sameSideTiePriority: 0, movementAllowance: 5 },
        ],
        rpg,
      ),
    ).toThrow(/Ambiguous same-side Speed tie/);
  });

  it("uses the RPG resource transition when applying direct HP damage", () => {
    const rpg = createActorRpgState([definition(defenderId, "Infantry", 8)]);
    const damaged = damageActorHp(rpg, defenderId, 125);
    expect(damaged.kind).toBe("changed");
    if (damaged.kind !== "changed") return;
    expect(damaged.current).toBe(0);
    expect(damaged.applied).toBe(100);
  });
});
