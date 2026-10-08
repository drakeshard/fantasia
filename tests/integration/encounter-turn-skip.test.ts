import { describe, expect, it } from "vitest";
import {
  type ActorRpgDefinition,
  actorId,
  advanceEncounterTurnState,
  createActorRpgState,
  createEncounterTurnState,
  damageActorHp,
  serializeActorId,
} from "../../packages/game/src/index.ts";

const scoutId = actorId("i06-skip:scout");
const heroId = actorId("i06-skip:hero");
const lancerId = actorId("i06-skip:lancer");
const enemyArcherId = actorId("i06-skip:enemy-archer");

function actorDefinition(
  actorIdValue: ReturnType<typeof actorId>,
  initialClass: string,
  speed: number,
): ActorRpgDefinition {
  return {
    actorId: actorIdValue,
    classes: [initialClass],
    initialClass,
    attributes: {
      physicalPower: 10,
      magicalPower: 5,
      defense: 7,
      resistance: 7,
      speed,
      stability: 8,
    },
    hp: { current: 20, capacity: 20 },
  };
}

describe("GAME-I06 encounter turn eligibility", () => {
  it("skips a zero-HP participant while another enemy keeps the encounter eligible to continue", () => {
    const participants = [
      { actorId: scoutId, side: "player" as const, sameSideTiePriority: 0, movementAllowance: 5 },
      { actorId: heroId, side: "player" as const, sameSideTiePriority: 1, movementAllowance: 4 },
      { actorId: lancerId, side: "enemy" as const, sameSideTiePriority: 0, movementAllowance: 4 },
      {
        actorId: enemyArcherId,
        side: "enemy" as const,
        sameSideTiePriority: 1,
        movementAllowance: 4,
      },
    ];
    let rpg = createActorRpgState([
      actorDefinition(scoutId, "Archer", 12),
      actorDefinition(heroId, "Infantry", 8),
      actorDefinition(lancerId, "Lancer", 7),
      actorDefinition(enemyArcherId, "Archer", 6),
    ]);
    let turn = createEncounterTurnState(participants, rpg);

    expect(serializeActorId(turn.activeActorId)).toBe("i06-skip:scout");
    turn = advanceEncounterTurnState(turn, participants, rpg);
    expect(serializeActorId(turn.activeActorId)).toBe("i06-skip:hero");

    const incapacitated = damageActorHp(rpg, lancerId, 20);
    expect(incapacitated.kind).toBe("changed");
    if (incapacitated.kind !== "changed") throw new Error("Expected Lancer HP to reach zero");
    rpg = incapacitated.state;

    turn = advanceEncounterTurnState(turn, participants, rpg);
    expect(serializeActorId(turn.activeActorId)).toBe("i06-skip:enemy-archer");
    expect(turn.round).toBe(1);
    expect(turn.pendingActorIds.map(serializeActorId)).toEqual(["i06-skip:enemy-archer"]);

    turn = advanceEncounterTurnState(turn, participants, rpg);
    expect(turn.round).toBe(2);
    expect(turn.pendingActorIds.map(serializeActorId)).toEqual([
      "i06-skip:scout",
      "i06-skip:hero",
      "i06-skip:enemy-archer",
    ]);
  });
});
