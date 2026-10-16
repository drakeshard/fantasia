import type { CampaignProgressSnapshot } from "@fantasia/runtime";
import { FantasiaBackendError } from "./supabase.js";

export interface FantasiaCampaignProgressRecord {
  readonly accountId: string;
  readonly snapshot: CampaignProgressSnapshot;
  readonly revision: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

interface RawCampaignProgress {
  account_id?: unknown;
  schema_version?: unknown;
  saga_id?: unknown;
  chapter_id?: unknown;
  stage_id?: unknown;
  revision?: unknown;
  created_at?: unknown;
  updated_at?: unknown;
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

async function campaignRequest(
  path: string,
  init: RequestInit,
  accessToken: string,
): Promise<Response> {
  const config = backendConfig();
  const headers = new Headers(init.headers);
  headers.set("apikey", config.publishableKey);
  headers.set("authorization", `Bearer ${accessToken}`);
  if (!headers.has("content-type") && init.body !== undefined) {
    headers.set("content-type", "application/json");
  }

  const response = await fetch(`${config.url}${path}`, { ...init, headers });
  if (!response.ok) throw await parseError(response);
  return response;
}

function parseCampaignProgress(raw: RawCampaignProgress): FantasiaCampaignProgressRecord {
  if (
    typeof raw.account_id !== "string" ||
    raw.schema_version !== 1 ||
    typeof raw.saga_id !== "string" ||
    typeof raw.chapter_id !== "string" ||
    typeof raw.stage_id !== "string" ||
    typeof raw.revision !== "number" ||
    typeof raw.created_at !== "string" ||
    typeof raw.updated_at !== "string"
  ) {
    throw new FantasiaBackendError("Supabase returned invalid campaign progress.", 502);
  }

  return {
    accountId: raw.account_id,
    snapshot: {
      schemaVersion: 1,
      sagaId: raw.saga_id,
      chapterId: raw.chapter_id,
      stageId: raw.stage_id,
    },
    revision: raw.revision,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
  };
}

const campaignSelect =
  "account_id,schema_version,saga_id,chapter_id,stage_id,revision,created_at,updated_at";

export async function loadCampaignProgress(
  accessToken: string,
): Promise<FantasiaCampaignProgressRecord | null> {
  const response = await campaignRequest(
    `/rest/v1/campaign_progress?select=${campaignSelect}&limit=1`,
    { method: "GET" },
    accessToken,
  );
  const rows = (await response.json()) as RawCampaignProgress[];
  return rows[0] ? parseCampaignProgress(rows[0]) : null;
}

export async function saveCampaignProgress(
  accessToken: string,
  accountId: string,
  snapshot: CampaignProgressSnapshot,
): Promise<FantasiaCampaignProgressRecord> {
  const existing = await loadCampaignProgress(accessToken);
  const payload = {
    saga_id: snapshot.sagaId,
    chapter_id: snapshot.chapterId,
    stage_id: snapshot.stageId,
  };

  const response = existing
    ? await campaignRequest(
        `/rest/v1/campaign_progress?account_id=eq.${encodeURIComponent(accountId)}&select=${campaignSelect}`,
        {
          method: "PATCH",
          headers: { Prefer: "return=representation" },
          body: JSON.stringify(payload),
        },
        accessToken,
      )
    : await campaignRequest(
        `/rest/v1/campaign_progress?select=${campaignSelect}`,
        {
          method: "POST",
          headers: { Prefer: "return=representation" },
          body: JSON.stringify({ account_id: accountId, ...payload }),
        },
        accessToken,
      );

  const rows = (await response.json()) as RawCampaignProgress[];
  const row = rows[0];
  if (!row) throw new FantasiaBackendError("Campaign progress write returned no row.", 502);
  return parseCampaignProgress(row);
}
