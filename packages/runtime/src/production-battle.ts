import {
  type ActorId,
  type ActorRpgDefinition,
  actorId,
  actorRpgProfile,
  type BattlefieldState,
  battlefieldReadModel,
  createActorRpgState,
  createBattlefieldState,
  createEncounterState,
  type DirectAttackDefinition,
  deserializeActorIdentityState,
  developmentGrayboxDamagePolicy,
  type EncounterDefinition,
  type EncounterEvent,
  findActorGroundPath,
  placeActorOnBattlefield,
  reachableActorGroundLocations,
  serializeActorId,
} from "@fantasia/game";
import {
  type EncounterRuntimeEvent,
  type EncounterRuntimeInput,
  EncounterRuntimeRunner,
} from "./encounter-runner.js";

export interface ProductionBattleActorView {
  readonly id: string;
  readonly name: string;
  readonly role: string;
  readonly side: "player" | "enemy";
  readonly shortLabel: string;
  readonly hpCurrent: number;
  readonly hpCapacity: number;
  readonly selected: boolean;
  readonly active: boolean;
  readonly defeated: boolean;
}

export interface ProductionBattleAttributeView {
  readonly physicalPower: number;
  readonly magicalPower: number;
  readonly defense: number;
  readonly resistance: number;
  readonly speed: number;
  readonly stability: number;
}

export interface ProductionBattleCellView {
  readonly x: number;
  readonly y: number;
  readonly elevation: number;
  readonly blocked: boolean;
  readonly reachable: boolean;
  readonly reachableCost?: number;
  readonly path: boolean;
  readonly occupantActorId?: string;
}

export interface ProductionBattleView {
  readonly title: string;
  readonly subtitle: string;
  readonly bounds: BattlefieldState["bounds"];
  readonly actors: readonly ProductionBattleActorView[];
  readonly cells: readonly ProductionBattleCellView[];
  readonly round: number;
  readonly outcome: "ongoing" | "player-victory" | "enemy-victory" | "draw";
  readonly activeActorId: string;
  readonly activeActorName: string;
  readonly movementRemaining: number;
  readonly mainActAvailable: boolean;
  readonly selectedActorId: string;
  readonly selectedActorName: string;
  readonly selectedActorRole: string;
  readonly selectedActorSide: "player" | "enemy";
  readonly selectedHpCurrent: number;
  readonly selectedHpCapacity: number;
  readonly selectedAttributes: ProductionBattleAttributeView;
  readonly pathCost?: number;
  readonly runtimeTick: number;
}

export type ProductionBattleCommandResult =
  | Readonly<{
      kind: "applied";
      view: ProductionBattleView;
      event?: EncounterEvent;
    }>
  | Readonly<{
      kind: "rejected";
      view: ProductionBattleView;
      reason: string;
    }>;

interface ProductionActorDefinition {
  readonly id: ActorId;
  readonly tacticalEntityId: string;
  readonly name: string;
  readonly side: "player" | "enemy";
  readonly shortLabel: string;
  readonly movementAllowance: number;
  readonly initialCoord: Readonly<{ x: number; y: number }>;
  readonly rpg: Omit<ActorRpgDefinition, "actorId">;
}

const scoutId = actorId("production:scout");
const heroId = actorId("production:hero");
const lancerId = actorId("production:lancer");

const actors: readonly ProductionActorDefinition[] = [
  {
    id: scoutId,
    tacticalEntityId: "production-tactical:scout",
    name: "Scout",
    side: "player",
    shortLabel: "SC",
    movementAllowance: 5,
    initialCoord: { x: 0, y: 5 },
    rpg: {
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
  },
  {
    id: heroId,
    tacticalEntityId: "production-tactical:hero",
    name: "MC",
    side: "player",
    shortLabel: "MC",
    movementAllowance: 4,
    initialCoord: { x: 1, y: 4 },
    rpg: {
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
  },
  {
    id: lancerId,
    tacticalEntityId: "production-tactical:lancer",
    name: "Lancer",
    side: "enemy",
    shortLabel: "LN",
    movementAllowance: 4,
    initialCoord: { x: 2, y: 5 },
    rpg: {
      classes: ["Lancer"],
      initialClass: "Lancer",
      attributes: {
        physicalPower: 13,
        magicalPower: 4,
        defense: 11,
        resistance: 6,
        speed: 7,
        stability: 12,
      },
      hp: { current: 110, capacity: 110 },
    },
  },
];

const traversalRules = {
  moveCost: 1,
  maxClimb: 1,
  maxDrop: 1,
} as const;

const productionBasicAttack: DirectAttackDefinition = {
  reference: "production-basic-attack",
  scaling: "physical-power",
  coefficient: 2,
  damageCategory: "physical",
  horizontalRange: { min: 1, max: 2 },
  horizontalRangeMetric: "manhattan",
  elevationReach: { upward: 1, downward: 1 },
  hitChance: 1,
  criticalChance: 0,
  criticalMultiplier: 1.5,
};

const fixedStep = {
  stepMs: 50,
  maxFrameDeltaMs: 250,
  maxStepsPerFrame: 5,
} as const;

function actorDefinition(id: ActorId): ProductionActorDefinition | undefined {
  const serialized = serializeActorId(id);
  return actors.find((candidate) => serializeActorId(candidate.id) === serialized);
}

function actorDefinitionBySerializedId(id: string): ProductionActorDefinition | undefined {
  return actors.find((candidate) => serializeActorId(candidate.id) === id);
}

function rpgDefinitions(): readonly ActorRpgDefinition[] {
  return actors.map((actor) => ({ actorId: actor.id, ...actor.rpg }));
}

function encounterDefinition(): EncounterDefinition {
  return {
    participants: actors.map((actor, index) => ({
      actorId: actor.id,
      side: actor.side,
      sameSideTiePriority: index,
      movementAllowance: actor.movementAllowance,
    })),
    traversalRules,
    attacks: { [productionBasicAttack.reference]: productionBasicAttack },
  };
}

function coordKey(coord: Readonly<{ x: number; y: number }>): string {
  return `${coord.x}:${coord.y}`;
}

function initialBattle() {
  const identities = deserializeActorIdentityState({
    associations: actors.map((actor) => ({
      actorId: serializeActorId(actor.id),
      tacticalEntityId: actor.tacticalEntityId,
    })),
  });
  const rpg = createActorRpgState(rpgDefinitions());
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
      throw new Error(`Production fixture placement failed: ${placed.reason.kind}`);
    }
    battlefield = placed.state;
  }

  const definition = encounterDefinition();
  const state = createEncounterState(definition, rpg, battlefield);
  return { identities, definition, state };
}

function lastRuntimeEvent(
  beforeCount: number,
  events: readonly EncounterRuntimeEvent[],
): EncounterRuntimeEvent | undefined {
  return events.length > beforeCount ? events.at(-1) : undefined;
}

export class ProductionBattleSession {
  readonly #identities: ReturnType<typeof initialBattle>["identities"];
  readonly #definition: EncounterDefinition;
  readonly #runner: EncounterRuntimeRunner;
  #selectedActorId: ActorId;

  constructor() {
    const initial = initialBattle();
    this.#identities = initial.identities;
    this.#definition = initial.definition;
    this.#runner = new EncounterRuntimeRunner({
      runtime: { fixedStep, random: { kind: "seed", seed: 0x1f08_2026 } },
      definition: this.#definition,
      identities: this.#identities,
      initialState: initial.state,
      damagePolicy: developmentGrayboxDamagePolicy,
    });
    this.#selectedActorId = initial.state.turn.activeActorId;
  }

  selectActor(id: string): ProductionBattleView | undefined {
    const actor = actorDefinitionBySerializedId(id);
    if (actor === undefined) return undefined;
    this.#selectedActorId = actor.id;
    return this.view();
  }

  view(previewGoal?: Readonly<{ x: number; y: number }>): ProductionBattleView {
    const snapshot = this.#runner.snapshot();
    const state = snapshot.state;
    const selected = actorDefinition(this.#selectedActorId);
    const active = actorDefinition(state.turn.activeActorId);
    if (selected === undefined || active === undefined) {
      throw new Error("Production presentation references an unknown encounter actor");
    }

    const selectedProfile = actorRpgProfile(state.rpg, selected.id);
    if (selectedProfile === undefined) throw new Error("Selected actor RPG profile is missing");
    const selectedIsActive = serializeActorId(selected.id) === serializeActorId(active.id);
    const battlefield = battlefieldReadModel(state.battlefield, this.#identities);
    const reachableResult = reachableActorGroundLocations(
      state.battlefield,
      this.#identities,
      selected.id,
      selectedIsActive && state.outcome === "ongoing" ? state.turn.movementRemaining : 0,
      traversalRules,
    );
    const reachable =
      reachableResult.kind === "reachable"
        ? new Map(reachableResult.locations.map((entry) => [coordKey(entry.coord), entry.cost]))
        : new Map<string, number>();

    let pathKeys = new Set<string>();
    let pathCost: number | undefined;
    if (previewGoal !== undefined && reachable.has(coordKey(previewGoal))) {
      const path = findActorGroundPath(
        state.battlefield,
        this.#identities,
        selected.id,
        previewGoal,
        traversalRules,
      );
      if (path.kind === "path") {
        pathKeys = new Set(path.path.coords.map(coordKey));
        pathCost = path.path.cost;
      }
    }

    return {
      title: "Fantasia Production Battlefield",
      subtitle: "GAME-I08 encounter-backed renderer integration",
      bounds: battlefield.bounds,
      actors: actors.map((actor) => {
        const profile = actorRpgProfile(state.rpg, actor.id);
        if (profile === undefined) throw new Error("Encounter actor RPG profile is missing");
        return {
          id: serializeActorId(actor.id),
          name: actor.name,
          role: profile.activeClass,
          side: actor.side,
          shortLabel: actor.shortLabel,
          hpCurrent: profile.hp.current,
          hpCapacity: profile.hp.capacity,
          selected: serializeActorId(actor.id) === serializeActorId(selected.id),
          active: serializeActorId(actor.id) === serializeActorId(active.id),
          defeated: profile.hp.current <= 0,
        };
      }),
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
      round: state.turn.round,
      outcome: state.outcome,
      activeActorId: serializeActorId(active.id),
      activeActorName: active.name,
      movementRemaining: state.turn.movementRemaining,
      mainActAvailable: state.turn.mainActAvailable,
      selectedActorId: serializeActorId(selected.id),
      selectedActorName: selected.name,
      selectedActorRole: selectedProfile.activeClass,
      selectedActorSide: selected.side,
      selectedHpCurrent: selectedProfile.hp.current,
      selectedHpCapacity: selectedProfile.hp.capacity,
      selectedAttributes: { ...selectedProfile.attributes },
      ...(pathCost === undefined ? {} : { pathCost }),
      runtimeTick: snapshot.runtime.tick,
    };
  }

  #run(input: EncounterRuntimeInput): ProductionBattleCommandResult {
    const before = this.#runner.snapshot();
    this.#runner.enqueue(input);
    this.#runner.advance(fixedStep.stepMs);
    const after = this.#runner.snapshot();
    const runtimeEvent = lastRuntimeEvent(before.events.length, after.events);
    if (runtimeEvent?.kind === "command-rejected") {
      return { kind: "rejected", reason: runtimeEvent.reason, view: this.view() };
    }

    const encounterEvent =
      after.state.events.length > before.state.events.length
        ? after.state.events.at(-1)
        : undefined;
    return {
      kind: "applied",
      view: this.view(),
      ...(encounterEvent === undefined ? {} : { event: encounterEvent }),
    };
  }

  moveSelected(goal: Readonly<{ x: number; y: number }>): ProductionBattleCommandResult {
    return this.#run({ kind: "move", actorId: this.#selectedActorId, goal });
  }

  attackSelected(targetId: string): ProductionBattleCommandResult {
    const target = actorDefinitionBySerializedId(targetId);
    if (target === undefined) {
      return { kind: "rejected", reason: "unknown-actor", view: this.view() };
    }
    return this.#run({
      kind: "direct-attack",
      actorId: this.#selectedActorId,
      defenderId: target.id,
      attackReference: productionBasicAttack.reference,
    });
  }

  endTurn(): ProductionBattleCommandResult {
    const active = this.#runner.snapshot().state.turn.activeActorId;
    const result = this.#run({ kind: "end-turn", actorId: active });
    if (result.kind === "applied") {
      const next = actorDefinitionBySerializedId(result.view.activeActorId);
      if (next !== undefined) this.#selectedActorId = next.id;
      return { ...result, view: this.view() };
    }
    return result;
  }
}
