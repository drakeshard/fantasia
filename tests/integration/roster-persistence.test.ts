import { describe, expect, it } from "vitest";
import {
  createRosterState,
  serializeRosterState,
} from "../../packages/game/src/index.ts";
import {
  FANTASIA_ROSTER_SCHEMA_VERSION,
  restoreRosterUnitInstances,
} from "../../packages/runtime/src/index.ts";

const protagonist = "character:protagonist";
const ally = "character:ally";
const firstId = "11111111-1111-4111-8111-111111111111";
const secondId = "22222222-2222-4222-8222-222222222222";

describe("GAME-BACKEND06 roster unit-instance persistence contract", () => {
  it("restores known repository-owned references and serializes deterministically", () => {
    const restored = restoreRosterUnitInstances(
      [
        {
          instanceId: secondId,
          schemaVersion: FANTASIA_ROSTER_SCHEMA_VERSION,
          characterDefinitionId: ally,
        },
        {
          instanceId: firstId,
          schemaVersion: FANTASIA_ROSTER_SCHEMA_VERSION,
          characterDefinitionId: protagonist,
        },
      ],
      [protagonist, ally],
    );

    expect(restored.kind).toBe("restored");
    if (restored.kind !== "restored") return;
    expect(restored.snapshot).toEqual({
      schemaVersion: FANTASIA_ROSTER_SCHEMA_VERSION,
      units: [
        { instanceId: firstId, characterDefinitionId: protagonist },
        { instanceId: secondId, characterDefinitionId: ally },
      ],
    });
    expect(serializeRosterState(restored.state)).toEqual(restored.snapshot.units);
  });

  it("keeps separate unit instances distinct without defining duplicate-copy gameplay semantics", () => {
    const state = createRosterState(
      [protagonist],
      [
        { instanceId: firstId, characterDefinitionId: protagonist },
        { instanceId: secondId, characterDefinitionId: protagonist },
      ],
    );

    expect(state.units).toHaveLength(2);
  });

  it("rejects duplicate instance IDs, unknown character references, and malformed IDs", () => {
    expect(
      restoreRosterUnitInstances(
        [
          {
            instanceId: firstId,
            schemaVersion: FANTASIA_ROSTER_SCHEMA_VERSION,
            characterDefinitionId: protagonist,
          },
          {
            instanceId: firstId,
            schemaVersion: FANTASIA_ROSTER_SCHEMA_VERSION,
            characterDefinitionId: protagonist,
          },
        ],
        [protagonist],
      ),
    ).toEqual({ kind: "rejected", reason: "Roster contains a duplicate unit instance ID." });

    expect(
      restoreRosterUnitInstances(
        [
          {
            instanceId: firstId,
            schemaVersion: FANTASIA_ROSTER_SCHEMA_VERSION,
            characterDefinitionId: "character:unknown",
          },
        ],
        [protagonist],
      ),
    ).toEqual({ kind: "rejected", reason: "Roster references an unknown character definition." });

    expect(
      restoreRosterUnitInstances(
        [
          {
            instanceId: "not-a-uuid",
            schemaVersion: FANTASIA_ROSTER_SCHEMA_VERSION,
            characterDefinitionId: protagonist,
          },
        ],
        [protagonist],
      ),
    ).toEqual({ kind: "rejected", reason: "Unit instance ID must be a canonical UUID." });
  });

  it("rejects unsupported schemas and malformed persisted rows", () => {
    expect(
      restoreRosterUnitInstances(
        [{ instanceId: firstId, schemaVersion: 2, characterDefinitionId: protagonist }],
        [protagonist],
      ),
    ).toEqual({ kind: "rejected", reason: "Unsupported roster unit-instance schema version." });

    expect(
      restoreRosterUnitInstances(
        [{ instanceId: firstId, schemaVersion: 1, characterDefinitionId: 42 }],
        [protagonist],
      ),
    ).toEqual({ kind: "rejected", reason: "Malformed persisted roster unit instance." });
  });
});
