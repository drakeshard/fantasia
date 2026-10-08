import { describe, expect, it } from "vitest";
import {
  type ActorRpgDefinition,
  actorId,
  actorRpgProfile,
  createActorRpgState,
  deserializeActorRpgState,
  serializeActorRpgState,
} from "../../packages/game/src/index.ts";

const definitions: readonly ActorRpgDefinition[] = [
  {
    actorId: actorId("test:hero"),
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
  {
    actorId: actorId("test:archer"),
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
    hp: { current: 72, capacity: 80 },
  },
];

describe("GAME-I04 RPG core state", () => {
  it("composes class, core attributes, and HP around host-owned ActorId deterministically", () => {
    const first = createActorRpgState(definitions);
    const second = createActorRpgState(definitions);

    expect(serializeActorRpgState(second)).toEqual(serializeActorRpgState(first));
    expect(actorRpgProfile(first, actorId("test:hero"))).toEqual({
      activeClass: "Infantry",
      hp: { current: 100, capacity: 100 },
      attributes: {
        physicalPower: 12,
        magicalPower: 5,
        defense: 10,
        resistance: 7,
        speed: 8,
        stability: 10,
      },
    });
    expect(actorRpgProfile(first, actorId("test:archer"))?.hp).toEqual({
      current: 72,
      capacity: 80,
    });
  });

  it("round-trips plain JSON state through RPG contract validation", () => {
    const state = createActorRpgState(definitions);
    const serialized = serializeActorRpgState(state);
    const json = JSON.parse(JSON.stringify(serialized));
    const restored = deserializeActorRpgState(definitions, json);

    expect(serializeActorRpgState(restored)).toEqual(serialized);
  });

  it("rejects duplicate actor definitions and malformed persisted module state", () => {
    const heroDefinition = definitions[0];
    if (heroDefinition === undefined) throw new Error("Test RPG fixture requires a hero definition");

    expect(() => createActorRpgState([heroDefinition, heroDefinition])).toThrow(
      /Duplicate RPG ActorId definition/,
    );

    const serialized = serializeActorRpgState(createActorRpgState(definitions));
    const malformed = {
      actors: serialized.actors.map((entry, index) =>
        index === 0
          ? {
              ...entry,
              roles: { owned: [...entry.roles.owned], active: "undefined-class" },
            }
          : entry,
      ),
    };

    expect(() => deserializeActorRpgState(definitions, malformed)).toThrow(
      /Invalid RPG roles state/,
    );
  });
});
