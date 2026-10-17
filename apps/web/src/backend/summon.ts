import { type SummonSnapshot, restoreSummonState } from "@fantasia/runtime";
import { FantasiaBackendError } from "./supabase.js";

export interface FantasiaSummonRecord {
  readonly snapshot: SummonSnapshot;
  readonly stateUpdatedAtBySummonDefinitionId: Readonly<Record<string, string>>;
  readonly historyCreatedAtByEntryId: Readonly<Record<string, string>>;
}

interface RawSummonState {
  schema_version?: unknown;
  summon_definition_id?: unknown;
  revision?: unknown;
  state_json?: unknown;
  updated_at?: unknown;
}

interface RawSummonHistoryEntry {
  id?: unknown;
  schema_version?: unknown;
  summon_definition_id?: unknown;
  revision?: unknown;
  state_json?: unknown;
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

const stateSelect = "schema_version,summon_definition_id,revision,state_json,updated_at";
const historySelect = "id,schema_version,summon_definition_id,revision,state_json,created_at";

export function parseSummonRows(
  stateRows: readonly RawSummonState[],
  historyRows: readonly RawSummonHistoryEntry[],
  knownSummonDefinitionIds: readonly string[],
): FantasiaSummonRecord {
  const stateUpdatedAtBySummonDefinitionId: Record<string, string> = {};
  const persistedStates = stateRows.map((row) => {
    if (typeof row.updated_at !== "string") {
      throw new FantasiaBackendError("Supabase returned invalid summon state metadata.", 502);
    }
    if (typeof row.summon_definition_id === "string") {
      stateUpdatedAtBySummonDefinitionId[row.summon_definition_id] = row.updated_at;
    }
    return {
      schemaVersion: row.schema_version,
      summonDefinitionId: row.summon_definition_id,
      revision: row.revision,
      state: row.state_json,
    };
  });

  const historyCreatedAtByEntryId: Record<string, string> = {};
  const persistedHistory = historyRows.map((row) => {
    if (typeof row.created_at !== "string") {
      throw new FantasiaBackendError("Supabase returned invalid summon history metadata.", 502);
    }
    if (typeof row.id === "string") historyCreatedAtByEntryId[row.id.toLowerCase()] = row.created_at;
    return {
      entryId: row.id,
      schemaVersion: row.schema_version,
      summonDefinitionId: row.summon_definition_id,
      revision: row.revision,
      state: row.state_json,
    };
  });

  const restored = restoreSummonState(
    persistedStates,
    persistedHistory,
    knownSummonDefinitionIds,
  );
  if (restored.kind === "rejected") {
    throw new FantasiaBackendError(
      `Supabase returned invalid summon state: ${restored.reason}`,
      502,
    );
  }

  return {
    snapshot: restored.snapshot,
    stateUpdatedAtBySummonDefinitionId,
    historyCreatedAtByEntryId,
  };
}

export async function loadSummonState(
  accessToken: string,
  knownSummonDefinitionIds: readonly string[],
): Promise<FantasiaSummonRecord> {
  const config = backendConfig();
  const headers = {
    apikey: config.publishableKey,
    authorization: `Bearer ${accessToken}`,
  };
  const [stateResponse, historyResponse] = await Promise.all([
    fetch(
      `${config.url}/rest/v1/account_summon_state?select=${stateSelect}&order=summon_definition_id.asc`,
      { method: "GET", headers },
    ),
    fetch(
      `${config.url}/rest/v1/account_summon_history?select=${historySelect}&order=summon_definition_id.asc,revision.asc`,
      { method: "GET", headers },
    ),
  ]);
  if (!stateResponse.ok) throw await parseError(stateResponse);
  if (!historyResponse.ok) throw await parseError(historyResponse);

  return parseSummonRows(
    (await stateResponse.json()) as RawSummonState[],
    (await historyResponse.json()) as RawSummonHistoryEntry[],
    knownSummonDefinitionIds,
  );
}
