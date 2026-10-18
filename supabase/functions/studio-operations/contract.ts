export const STUDIO_ROLES = ["Viewer", "Editor", "Approver", "Admin"] as const;
export type StudioRole = (typeof STUDIO_ROLES)[number];

export const STUDIO_CAPABILITIES = [
  "studio.read",
  "registry.metadata.edit",
  "review.approve",
  "review.freeze",
  "studio.membership.manage",
] as const;
export type StudioCapability = (typeof STUDIO_CAPABILITIES)[number];

const roleCapabilities: Readonly<Record<StudioRole, readonly StudioCapability[]>> = {
  Viewer: ["studio.read"],
  Editor: ["studio.read", "registry.metadata.edit"],
  Approver: ["studio.read", "registry.metadata.edit", "review.approve", "review.freeze"],
  Admin: ["studio.read", "registry.metadata.edit", "studio.membership.manage"],
};

export function isStudioRole(value: unknown): value is StudioRole {
  return typeof value === "string" && (STUDIO_ROLES as readonly string[]).includes(value);
}

export function capabilitiesForRole(role: StudioRole): readonly StudioCapability[] {
  return roleCapabilities[role];
}

export type StudioSessionResult =
  | { readonly authorized: false; readonly role: null; readonly capabilities: readonly [] }
  | {
      readonly authorized: true;
      readonly role: StudioRole;
      readonly capabilities: readonly StudioCapability[];
    };

export const STUDIO_SESSION_GET = "session.get" as const;
export const STUDIO_ENTITY_NOTE_SET = "registry.entity_note.set" as const;
export const STUDIO_MEMBERSHIP_SET = "studio.membership.set" as const;

export type StudioOperationRequest =
  | { readonly type: typeof STUDIO_SESSION_GET }
  | {
      readonly type: typeof STUDIO_ENTITY_NOTE_SET;
      readonly idempotencyKey: string;
      readonly payload: { readonly semanticId: string; readonly note: string | null };
    }
  | {
      readonly type: typeof STUDIO_MEMBERSHIP_SET;
      readonly idempotencyKey: string;
      readonly payload: {
        readonly userId: string;
        readonly role: StudioRole;
        readonly active: boolean;
      };
    };

export class StudioOperationContractError extends Error {
  readonly status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "StudioOperationContractError";
    this.status = status;
  }
}

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

function parseIdempotencyKey(value: unknown): string {
  const key = typeof value === "string" ? value.trim() : "";
  if (key.length < 8 || key.length > 128) {
    throw new StudioOperationContractError("Idempotency key must be 8 to 128 characters.");
  }
  return key;
}

function parseUuid(value: unknown, label: string): string {
  const candidate = typeof value === "string" ? value.trim() : "";
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(candidate)
  ) {
    throw new StudioOperationContractError(`${label} must be a UUID.`);
  }
  return candidate;
}

export function parseStudioOperationRequest(value: unknown): StudioOperationRequest {
  if (!isRecord(value) || typeof value.type !== "string") {
    throw new StudioOperationContractError("Request body must contain an operation type.");
  }

  if (value.type === STUDIO_SESSION_GET) {
    requireExactKeys(value, ["type"]);
    return { type: STUDIO_SESSION_GET };
  }

  if (value.type === STUDIO_ENTITY_NOTE_SET) {
    requireExactKeys(value, ["type", "idempotencyKey", "payload"]);
    if (!isRecord(value.payload)) {
      throw new StudioOperationContractError("Entity-note payload is required.");
    }
    requireExactKeys(value.payload, ["semanticId", "note"]);
    const semanticId =
      typeof value.payload.semanticId === "string" ? value.payload.semanticId.trim() : "";
    if (semanticId.length < 1 || semanticId.length > 200 || /\s/.test(semanticId)) {
      throw new StudioOperationContractError("Semantic ID is invalid.");
    }
    const note = value.payload.note;
    if (note !== null && typeof note !== "string") {
      throw new StudioOperationContractError("Operator note must be a string or null.");
    }
    const normalizedNote = typeof note === "string" ? note.trim() : null;
    if (normalizedNote !== null && normalizedNote.length > 1000) {
      throw new StudioOperationContractError("Operator note must be at most 1000 characters.");
    }
    return {
      type: STUDIO_ENTITY_NOTE_SET,
      idempotencyKey: parseIdempotencyKey(value.idempotencyKey),
      payload: { semanticId, note: normalizedNote },
    };
  }

  if (value.type === STUDIO_MEMBERSHIP_SET) {
    requireExactKeys(value, ["type", "idempotencyKey", "payload"]);
    if (!isRecord(value.payload)) {
      throw new StudioOperationContractError("Membership payload is required.");
    }
    requireExactKeys(value.payload, ["userId", "role", "active"]);
    if (!isStudioRole(value.payload.role)) {
      throw new StudioOperationContractError("Studio role is invalid.");
    }
    if (typeof value.payload.active !== "boolean") {
      throw new StudioOperationContractError("Membership active flag is required.");
    }
    return {
      type: STUDIO_MEMBERSHIP_SET,
      idempotencyKey: parseIdempotencyKey(value.idempotencyKey),
      payload: {
        userId: parseUuid(value.payload.userId, "Membership user ID"),
        role: value.payload.role,
        active: value.payload.active,
      },
    };
  }

  throw new StudioOperationContractError("Unsupported Studio operation.", 404);
}
