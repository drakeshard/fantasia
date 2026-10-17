declare const currencyDefinitionIdBrand: unique symbol;
declare const currencyLedgerEntryIdBrand: unique symbol;

/** Stable repository-owned currency definition reference. */
export type CurrencyDefinitionId = string & {
  readonly [currencyDefinitionIdBrand]: "CurrencyDefinitionId";
};

/** Stable identity for one immutable currency-ledger entry. */
export type CurrencyLedgerEntryId = string & {
  readonly [currencyLedgerEntryIdBrand]: "CurrencyLedgerEntryId";
};

export interface SerializedCurrencyBalance {
  readonly currencyDefinitionId: string;
  readonly balance: number;
  readonly revision: number;
}

export interface SerializedCurrencyLedgerEntry {
  readonly entryId: string;
  readonly currencyDefinitionId: string;
  readonly delta: number;
  readonly balanceAfter: number;
  readonly balanceRevision: number;
}

export interface CurrencyBalance {
  readonly currencyDefinitionId: CurrencyDefinitionId;
  readonly balance: number;
  readonly revision: number;
}

export interface CurrencyLedgerEntry {
  readonly entryId: CurrencyLedgerEntryId;
  readonly currencyDefinitionId: CurrencyDefinitionId;
  readonly delta: number;
  readonly balanceAfter: number;
  readonly balanceRevision: number;
}

export interface EconomyState {
  readonly balances: readonly CurrencyBalance[];
  readonly ledger: readonly CurrencyLedgerEntry[];
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function assertSafeNonNegativeInteger(value: number, label: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`${label} must be a non-negative safe integer.`);
  }
}

function assertPositiveSafeInteger(value: number, label: string): void {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`${label} must be a positive safe integer.`);
  }
}

export function currencyDefinitionId(value: string): CurrencyDefinitionId {
  if (value.length === 0 || value.length > 128 || value !== value.trim()) {
    throw new Error("Currency definition ID must be a trimmed non-empty string up to 128 characters.");
  }
  return value as CurrencyDefinitionId;
}

export function currencyLedgerEntryId(value: string): CurrencyLedgerEntryId {
  if (!UUID_PATTERN.test(value)) {
    throw new Error("Currency ledger entry ID must be a canonical UUID.");
  }
  return value.toLowerCase() as CurrencyLedgerEntryId;
}

export function createEconomyState(
  knownCurrencyDefinitionIds: readonly string[],
  balances: readonly SerializedCurrencyBalance[],
  ledger: readonly SerializedCurrencyLedgerEntry[],
): EconomyState {
  const known = new Set(knownCurrencyDefinitionIds.map((id) => currencyDefinitionId(id)));
  const balanceIds = new Set<string>();
  const restoredBalances = balances.map((item) => {
    const definitionId = currencyDefinitionId(item.currencyDefinitionId);
    if (!known.has(definitionId)) {
      throw new Error("Currency balance references an unknown currency definition.");
    }
    if (balanceIds.has(definitionId)) {
      throw new Error("Economy state contains a duplicate currency balance.");
    }
    assertSafeNonNegativeInteger(item.balance, "Currency balance");
    assertPositiveSafeInteger(item.revision, "Currency balance revision");
    balanceIds.add(definitionId);
    return {
      currencyDefinitionId: definitionId,
      balance: item.balance,
      revision: item.revision,
    };
  });

  const entryIds = new Set<string>();
  const lastByCurrency = new Map<string, CurrencyLedgerEntry>();
  const restoredLedger = ledger
    .map((item) => {
      const entryId = currencyLedgerEntryId(item.entryId);
      const definitionId = currencyDefinitionId(item.currencyDefinitionId);
      if (!known.has(definitionId)) {
        throw new Error("Currency ledger references an unknown currency definition.");
      }
      if (entryIds.has(entryId)) {
        throw new Error("Economy state contains a duplicate currency ledger entry ID.");
      }
      if (!Number.isSafeInteger(item.delta) || item.delta === 0) {
        throw new Error("Currency ledger delta must be a non-zero safe integer.");
      }
      assertSafeNonNegativeInteger(item.balanceAfter, "Currency ledger balance-after");
      assertPositiveSafeInteger(item.balanceRevision, "Currency ledger balance revision");
      entryIds.add(entryId);
      return {
        entryId,
        currencyDefinitionId: definitionId,
        delta: item.delta,
        balanceAfter: item.balanceAfter,
        balanceRevision: item.balanceRevision,
      };
    })
    .sort((left, right) => {
      const definitionOrder = left.currencyDefinitionId.localeCompare(right.currencyDefinitionId);
      if (definitionOrder !== 0) return definitionOrder;
      return left.balanceRevision - right.balanceRevision;
    });

  for (const entry of restoredLedger) {
    const previous = lastByCurrency.get(entry.currencyDefinitionId);
    const expectedRevision = previous ? previous.balanceRevision + 1 : 1;
    const previousBalance = previous?.balanceAfter ?? 0;
    if (entry.balanceRevision !== expectedRevision) {
      throw new Error("Currency ledger balance revisions must be contiguous from revision 1.");
    }
    if (previousBalance + entry.delta !== entry.balanceAfter) {
      throw new Error("Currency ledger arithmetic does not match its balance-after value.");
    }
    lastByCurrency.set(entry.currencyDefinitionId, entry);
  }

  const balancesByCurrency = new Map(
    restoredBalances.map((item) => [item.currencyDefinitionId, item] as const),
  );
  if (balancesByCurrency.size !== lastByCurrency.size) {
    throw new Error("Currency balances and ledger do not describe the same currencies.");
  }
  for (const [definitionId, latest] of lastByCurrency) {
    const balance = balancesByCurrency.get(definitionId);
    if (!balance || balance.balance !== latest.balanceAfter || balance.revision !== latest.balanceRevision) {
      throw new Error("Currency balance does not match the latest ledger entry.");
    }
  }

  return { balances: restoredBalances, ledger: restoredLedger };
}

export function serializeEconomyState(state: EconomyState): Readonly<{
  balances: readonly SerializedCurrencyBalance[];
  ledger: readonly SerializedCurrencyLedgerEntry[];
}> {
  return {
    balances: [...state.balances]
      .sort((left, right) => left.currencyDefinitionId.localeCompare(right.currencyDefinitionId))
      .map((item) => ({
        currencyDefinitionId: item.currencyDefinitionId,
        balance: item.balance,
        revision: item.revision,
      })),
    ledger: [...state.ledger]
      .sort((left, right) => {
        const definitionOrder = left.currencyDefinitionId.localeCompare(right.currencyDefinitionId);
        if (definitionOrder !== 0) return definitionOrder;
        return left.balanceRevision - right.balanceRevision;
      })
      .map((entry) => ({
        entryId: entry.entryId,
        currencyDefinitionId: entry.currencyDefinitionId,
        delta: entry.delta,
        balanceAfter: entry.balanceAfter,
        balanceRevision: entry.balanceRevision,
      })),
  };
}
