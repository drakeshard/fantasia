import {
  createEconomyState,
  type EconomyState,
  type SerializedCurrencyBalance,
  type SerializedCurrencyLedgerEntry,
  serializeEconomyState,
} from "@fantasia/game";

export const FANTASIA_ECONOMY_SCHEMA_VERSION = 1 as const;

export interface PersistedCurrencyBalanceRow {
  readonly schemaVersion: unknown;
  readonly currencyDefinitionId: unknown;
  readonly balance: unknown;
  readonly revision: unknown;
}

export interface PersistedCurrencyLedgerRow {
  readonly entryId: unknown;
  readonly schemaVersion: unknown;
  readonly currencyDefinitionId: unknown;
  readonly delta: unknown;
  readonly balanceAfter: unknown;
  readonly balanceRevision: unknown;
}

export interface EconomySnapshot {
  readonly schemaVersion: typeof FANTASIA_ECONOMY_SCHEMA_VERSION;
  readonly balances: readonly SerializedCurrencyBalance[];
  readonly ledger: readonly SerializedCurrencyLedgerEntry[];
}

export type EconomyRestoreResult =
  | Readonly<{
      kind: "restored";
      state: EconomyState;
      snapshot: EconomySnapshot;
    }>
  | Readonly<{ kind: "rejected"; reason: string }>;

function parseBalances(
  rows: readonly PersistedCurrencyBalanceRow[],
): readonly SerializedCurrencyBalance[] {
  return rows.map((row) => {
    if (row.schemaVersion !== FANTASIA_ECONOMY_SCHEMA_VERSION) {
      throw new Error("Unsupported currency balance schema version.");
    }
    if (
      typeof row.currencyDefinitionId !== "string" ||
      typeof row.balance !== "number" ||
      typeof row.revision !== "number"
    ) {
      throw new Error("Malformed persisted currency balance.");
    }
    return {
      currencyDefinitionId: row.currencyDefinitionId,
      balance: row.balance,
      revision: row.revision,
    };
  });
}

function parseLedger(
  rows: readonly PersistedCurrencyLedgerRow[],
): readonly SerializedCurrencyLedgerEntry[] {
  return rows.map((row) => {
    if (row.schemaVersion !== FANTASIA_ECONOMY_SCHEMA_VERSION) {
      throw new Error("Unsupported currency ledger schema version.");
    }
    if (
      typeof row.entryId !== "string" ||
      typeof row.currencyDefinitionId !== "string" ||
      typeof row.delta !== "number" ||
      typeof row.balanceAfter !== "number" ||
      typeof row.balanceRevision !== "number"
    ) {
      throw new Error("Malformed persisted currency ledger entry.");
    }
    return {
      entryId: row.entryId,
      currencyDefinitionId: row.currencyDefinitionId,
      delta: row.delta,
      balanceAfter: row.balanceAfter,
      balanceRevision: row.balanceRevision,
    };
  });
}

export function restoreEconomyState(
  balanceRows: readonly PersistedCurrencyBalanceRow[],
  ledgerRows: readonly PersistedCurrencyLedgerRow[],
  knownCurrencyDefinitionIds: readonly string[],
): EconomyRestoreResult {
  try {
    const state = createEconomyState(
      knownCurrencyDefinitionIds,
      parseBalances(balanceRows),
      parseLedger(ledgerRows),
    );
    const serialized = serializeEconomyState(state);
    return {
      kind: "restored",
      state,
      snapshot: {
        schemaVersion: FANTASIA_ECONOMY_SCHEMA_VERSION,
        balances: serialized.balances,
        ledger: serialized.ledger,
      },
    };
  } catch (error) {
    return {
      kind: "rejected",
      reason: error instanceof Error ? error.message : "Economy restoration failed.",
    };
  }
}
