export interface FantasiaAuthUser {
  id: string;
  email?: string;
}

export interface FantasiaAuthSession {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  user: FantasiaAuthUser;
}

export interface FantasiaSignUpResult {
  user: FantasiaAuthUser | null;
  session: FantasiaAuthSession | null;
}

export interface FantasiaAuthRedirectResult {
  handled: boolean;
  session: FantasiaAuthSession | null;
  error?: string;
}

export interface FantasiaAccountProfile {
  accountId: string;
  displayName: string | null;
  revision: number;
  createdAt: string;
  updatedAt: string;
}

interface SupabaseConfig {
  url: string;
  publishableKey: string;
}

interface RawAuthUser {
  id?: unknown;
  email?: unknown;
}

interface RawAuthResponse {
  access_token?: unknown;
  refresh_token?: unknown;
  expires_in?: unknown;
  user?: RawAuthUser | null;
}

interface RawAccountProfile {
  account_id?: unknown;
  display_name?: unknown;
  revision?: unknown;
  created_at?: unknown;
  updated_at?: unknown;
}

interface ParsedAuthRedirect {
  handled: boolean;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
  error?: string;
}

export class FantasiaBackendError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "FantasiaBackendError";
    this.status = status;
  }
}

function getConfig(): SupabaseConfig {
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

export function isFantasiaBackendConfigured(): boolean {
  return Boolean(
    import.meta.env.VITE_SUPABASE_URL?.trim() &&
      import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim(),
  );
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

async function request(
  path: string,
  init: RequestInit = {},
  accessToken?: string,
): Promise<Response> {
  const config = getConfig();
  const headers = new Headers(init.headers);
  headers.set("apikey", config.publishableKey);
  if (!headers.has("content-type") && init.body !== undefined) {
    headers.set("content-type", "application/json");
  }
  if (accessToken) headers.set("authorization", `Bearer ${accessToken}`);

  const response = await fetch(`${config.url}${path}`, { ...init, headers });
  if (!response.ok) throw await parseError(response);
  return response;
}

function parseUser(raw: RawAuthUser | null | undefined): FantasiaAuthUser | null {
  if (!raw || typeof raw.id !== "string") return null;
  return {
    id: raw.id,
    ...(typeof raw.email === "string" ? { email: raw.email } : {}),
  };
}

function parseSession(raw: RawAuthResponse): FantasiaAuthSession | null {
  const user = parseUser(raw.user);
  if (
    !user ||
    typeof raw.access_token !== "string" ||
    typeof raw.refresh_token !== "string" ||
    typeof raw.expires_in !== "number"
  ) {
    return null;
  }

  return {
    accessToken: raw.access_token,
    refreshToken: raw.refresh_token,
    expiresAt: Math.floor(Date.now() / 1000) + raw.expires_in,
    user,
  };
}

function firstAuthParam(url: URL, name: string): string | null {
  const searchValue = url.searchParams.get(name);
  if (searchValue) return searchValue;
  const hash = new URLSearchParams(url.hash.startsWith("#") ? url.hash.slice(1) : url.hash);
  return hash.get(name);
}

export function parseFantasiaAuthRedirect(rawUrl: string): ParsedAuthRedirect {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return { handled: false };
  }

  const error = firstAuthParam(url, "error_description") ?? firstAuthParam(url, "error");
  const errorCode = firstAuthParam(url, "error_code");
  if (error || errorCode) {
    return {
      handled: true,
      error: error?.trim() || "The confirmation link could not be completed.",
    };
  }

  const accessToken = firstAuthParam(url, "access_token");
  const refreshToken = firstAuthParam(url, "refresh_token");
  if (!accessToken && !refreshToken) return { handled: false };
  if (!accessToken || !refreshToken) {
    return { handled: true, error: "The confirmation link returned an incomplete session." };
  }

  const expiresAtValue = Number(firstAuthParam(url, "expires_at"));
  const expiresInValue = Number(firstAuthParam(url, "expires_in"));
  const expiresAt =
    Number.isFinite(expiresAtValue) && expiresAtValue > 0
      ? Math.floor(expiresAtValue)
      : Number.isFinite(expiresInValue) && expiresInValue > 0
        ? Math.floor(Date.now() / 1000) + Math.floor(expiresInValue)
        : undefined;

  if (expiresAt === undefined) {
    return { handled: true, error: "The confirmation link returned a session without an expiry." };
  }

  return { handled: true, accessToken, refreshToken, expiresAt };
}

async function loadAuthUser(accessToken: string): Promise<FantasiaAuthUser> {
  const response = await request("/auth/v1/user", { method: "GET" }, accessToken);
  const user = parseUser((await response.json()) as RawAuthUser);
  if (!user) throw new FantasiaBackendError("Supabase returned an invalid confirmed user.", 502);
  return user;
}

export async function consumeFantasiaAuthRedirect(
  rawUrl: string,
): Promise<FantasiaAuthRedirectResult> {
  const parsed = parseFantasiaAuthRedirect(rawUrl);
  if (!parsed.handled) return { handled: false, session: null };
  if (parsed.error) return { handled: true, session: null, error: parsed.error };
  if (!parsed.accessToken || !parsed.refreshToken || parsed.expiresAt === undefined) {
    return {
      handled: true,
      session: null,
      error: "The confirmation link returned an incomplete session.",
    };
  }

  const user = await loadAuthUser(parsed.accessToken);
  return {
    handled: true,
    session: {
      accessToken: parsed.accessToken,
      refreshToken: parsed.refreshToken,
      expiresAt: parsed.expiresAt,
      user,
    },
  };
}

function withRedirect(path: string, emailRedirectTo?: string): string {
  if (!emailRedirectTo?.trim()) return path;
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}redirect_to=${encodeURIComponent(emailRedirectTo.trim())}`;
}

export async function signUpWithPassword(
  email: string,
  password: string,
  emailRedirectTo?: string,
): Promise<FantasiaSignUpResult> {
  const response = await request(withRedirect("/auth/v1/signup", emailRedirectTo), {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  const raw = (await response.json()) as RawAuthResponse;
  return { user: parseUser(raw.user), session: parseSession(raw) };
}

export async function resendSignupConfirmation(
  email: string,
  emailRedirectTo?: string,
): Promise<void> {
  await request(withRedirect("/auth/v1/resend", emailRedirectTo), {
    method: "POST",
    body: JSON.stringify({ type: "signup", email }),
  });
}

export async function signInWithPassword(
  email: string,
  password: string,
): Promise<FantasiaAuthSession> {
  const response = await request("/auth/v1/token?grant_type=password", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  const session = parseSession((await response.json()) as RawAuthResponse);
  if (!session) throw new FantasiaBackendError("Supabase returned an invalid auth session.", 502);
  return session;
}

export async function refreshAuthSession(refreshToken: string): Promise<FantasiaAuthSession> {
  const response = await request("/auth/v1/token?grant_type=refresh_token", {
    method: "POST",
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  const session = parseSession((await response.json()) as RawAuthResponse);
  if (!session)
    throw new FantasiaBackendError("Supabase returned an invalid refreshed session.", 502);
  return session;
}

export async function signOut(accessToken: string): Promise<void> {
  await request("/auth/v1/logout", { method: "POST" }, accessToken);
}

function parseAccountProfile(raw: RawAccountProfile): FantasiaAccountProfile {
  if (
    typeof raw.account_id !== "string" ||
    (raw.display_name !== null && typeof raw.display_name !== "string") ||
    typeof raw.revision !== "number" ||
    typeof raw.created_at !== "string" ||
    typeof raw.updated_at !== "string"
  ) {
    throw new FantasiaBackendError("Supabase returned an invalid account profile.", 502);
  }

  return {
    accountId: raw.account_id,
    displayName: raw.display_name,
    revision: raw.revision,
    createdAt: raw.created_at,
    updatedAt: raw.updated_at,
  };
}

export async function bootstrapAccount(
  accessToken: string,
  displayName?: string,
): Promise<FantasiaAccountProfile> {
  const response = await request(
    "/rest/v1/rpc/bootstrap_account",
    {
      method: "POST",
      body: JSON.stringify({ p_display_name: displayName ?? null }),
    },
    accessToken,
  );
  const rows = (await response.json()) as RawAccountProfile[];
  const row = rows[0];
  if (!row) throw new FantasiaBackendError("Account bootstrap returned no profile.", 502);
  return parseAccountProfile(row);
}

export async function loadAccountProfile(
  accessToken: string,
): Promise<FantasiaAccountProfile | null> {
  const response = await request(
    "/rest/v1/account_profiles?select=account_id,display_name,revision,created_at,updated_at&limit=1",
    { method: "GET" },
    accessToken,
  );
  const rows = (await response.json()) as RawAccountProfile[];
  return rows[0] ? parseAccountProfile(rows[0]) : null;
}

export async function updateDisplayName(
  accessToken: string,
  accountId: string,
  displayName: string,
): Promise<FantasiaAccountProfile> {
  const encodedAccountId = encodeURIComponent(accountId);
  const response = await request(
    `/rest/v1/account_profiles?account_id=eq.${encodedAccountId}&select=account_id,display_name,revision,created_at,updated_at`,
    {
      method: "PATCH",
      headers: { Prefer: "return=representation" },
      body: JSON.stringify({ display_name: displayName.trim() }),
    },
    accessToken,
  );
  const rows = (await response.json()) as RawAccountProfile[];
  const row = rows[0];
  if (!row) throw new FantasiaBackendError("Profile update was not applied.", 404);
  return parseAccountProfile(row);
}
