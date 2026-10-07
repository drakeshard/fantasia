import {
  deserializeTacticalEntityId,
  serializeTacticalEntityId,
  type TacticalEntityId,
} from "@drakeshard/tactical/identity";
import {
  type ActorId,
  actorIdsEqual,
  deserializeActorId,
  serializeActorId,
} from "../../actors/identity.js";

export interface ActorTacticalAssociation {
  readonly actorId: ActorId;
  readonly tacticalEntityId: TacticalEntityId;
}

export interface ActorIdentityState {
  readonly associations: readonly ActorTacticalAssociation[];
}

export interface SerializedActorTacticalAssociation {
  readonly actorId: string;
  readonly tacticalEntityId: string;
}

export interface SerializedActorIdentityState {
  readonly associations: readonly SerializedActorTacticalAssociation[];
}

export function createActorIdentityState(
  associations: readonly ActorTacticalAssociation[] = [],
): ActorIdentityState {
  const actorIds = new Set<string>();
  const tacticalEntityIds = new Set<string>();
  const copy: ActorTacticalAssociation[] = [];

  for (const association of associations) {
    const serializedActorId = serializeActorId(association.actorId);
    const serializedTacticalId = serializeTacticalEntityId(association.tacticalEntityId);

    if (actorIds.has(serializedActorId)) {
      throw new RangeError(`Duplicate ActorId association: ${serializedActorId}`);
    }
    if (tacticalEntityIds.has(serializedTacticalId)) {
      throw new RangeError(`Duplicate TacticalEntityId association: ${serializedTacticalId}`);
    }

    actorIds.add(serializedActorId);
    tacticalEntityIds.add(serializedTacticalId);
    copy.push({
      actorId: association.actorId,
      tacticalEntityId: association.tacticalEntityId,
    });
  }

  return { associations: copy };
}

export function tacticalEntityForActor(
  state: ActorIdentityState,
  actorId: ActorId,
): TacticalEntityId | undefined {
  return state.associations.find((association) => actorIdsEqual(association.actorId, actorId))
    ?.tacticalEntityId;
}

export function actorForTacticalEntity(
  state: ActorIdentityState,
  tacticalEntityId: TacticalEntityId,
): ActorId | undefined {
  const serializedTarget = serializeTacticalEntityId(tacticalEntityId);
  return state.associations.find(
    (association) => serializeTacticalEntityId(association.tacticalEntityId) === serializedTarget,
  )?.actorId;
}

export function serializeActorIdentityState(
  state: ActorIdentityState,
): SerializedActorIdentityState {
  return {
    associations: state.associations.map((association) => ({
      actorId: serializeActorId(association.actorId),
      tacticalEntityId: serializeTacticalEntityId(association.tacticalEntityId),
    })),
  };
}

export function deserializeActorIdentityState(
  state: SerializedActorIdentityState,
): ActorIdentityState {
  return createActorIdentityState(
    state.associations.map((association) => ({
      actorId: deserializeActorId(association.actorId),
      tacticalEntityId: deserializeTacticalEntityId(association.tacticalEntityId),
    })),
  );
}
