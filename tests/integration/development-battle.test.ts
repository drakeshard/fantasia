import { describe, expect, it } from "vitest";
import { DevelopmentBattleSession } from "../../packages/runtime/src/index.ts";

describe("GAME-UI01 development battle session", () => {
  it("exposes deterministic tactical and RPG read models with selectable actors", () => {
    const first = new DevelopmentBattleSession().view();
    const second = new DevelopmentBattleSession().view();

    expect(JSON.stringify(second)).toBe(JSON.stringify(first));
    expect(first.actors).toHaveLength(3);
    expect(first.cells).toHaveLength(48);
    expect(first.selectedActorName).toBe("MC");
    expect(first.selectedActorRole).toBe("Infantry");
    expect(first.selectedHpCurrent).toBe(100);
    expect(first.selectedHpCapacity).toBe(100);
    expect(first.selectedAttributes).toEqual({
      physicalPower: 12,
      magicalPower: 5,
      defense: 10,
      resistance: 7,
      speed: 8,
      stability: 10,
    });
    expect(first.cells.some((cell) => cell.blocked)).toBe(true);
    expect(first.cells.some((cell) => cell.elevation > 0)).toBe(true);
    expect(first.cells.some((cell) => cell.reachable && cell.reachableCost === 1)).toBe(true);
  });

  it("previews a reachable path and moves only within the current movement budget", () => {
    const battle = new DevelopmentBattleSession();
    const preview = battle.view({ x: 1, y: 2 });

    expect(preview.pathCost).toBe(2);
    expect(preview.cells.filter((cell) => cell.path).length).toBeGreaterThanOrEqual(3);

    const moved = battle.moveSelected({ x: 1, y: 2 });
    expect(moved.kind).toBe("moved");
    if (moved.kind !== "moved") return;

    const destination = moved.view.cells.find((cell) => cell.x === 1 && cell.y === 2);
    expect(destination?.occupantActorId).toBe("dev:mc");
    expect(moved.view.selectedActorRole).toBe("Infantry");
    expect(moved.view.selectedHpCurrent).toBe(100);

    const rejected = battle.moveSelected({ x: 7, y: 0 });
    expect(rejected).toEqual({ kind: "rejected", reason: "unreachable" });
  });

  it("switches unit selection without mutating battlefield placement", () => {
    const battle = new DevelopmentBattleSession();
    const before = battle.view();
    const selected = battle.selectActor("dev:scout");

    expect(selected?.selectedActorName).toBe("Scout");
    expect(selected?.selectedActorRole).toBe("Archer");
    expect(selected?.selectedMoveBudget).toBe(5);
    expect(selected?.selectedHpCurrent).toBe(80);
    expect(selected?.selectedAttributes.speed).toBe(12);
    expect(
      selected?.cells.map((cell) => ({ x: cell.x, y: cell.y, actor: cell.occupantActorId })),
    ).toEqual(before.cells.map((cell) => ({ x: cell.x, y: cell.y, actor: cell.occupantActorId })));
  });
});
