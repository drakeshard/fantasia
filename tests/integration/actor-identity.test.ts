import type { AdvancementState } from "@drakeshard/rpg/advancement";
import { tacticalEntityId, type TacticalEntityId } from "@drakeshard/tactical/identity";
import { describe, expect, it } from "vitest";
import {
  actorForTacticalEntity,
  actorId,
  associateRpgSubject,
  createActorIdentityState,
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
    const mcTactical = tacticalEntityId("tactical:mc");
    const enemyTactical = tacticalEntityId("tactical:enemy:1");
    const state = createActorIdentityState([
      { actorId: mc, tacticalEntityId: mcTactical },
      { actorId: enemy, tacticalEntityId: enemyTactical },
    ]);

    expect(tacticalEntityForActor(state, mc)).toBe(mcTactical);
    expect(actorForTacticalEntity(state, enemyTactical)).toBe(enemy);
    expect(tacticalEntityForActor(state, actorId("actor:missing"))).toBeUndefined();
    expect(actorForTacticalEntity(state, tacticalEntityId("tactical:missing"))).toBeUndefined();
  });

  it("rejects duplicate identities on either side of the association", () => {
    const actor = actorId("actor:one");
    const otherActor = actorId("actor:two");
    const tactical = tacticalEntityId("tactical:one");
    const otherTactical = tacticalEntityId("tactical:two");

    expect(() =>
      createActorIdentityState([
        { actorId: actor, tacticalEntityId: tactical },
        { actorId: actor, tacticalEntityId: otherTactical },
      ]),
    ).toThrow(/Duplicate ActorId/);

    expect(() =>
      createActorIdentityState([
        { actorId: actor, tacticalEntityId: tactical },
        { actorId: otherActor, tacticalEntityId: tactical },
      ]),
    ).toThrow(/Duplicate TacticalEntityId/);
  });

  it("round-trips through plain JSON-friendly persisted state without changing order", () => {
    const associations = createActorIdentityState([
      { actorId: actorId("actor:mc"), tacticalEntityId: tacticalEntityId("tactical:mc") },
      {
        actorId: actorId("actor:ally:robin"),
        tacticalEntityId: tacticalEntityId("tactical:ally:robin"),
      },
    ]);

    const serialized = serializeActorIdentityState(associations);
    const json = JSON.stringify(serialized);
    const restored = deserializeActorIdentityState(JSON.parse(json));

    expect(serialized).toEqual({
      associations: [
        { actorId: "actor:mc", tacticalEntityId: "tactical:mc" },
        { actorId: "actor:ally:robin", tacticalEntityId: "tactical:ally:robin" },
      ],
    });
    expect(serializeActorIdentityState(restored)).toEqual(serialized);
  });

  it("keeps TacticalEntityId semantically distinct at the type boundary", () => {
    const tactical: TacticalEntityId = tacticalEntityId("tactical:typed");
    expect(tactical).toBe("tactical:typed");
  });
});
