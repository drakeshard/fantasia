import { describe, expect, it } from "vitest";
import { serializeSummonPersistenceState } from "../../packages/game/src/index.ts";
import {
  FANTASIA_SUMMON_SCHEMA_VERSION,
  restoreSummonState,
} from "../../packages/runtime/src/index.ts";

const standard = "summon:test-standard";
const limited = "summon:test-limited";
const entry1 = "11111111-1111-4111-8111-111111111111";
const entry2 = "22222222-2222-4222-8222-222222222222";
const entry3 = "33333333-3333-4333-8333-333333333333";

describe("GAME-BACKEND09 summon persistence contract", () => {
  it("restores deterministic opaque state and contiguous immutable history", () => {
    const restored = restoreSummonState(
      [
        {
          schemaVersion: FANTASIA_SUMMON_SCHEMA_VERSION,
          summonDefinitionId: limited,
          revision: 1,
          state: { z: 2, a: { y: true, x: 1 } },
        },
        {
          schemaVersion: FANTASIA_SUMMON_SCHEMA_VERSION,
          summonDefinitionId: standard,
          revision: 2,
          state: { counter: 2, nested: { second: "b", first: "a" } },
        },
      ],
      [
        {
          entryId: entry2,
          schemaVersion: 1,
          summonDefinitionId: standard,
          revision: 2,
          state: { nested: { first: "a", second: "b" }, counter: 2 },
        },
        {
          entryId: entry3,
          schemaVersion: 1,
          summonDefinitionId: limited,
          revision: 1,
          state: { a: { x: 1, y: true }, z: 2 },
        },
        {
          entryId: entry1,
          schemaVersion: 1,
          summonDefinitionId: standard,
          revision: 1,
          state: { counter: 1 },
        },
      ],
      [standard, limited],
    );

    expect(restored.kind).toBe("restored");
    if (restored.kind !== "restored") return;
    expect(restored.snapshot).toEqual({
      schemaVersion: 1,
      states: [
        { summonDefinitionId: limited, revision: 1, state: { a: { x: 1, y: true }, z: 2 } },
        {
          summonDefinitionId: standard,
          revision: 2,
          state: { counter: 2, nested: { first: "a", second: "b" } },
        },
      ],
      history: [
        {
          entryId: entry3,
          summonDefinitionId: limited,
          revision: 1,
          state: { a: { x: 1, y: true }, z: 2 },
        },
        { entryId: entry1, summonDefinitionId: standard, revision: 1, state: { counter: 1 } },
        {
          entryId: entry2,
          summonDefinitionId: standard,
          revision: 2,
          state: { counter: 2, nested: { first: "a", second: "b" } },
        },
      ],
    });
    expect(serializeSummonPersistenceState(restored.state)).toEqual({
      states: restored.snapshot.states,
      history: restored.snapshot.history,
    });
  });

  it("accepts empty persistence without inventing summon state", () => {
    expect(restoreSummonState([], [], [standard])).toEqual({
      kind: "restored",
      state: { states: [], history: [] },
      snapshot: { schemaVersion: 1, states: [], history: [] },
    });
  });

  it("rejects unknown definitions, duplicates, revision gaps, and state mismatch", () => {
    expect(
      restoreSummonState(
        [{ schemaVersion: 1, summonDefinitionId: "summon:unknown", revision: 1, state: {} }],
        [],
        [standard],
      ),
    ).toEqual({ kind: "rejected", reason: "Summon state references an unknown summon definition." });

    expect(
      restoreSummonState(
        [
          { schemaVersion: 1, summonDefinitionId: standard, revision: 1, state: {} },
          { schemaVersion: 1, summonDefinitionId: standard, revision: 1, state: {} },
        ],
        [{ entryId: entry1, schemaVersion: 1, summonDefinitionId: standard, revision: 1, state: {} }],
        [standard],
      ),
    ).toEqual({ kind: "rejected", reason: "Summon persistence contains duplicate current state." });

    expect(
      restoreSummonState(
        [{ schemaVersion: 1, summonDefinitionId: standard, revision: 2, state: { value: 2 } }],
        [
          { entryId: entry1, schemaVersion: 1, summonDefinitionId: standard, revision: 1, state: { value: 1 } },
          { entryId: entry2, schemaVersion: 1, summonDefinitionId: standard, revision: 3, state: { value: 2 } },
        ],
        [standard],
      ),
    ).toEqual({ kind: "rejected", reason: "Summon history revisions must be contiguous from revision 1." });

    expect(
      restoreSummonState(
        [{ schemaVersion: 1, summonDefinitionId: standard, revision: 1, state: { value: 2 } }],
        [{ entryId: entry1, schemaVersion: 1, summonDefinitionId: standard, revision: 1, state: { value: 1 } }],
        [standard],
      ),
    ).toEqual({ kind: "rejected", reason: "Summon current state does not match the latest history entry." });
  });

  it("rejects unsupported schemas, malformed JSON shapes, unsafe revisions, and invalid UUIDs", () => {
    expect(
      restoreSummonState(
        [{ schemaVersion: 2, summonDefinitionId: standard, revision: 1, state: {} }],
        [],
        [standard],
      ),
    ).toEqual({ kind: "rejected", reason: "Unsupported summon state schema version." });

    expect(
      restoreSummonState(
        [{ schemaVersion: 1, summonDefinitionId: standard, revision: 1, state: [] }],
        [],
        [standard],
      ),
    ).toEqual({ kind: "rejected", reason: "Malformed persisted summon state." });

    expect(
      restoreSummonState(
        [{ schemaVersion: 1, summonDefinitionId: standard, revision: Number.MAX_SAFE_INTEGER + 1, state: {} }],
        [],
        [standard],
      ),
    ).toEqual({ kind: "rejected", reason: "Summon state revision must be a positive safe integer." });

    expect(
      restoreSummonState(
        [{ schemaVersion: 1, summonDefinitionId: standard, revision: 1, state: {} }],
        [{ entryId: "not-a-uuid", schemaVersion: 1, summonDefinitionId: standard, revision: 1, state: {} }],
        [standard],
      ),
    ).toEqual({ kind: "rejected", reason: "Summon history entry ID must be a canonical UUID." });
  });
});
