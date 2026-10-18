import { describe, expect, it } from "vitest";
import { serializeEconomyState } from "../../packages/game/src/index.ts";
import {
  FANTASIA_ECONOMY_SCHEMA_VERSION,
  restoreEconomyState,
} from "../../packages/runtime/src/index.ts";

const progression = "currency:test-progression";
const other = "currency:test-other";
const entry1 = "11111111-1111-4111-8111-111111111111";
const entry2 = "22222222-2222-4222-8222-222222222222";
const entry3 = "33333333-3333-4333-8333-333333333333";

describe("GAME-BACKEND08 economy persistence contract", () => {
  it("restores a revisioned ledger and deterministic current balances", () => {
    const restored = restoreEconomyState(
      [
        {
          schemaVersion: FANTASIA_ECONOMY_SCHEMA_VERSION,
          currencyDefinitionId: other,
          balance: 25,
          revision: 1,
        },
        {
          schemaVersion: FANTASIA_ECONOMY_SCHEMA_VERSION,
          currencyDefinitionId: progression,
          balance: 60,
          revision: 2,
        },
      ],
      [
        {
          entryId: entry2,
          schemaVersion: FANTASIA_ECONOMY_SCHEMA_VERSION,
          currencyDefinitionId: progression,
          delta: -40,
          balanceAfter: 60,
          balanceRevision: 2,
        },
        {
          entryId: entry3,
          schemaVersion: FANTASIA_ECONOMY_SCHEMA_VERSION,
          currencyDefinitionId: other,
          delta: 25,
          balanceAfter: 25,
          balanceRevision: 1,
        },
        {
          entryId: entry1,
          schemaVersion: FANTASIA_ECONOMY_SCHEMA_VERSION,
          currencyDefinitionId: progression,
          delta: 100,
          balanceAfter: 100,
          balanceRevision: 1,
        },
      ],
      [progression, other],
    );

    expect(restored.kind).toBe("restored");
    if (restored.kind !== "restored") return;
    expect(restored.snapshot).toEqual({
      schemaVersion: FANTASIA_ECONOMY_SCHEMA_VERSION,
      balances: [
        { currencyDefinitionId: other, balance: 25, revision: 1 },
        { currencyDefinitionId: progression, balance: 60, revision: 2 },
      ],
      ledger: [
        {
          entryId: entry3,
          currencyDefinitionId: other,
          delta: 25,
          balanceAfter: 25,
          balanceRevision: 1,
        },
        {
          entryId: entry1,
          currencyDefinitionId: progression,
          delta: 100,
          balanceAfter: 100,
          balanceRevision: 1,
        },
        {
          entryId: entry2,
          currencyDefinitionId: progression,
          delta: -40,
          balanceAfter: 60,
          balanceRevision: 2,
        },
      ],
    });
    expect(serializeEconomyState(restored.state)).toEqual({
      balances: restored.snapshot.balances,
      ledger: restored.snapshot.ledger,
    });
  });

  it("accepts an empty economy without inventing starting balances", () => {
    expect(restoreEconomyState([], [], [progression])).toEqual({
      kind: "restored",
      state: { balances: [], ledger: [] },
      snapshot: {
        schemaVersion: FANTASIA_ECONOMY_SCHEMA_VERSION,
        balances: [],
        ledger: [],
      },
    });
  });

  it("rejects unknown definitions and duplicate current balances", () => {
    expect(
      restoreEconomyState(
        [{ schemaVersion: 1, currencyDefinitionId: "currency:unknown", balance: 1, revision: 1 }],
        [
          {
            entryId: entry1,
            schemaVersion: 1,
            currencyDefinitionId: "currency:unknown",
            delta: 1,
            balanceAfter: 1,
            balanceRevision: 1,
          },
        ],
        [progression],
      ),
    ).toEqual({
      kind: "rejected",
      reason: "Currency balance references an unknown currency definition.",
    });

    expect(
      restoreEconomyState(
        [
          { schemaVersion: 1, currencyDefinitionId: progression, balance: 1, revision: 1 },
          { schemaVersion: 1, currencyDefinitionId: progression, balance: 1, revision: 1 },
        ],
        [
          {
            entryId: entry1,
            schemaVersion: 1,
            currencyDefinitionId: progression,
            delta: 1,
            balanceAfter: 1,
            balanceRevision: 1,
          },
        ],
        [progression],
      ),
    ).toEqual({
      kind: "rejected",
      reason: "Economy state contains a duplicate currency balance.",
    });
  });

  it("rejects broken ledger arithmetic, revision gaps, and balance mismatch", () => {
    const balance = [
      { schemaVersion: 1, currencyDefinitionId: progression, balance: 60, revision: 2 },
    ];

    expect(
      restoreEconomyState(
        balance,
        [
          {
            entryId: entry1,
            schemaVersion: 1,
            currencyDefinitionId: progression,
            delta: 100,
            balanceAfter: 99,
            balanceRevision: 1,
          },
        ],
        [progression],
      ),
    ).toEqual({
      kind: "rejected",
      reason: "Currency ledger arithmetic does not match its balance-after value.",
    });

    expect(
      restoreEconomyState(
        balance,
        [
          {
            entryId: entry1,
            schemaVersion: 1,
            currencyDefinitionId: progression,
            delta: 100,
            balanceAfter: 100,
            balanceRevision: 1,
          },
          {
            entryId: entry2,
            schemaVersion: 1,
            currencyDefinitionId: progression,
            delta: -40,
            balanceAfter: 60,
            balanceRevision: 3,
          },
        ],
        [progression],
      ),
    ).toEqual({
      kind: "rejected",
      reason: "Currency ledger balance revisions must be contiguous from revision 1.",
    });

    expect(
      restoreEconomyState(
        [{ schemaVersion: 1, currencyDefinitionId: progression, balance: 61, revision: 2 }],
        [
          {
            entryId: entry1,
            schemaVersion: 1,
            currencyDefinitionId: progression,
            delta: 100,
            balanceAfter: 100,
            balanceRevision: 1,
          },
          {
            entryId: entry2,
            schemaVersion: 1,
            currencyDefinitionId: progression,
            delta: -40,
            balanceAfter: 60,
            balanceRevision: 2,
          },
        ],
        [progression],
      ),
    ).toEqual({
      kind: "rejected",
      reason: "Currency balance does not match the latest ledger entry.",
    });
  });

  it("rejects unsupported schemas, malformed values, and unsafe integers", () => {
    expect(
      restoreEconomyState(
        [{ schemaVersion: 2, currencyDefinitionId: progression, balance: 1, revision: 1 }],
        [],
        [progression],
      ),
    ).toEqual({ kind: "rejected", reason: "Unsupported currency balance schema version." });

    expect(
      restoreEconomyState(
        [{ schemaVersion: 1, currencyDefinitionId: progression, balance: "1", revision: 1 }],
        [],
        [progression],
      ),
    ).toEqual({ kind: "rejected", reason: "Malformed persisted currency balance." });

    expect(
      restoreEconomyState(
        [
          {
            schemaVersion: 1,
            currencyDefinitionId: progression,
            balance: Number.MAX_SAFE_INTEGER + 1,
            revision: 1,
          },
        ],
        [],
        [progression],
      ),
    ).toEqual({
      kind: "rejected",
      reason: "Currency balance must be a non-negative safe integer.",
    });
  });
});
