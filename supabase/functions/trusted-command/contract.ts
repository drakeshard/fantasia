export const TRUSTED_PROFILE_DISPLAY_NAME_COMMAND = "profile.update_display_name" as const;

export interface TrustedProfileDisplayNameRequest {
  readonly type: typeof TRUSTED_PROFILE_DISPLAY_NAME_COMMAND;
  readonly idempotencyKey: string;
  readonly payload: {
    readonly displayName: string;
  };
}

export type TrustedCommandRequest = TrustedProfileDisplayNameRequest;

export interface TrustedProfileResult {
  readonly accountId: string;
  readonly displayName: string;
  readonly revision: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface TrustedProfileDisplayNameResponse {
  readonly command: typeof TRUSTED_PROFILE_DISPLAY_NAME_COMMAND;
  readonly idempotencyKey: string;
  readonly replayed: boolean;
  readonly result: TrustedProfileResult;
}

export class TrustedCommandContractError extends Error {
  readonly status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "TrustedCommandContractError";
    this.status = status;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseTrustedCommandRequest(value: unknown): TrustedCommandRequest {
  if (!isRecord(value)) throw new TrustedCommandContractError("Request body must be an object.");
  if (value.type !== TRUSTED_PROFILE_DISPLAY_NAME_COMMAND) {
    throw new TrustedCommandContractError("Unsupported trusted command.", 404);
  }

  const idempotencyKey = typeof value.idempotencyKey === "string" ? value.idempotencyKey.trim() : "";
  if (idempotencyKey.length < 8 || idempotencyKey.length > 128) {
    throw new TrustedCommandContractError("Idempotency key must be 8 to 128 characters.");
  }

  if (!isRecord(value.payload) || typeof value.payload.displayName !== "string") {
    throw new TrustedCommandContractError("Display name is required.");
  }
  const displayName = value.payload.displayName.trim();
  if (displayName.length < 1 || displayName.length > 40) {
    throw new TrustedCommandContractError("Display name must be 1 to 40 characters.");
  }

  return {
    type: TRUSTED_PROFILE_DISPLAY_NAME_COMMAND,
    idempotencyKey,
    payload: { displayName },
  };
}
