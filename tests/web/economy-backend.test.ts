import { describe, expect, it } from "vitest";
import { parseEconomyRows } from "../../apps/web/src/backend/economy.ts";

const progression = "currency:test-progression";
const entryId = "11111111-1111-4111-8111-111111111111";

describe("GAME-BACKEND08 economy backend transport", () => {
  it("parses owner economy rows through the repository-owned currency catalog", () => {
    expect(
      parseEconomyRows(
        [
          {
            schema_version: 1,
            currency_definition_id: progression,
            balance: 75,
            revision: 1,
            updated_at: "2026-10-17T00:00:00.000Z",
          },
        ],
        [
          {
            id: entryId,
            schema_version: 1,
            currency_definition_id: progression,
            delta: 75,
            balance_after: 75,
            balance_revision: 1,
            created_at: "2026-10-17T00:00:00.000Z",
          },
        ],
        [progression],
      ),
    ).toEqual({
      snapshot: {
        schemaVersion: 1,
        balances: [{ currencyDefinitionId: progression, balance: 75, revision: 1 }],
        ledger: [
          {
            entryId,
            currencyDefinitionId: progression,
            delta: 75,
            balanceAfter: 75,
            balanceRevision: 1,
          },
        ],
      },
      balanceUpdatedAtByCurrencyDefinitionId: {
        [progression]: "2026-10-17T00:00:00.000Z",
      },
      ledgerCreatedAtByEntryId: {
        [entryId]: "2026-10-17T00:00:00.000Z",
      },
    });
  });

  it("accepts an empty account economy without synthesizing balances", () => {
    expect(parseEconomyRows([], [], [progression])).toEqual({
      snapshot: { schemaVersion: 1, balances: [], ledger: [] },
      balanceUpdatedAtByCurrencyDefinitionId: {},
      ledgerCreatedAtByEntryId: {},
    });
  });

  it("rejects malformed transport timestamps", () => {
    expect(() =>
      parseEconomyRows(
        [
          {
            schema_version: 1,
            currency_definition_id: progression,
            balance: 75,
            revision: 1,
            updated_at: 42,
          },
        ],
        [],
        [progression],
      ),
    ).toThrow("Supabase returned invalid currency balance metadata.");

    expect(() =>
      parseEconomyRows(
        [],
        [
          {
            id: entryId,
            schema_version: 1,
            currency_definition_id: progression,
            delta: 75,
            balance_after: 75,
            balance_revision: 1,
            created_at: 42,
          },
        ],
        [progression],
      ),
    ).toThrow("Supabase returned invalid currency ledger metadata.");
  });

  it("rejects persisted currency definitions not present in the supplied Git catalog", () => {
    expect(() =>
      parseEconomyRows(
        [
          {
            schema_version: 1,
            currency_definition_id: "currency:unknown",
            balance: 75,
            revision: 1,
            updated_at: "2026-10-17T00:00:00.000Z",
          },
        ],
        [
          {
            id: entryId,
            schema_version: 1,
            currency_definition_id: "currency:unknown",
            delta: 75,
            balance_after: 75,
            balance_revision: 1,
            created_at: "2026-10-17T00:00:00.000Z",
          },
        ],
        [progression],
      ),
    ).toThrow(
      "Supabase returned invalid economy state: Currency balance references an unknown currency definition.",
    );
  });
});
