import {
  type AttributeDefinition,
  type AttributeState,
  initializeAttribute,
  validateAttributeState,
} from "@drakeshard/rpg/attributes";
import {
  type ResourceDefinition,
  type ResourceState,
  initializeResource,
  validateResourceState,
} from "@drakeshard/rpg/resources";
import {
  activateRole,
  grantRole,
  initializeRoles,
  type RoleCatalogDefinition,
  type RolesState,
  validateRolesState,
} from "@drakeshard/rpg/roles";
import {
  type ActorId,
  actorIdsEqual,
  deserializeActorId,
  serializeActorId,
} from "../../actors/identity.js";

export const CORE_ATTRIBUTE_REFERENCES = {
  physicalPower: "physical-power",
  magicalPower: "magical-power",
  defense: "defense",
  resistance: "resistance",
  speed: "speed",
  stability: "stability",
} as const;

export const HP_RESOURCE_REFERENCE = "hp" as const;

export interface CoreAttributeBases {
  readonly physicalPower: number;
  readonly magicalPower: number;
  readonly defense: number;
  readonly resistance: number;
  readonly speed: number;
  readonly stability: number;
}

export interface ActorRpgDefinition {
  readonly actorId: ActorId;
  readonly classes: readonly string[];
  readonly initialClass: string;
  readonly attributes: CoreAttributeBases;
  readonly hp: Readonly<{
    current: number;
    capacity: number;
  }>;
}

export interface ActorCoreAttributeState {
  readonly physicalPower: AttributeState<typeof CORE_ATTRIBUTE_REFERENCES.physicalPower>;
  readonly magicalPower: AttributeState<typeof CORE_ATTRIBUTE_REFERENCES.magicalPower>;
  readonly defense: AttributeState<typeof CORE_ATTRIBUTE_REFERENCES.defense>;
  readonly resistance: AttributeState<typeof CORE_ATTRIBUTE_REFERENCES.resistance>;
  readonly speed: AttributeState<typeof CORE_ATTRIBUTE_REFERENCES.speed>;
  readonly stability: AttributeState<typeof CORE_ATTRIBUTE_REFERENCES.stability>;
}

export interface ActorRpgSubjectState {
  readonly actorId: ActorId;
  readonly roles: RolesState<string>;
  readonly attributes: ActorCoreAttributeState;
  readonly hp: ResourceState<typeof HP_RESOURCE_REFERENCE>;
}

export interface ActorRpgState {
  readonly actors: readonly ActorRpgSubjectState[];
}

export interface SerializedActorRpgSubjectState {
  readonly actorId: string;
  readonly roles: RolesState<string>;
  readonly attributes: ActorCoreAttributeState;
  readonly hp: ResourceState<typeof HP_RESOURCE_REFERENCE>;
}

export interface SerializedActorRpgState {
  readonly actors: readonly SerializedActorRpgSubjectState[];
}

export interface ActorRpgProfile {
  readonly activeClass: string;
  readonly hp: Readonly<{ current: number; capacity: number }>;
  readonly attributes: CoreAttributeBases;
}

function roleDefinition(definition: ActorRpgDefinition): RoleCatalogDefinition<string> {
  return { roles: [...definition.classes] };
}

function attributeDefinition<Reference extends string>(
  reference: Reference,
  initialBase: number,
): AttributeDefinition<Reference> {
  return { reference, initialBase };
}

function hpDefinition(definition: ActorRpgDefinition): ResourceDefinition<typeof HP_RESOURCE_REFERENCE> {
  return {
    reference: HP_RESOURCE_REFERENCE,
    initialCurrent: definition.hp.current,
    initialCapacity: definition.hp.capacity,
  };
}

function initializeCoreAttribute<Reference extends string>(
  reference: Reference,
  initialBase: number,
): AttributeState<Reference> {
  const result = initializeAttribute(attributeDefinition(reference, initialBase));
  if (result.kind !== "initialized") {
    throw new RangeError(`Invalid Fantasia RPG attribute definition: ${reference}`);
  }
  return result.state;
}

function initializeActorRpgSubject(definition: ActorRpgDefinition): ActorRpgSubjectState {
  const rolesDefinition = roleDefinition(definition);
  const initialRoles = initializeRoles(rolesDefinition);
  if (initialRoles.kind !== "initialized") {
    throw new RangeError("Invalid Fantasia RPG class catalog");
  }

  const granted = grantRole(rolesDefinition, initialRoles.state, definition.initialClass);
  if (granted.kind !== "changed") {
    throw new RangeError(`Invalid initial Fantasia class: ${definition.initialClass}`);
  }
  const activated = activateRole(rolesDefinition, granted.state, definition.initialClass);
  if (activated.kind !== "changed") {
    throw new RangeError(`Unable to activate initial Fantasia class: ${definition.initialClass}`);
  }

  const hp = initializeResource(hpDefinition(definition));
  if (hp.kind !== "initialized") {
    throw new RangeError("Invalid Fantasia HP definition");
  }

  return {
    actorId: definition.actorId,
    roles: activated.state,
    attributes: {
      physicalPower: initializeCoreAttribute(
        CORE_ATTRIBUTE_REFERENCES.physicalPower,
        definition.attributes.physicalPower,
      ),
      magicalPower: initializeCoreAttribute(
        CORE_ATTRIBUTE_REFERENCES.magicalPower,
        definition.attributes.magicalPower,
      ),
      defense: initializeCoreAttribute(
        CORE_ATTRIBUTE_REFERENCES.defense,
        definition.attributes.defense,
      ),
      resistance: initializeCoreAttribute(
        CORE_ATTRIBUTE_REFERENCES.resistance,
        definition.attributes.resistance,
      ),
      speed: initializeCoreAttribute(CORE_ATTRIBUTE_REFERENCES.speed, definition.attributes.speed),
      stability: initializeCoreAttribute(
        CORE_ATTRIBUTE_REFERENCES.stability,
        definition.attributes.stability,
      ),
    },
    hp: hp.state,
  };
}

export function createActorRpgState(definitions: readonly ActorRpgDefinition[]): ActorRpgState {
  const seenActorIds = new Set<string>();
  const actors: ActorRpgSubjectState[] = [];

  for (const definition of definitions) {
    const serializedActorId = serializeActorId(definition.actorId);
    if (seenActorIds.has(serializedActorId)) {
      throw new RangeError(`Duplicate RPG ActorId definition: ${serializedActorId}`);
    }
    seenActorIds.add(serializedActorId);
    actors.push(initializeActorRpgSubject(definition));
  }

  return { actors };
}

export function actorRpgSubject(
  state: ActorRpgState,
  actorId: ActorId,
): ActorRpgSubjectState | undefined {
  return state.actors.find((entry) => actorIdsEqual(entry.actorId, actorId));
}

export function actorRpgProfile(state: ActorRpgState, actorId: ActorId): ActorRpgProfile | undefined {
  const subject = actorRpgSubject(state, actorId);
  if (subject === undefined || subject.roles.active === null) return undefined;

  return {
    activeClass: subject.roles.active,
    hp: { current: subject.hp.current, capacity: subject.hp.capacity },
    attributes: {
      physicalPower: subject.attributes.physicalPower.base,
      magicalPower: subject.attributes.magicalPower.base,
      defense: subject.attributes.defense.base,
      resistance: subject.attributes.resistance.base,
      speed: subject.attributes.speed.base,
      stability: subject.attributes.stability.base,
    },
  };
}

export function serializeActorRpgState(state: ActorRpgState): SerializedActorRpgState {
  return {
    actors: state.actors.map((entry) => ({
      actorId: serializeActorId(entry.actorId),
      roles: { owned: [...entry.roles.owned], active: entry.roles.active },
      attributes: {
        physicalPower: { ...entry.attributes.physicalPower },
        magicalPower: { ...entry.attributes.magicalPower },
        defense: { ...entry.attributes.defense },
        resistance: { ...entry.attributes.resistance },
        speed: { ...entry.attributes.speed },
        stability: { ...entry.attributes.stability },
      },
      hp: { ...entry.hp },
    })),
  };
}

function validateSerializedSubject(
  definition: ActorRpgDefinition,
  entry: SerializedActorRpgSubjectState,
): void {
  if (validateRolesState(roleDefinition(definition), entry.roles).kind !== "valid") {
    throw new RangeError(`Invalid RPG roles state for actor: ${entry.actorId}`);
  }

  const attributeEntries = [
    [CORE_ATTRIBUTE_REFERENCES.physicalPower, definition.attributes.physicalPower, entry.attributes.physicalPower],
    [CORE_ATTRIBUTE_REFERENCES.magicalPower, definition.attributes.magicalPower, entry.attributes.magicalPower],
    [CORE_ATTRIBUTE_REFERENCES.defense, definition.attributes.defense, entry.attributes.defense],
    [CORE_ATTRIBUTE_REFERENCES.resistance, definition.attributes.resistance, entry.attributes.resistance],
    [CORE_ATTRIBUTE_REFERENCES.speed, definition.attributes.speed, entry.attributes.speed],
    [CORE_ATTRIBUTE_REFERENCES.stability, definition.attributes.stability, entry.attributes.stability],
  ] as const;

  for (const [reference, initialBase, attributeState] of attributeEntries) {
    if (validateAttributeState(attributeDefinition(reference, initialBase), attributeState).kind !== "valid") {
      throw new RangeError(`Invalid RPG attribute state for actor: ${entry.actorId}`);
    }
  }

  if (validateResourceState(hpDefinition(definition), entry.hp).kind !== "valid") {
    throw new RangeError(`Invalid RPG HP state for actor: ${entry.actorId}`);
  }
}

export function deserializeActorRpgState(
  definitions: readonly ActorRpgDefinition[],
  serialized: SerializedActorRpgState,
): ActorRpgState {
  const definitionsById = new Map(
    definitions.map((definition) => [serializeActorId(definition.actorId), definition]),
  );
  if (definitionsById.size !== definitions.length) {
    throw new RangeError("Duplicate ActorId in Fantasia RPG definitions");
  }
  if (serialized.actors.length !== definitions.length) {
    throw new RangeError("Serialized RPG actor set does not match Fantasia definitions");
  }

  const seenActorIds = new Set<string>();
  const actors = serialized.actors.map((entry) => {
    if (seenActorIds.has(entry.actorId)) {
      throw new RangeError(`Duplicate serialized RPG ActorId: ${entry.actorId}`);
    }
    seenActorIds.add(entry.actorId);

    const definition = definitionsById.get(entry.actorId);
    if (definition === undefined) {
      throw new RangeError(`Unknown serialized RPG ActorId: ${entry.actorId}`);
    }
    validateSerializedSubject(definition, entry);

    return {
      actorId: deserializeActorId(entry.actorId),
      roles: { owned: [...entry.roles.owned], active: entry.roles.active },
      attributes: {
        physicalPower: { ...entry.attributes.physicalPower },
        magicalPower: { ...entry.attributes.magicalPower },
        defense: { ...entry.attributes.defense },
        resistance: { ...entry.attributes.resistance },
        speed: { ...entry.attributes.speed },
        stability: { ...entry.attributes.stability },
      },
      hp: { ...entry.hp },
    };
  });

  return { actors };
}
