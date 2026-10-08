import {
  actorId,
  battlefieldCellFacts,
  createBattlefieldState,
  deserializeActorIdentityState,
  findActorGroundPath,
  moveActorOnBattlefield,
  placeActorOnBattlefield,
  reachableActorGroundLocations,
  serializeActorId,
  type BattlefieldState,
  type GroundTraversalRules,
} from "@fantasia/game";

export interface PlaytestCoord {
  readonly x: number;
  readonly y: number;
}

export interface PlaytestActor {
  readonly id: string;
  readonly name: string;
  readonly subtitle: string;
  readonly glyph: string;
  readonly team: "player" | "ally";
}

export interface PlaytestTile {
  readonly key: string;
  readonly x: number;
  readonly y: number;
  readonly blocked: boolean;
  readonly elevation: number;
  readonly occupantActorId?: string;
  readonly reachable: boolean;
  readonly movementCost?: number;
}

export interface PlaytestBattlefieldSnapshot {
  readonly width: number;
  readonly height: number;
  readonly actors: readonly PlaytestActor[];
  readonly tiles: readonly PlaytestTile[];
}

export interface PlaytestPath {
  readonly coords: readonly PlaytestCoord[];
  readonly cost: number;
}

export type PlaytestMoveResult =
  | { readonly kind: "moved"; readonly path: PlaytestPath }
  | { readonly kind: "rejected"; readonly reason: string };

const actors: readonly PlaytestActor[] = [
  {
    id: "actor:mc",
    name: "Primora Trainee",
    subtitle: "Infantry · Player",
    glyph: "MC",
    team: "player",
  },
  {
    id: "actor:ally",
    name: "Allied Scout",
    subtitle: "Guest Ally",
    glyph: "A",
    team: "ally",
  },
];

const identities = deserializeActorIdentityState({
  associations: [
    { actorId: "actor:mc", tacticalEntityId: "tactical:mc" },
    { actorId: "actor:ally", tacticalEntityId: "tactical:ally" },
  ],
});

const traversalRules: GroundTraversalRules = {
  moveCost: 1,
  maxClimb: 1,
  maxDrop: 1,
};

const movementBudget = 4;

function coordKey(coord: PlaytestCoord): string {
  return `${coord.x},${coord.y}`;
}

function knownActor(value: string) {
  return actors.some((actor) => actor.id === value) ? actorId(value) : undefined;
}

function createInitialBattlefield(): BattlefieldState {
  let state = createBattlefieldState(
    { minX: 0, maxX: 6, minY: 0, maxY: 4 },
    [
      { x: 3, y: 1 },
      { x: 3, y: 2 },
      { x: 3, y: 3 },
      { x: 5, y: 3 },
    ],
    [
      { coord: { x: 4, y: 0 }, level: 1 },
      { coord: { x: 4, y: 1 }, level: 1 },
      { coord: { x: 5, y: 0 }, level: 2 },
      { coord: { x: 6, y: 0 }, level: 2 },
      { coord: { x: 1, y: 0 }, level: 1 },
    ],
  );

  const mc = placeActorOnBattlefield(state, identities, actorId("actor:mc"), { x: 1, y: 3 });
  if (mc.kind !== "placed") throw new Error(`Playtest MC placement failed: ${mc.reason.kind}`);
  state = mc.state;

  const ally = placeActorOnBattlefield(state, identities, actorId("actor:ally"), { x: 1, y: 1 });
  if (ally.kind !== "placed") throw new Error(`Playtest ally placement failed: ${ally.reason.kind}`);
  return ally.state;
}

export class FantasiaPlaytestBattlefield {
  private battlefield = createInitialBattlefield();

  snapshot(selectedActorId: string): PlaytestBattlefieldSnapshot {
    const selected = knownActor(selectedActorId);
    const reachable =
      selected === undefined
        ? undefined
        : reachableActorGroundLocations(
            this.battlefield,
            identities,
            selected,
            movementBudget,
            traversalRules,
          );

    const reachableCosts = new Map<string, number>();
    if (reachable?.kind === "reachable") {
      for (const location of reachable.locations) reachableCosts.set(coordKey(location.coord), location.cost);
    }

    const { bounds } = this.battlefield;
    const tiles: PlaytestTile[] = [];
    for (let y = bounds.minY; y <= bounds.maxY; y += 1) {
      for (let x = bounds.minX; x <= bounds.maxX; x += 1) {
        const facts = battlefieldCellFacts(this.battlefield, identities, { x, y });
        const key = coordKey({ x, y });
        const cost = reachableCosts.get(key);
        tiles.push({
          key,
          x,
          y,
          blocked: facts.blocked,
          elevation: facts.elevation,
          ...(facts.actorId === undefined ? {} : { occupantActorId: serializeActorId(facts.actorId) }),
          reachable: cost !== undefined,
          ...(cost === undefined ? {} : { movementCost: cost }),
        });
      }
    }

    return {
      width: bounds.maxX - bounds.minX + 1,
      height: bounds.maxY - bounds.minY + 1,
      actors,
      tiles,
    };
  }

  previewPath(actorIdValue: string, goal: PlaytestCoord): PlaytestPath | undefined {
    const actor = knownActor(actorIdValue);
    if (actor === undefined) return undefined;

    const result = findActorGroundPath(this.battlefield, identities, actor, goal, traversalRules);
    if (result.kind !== "path") return undefined;
    return {
      coords: result.path.coords.map((coord) => ({ ...coord })),
      cost: result.path.cost,
    };
  }

  moveActor(actorIdValue: string, goal: PlaytestCoord): PlaytestMoveResult {
    const actor = knownActor(actorIdValue);
    if (actor === undefined) return { kind: "rejected", reason: "unknown-actor" };

    const result = moveActorOnBattlefield(this.battlefield, identities, actor, goal, traversalRules);
    if (result.kind !== "moved") return { kind: "rejected", reason: result.reason.kind };

    this.battlefield = result.state;
    return {
      kind: "moved",
      path: {
        coords: result.path.coords.map((coord) => ({ ...coord })),
        cost: result.path.cost,
      },
    };
  }
}

export function createPlaytestBattlefield(): FantasiaPlaytestBattlefield {
  return new FantasiaPlaytestBattlefield();
}
