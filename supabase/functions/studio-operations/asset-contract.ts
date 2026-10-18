import { StudioOperationContractError } from "./contract.ts";

export const STUDIO_ASSET_SOURCE_REGISTER = "registry.asset_source.register" as const;
export const STUDIO_ASSET_VERSION_SELECT = "registry.asset_version.select" as const;
export const STUDIO_ASSET_RELATION_SET = "registry.asset_relation.set" as const;
export const STUDIO_ASSET_SOURCE_ACCESS = "registry.asset_source.access" as const;

export type StudioAssetOperationRequest =
  | {
      readonly type: typeof STUDIO_ASSET_SOURCE_REGISTER;
      readonly idempotencyKey: string;
      readonly payload: {
        readonly ownerSemanticId: string;
        readonly assetSemanticId: string;
        readonly role: string;
        readonly variant: string | null;
        readonly derivativeRequired: boolean;
        readonly driveFileReference: string;
      };
    }
  | {
      readonly type: typeof STUDIO_ASSET_VERSION_SELECT;
      readonly idempotencyKey: string;
      readonly payload: {
        readonly assetSemanticId: string;
        readonly versionId: string;
      };
    }
  | {
      readonly type: typeof STUDIO_ASSET_RELATION_SET;
      readonly idempotencyKey: string;
      readonly payload: {
        readonly sourceAssetId: string;
        readonly relationType: string;
        readonly targetAssetId: string;
        readonly active: boolean;
      };
    }
  | {
      readonly type: typeof STUDIO_ASSET_SOURCE_ACCESS;
      readonly payload: {
        readonly versionId: string;
        readonly disposition: "preview" | "download";
      };
    };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireExactKeys(record: Record<string, unknown>, expected: readonly string[]): void {
  const actual = Object.keys(record).sort();
  const sortedExpected = [...expected].sort();
  if (JSON.stringify(actual) !== JSON.stringify(sortedExpected)) {
    throw new StudioOperationContractError("Request contains unsupported fields.");
  }
}

function requiredText(value: unknown, label: string, min: number, max: number): string {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (normalized.length < min || normalized.length > max) {
    throw new StudioOperationContractError(`${label} is invalid.`);
  }
  return normalized;
}

function semanticId(value: unknown, label: string, max: number): string {
  const result = requiredText(value, label, 1, max);
  if (/\s/.test(result)) throw new StudioOperationContractError(`${label} is invalid.`);
  return result;
}

function uuid(value: unknown, label: string): string {
  const result = requiredText(value, label, 36, 36);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(result)) {
    throw new StudioOperationContractError(`${label} must be a UUID.`);
  }
  return result;
}

function idempotencyKey(value: unknown): string {
  return requiredText(value, "Idempotency key", 8, 128);
}

export function parseStudioAssetOperationRequest(value: unknown): StudioAssetOperationRequest | null {
  if (!isRecord(value) || typeof value.type !== "string") return null;

  if (value.type === STUDIO_ASSET_SOURCE_REGISTER) {
    requireExactKeys(value, ["type", "idempotencyKey", "payload"]);
    if (!isRecord(value.payload)) throw new StudioOperationContractError("Asset-source payload is required.");
    requireExactKeys(value.payload, [
      "ownerSemanticId",
      "assetSemanticId",
      "role",
      "variant",
      "derivativeRequired",
      "driveFileReference",
    ]);
    const variant = value.payload.variant;
    if (variant !== null && typeof variant !== "string") {
      throw new StudioOperationContractError("Asset variant must be a string or null.");
    }
    const normalizedVariant = typeof variant === "string" ? variant.trim() : null;
    if (normalizedVariant && normalizedVariant.length > 120) {
      throw new StudioOperationContractError("Asset variant is invalid.");
    }
    if (typeof value.payload.derivativeRequired !== "boolean") {
      throw new StudioOperationContractError("Derivative-required flag is required.");
    }
    return {
      type: STUDIO_ASSET_SOURCE_REGISTER,
      idempotencyKey: idempotencyKey(value.idempotencyKey),
      payload: {
        ownerSemanticId: semanticId(value.payload.ownerSemanticId, "Owner semantic ID", 200),
        assetSemanticId: semanticId(value.payload.assetSemanticId, "Asset semantic ID", 240),
        role: requiredText(value.payload.role, "Asset role", 1, 100),
        variant: normalizedVariant || null,
        derivativeRequired: value.payload.derivativeRequired,
        driveFileReference: requiredText(
          value.payload.driveFileReference,
          "Google Drive file reference",
          10,
          1024,
        ),
      },
    };
  }

  if (value.type === STUDIO_ASSET_VERSION_SELECT) {
    requireExactKeys(value, ["type", "idempotencyKey", "payload"]);
    if (!isRecord(value.payload)) throw new StudioOperationContractError("Asset-version payload is required.");
    requireExactKeys(value.payload, ["assetSemanticId", "versionId"]);
    return {
      type: STUDIO_ASSET_VERSION_SELECT,
      idempotencyKey: idempotencyKey(value.idempotencyKey),
      payload: {
        assetSemanticId: semanticId(value.payload.assetSemanticId, "Asset semantic ID", 240),
        versionId: uuid(value.payload.versionId, "Asset version ID"),
      },
    };
  }

  if (value.type === STUDIO_ASSET_RELATION_SET) {
    requireExactKeys(value, ["type", "idempotencyKey", "payload"]);
    if (!isRecord(value.payload)) throw new StudioOperationContractError("Asset-relation payload is required.");
    requireExactKeys(value.payload, ["sourceAssetId", "relationType", "targetAssetId", "active"]);
    if (typeof value.payload.active !== "boolean") {
      throw new StudioOperationContractError("Asset relation active flag is required.");
    }
    return {
      type: STUDIO_ASSET_RELATION_SET,
      idempotencyKey: idempotencyKey(value.idempotencyKey),
      payload: {
        sourceAssetId: semanticId(value.payload.sourceAssetId, "Source asset ID", 240),
        relationType: requiredText(value.payload.relationType, "Relation type", 1, 120),
        targetAssetId: semanticId(value.payload.targetAssetId, "Target asset ID", 240),
        active: value.payload.active,
      },
    };
  }

  if (value.type === STUDIO_ASSET_SOURCE_ACCESS) {
    requireExactKeys(value, ["type", "payload"]);
    if (!isRecord(value.payload)) throw new StudioOperationContractError("Asset-source access payload is required.");
    requireExactKeys(value.payload, ["versionId", "disposition"]);
    if (value.payload.disposition !== "preview" && value.payload.disposition !== "download") {
      throw new StudioOperationContractError("Asset-source disposition is invalid.");
    }
    return {
      type: STUDIO_ASSET_SOURCE_ACCESS,
      payload: {
        versionId: uuid(value.payload.versionId, "Asset version ID"),
        disposition: value.payload.disposition,
      },
    };
  }

  return null;
}

export function parseAssetUploadForm(form: FormData): {
  readonly idempotencyKey: string;
  readonly ownerSemanticId: string;
  readonly assetSemanticId: string;
  readonly role: string;
  readonly variant: string | null;
  readonly derivativeRequired: boolean;
  readonly file: File;
} {
  const file = form.get("file");
  if (!(file instanceof File)) throw new StudioOperationContractError("Source file is required.");
  const derivative = form.get("derivativeRequired");
  if (derivative !== "true" && derivative !== "false") {
    throw new StudioOperationContractError("Derivative-required flag is invalid.");
  }
  const rawVariant = form.get("variant");
  if (rawVariant !== null && typeof rawVariant !== "string") {
    throw new StudioOperationContractError("Asset variant is invalid.");
  }
  const normalizedVariant = typeof rawVariant === "string" ? rawVariant.trim() : "";
  if (normalizedVariant.length > 120) throw new StudioOperationContractError("Asset variant is invalid.");
  return {
    idempotencyKey: idempotencyKey(form.get("idempotencyKey")),
    ownerSemanticId: semanticId(form.get("ownerSemanticId"), "Owner semantic ID", 200),
    assetSemanticId: semanticId(form.get("assetSemanticId"), "Asset semantic ID", 240),
    role: requiredText(form.get("role"), "Asset role", 1, 100),
    variant: normalizedVariant || null,
    derivativeRequired: derivative === "true",
    file,
  };
}
