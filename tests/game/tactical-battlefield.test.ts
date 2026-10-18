import { describe, expect, it } from "vitest";
import {
  actorId,
  createBattlefieldState,
  deserializeActorIdentityState,
  deserializeBattlefieldState,
  findActorGroundPath,
  moveActorOnBattlefield,
  placeActorOnBattlefield,
  reachableActorGroundLocations,
  serializeBattlefieldState,
} from "../../packages/game/src/index.ts";

const identities = deserializeActorIdentityState({
  associations: [
    { actorId: "actor:mc", tacticalEntityId: "tactical:mc" },
    { actorId: "actor:ally", tacticalEntityId: "tactical:ally" },
  ],
});

const groundRules = {
  moveCost: 1,
  maxClimb: 1,
  maxDrop: 1,
} as const;

function placeMcAtOrigin() {
  const battlefield = createBattlefieldState({ minX: 0, maxX: 2, minY: 0, maxY: 2 });
  const result = placeActorOnBattlefield(battlefield, identities, actorId("actor:mc"), {
    x: 1,
    y: 1,
  });
  if (result.kind !== "placed") throw new Error(`Expected MC placement: ${result.reason.kind}`);
  return result.state;
}

describe("GAME-I03 Tactical battlefield production slice", () => {
  it("uses the authoritative four-direction ground topology", () => {
    const state = placeMcAtOrigin();
    const result = reachableActorGroundLocations(
      state,
      identities,
      actorId("actor:mc"),
      1,
      groundRules,
    );

    expect(result).toEqual({
      kind: "reachable",
      locations: [
        { coord: { x: 1, y: 1 }, cost: 0 },
        { coord: { x: 1, y: 0 }, cost: 1 },
        { coord: { x: 2, y: 1 }, cost: 1 },
        { coord: { x: 1, y: 2 }, cost: 1 },
        { coord: { x: 0, y: 1 }, cost: 1 },
      ],
    });
  });

  it("enforces Fantasia exclusive active-entity occupancy", () => {
    const state = placeMcAtOrigin();
    const result = placeActorOnBattlefield(state, identities, actorId("actor:ally"), {
      x: 1,
      y: 1,
    });

    expect(result.kind).toBe("rejected");
    if (result.kind === "rejected") expect(result.reason.kind).toBe("occupancy-conflict");
  });

  it("routes deterministically around static blocked structure", () => {
    const battlefield = createBattlefieldState({ minX: 0, maxX: 2, minY: 0, maxY: 2 }, [
      { x: 1, y: 0 },
    ]);
    const placed = placeActorOnBattlefield(battlefield, identities, actorId("actor:mc"), {
      x: 0,
      y: 0,
    });
    if (placed.kind !== "placed") throw new Error(`Expected MC placement: ${placed.reason.kind}`);

    const first = findActorGroundPath(
      placed.state,
      identities,
      actorId("actor:mc"),
      { x: 2, y: 0 },
      groundRules,
    );
    const second = findActorGroundPath(
      placed.state,
      identities,
      actorId("actor:mc"),
      { x: 2, y: 0 },
      groundRules,
    );

    expect(first).toEqual({
      kind: "path",
      path: {
        coords: [
          { x: 0, y: 0 },
          { x: 0, y: 1 },
          { x: 1, y: 1 },
          { x: 2, y: 1 },
          { x: 2, y: 0 },
        ],
        cost: 4,
      },
    });
    expect(JSON.stringify(second)).toBe(JSON.stringify(first));
  });

  it("keeps climb/drop policy game-owned while Tactical supplies logical elevation", () => {
    const battlefield = createBattlefieldState(
      { minX: 0, maxX: 2, minY: 0, maxY: 1 },
      [],
      [{ coord: { x: 1, y: 0 }, level: 2 }],
    );
    const placed = placeActorOnBattlefield(battlefield, identities, actorId("actor:mc"), {
      x: 0,
      y: 0,
    });
    if (placed.kind !== "placed") throw new Error(`Expected MC placement: ${placed.reason.kind}`);

    const result = findActorGroundPath(
      placed.state,
      identities,
      actorId("actor:mc"),
      { x: 2, y: 0 },
      groundRules,
    );

    expect(result).toEqual({
      kind: "path",
      path: {
        coords: [
          { x: 0, y: 0 },
          { x: 0, y: 1 },
          { x: 1, y: 1 },
          { x: 2, y: 1 },
          { x: 2, y: 0 },
        ],
        cost: 4,
      },
    });
  });

  it("relocates only after a valid Tactical path and preserves plain serialized state", () => {
    const state = placeMcAtOrigin();
    const moved = moveActorOnBattlefield(
      state,
      identities,
      actorId("actor:mc"),
      { x: 2, y: 2 },
      groundRules,
    );

    expect(moved.kind).toBe("moved");
    if (moved.kind !== "moved") return;

    expect(moved.path).toEqual({
      coords: [
        { x: 1, y: 1 },
        { x: 2, y: 1 },
        { x: 2, y: 2 },
      ],
      cost: 2,
    });

    const serialized = serializeBattlefieldState(moved.state);
    const roundTrip = serializeBattlefieldState(
      deserializeBattlefieldState(JSON.parse(JSON.stringify(serialized))),
    );

    expect(roundTrip).toEqual(serialized);
  });

  it("leaves state unchanged when a destination is structurally unreachable", () => {
    const battlefield = createBattlefieldState({ minX: 0, maxX: 2, minY: 0, maxY: 0 }, [
      { x: 1, y: 0 },
    ]);
    const placed = placeActorOnBattlefield(battlefield, identities, actorId("actor:mc"), {
      x: 0,
      y: 0,
    });
    if (placed.kind !== "placed") throw new Error(`Expected MC placement: ${placed.reason.kind}`);

    const before = serializeBattlefieldState(placed.state);
    const result = moveActorOnBattlefield(
      placed.state,
      identities,
      actorId("actor:mc"),
      { x: 2, y: 0 },
      groundRules,
    );

    expect(result).toEqual({
      kind: "rejected",
      reason: { kind: "unreachable", coord: { x: 2, y: 0 } },
    });
    expect(serializeBattlefieldState(placed.state)).toEqual(before);
  });
});
