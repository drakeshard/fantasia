import { describe, expect, it } from "vitest";
import { parseEquipmentInstanceRows } from "../../apps/web/src/backend/equipment.ts";

const sword = "equipment:test-sword";
const instanceId = "11111111-1111-4111-8111-111111111111";

describe("GAME-BACKEND07 equipment backend transport", () => {
  it("parses Supabase rows through the repository-owned equipment catalog", () => {
    expect(
      parseEquipmentInstanceRows(
        [
          {
            id: instanceId,
            schema_version: 1,
            equipment_definition_id: sword,
            created_at: "2026-10-17T00:00:00.000Z",
          },
        ],
        [sword],
      ),
    ).toEqual({
      snapshot: {
        schemaVersion: 1,
        equipment: [{ instanceId, equipmentDefinitionId: sword }],
      },
      createdAtByInstanceId: {
        [instanceId]: "2026-10-17T00:00:00.000Z",
      },
    });
  });

  it("rejects malformed transport metadata before exposing equipment state", () => {
    expect(() =>
      parseEquipmentInstanceRows(
        [
          {
            id: instanceId,
            schema_version: 1,
            equipment_definition_id: sword,
            created_at: 42,
          },
        ],
        [sword],
      ),
    ).toThrow("Supabase returned invalid equipment metadata.");
  });

  it("rejects persisted definitions that are not present in the supplied Git catalog", () => {
    expect(() =>
      parseEquipmentInstanceRows(
        [
          {
            id: instanceId,
            schema_version: 1,
            equipment_definition_id: "equipment:unknown",
            created_at: "2026-10-17T00:00:00.000Z",
          },
        ],
        [sword],
      ),
    ).toThrow(
      "Supabase returned invalid equipment state: Equipment inventory references an unknown equipment definition.",
    );
  });
});
