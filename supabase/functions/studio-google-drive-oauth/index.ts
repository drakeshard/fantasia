import {
  createGoogleDriveSourceFolders,
  exchangeGoogleDriveAuthorizationCode,
  GoogleDriveProviderError,
  readGoogleDriveAccount,
} from "../studio-operations/google-drive-provider.ts";

function environmentKey(directName: string, collectionName: string): string {
  const direct = Deno.env.get(directName)?.trim();
  if (direct) return direct;
  const collection = Deno.env.get(collectionName)?.trim();
  if (collection) {
    const parsed = JSON.parse(collection) as Record<string, unknown>;
    const candidate = parsed.default;
    if (typeof candidate === "string" && candidate.trim()) return candidate.trim();
  }
  throw new Error(`Missing required Edge Function environment key: ${directName}/${collectionName}`);
}

async function sha256Hex(value: string): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
  return [...digest].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function callRpc(
  supabaseUrl: string,
  secretKey: string,
  rpcName: string,
  rpcBody: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/${rpcName}`, {
    method: "POST",
    headers: {
      apikey: secretKey,
      authorization: `Bearer ${secretKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(rpcBody),
  });
  const body = await response.json().catch(() => null) as Record<string, unknown> | null;
  if (!response.ok || !body) {
    const message = typeof body?.message === "string" ? body.message : "Studio Google Drive OAuth operation failed.";
    throw new Error(message);
  }
  return body;
}

function redirectResponse(studioOrigin: string, result: "connected" | "error", message?: string): Response {
  const target = new URL(studioOrigin);
  target.searchParams.set("module", "assets");
  target.searchParams.set("drive", result);
  if (message) target.searchParams.set("driveMessage", message.slice(0, 180));
  return new Response(null, {
    status: 302,
    headers: {
      location: target.toString(),
      "cache-control": "no-store",
    },
  });
}

Deno.serve(async (request: Request) => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")?.replace(/\/$/, "");
  const studioOrigin = Deno.env.get("STUDIO_PUBLIC_ORIGIN")?.trim();
  if (!supabaseUrl || !studioOrigin) {
    return Response.json({ message: "Studio Google Drive OAuth callback is not configured." }, { status: 503 });
  }
  if (request.method !== "GET") {
    return Response.json({ message: "Method not allowed." }, { status: 405 });
  }

  try {
    const secretKey = environmentKey("SUPABASE_SECRET_KEY", "SUPABASE_SECRET_KEYS");
    const callbackUrl = `${supabaseUrl}/functions/v1/studio-google-drive-oauth`;
    const url = new URL(request.url);
    const state = url.searchParams.get("state")?.trim();
    const code = url.searchParams.get("code")?.trim();
    const oauthError = url.searchParams.get("error")?.trim();

    if (!state) return redirectResponse(studioOrigin, "error", "Google authorization returned no state.");
    const stateResult = await callRpc(
      supabaseUrl,
      secretKey,
      "consume_studio_google_drive_oauth_state",
      { p_state_hash: await sha256Hex(state) },
    );
    const actorUserId = typeof stateResult.actorUserId === "string" ? stateResult.actorUserId : null;
    if (!actorUserId) throw new Error("Google Drive OAuth state did not resolve to a Studio administrator.");
    if (oauthError) return redirectResponse(studioOrigin, "error", `Google authorization was not completed: ${oauthError}`);
    if (!code) return redirectResponse(studioOrigin, "error", "Google authorization returned no code.");

    const tokens = await exchangeGoogleDriveAuthorizationCode(code, callbackUrl);
    const [account, folders] = await Promise.all([
      readGoogleDriveAccount(tokens.accessToken),
      createGoogleDriveSourceFolders(tokens.accessToken),
    ]);

    await callRpc(
      supabaseUrl,
      secretKey,
      "upsert_studio_google_drive_connection",
      {
        p_connected_by_user_id: actorUserId,
        p_account_email: account.email,
        p_account_display_name: account.displayName,
        p_refresh_token: tokens.refreshToken,
        p_root_folder_id: folders.rootFolderId,
        p_production_assets_folder_id: folders.productionAssetsFolderId,
        p_source_masters_folder_id: folders.sourceMastersFolderId,
        p_scopes: ["https://www.googleapis.com/auth/drive.file"],
      },
    );

    return redirectResponse(studioOrigin, "connected");
  } catch (error) {
    console.error(
      "studio-google-drive-oauth failed",
      error instanceof Error ? error.message : "unknown error",
    );
    const message = error instanceof GoogleDriveProviderError || error instanceof Error
      ? error.message
      : "Google Drive connection failed.";
    return redirectResponse(studioOrigin, "error", message);
  }
});
