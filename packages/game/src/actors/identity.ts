declare const actorIdBrand: unique symbol;

/** Canonical identity for a concrete Fantasia actor/character. */
export type ActorId = string & {
  readonly [actorIdBrand]: "ActorId";
};

export function actorId(value: string): ActorId {
  return value as ActorId;
}

export function actorIdsEqual(left: ActorId, right: ActorId): boolean {
  return left === right;
}

export function serializeActorId(id: ActorId): string {
  return id;
}

export function deserializeActorId(value: string): ActorId {
  return actorId(value);
}
