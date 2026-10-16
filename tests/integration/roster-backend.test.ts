import { describe, expect, it } from "vitest";
import { parseRosterUnitInstanceRows } from "../../apps/web/src/backend/roster.ts";

const protagonist = "character:protagonist";
const instanceId = "11111111-1111-4111-8111-111111111111";

describe("GAME-BACKEND06 roster backend transport", () => {
  it("parses Supabase rows through the repository-owned character catalog", () => {
    expect(
      parseRosterUnitInstanceRows(
        [
          {
            id: instanceId,
            schema_version: 1,
            character_definition_id: protagonist,
            created_at: "2026-10-17T00:00:00.000Z",
          },
        ],
        [protagonist],
      ),
    ).toEqual({
      snapshot: {
        schemaVersion: 1,
        units: [{ instanceId, characterDefinitionId: protagonist }],
      },
      createdAtByInstanceId: {
        [instanceId]: "2026-10-17T00:00:00.000Z",
      },
    });
  });

  it("rejects malformed transport metadata before exposing roster state", () => {
    expect(() =>
      parseRosterUnitInstanceRows(
        [
          {
            id: instanceId,
            schema_version: 1,
            character_definition_id: protagonist,
            created_at: 42,
          },
        ],
        [protagonist],
      ),
    ).toThrow("Supabase returned invalid roster metadata.");
  });

  it("rejects persisted definitions that are not present in the supplied Git catalog", () => {
    expect(() =>
      parseRosterUnitInstanceRows(
        [
          {
            id: instanceId,
            schema_version: 1,
            character_definition_id: "character:unknown",
            created_at: "2026-10-17T00:00:00.000Z",
          },
        ],
        [protagonist],
      ),
    ).toThrow("Supabase returned invalid roster state: Roster references an unknown character definition.");
  });
});
