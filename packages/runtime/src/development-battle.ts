import {
  type ActorId,
  actorId,
  type BattlefieldState,
  battlefieldReadModel,
  createBattlefieldState,
  deserializeActorIdentityState,
  findActorGroundPath,
  type GroundTraversalRules,
  moveActorOnBattlefield,
  placeActorOnBattlefield,
  reachableActorGroundLocations,
  serializeActorId,
} from "@fantasia/game";

export interface DevelopmentBattleActorView {
  readonly id: string;
  readonly name: string;
  readonly role: string;
  readonly shortLabel: string;
  readonly moveBudget: number;
  readonly selected: boolean;
}

export interface DevelopmentBattleCellView {
  readonly x: number;
  readonly y: number;
  readonly elevation: number;
  readonly blocked: boolean;
  readonly reachable: boolean;
  readonly reachableCost?: number;
  readonly path: boolean;
  readonly occupantActorId?: string;
}

export interface DevelopmentBattleView {
  readonly title: string;
  readonly subtitle: string;
  readonly bounds: BattlefieldState["bounds"];
  readonly actors: readonly DevelopmentBattleActorView[];
  readonly cells: readonly DevelopmentBattleCellView[];
  readonly selectedActorId: string;
  readonly selectedActorName: string;
  readonly selectedActorRole: string;
  readonly selectedMoveBudget: number;
  readonly pathCost?: number;
}

export type DevelopmentBattleMoveResult =
  | { readonly kind: "moved"; readonly view: DevelopmentBattleView }
  | { readonly kind: "rejected"; readonly reason: "unreachable" | "unknown-actor" };

interface DevelopmentActorDefinition {
  readonly id: ActorId;
  readonly tacticalEntityId: string;
  readonly name: string;
  readonly role: string;
  readonly shortLabel: string;
  readonly moveBudget: number;
  readonly initialCoord: { readonly x: number; readonly y: number };
}

const actors: readonly DevelopmentActorDefinition[] = [
  {
    id: actorId("dev:mc"),
    tacticalEntityId: "dev-tactical:mc",
    name: "MC",
    role: "Infantry",
    shortLabel: "MC",
    moveBudget: 4,
    initialCoord: { x: 1, y: 4 },
  },
  {
    id: actorId("dev:scout"),
    tacticalEntityId: "dev-tactical:scout",
    name: "Scout",
    role: "Archer",
    shortLabel: "SC",
    moveBudget: 5,
    initialCoord: { x: 0, y: 5 },
  },
  {
    id: actorId("dev:lancer"),
    tacticalEntityId: "dev-tactical:lancer",
    name: "Lancer",
    role: "Lancer",
    shortLabel: "LN",
    moveBudget: 4,
    initialCoord: { x: 2, y: 5 },
  },
];

const traversalRules: GroundTraversalRules = {
  moveCost: 1,
  maxClimb: 1,
  maxDrop: 1,
};

function coordKey(coord: { readonly x: number; readonly y: number }): string {
  return `${coord.x}:${coord.y}`;
}

function definitionForId(id: ActorId): DevelopmentActorDefinition | undefined {
  const serialized = serializeActorId(id);
  return actors.find((actor) => serializeActorId(actor.id) === serialized);
}

function buildInitialState() {
  const identities = deserializeActorIdentityState({
    associations: actors.map((actor) => ({
      actorId: serializeActorId(actor.id),
      tacticalEntityId: actor.tacticalEntityId,
    })),
  });

  let battlefield = createBattlefieldState(
    { minX: 0, maxX: 7, minY: 0, maxY: 5 },
    [
      { x: 3, y: 1 },
      { x: 3, y: 2 },
      { x: 3, y: 3 },
      { x: 6, y: 4 },
    ],
    [
      { coord: { x: 1, y: 1 }, level: 1 },
      { coord: { x: 2, y: 1 }, level: 1 },
      { coord: { x: 4, y: 2 }, level: 1 },
      { coord: { x: 5, y: 2 }, level: 2 },
      { coord: { x: 5, y: 3 }, level: 1 },
    ],
  );

  for (const actor of actors) {
    const placed = placeActorOnBattlefield(battlefield, identities, actor.id, actor.initialCoord);
    if (placed.kind !== "placed") {
      throw new Error(`Development fixture placement failed: ${placed.reason.kind}`);
    }
    battlefield = placed.state;
  }

  return { identities, battlefield };
}

export class DevelopmentBattleSession {
  readonly #identities: ReturnType<typeof buildInitialState>["identities"];
  #battlefield: BattlefieldState;
  #selectedActorId: ActorId;

  constructor() {
    const initial = buildInitialState();
    this.#identities = initial.identities;
    this.#battlefield = initial.battlefield;
    this.#selectedActorId = actors[0].id;
  }

  selectActor(id: string): DevelopmentBattleView | undefined {
    const actor = actors.find((candidate) => serializeActorId(candidate.id) === id);
    if (actor === undefined) return undefined;
    this.#selectedActorId = actor.id;
    return this.view();
  }

  view(previewGoal?: { readonly x: number; readonly y: number }): DevelopmentBattleView {
    const selected = definitionForId(this.#selectedActorId);
    if (selected === undefined) throw new Error("Development battle selected actor is missing");

    const battlefield = battlefieldReadModel(this.#battlefield, this.#identities);
    const reachableResult = reachableActorGroundLocations(
      this.#battlefield,
      this.#identities,
      selected.id,
      selected.moveBudget,
      traversalRules,
    );
    const reachable =
      reachableResult.kind === "reachable"
        ? new Map(reachableResult.locations.map((entry) => [coordKey(entry.coord), entry.cost]))
        : new Map<string, number>();

    let pathKeys = new Set<string>();
    let pathCost: number | undefined;
    if (previewGoal !== undefined && reachable.has(coordKey(previewGoal))) {
      const result = findActorGroundPath(
        this.#battlefield,
        this.#identities,
        selected.id,
        previewGoal,
        traversalRules,
      );
      if (result.kind === "path") {
        pathKeys = new Set(result.path.coords.map(coordKey));
        pathCost = result.path.cost;
      }
    }

    return {
      title: "Development Battlefield",
      subtitle: "Renderer-neutral GAME-I03 movement playground",
      bounds: battlefield.bounds,
      actors: actors.map((actor) => ({
        id: serializeActorId(actor.id),
        name: actor.name,
        role: actor.role,
        shortLabel: actor.shortLabel,
        moveBudget: actor.moveBudget,
        selected: serializeActorId(actor.id) === serializeActorId(selected.id),
      })),
      cells: battlefield.cells.map((cell) => {
        const key = coordKey(cell.coord);
        const cost = reachable.get(key);
        return {
          x: cell.coord.x,
          y: cell.coord.y,
          elevation: cell.elevation,
          blocked: cell.blocked,
          reachable: cost !== undefined,
          ...(cost === undefined ? {} : { reachableCost: cost }),
          path: pathKeys.has(key),
          ...(cell.actorId === undefined
            ? {}
            : { occupantActorId: serializeActorId(cell.actorId) }),
        };
      }),
      selectedActorId: serializeActorId(selected.id),
      selectedActorName: selected.name,
      selectedActorRole: selected.role,
      selectedMoveBudget: selected.moveBudget,
      ...(pathCost === undefined ? {} : { pathCost }),
    };
  }

  moveSelected(goal: { readonly x: number; readonly y: number }): DevelopmentBattleMoveResult {
    const selected = definitionForId(this.#selectedActorId);
    if (selected === undefined) return { kind: "rejected", reason: "unknown-actor" };

    const reachable = reachableActorGroundLocations(
      this.#battlefield,
      this.#identities,
      selected.id,
      selected.moveBudget,
      traversalRules,
    );
    if (
      reachable.kind !== "reachable" ||
      !reachable.locations.some((entry) => entry.coord.x === goal.x && entry.coord.y === goal.y)
    ) {
      return { kind: "rejected", reason: "unreachable" };
    }

    const moved = moveActorOnBattlefield(
      this.#battlefield,
      this.#identities,
      selected.id,
      goal,
      traversalRules,
    );
    if (moved.kind !== "moved") return { kind: "rejected", reason: "unreachable" };

    this.#battlefield = moved.state;
    return { kind: "moved", view: this.view() };
  }
}
