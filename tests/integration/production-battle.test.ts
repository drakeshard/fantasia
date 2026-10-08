import { describe, expect, it } from "vitest";
import { ProductionBattleSession } from "../../packages/runtime/src/index.ts";

describe("GAME-I08 production battle presentation session", () => {
  it("mirrors the authoritative encounter aggregate without renderer state", () => {
    const first = new ProductionBattleSession().view();
    const second = new ProductionBattleSession().view();

    expect(JSON.stringify(second)).toBe(JSON.stringify(first));
    expect(first.title).toBe("Fantasia Production Battlefield");
    expect(first.actors).toHaveLength(3);
    expect(first.cells).toHaveLength(48);
    expect(first.round).toBe(1);
    expect(first.activeActorName).toBe("Scout");
    expect(first.selectedActorName).toBe("Scout");
    expect(first.selectedActorRole).toBe("Archer");
    expect(first.movementRemaining).toBe(5);
    expect(first.mainActAvailable).toBe(true);
    expect(first.outcome).toBe("ongoing");
    expect(first.runtimeTick).toBe(0);
    expect(first.cells.some((cell) => cell.elevation === 2)).toBe(true);
  });

  it("routes move, attack, and end-turn through fixed-tick encounter commands", () => {
    const battle = new ProductionBattleSession();
    const preview = battle.view({ x: 1, y: 5 });
    expect(preview.pathCost).toBe(1);

    const moved = battle.moveSelected({ x: 1, y: 5 });
    expect(moved.kind).toBe("applied");
    expect(moved.view.runtimeTick).toBe(1);
    expect(moved.view.movementRemaining).toBe(4);
    expect(moved.event?.kind).toBe("actor-moved");
    expect(
      moved.view.cells.find((cell) => cell.x === 1 && cell.y === 5)?.occupantActorId,
    ).toBe("production:scout");

    const attacked = battle.attackSelected("production:lancer");
    expect(attacked.kind).toBe("applied");
    expect(attacked.view.runtimeTick).toBe(2);
    expect(attacked.view.mainActAvailable).toBe(false);
    expect(attacked.view.actors.find((actor) => actor.id === "production:lancer")?.hpCurrent).toBe(
      101,
    );
    expect(attacked.event?.kind).toBe("direct-attack-resolved");

    const ended = battle.endTurn();
    expect(ended.kind).toBe("applied");
    expect(ended.view.runtimeTick).toBe(3);
    expect(ended.view.activeActorName).toBe("MC");
    expect(ended.view.selectedActorName).toBe("MC");
    expect(ended.view.movementRemaining).toBe(4);
    expect(ended.view.mainActAvailable).toBe(true);
  });

  it("keeps selection and path preview non-authoritative", () => {
    const battle = new ProductionBattleSession();
    const baseline = battle.view();
    const selected = battle.selectActor("production:hero");
    const preview = battle.view({ x: 1, y: 3 });

    expect(selected?.selectedActorName).toBe("MC");
    expect(selected?.activeActorName).toBe("Scout");
    expect(preview.runtimeTick).toBe(baseline.runtimeTick);
    expect(preview.round).toBe(baseline.round);
    expect(preview.actors.map((actor) => actor.hpCurrent)).toEqual(
      baseline.actors.map((actor) => actor.hpCurrent),
    );

    const rejected = battle.moveSelected({ x: 1, y: 3 });
    expect(rejected.kind).toBe("rejected");
    if (rejected.kind !== "rejected") return;
    expect(rejected.reason).toBe("not-active-actor");
    expect(rejected.view.runtimeTick).toBe(1);
  });
});
