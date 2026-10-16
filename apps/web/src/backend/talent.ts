import {
  restoreTalentProgress,
  type TalentProgressSnapshot,
} from "@fantasia/runtime";
import { FantasiaBackendError } from "./supabase.js";

export interface FantasiaTalentProgressRecord {
  readonly accountId: string;
  readonly snapshot: TalentProgressSnapshot;
  readonly revision: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

interface RawTalentProgress {
  account_id?: unknown;
  schema_version?: unknown;
  state?: unknown;
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

async function talentRequest(path: string, accessToken: string): Promise<Response> {
  const config = backendConfig();
  const response = await fetch(`${config.url}${path}`, {
    method: "GET",
    headers: {
      apikey: config.publishableKey,
      authorization: `Bearer ${accessToken}`,
    },
  });
  if (!response.ok) throw await parseError(response);
  return response;
}

function parseTalentProgress(raw: RawTalentProgress): FantasiaTalentProgressRecord {
  if (
    typeof raw.account_id !== "string" ||
    typeof raw.revision !== "number" ||
    typeof raw.created_at !== "string" ||
    typeof raw.updated_at !== "string"
  ) {
    throw new FantasiaBackendError("Supabase returned invalid Talent progress metadata.", 502);
  }

  const restored = restoreTalentProgress(raw.schema_version, raw.state);
  if (restored.kind === "rejected") {
    throw new FantasiaBackendError(`Supabase returned invalid Talent progress: ${restored.reason}`, 502);
  }

  return {
    accountId: raw.account_id,
    snapshot: restored.snapshot,
    revision: raw.revision,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
  };
}

const talentSelect = "account_id,schema_version,state,revision,created_at,updated_at";

export async function loadTalentProgress(
  accessToken: string,
): Promise<FantasiaTalentProgressRecord | null> {
  const response = await talentRequest(
    `/rest/v1/account_talent_progress?select=${talentSelect}&limit=1`,
    accessToken,
  );
  const rows = (await response.json()) as RawTalentProgress[];
  return rows[0] ? parseTalentProgress(rows[0]) : null;
}
