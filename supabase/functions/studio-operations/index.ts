import {
  composeStudioEntity,
  permissionPresentation,
  type RegistrySnapshot,
  type StudioEntityReadModel,
  type StudioSearchQuery,
  searchStudioEntities,
} from "../../../packages/studio-read-model/src/index.ts";
import {
  type AssetWorkspaceRegistrySnapshot,
  composeAssetWorkspace,
} from "./asset-read-model.ts";
import {
  parseAssetUploadForm,
  parseStudioAssetOperationRequest,
  STUDIO_ASSET_RELATION_SET,
  STUDIO_ASSET_SOURCE_ACCESS,
  STUDIO_ASSET_SOURCE_REGISTER,
  STUDIO_ASSET_VERSION_SELECT,
} from "./asset-contract.ts";
import {
  GoogleDriveProviderError,
  inspectGoogleDriveFile,
  readGoogleDriveSource,
  uploadGoogleDriveFile,
  type GoogleDriveSourceMetadata,
} from "./google-drive-provider.ts";
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
  if (code === "22023" || code === "55000") return 409;
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

function asRegistrySnapshot(value: unknown): AssetWorkspaceRegistrySnapshot {
  if (!value || typeof value !== "object") {
    throw new Error("Studio registry snapshot is malformed.");
  }
  const snapshot = value as Record<string, unknown>;
  const requiredArrays = [
    "contentEntities",
    "assets",
    "assetVersions",
    "entityRelations",
    "assetRelations",
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
  return value as AssetWorkspaceRegistrySnapshot;
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
        registry: registry as RegistrySnapshot,
        runtimeManifest,
        permissions,
        exposeProviderReference: false,
      }),
    ),
    ...registryOnlyReadModels(
      registry as RegistrySnapshot,
      canonicalIds,
      runtimeManifest,
      permissions,
    ),
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
      providerState: "registry-observed-provider-access-on-demand",
    },
    search,
    models: pageModels,
    assets: composeAssetWorkspace(registry, runtimeManifest),
    canonicalProposals,
  };
}

function canonicalOwner(ownerSemanticId: string) {
  const canonical = loadRepositorySnapshot().canonicalModels.find(
    (model) => model.semanticId === ownerSemanticId,
  );
  if (!canonical) {
    throw new StudioOperationContractError(
      "Asset owner must resolve through a supported canonical repository adapter.",
      404,
    );
  }
  return canonical;
}

async function registerAssetSource(
  userId: string,
  supabaseUrl: string,
  secretKey: string,
  request: {
    readonly idempotencyKey: string;
    readonly ownerSemanticId: string;
    readonly assetSemanticId: string;
    readonly role: string;
    readonly variant: string | null;
    readonly derivativeRequired: boolean;
  },
  source: GoogleDriveSourceMetadata,
): Promise<unknown> {
  const owner = canonicalOwner(request.ownerSemanticId);
  return callRpc(supabaseUrl, secretKey, "execute_studio_asset_source_register_command", {
    p_actor_user_id: userId,
    p_idempotency_key: request.idempotencyKey,
    p_owner_semantic_id: owner.semanticId,
    p_owner_entity_type: owner.entityType,
    p_owner_display_label: owner.displayName,
    p_owner_canonical_git_path: owner.canonicalPath,
    p_asset_semantic_id: request.assetSemanticId,
    p_role: request.role,
    p_variant: request.variant,
    p_derivative_required: request.derivativeRequired,
    p_provider_kind: source.providerKind,
    p_provider_ref: source.providerRef,
    p_source_name: source.sourceName,
    p_media_type: source.mediaType,
    p_width_px: source.widthPx,
    p_height_px: source.heightPx,
    p_byte_size: source.byteSize,
    p_checksum_algorithm: source.checksumAlgorithm,
    p_checksum: source.checksum,
    p_provider_observed_at: source.observedAt,
  });
}

async function sourceAccessResponse(
  userId: string,
  supabaseUrl: string,
  secretKey: string,
  versionId: string,
  disposition: "preview" | "download",
): Promise<Response> {
  const value = await callRpc(supabaseUrl, secretKey, "get_studio_asset_version_source", {
    p_actor_user_id: userId,
    p_version_id: versionId,
  });
  if (!value || typeof value !== "object") {
    throw new StudioOperationContractError("Asset source response is malformed.", 500);
  }
  const source = value as Record<string, unknown>;
  if (source.providerKind !== "google-drive" || typeof source.providerRef !== "string") {
    throw new StudioOperationContractError("Asset source provider is not supported.", 409);
  }
  const { metadata, bytes } = await readGoogleDriveSource(source.providerRef);
  const mediaType = typeof metadata.mimeType === "string"
    ? metadata.mimeType
    : typeof source.mediaType === "string"
      ? source.mediaType
      : "application/octet-stream";
  const rawName = typeof metadata.name === "string"
    ? metadata.name
    : typeof source.sourceName === "string"
      ? source.sourceName
      : `asset-${versionId}`;
  const safeName = rawName.replace(/[\r\n"\\]/g, "_");
  return new Response(bytes, {
    status: 200,
    headers: {
      ...corsHeaders,
      "content-type": mediaType,
      "content-length": String(bytes.byteLength),
      "content-disposition": `${disposition === "preview" ? "inline" : "attachment"}; filename="${safeName}"`,
      "cache-control": "private, no-store",
    },
  });
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
    if (typeof user.id !== "string") {
      return jsonResponse({ message: "Authentication required." }, 401);
    }

    const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
    if (contentType.startsWith("multipart/form-data")) {
      const form = await request.formData();
      if (form.get("type") !== "registry.asset_source.upload") {
        throw new StudioOperationContractError("Unsupported multipart Studio operation.", 404);
      }
      const upload = parseAssetUploadForm(form);
      canonicalOwner(upload.ownerSemanticId);
      const source = await uploadGoogleDriveFile(upload.file);
      return jsonResponse(
        await registerAssetSource(user.id, supabaseUrl, secretKey, upload, source),
      );
    }

    const requestBody = await request.json();
    const assetOperation = parseStudioAssetOperationRequest(requestBody);
    if (assetOperation?.type === STUDIO_ASSET_SOURCE_REGISTER) {
      canonicalOwner(assetOperation.payload.ownerSemanticId);
      const source = await inspectGoogleDriveFile(assetOperation.payload.driveFileReference);
      return jsonResponse(
        await registerAssetSource(
          user.id,
          supabaseUrl,
          secretKey,
          { idempotencyKey: assetOperation.idempotencyKey, ...assetOperation.payload },
          source,
        ),
      );
    }
    if (assetOperation?.type === STUDIO_ASSET_VERSION_SELECT) {
      return jsonResponse(
        await callRpc(supabaseUrl, secretKey, "execute_studio_asset_version_select_command", {
          p_actor_user_id: user.id,
          p_idempotency_key: assetOperation.idempotencyKey,
          p_asset_semantic_id: assetOperation.payload.assetSemanticId,
          p_version_id: assetOperation.payload.versionId,
        }),
      );
    }
    if (assetOperation?.type === STUDIO_ASSET_RELATION_SET) {
      return jsonResponse(
        await callRpc(supabaseUrl, secretKey, "execute_studio_asset_relation_set_command", {
          p_actor_user_id: user.id,
          p_idempotency_key: assetOperation.idempotencyKey,
          p_source_asset_id: assetOperation.payload.sourceAssetId,
          p_relation_type: assetOperation.payload.relationType,
          p_target_asset_id: assetOperation.payload.targetAssetId,
          p_active: assetOperation.payload.active,
        }),
      );
    }
    if (assetOperation?.type === STUDIO_ASSET_SOURCE_ACCESS) {
      return sourceAccessResponse(
        user.id,
        supabaseUrl,
        secretKey,
        assetOperation.payload.versionId,
        assetOperation.payload.disposition,
      );
    }

    const operation = parseStudioOperationRequest(requestBody);
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
    if (error instanceof StudioOperationContractError || error instanceof GoogleDriveProviderError) {
      return jsonResponse({ message: error.message }, error.status);
    }
    console.error(
      "studio-operations failed",
      error instanceof Error ? error.message : "unknown error",
    );
    return jsonResponse({ message: "Studio operation service failed." }, 500);
  }
});
