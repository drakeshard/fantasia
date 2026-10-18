import {
  composeStudioEntity,
  permissionPresentation,
  type RegistrySnapshot,
  type StudioEntityReadModel,
  type StudioSearchQuery,
  searchStudioEntities,
} from "../../../packages/studio-read-model/src/index.ts";
import {
  parseStudioOperationRequest,
  STUDIO_ENTITY_NOTE_SET,
  STUDIO_MEMBERSHIP_SET,
  STUDIO_READ_MODELS_GET,
  STUDIO_SESSION_GET,
  StudioOperationContractError,
} from "./contract.ts";
import { registryOnlyReadModels } from "./missing-canonical.ts";
import { loadRepositorySnapshot } from "./repository-snapshot.ts";

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
  throw new Error(
    `Missing required Edge Function environment key: ${directName}/${collectionName}`,
  );
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

async function callRpc(
  supabaseUrl: string,
  secretKey: string,
  rpcName: string,
  rpcBody: Record<string, unknown>,
): Promise<unknown> {
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/${rpcName}`, {
    method: "POST",
    headers: {
      apikey: secretKey,
      authorization: `Bearer ${secretKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(rpcBody),
  });
  const result = await parseJsonResponse(response);
  if (!response.ok) {
    const error = result as { code?: unknown; message?: unknown } | null;
    const message =
      error && typeof error.message === "string" ? error.message : "Studio operation failed.";
    throw new StudioOperationContractError(message, statusForDatabaseError(error?.code));
  }
  return result;
}

function asSession(value: unknown): {
  authorized: boolean;
  role: string | null;
  capabilities: readonly string[];
} {
  if (!value || typeof value !== "object") throw new Error("Studio session response is malformed.");
  const session = value as Record<string, unknown>;
  return {
    authorized: session.authorized === true,
    role: typeof session.role === "string" ? session.role : null,
    capabilities: Array.isArray(session.capabilities)
      ? session.capabilities.filter((item): item is string => typeof item === "string")
      : [],
  };
}

function asRegistrySnapshot(value: unknown): RegistrySnapshot {
  if (!value || typeof value !== "object")
    throw new Error("Studio registry snapshot is malformed.");
  const snapshot = value as Record<string, unknown>;
  const requiredArrays = [
    "contentEntities",
    "assets",
    "assetVersions",
    "entityRelations",
    "runtimeDerivatives",
    "validationResults",
    "changeEvents",
  ] as const;
  for (const key of requiredArrays) {
    if (!Array.isArray(snapshot[key])) {
      throw new Error(`Studio registry snapshot ${key} is malformed.`);
    }
  }
  if (typeof snapshot.observedAt !== "string") {
    throw new Error("Studio registry snapshot observedAt is malformed.");
  }
  return value as RegistrySnapshot;
}

async function readDashboardCanonicalProposals(
  userId: string,
  supabaseUrl: string,
  secretKey: string,
): Promise<unknown> {
  const response = await fetch(
    `${supabaseUrl}/rest/v1/rpc/get_studio_dashboard_canonical_proposals`,
    {
      method: "POST",
      headers: {
        apikey: secretKey,
        authorization: `Bearer ${secretKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ p_user_id: userId }),
    },
  );
  if (!response.ok) {
    return {
      state: "unavailable",
      observedAt: null,
      items: [],
      message: "Canonical proposal summary source is unavailable.",
    };
  }
  const result = await parseJsonResponse(response);
  if (!result || typeof result !== "object") {
    return {
      state: "unavailable",
      observedAt: null,
      items: [],
      message: "Canonical proposal summary source returned an invalid response.",
    };
  }
  return result;
}

async function readModels(
  userId: string,
  supabaseUrl: string,
  secretKey: string,
  query: StudioSearchQuery & { readonly semanticId?: string },
): Promise<unknown> {
  const [sessionValue, registryValue] = await Promise.all([
    callRpc(supabaseUrl, secretKey, "get_studio_session", { p_user_id: userId }),
    callRpc(supabaseUrl, secretKey, "get_studio_registry_read_snapshot", { p_user_id: userId }),
  ]);
  const repositorySnapshot = loadRepositorySnapshot();
  const session = asSession(sessionValue);
  if (!session.authorized || !session.role || !session.capabilities.includes("studio.read")) {
    throw new StudioOperationContractError("Studio membership required.", 403);
  }
  const [registry, canonicalProposals] = await Promise.all([
    Promise.resolve(asRegistrySnapshot(registryValue)),
    readDashboardCanonicalProposals(userId, supabaseUrl, secretKey),
  ]);
  const permissions = permissionPresentation(session.role, session.capabilities);
  const canonicalModels = repositorySnapshot.canonicalModels;
  const runtimeManifest = repositorySnapshot.runtimeManifest;
  const canonicalIds = new Set(canonicalModels.map((model) => model.semanticId));
  const models = [
    ...canonicalModels.map((canonical) =>
      composeStudioEntity({
        canonical,
        registry,
        runtimeManifest,
        permissions,
        exposeProviderReference: false,
      }),
    ),
    ...registryOnlyReadModels(registry, canonicalIds, runtimeManifest, permissions),
  ];
  const selected = query.semanticId
    ? models.filter((model) => model.semanticId === query.semanticId)
    : models;
  const search = searchStudioEntities(selected, query);
  const selectedIds = new Set(search.rows.map((row) => row.semanticId));
  const pageModels: readonly StudioEntityReadModel[] = selected.filter((model) =>
    selectedIds.has(model.semanticId),
  );
  return {
    readModelVersion: 1,
    revision: repositorySnapshot.revision,
    freshness: {
      gitRevision: repositorySnapshot.revision,
      gitState: "deployment-snapshot",
      registryObservedAt: registry.observedAt,
      providerState: "registry-observed-no-live-provider-fetch",
    },
    search,
    models: pageModels,
    canonicalProposals,
  };
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
    if (!userResponse.ok) return jsonResponse({ message: "Authentication required." }, 401);
    const user = (await userResponse.json()) as { id?: unknown };
    if (typeof user.id !== "string")
      return jsonResponse({ message: "Authentication required." }, 401);

    const operation = parseStudioOperationRequest(await request.json());
    if (operation.type === STUDIO_READ_MODELS_GET) {
      return jsonResponse(await readModels(user.id, supabaseUrl, secretKey, operation.payload));
    }

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
    return jsonResponse(await callRpc(supabaseUrl, secretKey, rpcName, rpcBody));
  } catch (error) {
    if (error instanceof StudioOperationContractError) {
      return jsonResponse({ message: error.message }, error.status);
    }
    console.error(
      "studio-operations failed",
      error instanceof Error ? error.message : "unknown error",
    );
    return jsonResponse({ message: "Studio operation service failed." }, 500);
  }
});
