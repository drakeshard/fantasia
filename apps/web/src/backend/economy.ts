import { type EconomySnapshot, restoreEconomyState } from "@fantasia/runtime";
import { FantasiaBackendError } from "./supabase.js";

export interface FantasiaEconomyRecord {
  readonly snapshot: EconomySnapshot;
  readonly balanceUpdatedAtByCurrencyDefinitionId: Readonly<Record<string, string>>;
  readonly ledgerCreatedAtByEntryId: Readonly<Record<string, string>>;
}

interface RawCurrencyBalance {
  schema_version?: unknown;
  currency_definition_id?: unknown;
  balance?: unknown;
  revision?: unknown;
  updated_at?: unknown;
}

interface RawCurrencyLedgerEntry {
  id?: unknown;
  schema_version?: unknown;
  currency_definition_id?: unknown;
  delta?: unknown;
  balance_after?: unknown;
  balance_revision?: unknown;
  created_at?: unknown;
}

function backendConfig() {
  const url = import.meta.env.VITE_SUPABASE_URL?.trim();
  const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!url || !publishableKey) {
    throw new FantasiaBackendError(
      "Fantasia backend is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.",
      0,
    );
  }
  return { url: url.replace(/\/$/, ""), publishableKey };
}

async function parseError(response: Response): Promise<FantasiaBackendError> {
  let message = `${response.status} ${response.statusText}`.trim();
  try {
    const payload = (await response.json()) as Record<string, unknown>;
    const candidate = payload.message ?? payload.error_description ?? payload.error ?? payload.hint;
    if (typeof candidate === "string" && candidate.trim()) message = candidate;
  } catch {
    // Keep the HTTP status text when the response body is not JSON.
  }
  return new FantasiaBackendError(message, response.status);
}

const balanceSelect = "schema_version,currency_definition_id,balance,revision,updated_at";
const ledgerSelect =
  "id,schema_version,currency_definition_id,delta,balance_after,balance_revision,created_at";

export function parseEconomyRows(
  balanceRows: readonly RawCurrencyBalance[],
  ledgerRows: readonly RawCurrencyLedgerEntry[],
  knownCurrencyDefinitionIds: readonly string[],
): FantasiaEconomyRecord {
  const balanceUpdatedAtByCurrencyDefinitionId: Record<string, string> = {};
  const persistedBalances = balanceRows.map((row) => {
    if (typeof row.updated_at !== "string") {
      throw new FantasiaBackendError("Supabase returned invalid currency balance metadata.", 502);
    }
    if (typeof row.currency_definition_id === "string") {
      balanceUpdatedAtByCurrencyDefinitionId[row.currency_definition_id] = row.updated_at;
    }
    return {
      schemaVersion: row.schema_version,
      currencyDefinitionId: row.currency_definition_id,
      balance: row.balance,
      revision: row.revision,
    };
  });

  const ledgerCreatedAtByEntryId: Record<string, string> = {};
  const persistedLedger = ledgerRows.map((row) => {
    if (typeof row.created_at !== "string") {
      throw new FantasiaBackendError("Supabase returned invalid currency ledger metadata.", 502);
    }
    if (typeof row.id === "string") ledgerCreatedAtByEntryId[row.id.toLowerCase()] = row.created_at;
    return {
      entryId: row.id,
      schemaVersion: row.schema_version,
      currencyDefinitionId: row.currency_definition_id,
      delta: row.delta,
      balanceAfter: row.balance_after,
      balanceRevision: row.balance_revision,
    };
  });

  const restored = restoreEconomyState(
    persistedBalances,
    persistedLedger,
    knownCurrencyDefinitionIds,
  );
  if (restored.kind === "rejected") {
    throw new FantasiaBackendError(
      `Supabase returned invalid economy state: ${restored.reason}`,
      502,
    );
  }

  return {
    snapshot: restored.snapshot,
    balanceUpdatedAtByCurrencyDefinitionId,
    ledgerCreatedAtByEntryId,
  };
}

export async function loadEconomyState(
  accessToken: string,
  knownCurrencyDefinitionIds: readonly string[],
): Promise<FantasiaEconomyRecord> {
  const config = backendConfig();
  const headers = {
    apikey: config.publishableKey,
    authorization: `Bearer ${accessToken}`,
  };
  const [balanceResponse, ledgerResponse] = await Promise.all([
    fetch(
      `${config.url}/rest/v1/account_currency_balances?select=${balanceSelect}&order=currency_definition_id.asc`,
      { method: "GET", headers },
    ),
    fetch(
      `${config.url}/rest/v1/account_currency_ledger?select=${ledgerSelect}&order=currency_definition_id.asc,balance_revision.asc`,
      { method: "GET", headers },
    ),
  ]);
  if (!balanceResponse.ok) throw await parseError(balanceResponse);
  if (!ledgerResponse.ok) throw await parseError(ledgerResponse);

  return parseEconomyRows(
    (await balanceResponse.json()) as RawCurrencyBalance[],
    (await ledgerResponse.json()) as RawCurrencyLedgerEntry[],
    knownCurrencyDefinitionIds,
  );
}
