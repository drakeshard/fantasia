import {
  parseTrustedCommandRequest,
  TRUSTED_PROFILE_DISPLAY_NAME_COMMAND,
  TrustedCommandContractError,
} from "./contract.ts";

const corsHeaders = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization, apikey, content-type, x-client-info",
  "access-control-allow-methods": "POST, OPTIONS",
};

function jsonResponse(body: unknown, status = 200): Response {
  return Response.json(body, {
    status,
    headers: corsHeaders,
  });
}

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

async function parseJsonResponse(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return jsonResponse({ message: "Method not allowed." }, 405);

  try {
    const authorization = request.headers.get("authorization");
    if (!authorization?.startsWith("Bearer ")) {
      return jsonResponse({ message: "Authentication required." }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")?.replace(/\/$/, "");
    if (!supabaseUrl) throw new Error("Missing SUPABASE_URL.");
    const publishableKey = environmentKey("SUPABASE_PUBLISHABLE_KEY", "SUPABASE_PUBLISHABLE_KEYS");
    const secretKey = environmentKey("SUPABASE_SECRET_KEY", "SUPABASE_SECRET_KEYS");

    const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        apikey: publishableKey,
        authorization,
      },
    });
    if (!userResponse.ok) return jsonResponse({ message: "Authentication required." }, 401);
    const user = (await userResponse.json()) as { id?: unknown };
    if (typeof user.id !== "string") return jsonResponse({ message: "Authentication required." }, 401);

    const command = parseTrustedCommandRequest(await request.json());
    if (command.type !== TRUSTED_PROFILE_DISPLAY_NAME_COMMAND) {
      return jsonResponse({ message: "Unsupported trusted command." }, 404);
    }

    const rpcResponse = await fetch(
      `${supabaseUrl}/rest/v1/rpc/execute_profile_display_name_command`,
      {
        method: "POST",
        headers: {
          apikey: secretKey,
          "content-type": "application/json",
        },
        body: JSON.stringify({
          p_account_id: user.id,
          p_idempotency_key: command.idempotencyKey,
          p_display_name: command.payload.displayName,
        }),
      },
    );
    const rpcBody = await parseJsonResponse(rpcResponse);
    if (!rpcResponse.ok) {
      const error = rpcBody as { code?: unknown; message?: unknown } | null;
      const message =
        error && typeof error.message === "string" ? error.message : "Trusted command failed.";
      const status = error?.code === "22023" ? 409 : error?.code === "P0002" ? 404 : 500;
      return jsonResponse({ message }, status);
    }

    return jsonResponse(rpcBody);
  } catch (error) {
    if (error instanceof TrustedCommandContractError) {
      return jsonResponse({ message: error.message }, error.status);
    }
    console.error("trusted-command failed", error instanceof Error ? error.message : "unknown error");
    return jsonResponse({ message: "Trusted command service failed." }, 500);
  }
});
