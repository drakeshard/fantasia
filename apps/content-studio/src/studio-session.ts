import type {
  StudioRole,
  StudioSessionResult,
} from "../../../supabase/functions/studio-operations/contract";
import type { StudioReadModelsResponse } from "./dashboard-model";

const defaultSupabaseUrl = "https://mswgfxqhqhtltbrkkspy.supabase.co";
const defaultPublishableKey = "sb_publishable_Okszqzy-4qQaYGB_mLlzlA_-AWqA_3y";

export const studioSupabaseUrl =
  (import.meta.env.VITE_STUDIO_SUPABASE_URL as string | undefined)?.trim() || defaultSupabaseUrl;
export const studioPublishableKey =
  (import.meta.env.VITE_STUDIO_SUPABASE_PUBLISHABLE_KEY as string | undefined)?.trim() ||
  defaultPublishableKey;

const studioOperationsFunctionUrl = `${studioSupabaseUrl}/functions/v1/studio-operations`;
const studioCanonicalChangeFunctionUrl = `${studioSupabaseUrl}/functions/v1/studio-canonical-change`;
const storageKey = "fantasia.content-studio.session.v1";

export type StoredStudioAuthSession = {
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly expiresAt: number;
  readonly email: string | null;
};

export type StudioAuthorization = {
  readonly role: StudioRole;
  readonly capabilities: readonly string[];
};

export type StudioSessionState =
  | { readonly status: "loading" }
  | { readonly status: "signed-out" }
  | { readonly status: "unauthorized"; readonly auth: StoredStudioAuthSession }
  | {
      readonly status: "authorized";
      readonly auth: StoredStudioAuthSession;
      readonly authorization: StudioAuthorization;
    }
  | { readonly status: "error"; readonly message: string };

type SupabaseTokenResponse = {
  readonly access_token?: unknown;
  readonly refresh_token?: unknown;
  readonly expires_in?: unknown;
  readonly user?: { readonly email?: unknown };
};

export interface StudioCanonicalProposalResponse {
  readonly replayed?: boolean;
  readonly proposal?: {
    readonly changeRequestId?: string | null;
    readonly semanticId?: string | null;
    readonly status?: string | null;
    readonly branchName?: string | null;
    readonly commitSha?: string | null;
    readonly pullRequestNumber?: number | null;
    readonly pullRequestUrl?: string | null;
    readonly validationMessage?: string | null;
  };
}

function parseTokenResponse(value: SupabaseTokenResponse): StoredStudioAuthSession {
  if (
    typeof value.access_token !== "string" ||
    typeof value.refresh_token !== "string" ||
    typeof value.expires_in !== "number"
  )
    throw new Error("Supabase returned an invalid session.");
  return {
    accessToken: value.access_token,
    refreshToken: value.refresh_token,
    expiresAt: Date.now() + value.expires_in * 1000,
    email: typeof value.user?.email === "string" ? value.user.email : null,
  };
}

async function parseResponseBody(response: Response): Promise<Record<string, unknown>> {
  try {
    return (await response.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

async function edgeOperation(
  session: StoredStudioAuthSession,
  functionUrl: string,
  requestBody: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const response = await fetch(functionUrl, {
    method: "POST",
    headers: {
      apikey: studioPublishableKey,
      authorization: `Bearer ${session.accessToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });
  const body = await parseResponseBody(response);
  if (response.status === 401) {
    clearStudioAuthSession();
    throw new Error("Studio session is no longer valid.");
  }
  if (!response.ok)
    throw new Error(typeof body.message === "string" ? body.message : "Studio operation failed.");
  return body;
}

async function studioOperation(
  session: StoredStudioAuthSession,
  requestBody: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  return edgeOperation(session, studioOperationsFunctionUrl, requestBody);
}

export function loadStoredStudioAuthSession(): StoredStudioAuthSession | null {
  const raw = window.localStorage.getItem(storageKey);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<StoredStudioAuthSession>;
    if (
      typeof parsed.accessToken !== "string" ||
      typeof parsed.refreshToken !== "string" ||
      typeof parsed.expiresAt !== "number"
    ) {
      window.localStorage.removeItem(storageKey);
      return null;
    }
    return {
      accessToken: parsed.accessToken,
      refreshToken: parsed.refreshToken,
      expiresAt: parsed.expiresAt,
      email: typeof parsed.email === "string" ? parsed.email : null,
    };
  } catch {
    window.localStorage.removeItem(storageKey);
    return null;
  }
}

export function storeStudioAuthSession(session: StoredStudioAuthSession): void {
  window.localStorage.setItem(storageKey, JSON.stringify(session));
}

export function clearStudioAuthSession(): void {
  window.localStorage.removeItem(storageKey);
}

export async function signInStudio(
  email: string,
  password: string,
): Promise<StoredStudioAuthSession> {
  const response = await fetch(`${studioSupabaseUrl}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: studioPublishableKey, "content-type": "application/json" },
    body: JSON.stringify({ email: email.trim(), password }),
  });
  const body = await parseResponseBody(response);
  if (!response.ok)
    throw new Error(typeof body.message === "string" ? body.message : "Sign in failed.");
  const session = parseTokenResponse(body as SupabaseTokenResponse);
  storeStudioAuthSession(session);
  return session;
}

async function refreshStudioAuthSession(
  session: StoredStudioAuthSession,
): Promise<StoredStudioAuthSession> {
  const response = await fetch(`${studioSupabaseUrl}/auth/v1/token?grant_type=refresh_token`, {
    method: "POST",
    headers: { apikey: studioPublishableKey, "content-type": "application/json" },
    body: JSON.stringify({ refresh_token: session.refreshToken }),
  });
  if (!response.ok) {
    clearStudioAuthSession();
    throw new Error("Studio session expired. Sign in again.");
  }
  const refreshed = parseTokenResponse((await response.json()) as SupabaseTokenResponse);
  storeStudioAuthSession(refreshed);
  return refreshed;
}

export async function ensureFreshStudioAuthSession(
  session: StoredStudioAuthSession,
): Promise<StoredStudioAuthSession> {
  return session.expiresAt - Date.now() > 60_000 ? session : refreshStudioAuthSession(session);
}

export async function fetchStudioAuthorization(
  session: StoredStudioAuthSession,
): Promise<StudioSessionResult> {
  const body = await studioOperation(session, { type: "session.get" });
  if (typeof body.authorized !== "boolean")
    throw new Error("Studio authorization response was invalid.");
  if (!body.authorized) return { authorized: false, role: null, capabilities: [] };
  if (typeof body.role !== "string" || !Array.isArray(body.capabilities))
    throw new Error("Studio authorization response was invalid.");
  return body as unknown as StudioSessionResult;
}

export async function fetchStudioReadModels(
  session: StoredStudioAuthSession,
): Promise<StudioReadModelsResponse> {
  const body = await studioOperation(session, {
    type: "studio.read_models.get",
    payload: { offset: 0, limit: 100 },
  });
  if (
    typeof body.readModelVersion !== "number" ||
    typeof body.revision !== "string" ||
    !body.freshness ||
    typeof body.freshness !== "object" ||
    !body.search ||
    typeof body.search !== "object" ||
    !Array.isArray(body.models)
  )
    throw new Error("Studio read-model response was invalid.");
  const normalized = body as unknown as Omit<StudioReadModelsResponse, "canonicalProposals"> & {
    canonicalProposals?: StudioReadModelsResponse["canonicalProposals"];
  };
  return {
    ...normalized,
    canonicalProposals:
      normalized.canonicalProposals?.state === "available" ||
      normalized.canonicalProposals?.state === "unavailable"
        ? normalized.canonicalProposals
        : {
            state: "unavailable",
            observedAt: null,
            items: [],
            message:
              "Canonical proposal summary source is not deployed in this read-model response.",
          },
  };
}

export async function createCharacterDisplayNameProposal(
  session: StoredStudioAuthSession,
  input: {
    readonly semanticId: string;
    readonly baseRevision: string;
    readonly displayName: string;
  },
): Promise<StudioCanonicalProposalResponse> {
  const idempotencyKey =
    `character-${input.semanticId.replace(/[^a-z0-9]+/gi, "-")}-${Date.now().toString(36)}`.slice(
      0,
      128,
    );
  const body = await edgeOperation(session, studioCanonicalChangeFunctionUrl, {
    type: "canonical.change.proposal.create",
    idempotencyKey,
    payload: {
      semanticId: input.semanticId,
      canonicalPath: "content/characters/characters.json",
      contentType: "fantasia.character.v1",
      baseRevision: input.baseRevision,
      operation: { kind: "set-display-name", displayName: input.displayName },
      changeSummary: `Update ${input.semanticId} display name to ${input.displayName}`,
    },
  });
  return body as unknown as StudioCanonicalProposalResponse;
}

export async function restoreStudioSession(): Promise<StudioSessionState> {
  const stored = loadStoredStudioAuthSession();
  if (!stored) return { status: "signed-out" };
  try {
    const auth = await ensureFreshStudioAuthSession(stored);
    const authorization = await fetchStudioAuthorization(auth);
    if (!authorization.authorized) return { status: "unauthorized", auth };
    return {
      status: "authorized",
      auth,
      authorization: {
        role: authorization.role,
        capabilities: authorization.capabilities,
      },
    };
  } catch (error) {
    clearStudioAuthSession();
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Studio session restoration failed.",
    };
  }
}

export async function signOutStudio(session: StoredStudioAuthSession | null): Promise<void> {
  try {
    if (session)
      await fetch(`${studioSupabaseUrl}/auth/v1/logout`, {
        method: "POST",
        headers: {
          apikey: studioPublishableKey,
          authorization: `Bearer ${session.accessToken}`,
        },
      });
  } finally {
    clearStudioAuthSession();
  }
}
