import { type RosterSnapshot, restoreRosterUnitInstances } from "@fantasia/runtime";
import { FantasiaBackendError } from "./supabase.js";

export interface FantasiaRosterRecord {
  readonly snapshot: RosterSnapshot;
  readonly createdAtByInstanceId: Readonly<Record<string, string>>;
}

interface RawUnitInstance {
  id?: unknown;
  schema_version?: unknown;
  character_definition_id?: unknown;
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

const rosterSelect = "id,schema_version,character_definition_id,created_at";

export function parseRosterUnitInstanceRows(
  rows: readonly RawUnitInstance[],
  knownCharacterDefinitionIds: readonly string[],
): FantasiaRosterRecord {
  const createdAtByInstanceId: Record<string, string> = {};
  const persisted = rows.map((row) => {
    if (typeof row.created_at !== "string") {
      throw new FantasiaBackendError("Supabase returned invalid roster metadata.", 502);
    }
    if (typeof row.id === "string") createdAtByInstanceId[row.id.toLowerCase()] = row.created_at;
    return {
      instanceId: row.id,
      schemaVersion: row.schema_version,
      characterDefinitionId: row.character_definition_id,
    };
  });

  const restored = restoreRosterUnitInstances(persisted, knownCharacterDefinitionIds);
  if (restored.kind === "rejected") {
    throw new FantasiaBackendError(
      `Supabase returned invalid roster state: ${restored.reason}`,
      502,
    );
  }

  return { snapshot: restored.snapshot, createdAtByInstanceId };
}

export async function loadRosterUnitInstances(
  accessToken: string,
  knownCharacterDefinitionIds: readonly string[],
): Promise<FantasiaRosterRecord> {
  const config = backendConfig();
  const response = await fetch(
    `${config.url}/rest/v1/account_unit_instances?select=${rosterSelect}&order=created_at.asc,id.asc`,
    {
      method: "GET",
      headers: {
        apikey: config.publishableKey,
        authorization: `Bearer ${accessToken}`,
      },
    },
  );
  if (!response.ok) throw await parseError(response);

  return parseRosterUnitInstanceRows(
    (await response.json()) as RawUnitInstance[],
    knownCharacterDefinitionIds,
  );
}
