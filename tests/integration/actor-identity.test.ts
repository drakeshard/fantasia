import type { AdvancementState } from "@drakeshard/rpg/advancement";
import { describe, expect, it } from "vitest";
import {
  actorForTacticalEntity,
  actorId,
  associateRpgSubject,
  deserializeActorIdentityState,
  serializeActorIdentityState,
  tacticalEntityForActor,
} from "../../packages/game/src/index.ts";

describe("GAME-I02 actor and cross-domain identity", () => {
  it("uses the Fantasia ActorId as the host-owned RPG subject identity", () => {
    const mc = actorId("actor:mc");
    const advancement: AdvancementState<"character-level", "level-1"> = {
      track: "character-level",
      rank: "level-1",
    };

    const subject = associateRpgSubject(mc, advancement);

    expect(subject).toEqual({ actorId: mc, state: advancement });
  });

  it("maps ActorId and TacticalEntityId in both directions", () => {
    const mc = actorId("actor:mc");
    const enemy = actorId("actor:enemy:1");
    const state = deserializeActorIdentityState({
      associations: [
        { actorId: "actor:mc", tacticalEntityId: "tactical:mc" },
        { actorId: "actor:enemy:1", tacticalEntityId: "tactical:enemy:1" },
      ],
    });
    const mcTactical = state.associations[0]?.tacticalEntityId;
    const enemyTactical = state.associations[1]?.tacticalEntityId;

    expect(mcTactical).toBeDefined();
    expect(enemyTactical).toBeDefined();
    if (mcTactical === undefined || enemyTactical === undefined) {
      throw new Error("Expected tactical identity associations");
    }

    expect(tacticalEntityForActor(state, mc)).toBe(mcTactical);
    expect(actorForTacticalEntity(state, enemyTactical)).toBe(enemy);
    expect(tacticalEntityForActor(state, actorId("actor:missing"))).toBeUndefined();
  });

  it("rejects duplicate identities on either side of the association", () => {
    expect(() =>
      deserializeActorIdentityState({
        associations: [
          { actorId: "actor:one", tacticalEntityId: "tactical:one" },
          { actorId: "actor:one", tacticalEntityId: "tactical:two" },
        ],
      }),
    ).toThrow(/Duplicate ActorId/);

    expect(() =>
      deserializeActorIdentityState({
        associations: [
          { actorId: "actor:one", tacticalEntityId: "tactical:one" },
          { actorId: "actor:two", tacticalEntityId: "tactical:one" },
        ],
      }),
    ).toThrow(/Duplicate TacticalEntityId/);
  });

  it("round-trips through plain JSON-friendly persisted state without changing order", () => {
    const serialized = {
      associations: [
        { actorId: "actor:mc", tacticalEntityId: "tactical:mc" },
        { actorId: "actor:ally:robin", tacticalEntityId: "tactical:ally:robin" },
      ],
    } as const;
    const json = JSON.stringify(serialized);
    const restored = deserializeActorIdentityState(JSON.parse(json));

    expect(serializeActorIdentityState(restored)).toEqual(serialized);
  });
});
