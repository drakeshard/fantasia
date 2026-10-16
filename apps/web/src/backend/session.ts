import {
  bootstrapAccount,
  type FantasiaAccountProfile,
  type FantasiaAuthSession,
  FantasiaBackendError,
  refreshAuthSession,
} from "./supabase.js";

const SESSION_STORAGE_KEY = "fantasia.auth.session.v1";
const REFRESH_MARGIN_SECONDS = 60;

export interface RestoredFantasiaAccount {
  session: FantasiaAuthSession;
  profile: FantasiaAccountProfile;
}

interface StoredSessionV1 {
  version: 1;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  user: FantasiaAuthSession["user"];
}

function storage(): Storage | undefined {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

function isStoredSession(value: unknown): value is StoredSessionV1 {
  if (!value || typeof value !== "object") return false;
  const session = value as Partial<StoredSessionV1>;
  return (
    session.version === 1 &&
    typeof session.accessToken === "string" &&
    typeof session.refreshToken === "string" &&
    typeof session.expiresAt === "number" &&
    typeof session.user === "object" &&
    session.user !== null &&
    typeof session.user.id === "string"
  );
}

export function persistAuthSession(session: FantasiaAuthSession): boolean {
  const target = storage();
  if (!target) return false;
  const stored: StoredSessionV1 = { version: 1, ...session };
  try {
    target.setItem(SESSION_STORAGE_KEY, JSON.stringify(stored));
    return true;
  } catch {
    return false;
  }
}

export function clearPersistedAuthSession(): void {
  try {
    storage()?.removeItem(SESSION_STORAGE_KEY);
  } catch {
    // Session cleanup is best-effort when browser storage is unavailable.
  }
}

function loadPersistedAuthSession(): FantasiaAuthSession | null {
  const target = storage();
  if (!target) return null;
  try {
    const raw = target.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isStoredSession(parsed)) {
      clearPersistedAuthSession();
      return null;
    }
    const { version: _version, ...session } = parsed;
    return session;
  } catch {
    clearPersistedAuthSession();
    return null;
  }
}

function needsRefresh(session: FantasiaAuthSession): boolean {
  return session.expiresAt <= Math.floor(Date.now() / 1000) + REFRESH_MARGIN_SECONDS;
}

export async function restoreAccountSession(): Promise<RestoredFantasiaAccount | null> {
  let session = loadPersistedAuthSession();
  if (!session) return null;

  try {
    if (needsRefresh(session)) {
      session = await refreshAuthSession(session.refreshToken);
      persistAuthSession(session);
    }

    const profile = await bootstrapAccount(session.accessToken);
    return { session, profile };
  } catch (error) {
    if (error instanceof FantasiaBackendError && (error.status === 400 || error.status === 401)) {
      clearPersistedAuthSession();
      return null;
    }
    throw error;
  }
}
