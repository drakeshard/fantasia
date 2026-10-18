import {
  CANONICAL_CHARACTER_CONTENT_TYPE,
  CANONICAL_CHARACTER_OPERATION,
  CANONICAL_CHARACTER_PATH,
  CANONICAL_STORY_NODE_CONTENT_TYPE,
  CANONICAL_STORY_NODE_OPERATION,
  CANONICAL_STORY_PATH,
  type CanonicalChangeRequest,
} from "./canonical-change.ts";
import { StudioOperationContractError } from "./contract.ts";

export const STUDIO_CANONICAL_CHANGE_PROPOSE = "canonical.change.proposal.create" as const;
export const STUDIO_CANONICAL_CHANGE_STATUS_GET = "canonical.change.proposal.get" as const;

export const STUDIO_PROPOSAL_STATES = [
  "clean",
  "edited",
  "validating",
  "validation-failed",
  "stale",
  "proposal-creating",
  "pr-open",
  "checks-pending",
  "checks-failed",
  "merged",
  "closed",
  "superseded",
  "failed",
] as const;
export type StudioProposalState = (typeof STUDIO_PROPOSAL_STATES)[number];

export type StudioCanonicalChangeProposalCreateRequest = {
  readonly type: typeof STUDIO_CANONICAL_CHANGE_PROPOSE;
  readonly idempotencyKey: string;
  readonly payload: CanonicalChangeRequest;
};

export type StudioCanonicalChangeProposalStatusRequest = {
  readonly type: typeof STUDIO_CANONICAL_CHANGE_STATUS_GET;
  readonly payload: { readonly changeRequestId: string };
};

export type StudioCanonicalChangeRequest =
  | StudioCanonicalChangeProposalCreateRequest
  | StudioCanonicalChangeProposalStatusRequest;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireExactKeys(record: Record<string, unknown>, expected: readonly string[]): void {
  const actual = Object.keys(record).sort();
  const wanted = [...expected].sort();
  if (JSON.stringify(actual) !== JSON.stringify(wanted)) throw new StudioOperationContractError("Request contains unsupported fields.");
}

function requiredText(value: unknown, label: string, min: number, max: number): string {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (normalized.length < min || normalized.length > max) throw new StudioOperationContractError(`${label} is invalid.`);
  return normalized;
}

function parseChangeRequestId(value: unknown): string {
  return requiredText(value, "Change request ID", 8, 128);
}

function parseBasePayload(payload: Record<string, unknown>) {
  const baseRevision = requiredText(payload.baseRevision, "Base revision", 40, 40);
  if (!/^[0-9a-f]{40}$/.test(baseRevision)) throw new StudioOperationContractError("Base revision must be a full Git SHA.");
  const semanticId = requiredText(payload.semanticId, "Semantic ID", 1, 200);
  if (/\s/.test(semanticId)) throw new StudioOperationContractError("Semantic ID is invalid.");
  const changeSummary = requiredText(payload.changeSummary, "Change summary", 1, 500);
  if (!isRecord(payload.operation)) throw new StudioOperationContractError("Canonical change operation is required.");
  return { baseRevision, semanticId, changeSummary, operation: payload.operation };
}

export function isCanonicalChangeOperationType(value: unknown): boolean {
  return value === STUDIO_CANONICAL_CHANGE_PROPOSE || value === STUDIO_CANONICAL_CHANGE_STATUS_GET;
}

export function parseCanonicalChangeRequest(value: unknown): StudioCanonicalChangeRequest {
  if (!isRecord(value) || typeof value.type !== "string") throw new StudioOperationContractError("Request body must contain an operation type.");

  if (value.type === STUDIO_CANONICAL_CHANGE_PROPOSE) {
    requireExactKeys(value, ["type", "idempotencyKey", "payload"]);
    const idempotencyKey = parseChangeRequestId(value.idempotencyKey);
    if (!isRecord(value.payload)) throw new StudioOperationContractError("Canonical change payload is required.");
    requireExactKeys(value.payload, ["semanticId", "canonicalPath", "contentType", "baseRevision", "operation", "changeSummary"]);
    const parsed = parseBasePayload(value.payload);

    if (value.payload.canonicalPath === CANONICAL_STORY_PATH && value.payload.contentType === CANONICAL_STORY_NODE_CONTENT_TYPE) {
      requireExactKeys(parsed.operation, ["kind", "summary"]);
      if (parsed.operation.kind !== CANONICAL_STORY_NODE_OPERATION) throw new StudioOperationContractError("Canonical change operation is not allowlisted.");
      return {
        type: STUDIO_CANONICAL_CHANGE_PROPOSE,
        idempotencyKey,
        payload: {
          semanticId: parsed.semanticId,
          canonicalPath: CANONICAL_STORY_PATH,
          contentType: CANONICAL_STORY_NODE_CONTENT_TYPE,
          baseRevision: parsed.baseRevision,
          operation: { kind: CANONICAL_STORY_NODE_OPERATION, summary: requiredText(parsed.operation.summary, "Story node summary", 1, 4000) },
          changeSummary: parsed.changeSummary,
        },
      };
    }

    if (value.payload.canonicalPath === CANONICAL_CHARACTER_PATH && value.payload.contentType === CANONICAL_CHARACTER_CONTENT_TYPE) {
      requireExactKeys(parsed.operation, ["kind", "displayName"]);
      if (parsed.operation.kind !== CANONICAL_CHARACTER_OPERATION) throw new StudioOperationContractError("Canonical change operation is not allowlisted.");
      return {
        type: STUDIO_CANONICAL_CHANGE_PROPOSE,
        idempotencyKey,
        payload: {
          semanticId: parsed.semanticId,
          canonicalPath: CANONICAL_CHARACTER_PATH,
          contentType: CANONICAL_CHARACTER_CONTENT_TYPE,
          baseRevision: parsed.baseRevision,
          operation: { kind: CANONICAL_CHARACTER_OPERATION, displayName: requiredText(parsed.operation.displayName, "Character display name", 1, 120) },
          changeSummary: parsed.changeSummary,
        },
      };
    }
    throw new StudioOperationContractError("Canonical path/content type is not allowlisted.");
  }

  if (value.type === STUDIO_CANONICAL_CHANGE_STATUS_GET) {
    requireExactKeys(value, ["type", "payload"]);
    if (!isRecord(value.payload)) throw new StudioOperationContractError("Proposal status payload is required.");
    requireExactKeys(value.payload, ["changeRequestId"]);
    return { type: STUDIO_CANONICAL_CHANGE_STATUS_GET, payload: { changeRequestId: parseChangeRequestId(value.payload.changeRequestId) } };
  }

  throw new StudioOperationContractError("Unsupported Studio operation.", 404);
}
