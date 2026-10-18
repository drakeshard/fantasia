import {
  clearStudioAuthSession,
  studioPublishableKey,
  studioSupabaseUrl,
  type StoredStudioAuthSession,
} from "../../studio-session";

const operationsUrl = `${studioSupabaseUrl}/functions/v1/studio-operations`;

export type AssetSourceMutationInput = {
  readonly ownerSemanticId: string;
  readonly assetSemanticId: string;
  readonly role: string;
  readonly variant: string | null;
  readonly derivativeRequired: boolean;
};

export type GoogleDriveConnectionStatus = {
  readonly connected: boolean;
  readonly accountEmail?: string;
  readonly accountDisplayName?: string | null;
  readonly connectedAt?: string;
  readonly updatedAt?: string;
};

function operationKey(prefix: string, semanticId: string): string {
  return `${prefix}-${semanticId.replace(/[^a-z0-9]+/gi, "-")}-${crypto.randomUUID()}`.slice(0, 128);
}

async function parseError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { message?: unknown };
    if (typeof body.message === "string") return body.message;
  } catch {
    // Source-access responses can be binary.
  }
  return "Studio asset operation failed.";
}

async function jsonOperation(
  session: StoredStudioAuthSession,
  body: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const response = await fetch(operationsUrl, {
    method: "POST",
    headers: {
      apikey: studioPublishableKey,
      authorization: `Bearer ${session.accessToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (response.status === 401) {
    clearStudioAuthSession();
    throw new Error("Studio session is no longer valid.");
  }
  if (!response.ok) throw new Error(await parseError(response));
  return (await response.json()) as Record<string, unknown>;
}

export async function getGoogleDriveConnectionStatus(
  session: StoredStudioAuthSession,
): Promise<GoogleDriveConnectionStatus> {
  const result = await jsonOperation(session, { type: "provider.google_drive.status" });
  return {
    connected: result.connected === true,
    accountEmail: typeof result.accountEmail === "string" ? result.accountEmail : undefined,
    accountDisplayName: typeof result.accountDisplayName === "string" ? result.accountDisplayName : null,
    connectedAt: typeof result.connectedAt === "string" ? result.connectedAt : undefined,
    updatedAt: typeof result.updatedAt === "string" ? result.updatedAt : undefined,
  };
}

export async function beginGoogleDriveConnection(
  session: StoredStudioAuthSession,
): Promise<{ readonly authorizationUrl: string; readonly callbackUrl: string }> {
  const result = await jsonOperation(session, { type: "provider.google_drive.connect.begin" });
  if (typeof result.authorizationUrl !== "string" || typeof result.callbackUrl !== "string") {
    throw new Error("Google Drive connection response is malformed.");
  }
  return { authorizationUrl: result.authorizationUrl, callbackUrl: result.callbackUrl };
}

export async function registerDriveAssetSource(
  session: StoredStudioAuthSession,
  input: AssetSourceMutationInput & { readonly driveFileReference: string },
): Promise<Record<string, unknown>> {
  return jsonOperation(session, {
    type: "registry.asset_source.register",
    idempotencyKey: operationKey("asset-source", input.assetSemanticId),
    payload: input,
  });
}

export async function uploadDriveAssetSource(
  session: StoredStudioAuthSession,
  input: AssetSourceMutationInput & { readonly file: File },
): Promise<Record<string, unknown>> {
  const form = new FormData();
  form.set("type", "registry.asset_source.upload");
  form.set("idempotencyKey", operationKey("asset-upload", input.assetSemanticId));
  form.set("ownerSemanticId", input.ownerSemanticId);
  form.set("assetSemanticId", input.assetSemanticId);
  form.set("role", input.role);
  form.set("variant", input.variant ?? "");
  form.set("derivativeRequired", String(input.derivativeRequired));
  form.set("file", input.file);
  const response = await fetch(operationsUrl, {
    method: "POST",
    headers: {
      apikey: studioPublishableKey,
      authorization: `Bearer ${session.accessToken}`,
    },
    body: form,
  });
  if (response.status === 401) {
    clearStudioAuthSession();
    throw new Error("Studio session is no longer valid.");
  }
  if (!response.ok) throw new Error(await parseError(response));
  return (await response.json()) as Record<string, unknown>;
}

export async function selectAssetVersion(
  session: StoredStudioAuthSession,
  assetSemanticId: string,
  versionId: string,
): Promise<Record<string, unknown>> {
  return jsonOperation(session, {
    type: "registry.asset_version.select",
    idempotencyKey: operationKey("asset-select", assetSemanticId),
    payload: { assetSemanticId, versionId },
  });
}

export async function setAssetRelation(
  session: StoredStudioAuthSession,
  input: {
    readonly sourceAssetId: string;
    readonly relationType: string;
    readonly targetAssetId: string;
    readonly active: boolean;
  },
): Promise<Record<string, unknown>> {
  return jsonOperation(session, {
    type: "registry.asset_relation.set",
    idempotencyKey: operationKey("asset-relation", input.sourceAssetId),
    payload: input,
  });
}

export async function fetchAssetSourceBlob(
  session: StoredStudioAuthSession,
  versionId: string,
  disposition: "preview" | "download",
): Promise<Blob> {
  const response = await fetch(operationsUrl, {
    method: "POST",
    headers: {
      apikey: studioPublishableKey,
      authorization: `Bearer ${session.accessToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      type: "registry.asset_source.access",
      payload: { versionId, disposition },
    }),
  });
  if (response.status === 401) {
    clearStudioAuthSession();
    throw new Error("Studio session is no longer valid.");
  }
  if (!response.ok) throw new Error(await parseError(response));
  return response.blob();
}
