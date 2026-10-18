import type { StudioRole, StudioSessionResult } from "../../../supabase/functions/studio-operations/contract";

const defaultSupabaseUrl = "https://mswgfxqhqhtltbrkkspy.supabase.co";
const defaultPublishableKey = "sb_publishable_Okszqzy-4qQaYGB_mLlzlA_-AWqA_3y";

export const studioSupabaseUrl =
  (import.meta.env.VITE_STUDIO_SUPABASE_URL as string | undefined)?.trim() || defaultSupabaseUrl;
export const studioPublishableKey =
  (import.meta.env.VITE_STUDIO_SUPABASE_PUBLISHABLE_KEY as string | undefined)?.trim() ||
  defaultPublishableKey;

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

function parseTokenResponse(value: SupabaseTokenResponse): StoredStudioAuthSession {
  if (
    typeof value.access_token !== "string" ||
    typeof value.refresh_token !== "string" ||
    typeof value.expires_in !== "number"
  ) {
    throw new Error("Supabase returned an invalid session.");
  }

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

export async function signInStudio(email: string, password: string): Promise<StoredStudioAuthSession> {
  const response = await fetch(`${studioSupabaseUrl}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: studioPublishableKey, "content-type": "application/json" },
    body: JSON.stringify({ email: email.trim(), password }),
  });
  const body = await parseResponseBody(response);
  if (!response.ok) {
    throw new Error(typeof body.message === "string" ? body.message : "Sign in failed.");
  }
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
  if (session.expiresAt - Date.now() > 60_000) return session;
  return refreshStudioAuthSession(session);
}

export async function fetchStudioAuthorization(
  session: StoredStudioAuthSession,
): Promise<StudioSessionResult> {
  const response = await fetch(`${studioSupabaseUrl}/functions/v1/studio-operations`, {
    method: "POST",
    headers: {
      apikey: studioPublishableKey,
      authorization: `Bearer ${session.accessToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ type: "session.get" }),
  });
  const body = await parseResponseBody(response);
  if (response.status === 401) {
    clearStudioAuthSession();
    throw new Error("Studio session is no longer valid.");
  }
  if (!response.ok) {
    throw new Error(typeof body.message === "string" ? body.message : "Studio authorization failed.");
  }
  if (typeof body.authorized !== "boolean") {
    throw new Error("Studio authorization response was invalid.");
  }
  if (!body.authorized) {
    return { authorized: false, role: null, capabilities: [] };
  }
  if (typeof body.role !== "string" || !Array.isArray(body.capabilities)) {
    throw new Error("Studio authorization response was invalid.");
  }
  return body as unknown as StudioSessionResult;
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
      authorization: { role: authorization.role, capabilities: authorization.capabilities },
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
    if (session) {
      await fetch(`${studioSupabaseUrl}/auth/v1/logout`, {
        method: "POST",
        headers: { apikey: studioPublishableKey, authorization: `Bearer ${session.accessToken}` },
      });
    }
  } finally {
    clearStudioAuthSession();
  }
}
