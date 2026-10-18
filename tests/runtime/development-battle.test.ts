import { describe, expect, it } from "vitest";
import { DevelopmentBattleSession } from "../../packages/runtime/src/index.ts";

describe("GAME-I05 development battle session", () => {
  it("exposes deterministic tactical, RPG, and turn read models", () => {
    const first = new DevelopmentBattleSession().view();
    const second = new DevelopmentBattleSession().view();

    expect(JSON.stringify(second)).toBe(JSON.stringify(first));
    expect(first.actors).toHaveLength(3);
    expect(first.cells).toHaveLength(48);
    expect(first.activeActorName).toBe("Scout");
    expect(first.selectedActorName).toBe("Scout");
    expect(first.selectedActorRole).toBe("Archer");
    expect(first.selectedHpCurrent).toBe(80);
    expect(first.selectedHpCapacity).toBe(80);
    expect(first.movementRemaining).toBe(5);
    expect(first.mainActAvailable).toBe(true);
    expect(first.selectedAttributes).toEqual({
      physicalPower: 10,
      magicalPower: 6,
      defense: 6,
      resistance: 7,
      speed: 12,
      stability: 7,
    });
    expect(first.cells.some((cell) => cell.blocked)).toBe(true);
    expect(first.cells.some((cell) => cell.elevation > 0)).toBe(true);
    expect(first.cells.some((cell) => cell.reachable && cell.reachableCost === 1)).toBe(true);
  });

  it("spends active-turn movement by authoritative path cost", () => {
    const battle = new DevelopmentBattleSession();
    const preview = battle.view({ x: 1, y: 5 });

    expect(preview.pathCost).toBe(1);
    const moved = battle.moveSelected({ x: 1, y: 5 });
    expect(moved.kind).toBe("moved");
    if (moved.kind !== "moved") return;

    const destination = moved.view.cells.find((cell) => cell.x === 1 && cell.y === 5);
    expect(destination?.occupantActorId).toBe("dev:scout");
    expect(moved.view.movementRemaining).toBe(4);

    battle.selectActor("dev:mc");
    expect(battle.moveSelected({ x: 1, y: 3 })).toEqual({
      kind: "rejected",
      reason: "not-active-actor",
    });
  });

  it("resolves an authoritative basic attack into RPG HP and consumes the Main Act", () => {
    const battle = new DevelopmentBattleSession();
    const result = battle.attackSelected("dev:lancer");

    expect(result.kind).toBe("resolved");
    if (result.kind !== "resolved") return;
    expect(result.attackerName).toBe("Scout");
    expect(result.defenderName).toBe("Lancer");
    expect(result.damage).toBe(9);
    expect(result.critical).toBe(false);
    expect(result.view.mainActAvailable).toBe(false);
    expect(result.view.actors.find((actor) => actor.id === "dev:lancer")?.hpCurrent).toBe(101);
    expect(battle.attackSelected("dev:lancer")).toEqual({
      kind: "rejected",
      reason: "main-act-spent",
    });
  });

  it("allows inspection of another actor without giving it the active turn", () => {
    const battle = new DevelopmentBattleSession();
    const selected = battle.selectActor("dev:mc");

    expect(selected?.selectedActorName).toBe("MC");
    expect(selected?.selectedActorRole).toBe("Infantry");
    expect(selected?.selectedHpCurrent).toBe(100);
    expect(selected?.selectedAttributes.speed).toBe(8);
    expect(selected?.activeActorName).toBe("Scout");
    expect(battle.attackSelected("dev:lancer")).toEqual({
      kind: "rejected",
      reason: "not-active-actor",
    });
  });
});
