import { describe, expect, it } from "vitest";
import {
  createEquipmentInventoryState,
  serializeEquipmentInventoryState,
} from "../../packages/game/src/index.ts";
import {
  FANTASIA_EQUIPMENT_SCHEMA_VERSION,
  restoreEquipmentInstances,
} from "../../packages/runtime/src/index.ts";

const sword = "equipment:test-sword";
const accessory = "equipment:test-accessory";
const firstId = "11111111-1111-4111-8111-111111111111";
const secondId = "22222222-2222-4222-8222-222222222222";

describe("GAME-BACKEND07 equipment-instance persistence contract", () => {
  it("restores known repository-owned references and serializes deterministically", () => {
    const restored = restoreEquipmentInstances(
      [
        {
          instanceId: secondId,
          schemaVersion: FANTASIA_EQUIPMENT_SCHEMA_VERSION,
          equipmentDefinitionId: accessory,
        },
        {
          instanceId: firstId,
          schemaVersion: FANTASIA_EQUIPMENT_SCHEMA_VERSION,
          equipmentDefinitionId: sword,
        },
      ],
      [sword, accessory],
    );

    expect(restored.kind).toBe("restored");
    if (restored.kind !== "restored") return;
    expect(restored.snapshot).toEqual({
      schemaVersion: FANTASIA_EQUIPMENT_SCHEMA_VERSION,
      equipment: [
        { instanceId: firstId, equipmentDefinitionId: sword },
        { instanceId: secondId, equipmentDefinitionId: accessory },
      ],
    });
    expect(serializeEquipmentInventoryState(restored.state)).toEqual(restored.snapshot.equipment);
  });

  it("keeps separate equipment instances distinct without defining duplicate-item semantics", () => {
    const state = createEquipmentInventoryState(
      [sword],
      [
        { instanceId: firstId, equipmentDefinitionId: sword },
        { instanceId: secondId, equipmentDefinitionId: sword },
      ],
    );

    expect(state.equipment).toHaveLength(2);
  });

  it("rejects duplicate instance IDs, unknown equipment references, and malformed IDs", () => {
    expect(
      restoreEquipmentInstances(
        [
          {
            instanceId: firstId,
            schemaVersion: FANTASIA_EQUIPMENT_SCHEMA_VERSION,
            equipmentDefinitionId: sword,
          },
          {
            instanceId: firstId,
            schemaVersion: FANTASIA_EQUIPMENT_SCHEMA_VERSION,
            equipmentDefinitionId: sword,
          },
        ],
        [sword],
      ),
    ).toEqual({
      kind: "rejected",
      reason: "Equipment inventory contains a duplicate equipment instance ID.",
    });

    expect(
      restoreEquipmentInstances(
        [
          {
            instanceId: firstId,
            schemaVersion: FANTASIA_EQUIPMENT_SCHEMA_VERSION,
            equipmentDefinitionId: "equipment:unknown",
          },
        ],
        [sword],
      ),
    ).toEqual({
      kind: "rejected",
      reason: "Equipment inventory references an unknown equipment definition.",
    });

    expect(
      restoreEquipmentInstances(
        [
          {
            instanceId: "not-a-uuid",
            schemaVersion: FANTASIA_EQUIPMENT_SCHEMA_VERSION,
            equipmentDefinitionId: sword,
          },
        ],
        [sword],
      ),
    ).toEqual({
      kind: "rejected",
      reason: "Equipment instance ID must be a canonical UUID.",
    });
  });

  it("rejects unsupported schemas and malformed persisted rows", () => {
    expect(
      restoreEquipmentInstances(
        [{ instanceId: firstId, schemaVersion: 2, equipmentDefinitionId: sword }],
        [sword],
      ),
    ).toEqual({ kind: "rejected", reason: "Unsupported equipment instance schema version." });

    expect(
      restoreEquipmentInstances(
        [{ instanceId: firstId, schemaVersion: 1, equipmentDefinitionId: 42 }],
        [sword],
      ),
    ).toEqual({ kind: "rejected", reason: "Malformed persisted equipment instance." });
  });
});
