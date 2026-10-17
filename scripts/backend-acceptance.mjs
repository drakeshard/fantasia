import { randomUUID } from "node:crypto";
import process from "node:process";

const TRUSTED_COMMAND = "profile.update_display_name";

function requireEnv(name, aliases = []) {
  for (const candidate of [name, ...aliases]) {
    const value = process.env[candidate]?.trim();
    if (value) return value;
  }
  throw new Error(`Missing required environment value: ${name}`);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message}: expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`);
  }
}

async function parseError(response) {
  let message = `${response.status} ${response.statusText}`.trim();
  try {
    const body = await response.json();
    const candidate = body?.message ?? body?.error_description ?? body?.error ?? body?.hint;
    if (typeof candidate === "string" && candidate.trim()) message = candidate;
  } catch {
    // Preserve the HTTP status text when the body is not JSON.
  }
  return new Error(message);
}

function createClient(config, fetchImpl = fetch) {
  async function request(path, init = {}, accessToken) {
    const headers = new Headers(init.headers);
    headers.set("apikey", config.publishableKey);
    if (init.body !== undefined && !headers.has("content-type")) {
      headers.set("content-type", "application/json");
    }
    if (accessToken) headers.set("authorization", `Bearer ${accessToken}`);

    const response = await fetchImpl(`${config.url}${path}`, { ...init, headers });
    if (!response.ok) throw await parseError(response);
    return response;
  }

  async function signIn(email, password) {
    const response = await request("/auth/v1/token?grant_type=password", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    const body = await response.json();
    assert(typeof body.access_token === "string", "Sign-in response is missing access_token");
    assert(typeof body.refresh_token === "string", "Sign-in response is missing refresh_token");
    assert(typeof body.user?.id === "string", "Sign-in response is missing the authenticated user");
    return {
      accessToken: body.access_token,
      refreshToken: body.refresh_token,
      userId: body.user.id,
    };
  }

  async function signOut(accessToken) {
    await request("/auth/v1/logout", { method: "POST" }, accessToken);
  }

  async function bootstrap(accessToken) {
    const response = await request(
      "/rest/v1/rpc/bootstrap_account",
      {
        method: "POST",
        body: JSON.stringify({ p_display_name: null }),
      },
      accessToken,
    );
    const rows = await response.json();
    assert(Array.isArray(rows) && rows.length === 1, "Account bootstrap must return exactly one profile");
    return parseProfile(rows[0]);
  }

  async function loadProfile(accessToken) {
    const response = await request(
      "/rest/v1/account_profiles?select=account_id,display_name,revision,created_at,updated_at&limit=1",
      { method: "GET" },
      accessToken,
    );
    const rows = await response.json();
    assert(Array.isArray(rows) && rows.length === 1, "Account profile load must return exactly one profile");
    return parseProfile(rows[0]);
  }

  async function trustedDisplayName(accessToken, idempotencyKey, displayName) {
    const response = await request(
      "/functions/v1/trusted-command",
      {
        method: "POST",
        body: JSON.stringify({
          type: TRUSTED_COMMAND,
          idempotencyKey,
          payload: { displayName },
        }),
      },
      accessToken,
    );
    return parseTrustedCommand(await response.json());
  }

  async function restoreNullDisplayName(accessToken, accountId) {
    const response = await request(
      `/rest/v1/account_profiles?account_id=eq.${encodeURIComponent(accountId)}&select=account_id,display_name,revision,created_at,updated_at`,
      {
        method: "PATCH",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify({ display_name: null }),
      },
      accessToken,
    );
    const rows = await response.json();
    assert(Array.isArray(rows) && rows.length === 1, "Null display-name cleanup must return one profile");
    return parseProfile(rows[0]);
  }

  return { bootstrap, loadProfile, restoreNullDisplayName, signIn, signOut, trustedDisplayName };
}

function parseProfile(value) {
  assert(value && typeof value === "object" && !Array.isArray(value), "Invalid account profile response");
  assert(typeof value.account_id === "string", "Profile is missing account_id");
  assert(value.display_name === null || typeof value.display_name === "string", "Profile has invalid display_name");
  assert(Number.isSafeInteger(value.revision) && value.revision >= 0, "Profile has invalid revision");
  assert(typeof value.created_at === "string", "Profile is missing created_at");
  assert(typeof value.updated_at === "string", "Profile is missing updated_at");
  return {
    accountId: value.account_id,
    displayName: value.display_name,
    revision: value.revision,
    createdAt: value.created_at,
    updatedAt: value.updated_at,
  };
}

function parseTrustedCommand(value) {
  assert(value && typeof value === "object" && !Array.isArray(value), "Invalid trusted-command response");
  assertEqual(value.command, TRUSTED_COMMAND, "Trusted-command type mismatch");
  assert(typeof value.idempotencyKey === "string", "Trusted command is missing idempotencyKey");
  assert(typeof value.replayed === "boolean", "Trusted command is missing replayed");
  const result = value.result;
  assert(result && typeof result === "object" && !Array.isArray(result), "Trusted command is missing result");
  assert(typeof result.accountId === "string", "Trusted command result is missing accountId");
  assert(typeof result.displayName === "string", "Trusted command result is missing displayName");
  assert(Number.isSafeInteger(result.revision), "Trusted command result has invalid revision");
  assert(typeof result.createdAt === "string", "Trusted command result is missing createdAt");
  assert(typeof result.updatedAt === "string", "Trusted command result is missing updatedAt");
  return value;
}

function assertReplay(first, replay, expectedKey) {
  assertEqual(first.idempotencyKey, expectedKey, "Initial command idempotency key mismatch");
  assertEqual(replay.idempotencyKey, expectedKey, "Replay idempotency key mismatch");
  assertEqual(first.replayed, false, "Initial command must not be a replay");
  assertEqual(replay.replayed, true, "Second command must be a replay");
  assertEqual(JSON.stringify(replay.result), JSON.stringify(first.result), "Replay result must exactly match initial result");
}

function runSelfTest() {
  const profile = parseProfile({
    account_id: "00000000-0000-0000-0000-000000000001",
    display_name: null,
    revision: 0,
    created_at: "2026-10-17T00:00:00Z",
    updated_at: "2026-10-17T00:00:00Z",
  });
  assertEqual(profile.displayName, null, "Profile parser must preserve null display names");

  const key = "00000000-0000-0000-0000-000000000002";
  const result = {
    accountId: profile.accountId,
    displayName: "Acceptance Test",
    revision: 1,
    createdAt: profile.createdAt,
    updatedAt: "2026-10-17T00:01:00Z",
  };
  const first = parseTrustedCommand({
    command: TRUSTED_COMMAND,
    idempotencyKey: key,
    replayed: false,
    result,
  });
  const replay = parseTrustedCommand({
    command: TRUSTED_COMMAND,
    idempotencyKey: key,
    replayed: true,
    result: { ...result },
  });
  assertReplay(first, replay, key);
  console.log("Backend acceptance self-test passed.");
}

async function runHostedAcceptance() {
  const config = {
    url: requireEnv("VITE_SUPABASE_URL", ["FANTASIA_SUPABASE_URL"]).replace(/\/$/, ""),
    publishableKey: requireEnv("VITE_SUPABASE_PUBLISHABLE_KEY", ["FANTASIA_SUPABASE_PUBLISHABLE_KEY"]),
  };
  const email = requireEnv("FANTASIA_ACCEPTANCE_EMAIL");
  const password = requireEnv("FANTASIA_ACCEPTANCE_PASSWORD");
  const client = createClient(config);

  let cleanupAccessToken;
  let originalProfile;
  let mutationApplied = false;

  try {
    const firstSession = await client.signIn(email, password);
    const bootstrapped = await client.bootstrap(firstSession.accessToken);
    const loaded = await client.loadProfile(firstSession.accessToken);
    assertEqual(loaded.accountId, firstSession.userId, "Loaded profile must belong to authenticated user");
    assertEqual(JSON.stringify(loaded), JSON.stringify(bootstrapped), "Bootstrap and load profile state must agree");
    originalProfile = loaded;

    const temporaryName = `E2E-${randomUUID().slice(0, 12)}`;
    const idempotencyKey = randomUUID();
    const first = await client.trustedDisplayName(firstSession.accessToken, idempotencyKey, temporaryName);
    mutationApplied = true;
    assertEqual(first.result.accountId, loaded.accountId, "Trusted command must mutate the authenticated account");
    assertEqual(first.result.displayName, temporaryName, "Trusted command must persist the requested display name");
    assertEqual(first.result.revision, loaded.revision + 1, "Trusted command must advance profile revision exactly once");

    const replay = await client.trustedDisplayName(firstSession.accessToken, idempotencyKey, temporaryName);
    assertReplay(first, replay, idempotencyKey);
    await client.signOut(firstSession.accessToken);

    const secondSession = await client.signIn(email, password);
    cleanupAccessToken = secondSession.accessToken;
    const restored = await client.loadProfile(secondSession.accessToken);
    assertEqual(restored.accountId, first.result.accountId, "Fresh session must restore the same account");
    assertEqual(restored.displayName, first.result.displayName, "Fresh session must restore the exact persisted display name");
    assertEqual(restored.revision, first.result.revision, "Fresh session must restore the exact persisted revision");

    console.log("Hosted backend acceptance passed: auth → bootstrap/load → trusted mutation → idempotent replay → fresh-session restore.");
  } finally {
    if (mutationApplied && originalProfile) {
      try {
        if (!cleanupAccessToken) {
          cleanupAccessToken = (await client.signIn(email, password)).accessToken;
        }
        if (originalProfile.displayName === null) {
          await client.restoreNullDisplayName(cleanupAccessToken, originalProfile.accountId);
        } else {
          await client.trustedDisplayName(cleanupAccessToken, randomUUID(), originalProfile.displayName);
        }
        console.log("Hosted backend acceptance cleanup restored the original display name.");
      } catch (cleanupError) {
        console.error("Hosted backend acceptance cleanup failed; inspect the test account profile before rerunning.");
        throw cleanupError;
      }
    }

    if (cleanupAccessToken) {
      try {
        await client.signOut(cleanupAccessToken);
      } catch {
        // The acceptance result is already known; local credentials are not persisted by this runner.
      }
    }
  }
}

if (process.argv.includes("--self-test")) {
  runSelfTest();
} else {
  await runHostedAcceptance();
}
