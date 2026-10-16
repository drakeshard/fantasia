import { type EquipmentSnapshot, restoreEquipmentInstances } from "@fantasia/runtime";
import { FantasiaBackendError } from "./supabase.js";

export interface FantasiaEquipmentRecord {
  readonly snapshot: EquipmentSnapshot;
  readonly createdAtByInstanceId: Readonly<Record<string, string>>;
}

interface RawEquipmentInstance {
  id?: unknown;
  schema_version?: unknown;
  equipment_definition_id?: unknown;
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

const equipmentSelect = "id,schema_version,equipment_definition_id,created_at";

export function parseEquipmentInstanceRows(
  rows: readonly RawEquipmentInstance[],
  knownEquipmentDefinitionIds: readonly string[],
): FantasiaEquipmentRecord {
  const createdAtByInstanceId: Record<string, string> = {};
  const persisted = rows.map((row) => {
    if (typeof row.created_at !== "string") {
      throw new FantasiaBackendError("Supabase returned invalid equipment metadata.", 502);
    }
    if (typeof row.id === "string") createdAtByInstanceId[row.id.toLowerCase()] = row.created_at;
    return {
      instanceId: row.id,
      schemaVersion: row.schema_version,
      equipmentDefinitionId: row.equipment_definition_id,
    };
  });

  const restored = restoreEquipmentInstances(persisted, knownEquipmentDefinitionIds);
  if (restored.kind === "rejected") {
    throw new FantasiaBackendError(
      `Supabase returned invalid equipment state: ${restored.reason}`,
      502,
    );
  }

  return { snapshot: restored.snapshot, createdAtByInstanceId };
}

export async function loadEquipmentInstances(
  accessToken: string,
  knownEquipmentDefinitionIds: readonly string[],
): Promise<FantasiaEquipmentRecord> {
  const config = backendConfig();
  const response = await fetch(
    `${config.url}/rest/v1/account_equipment_instances?select=${equipmentSelect}&order=created_at.asc,id.asc`,
    {
      method: "GET",
      headers: {
        apikey: config.publishableKey,
        authorization: `Bearer ${accessToken}`,
      },
    },
  );
  if (!response.ok) throw await parseError(response);

  return parseEquipmentInstanceRows(
    (await response.json()) as RawEquipmentInstance[],
    knownEquipmentDefinitionIds,
  );
}
