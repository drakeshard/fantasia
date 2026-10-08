import {
  type ActorId,
  type ActorRpgDefinition,
  type ActorRpgState,
  actorId,
  actorRpgProfile,
  type BattlefieldState,
  battlefieldReadModel,
  type CombatSide,
  consumeEncounterMainAct,
  createActorRpgState,
  createBattlefieldState,
  createEncounterTurnState,
  type DirectAttackDefinition,
  deserializeActorIdentityState,
  developmentGrayboxDamagePolicy,
  type EncounterTurnState,
  findActorGroundPath,
  type GroundTraversalRules,
  moveActorOnBattlefield,
  placeActorOnBattlefield,
  reachableActorGroundLocations,
  resolveDirectAttack,
  serializeActorId,
  spendEncounterMovement,
} from "@fantasia/game";

export interface DevelopmentBattleActorView {
  readonly id: string;
  readonly name: string;
  readonly role: string;
  readonly side: CombatSide;
  readonly shortLabel: string;
  readonly moveBudget: number;
  readonly hpCurrent: number;
  readonly hpCapacity: number;
  readonly selected: boolean;
  readonly active: boolean;
}

export interface DevelopmentBattleAttributeView {
  readonly physicalPower: number;
  readonly magicalPower: number;
  readonly defense: number;
  readonly resistance: number;
  readonly speed: number;
  readonly stability: number;
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
  readonly activeActorId: string;
  readonly activeActorName: string;
  readonly movementRemaining: number;
  readonly mainActAvailable: boolean;
  readonly selectedActorId: string;
  readonly selectedActorName: string;
  readonly selectedActorRole: string;
  readonly selectedActorSide: CombatSide;
  readonly selectedMoveBudget: number;
  readonly selectedHpCurrent: number;
  readonly selectedHpCapacity: number;
  readonly selectedAttributes: DevelopmentBattleAttributeView;
  readonly pathCost?: number;
}

export type DevelopmentBattleMoveResult =
  | { readonly kind: "moved"; readonly view: DevelopmentBattleView }
  | {
      readonly kind: "rejected";
      readonly reason: "unreachable" | "unknown-actor" | "not-active-actor";
    };

export type DevelopmentBattleAttackResult =
  | Readonly<{
      kind: "resolved";
      view: DevelopmentBattleView;
      attackerName: string;
      defenderName: string;
      damage: number;
      critical: boolean;
    }>
  | Readonly<{
      kind: "missed";
      view: DevelopmentBattleView;
      attackerName: string;
      defenderName: string;
    }>
  | Readonly<{
      kind: "rejected";
      reason:
        | "unknown-actor"
        | "not-active-actor"
        | "main-act-spent"
        | "same-side-target"
        | "out-of-range"
        | "out-of-elevation-reach"
        | "invalid-attack";
    }>;

interface DevelopmentActorDefinition {
  readonly id: ActorId;
  readonly tacticalEntityId: string;
  readonly name: string;
  readonly side: CombatSide;
  readonly shortLabel: string;
  readonly moveBudget: number;
  readonly initialCoord: { readonly x: number; readonly y: number };
  readonly rpg: Omit<ActorRpgDefinition, "actorId">;
}

const actors: readonly DevelopmentActorDefinition[] = [
  {
    id: actorId("dev:mc"),
    tacticalEntityId: "dev-tactical:mc",
    name: "MC",
    side: "player",
    shortLabel: "MC",
    moveBudget: 4,
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
    id: actorId("dev:scout"),
    tacticalEntityId: "dev-tactical:scout",
    name: "Scout",
    side: "player",
    shortLabel: "SC",
    moveBudget: 5,
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
    id: actorId("dev:lancer"),
    tacticalEntityId: "dev-tactical:lancer",
    name: "Lancer",
    side: "enemy",
    shortLabel: "LN",
    moveBudget: 4,
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

const traversalRules: GroundTraversalRules = {
  moveCost: 1,
  maxClimb: 1,
  maxDrop: 1,
};

const developmentBasicAttack: DirectAttackDefinition = {
  reference: "development-basic-attack",
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

function coordKey(coord: { readonly x: number; readonly y: number }): string {
  return `${coord.x}:${coord.y}`;
}

function definitionForId(id: ActorId): DevelopmentActorDefinition | undefined {
  const serialized = serializeActorId(id);
  return actors.find((actor) => serializeActorId(actor.id) === serialized);
}

function rpgDefinitions(): readonly ActorRpgDefinition[] {
  return actors.map((actor) => ({ actorId: actor.id, ...actor.rpg }));
}

function profileForActor(rpg: ActorRpgState, actor: DevelopmentActorDefinition) {
  const profile = actorRpgProfile(rpg, actor.id);
  if (profile === undefined) {
    throw new Error(`Development RPG profile missing: ${serializeActorId(actor.id)}`);
  }
  return profile;
}

function encounterParticipants() {
  return actors.map((actor, index) => ({
    actorId: actor.id,
    side: actor.side,
    sameSideTiePriority: index,
    movementAllowance: actor.moveBudget,
  }));
}

function combatParticipants() {
  return actors.map((actor) => ({ actorId: actor.id, side: actor.side }));
}

function buildInitialState() {
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
      throw new Error(`Development fixture placement failed: ${placed.reason.kind}`);
    }
    battlefield = placed.state;
  }

  return {
    identities,
    rpg,
    battlefield,
    turn: createEncounterTurnState(encounterParticipants(), rpg),
  };
}

export class DevelopmentBattleSession {
  readonly #identities: ReturnType<typeof buildInitialState>["identities"];
  #rpg: ActorRpgState;
  #battlefield: BattlefieldState;
  #turn: EncounterTurnState;
  #selectedActorId: ActorId;

  constructor() {
    const initial = buildInitialState();
    this.#identities = initial.identities;
    this.#rpg = initial.rpg;
    this.#battlefield = initial.battlefield;
    this.#turn = initial.turn;
    this.#selectedActorId = initial.turn.activeActorId;
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
    const active = definitionForId(this.#turn.activeActorId);
    if (active === undefined) throw new Error("Development battle active actor is missing");
    const selectedProfile = profileForActor(this.#rpg, selected);
    const selectedIsActive = serializeActorId(selected.id) === serializeActorId(active.id);

    const battlefield = battlefieldReadModel(this.#battlefield, this.#identities);
    const reachableResult = reachableActorGroundLocations(
      this.#battlefield,
      this.#identities,
      selected.id,
      selectedIsActive ? this.#turn.movementRemaining : 0,
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
      subtitle: "GAME-I05 deterministic combat foundation playground",
      bounds: battlefield.bounds,
      actors: actors.map((actor) => {
        const profile = profileForActor(this.#rpg, actor);
        return {
          id: serializeActorId(actor.id),
          name: actor.name,
          role: profile.activeClass,
          side: actor.side,
          shortLabel: actor.shortLabel,
          moveBudget: actor.moveBudget,
          hpCurrent: profile.hp.current,
          hpCapacity: profile.hp.capacity,
          selected: serializeActorId(actor.id) === serializeActorId(selected.id),
          active: serializeActorId(actor.id) === serializeActorId(active.id),
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
      activeActorId: serializeActorId(active.id),
      activeActorName: active.name,
      movementRemaining: this.#turn.movementRemaining,
      mainActAvailable: this.#turn.mainActAvailable,
      selectedActorId: serializeActorId(selected.id),
      selectedActorName: selected.name,
      selectedActorRole: selectedProfile.activeClass,
      selectedActorSide: selected.side,
      selectedMoveBudget: selected.moveBudget,
      selectedHpCurrent: selectedProfile.hp.current,
      selectedHpCapacity: selectedProfile.hp.capacity,
      selectedAttributes: { ...selectedProfile.attributes },
      ...(pathCost === undefined ? {} : { pathCost }),
    };
  }

  moveSelected(goal: { readonly x: number; readonly y: number }): DevelopmentBattleMoveResult {
    const selected = definitionForId(this.#selectedActorId);
    if (selected === undefined) return { kind: "rejected", reason: "unknown-actor" };
    if (serializeActorId(selected.id) !== serializeActorId(this.#turn.activeActorId)) {
      return { kind: "rejected", reason: "not-active-actor" };
    }

    const path = findActorGroundPath(
      this.#battlefield,
      this.#identities,
      selected.id,
      goal,
      traversalRules,
    );
    if (path.kind !== "path" || path.path.cost > this.#turn.movementRemaining) {
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

    const turn = spendEncounterMovement(this.#turn, path.path.cost);
    if (turn === undefined) return { kind: "rejected", reason: "unreachable" };
    this.#battlefield = moved.state;
    this.#turn = turn;
    return { kind: "moved", view: this.view() };
  }

  attackSelected(targetId: string): DevelopmentBattleAttackResult {
    const attacker = definitionForId(this.#selectedActorId);
    const defender = actors.find((candidate) => serializeActorId(candidate.id) === targetId);
    if (attacker === undefined || defender === undefined) {
      return { kind: "rejected", reason: "unknown-actor" };
    }
    if (serializeActorId(attacker.id) !== serializeActorId(this.#turn.activeActorId)) {
      return { kind: "rejected", reason: "not-active-actor" };
    }
    if (!this.#turn.mainActAvailable) {
      return { kind: "rejected", reason: "main-act-spent" };
    }

    const outcome = resolveDirectAttack({
      definition: developmentBasicAttack,
      attackerId: attacker.id,
      defenderId: defender.id,
      participants: combatParticipants(),
      rpg: this.#rpg,
      battlefield: this.#battlefield,
      identities: this.#identities,
      rolls: { hit: 0.5, critical: 0.5 },
      damagePolicy: developmentGrayboxDamagePolicy,
    });

    if (outcome.kind === "rejected") {
      if (outcome.reason === "same-side-target") {
        return { kind: "rejected", reason: "same-side-target" };
      }
      if (outcome.reason === "out-of-range") {
        return { kind: "rejected", reason: "out-of-range" };
      }
      if (outcome.reason === "out-of-elevation-reach") {
        return { kind: "rejected", reason: "out-of-elevation-reach" };
      }
      return { kind: "rejected", reason: "invalid-attack" };
    }

    this.#turn = consumeEncounterMainAct(this.#turn);
    if (outcome.kind === "missed") {
      return {
        kind: "missed",
        view: this.view(),
        attackerName: attacker.name,
        defenderName: defender.name,
      };
    }

    this.#rpg = outcome.rpg;
    return {
      kind: "resolved",
      view: this.view(),
      attackerName: attacker.name,
      defenderName: defender.name,
      damage: outcome.event.appliedDamage,
      critical: outcome.event.critical,
    };
  }
}
