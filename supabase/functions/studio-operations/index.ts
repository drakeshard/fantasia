import {
  parseStudioOperationRequest,
  STUDIO_ENTITY_NOTE_SET,
  STUDIO_MEMBERSHIP_SET,
  STUDIO_SESSION_GET,
  StudioOperationContractError,
} from "./contract.ts";

const corsHeaders = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization, apikey, content-type, x-client-info",
  "access-control-allow-methods": "POST, OPTIONS",
};

function jsonResponse(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: corsHeaders });
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

function statusForDatabaseError(code: unknown): number {
  if (code === "42501") return 403;
  if (code === "P0002") return 404;
  if (code === "22023") return 409;
  return 500;
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
      headers: { apikey: publishableKey, authorization },
    });
    if (!userResponse.ok) {
      return jsonResponse({ message: "Authentication required." }, 401);
    }
    const user = (await userResponse.json()) as { id?: unknown };
    if (typeof user.id !== "string") {
      return jsonResponse({ message: "Authentication required." }, 401);
    }

    const operation = parseStudioOperationRequest(await request.json());
    let rpcName: string;
    let rpcBody: Record<string, unknown>;

    if (operation.type === STUDIO_SESSION_GET) {
      rpcName = "get_studio_session";
      rpcBody = { p_user_id: user.id };
    } else if (operation.type === STUDIO_ENTITY_NOTE_SET) {
      rpcName = "execute_studio_entity_note_command";
      rpcBody = {
        p_actor_user_id: user.id,
        p_idempotency_key: operation.idempotencyKey,
        p_semantic_id: operation.payload.semanticId,
        p_note: operation.payload.note,
      };
    } else if (operation.type === STUDIO_MEMBERSHIP_SET) {
      rpcName = "execute_studio_membership_set_command";
      rpcBody = {
        p_actor_user_id: user.id,
        p_idempotency_key: operation.idempotencyKey,
        p_target_user_id: operation.payload.userId,
        p_role: operation.payload.role,
        p_active: operation.payload.active,
      };
    } else {
      return jsonResponse({ message: "Unsupported Studio operation." }, 404);
    }

    const rpcResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/${rpcName}`, {
      method: "POST",
      headers: { apikey: secretKey, "content-type": "application/json" },
      body: JSON.stringify(rpcBody),
    });
    const rpcResult = await parseJsonResponse(rpcResponse);
    if (!rpcResponse.ok) {
      const error = rpcResult as { code?: unknown; message?: unknown } | null;
      const message =
        error && typeof error.message === "string" ? error.message : "Studio operation failed.";
      return jsonResponse({ message }, statusForDatabaseError(error?.code));
    }

    return jsonResponse(rpcResult);
  } catch (error) {
    if (error instanceof StudioOperationContractError) {
      return jsonResponse({ message: error.message }, error.status);
    }
    console.error("studio-operations failed", error instanceof Error ? error.message : "unknown error");
    return jsonResponse({ message: "Studio operation service failed." }, 500);
  }
});
