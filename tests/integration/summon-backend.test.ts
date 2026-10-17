import { describe, expect, it } from "vitest";
import { parseSummonRows } from "../../apps/web/src/backend/summon.ts";

const definitionId = "summon:test-standard";
const entryId = "11111111-1111-4111-8111-111111111111";

describe("GAME-BACKEND09 summon backend transport", () => {
  it("parses owner-read transport through the repository catalog", () => {
    const record = parseSummonRows(
      [
        {
          schema_version: 1,
          summon_definition_id: definitionId,
          revision: 1,
          state_json: { counter: 1 },
          updated_at: "2026-10-17T00:00:00.000Z",
        },
      ],
      [
        {
          id: entryId,
          schema_version: 1,
          summon_definition_id: definitionId,
          revision: 1,
          state_json: { counter: 1 },
          created_at: "2026-10-17T00:00:00.000Z",
        },
      ],
      [definitionId],
    );

    expect(record.snapshot.states).toEqual([
      { summonDefinitionId: definitionId, revision: 1, state: { counter: 1 } },
    ]);
    expect(record.stateUpdatedAtBySummonDefinitionId[definitionId]).toBe(
      "2026-10-17T00:00:00.000Z",
    );
    expect(record.historyCreatedAtByEntryId[entryId]).toBe("2026-10-17T00:00:00.000Z");
  });

  it("rejects malformed metadata and unknown persisted definitions", () => {
    expect(() =>
      parseSummonRows(
        [
          {
            schema_version: 1,
            summon_definition_id: definitionId,
            revision: 1,
            state_json: {},
            updated_at: null,
          },
        ],
        [],
        [definitionId],
      ),
    ).toThrow("Supabase returned invalid summon state metadata.");

    expect(() =>
      parseSummonRows(
        [{ schema_version: 1, summon_definition_id: definitionId, revision: 1, state_json: {}, updated_at: "now" }],
        [{ id: entryId, schema_version: 1, summon_definition_id: definitionId, revision: 1, state_json: {}, created_at: null }],
        [definitionId],
      ),
    ).toThrow("Supabase returned invalid summon history metadata.");

    expect(() =>
      parseSummonRows(
        [{ schema_version: 1, summon_definition_id: "summon:unknown", revision: 1, state_json: {}, updated_at: "now" }],
        [{ id: entryId, schema_version: 1, summon_definition_id: "summon:unknown", revision: 1, state_json: {}, created_at: "now" }],
        [definitionId],
      ),
    ).toThrow("Supabase returned invalid summon state: Summon state references an unknown summon definition.");
  });
});
