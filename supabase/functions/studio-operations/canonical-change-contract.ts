import {
  CANONICAL_STORY_NODE_CONTENT_TYPE,
  CANONICAL_STORY_NODE_OPERATION,
  CANONICAL_STORY_PATH,
  type CanonicalStoryNodeChangeRequest,
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
  readonly payload: CanonicalStoryNodeChangeRequest;
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
  if (JSON.stringify(actual) !== JSON.stringify(wanted)) {
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

function parseChangeRequestId(value: unknown): string {
  return requiredText(value, "Change request ID", 8, 128);
}

export function isCanonicalChangeOperationType(value: unknown): boolean {
  return value === STUDIO_CANONICAL_CHANGE_PROPOSE || value === STUDIO_CANONICAL_CHANGE_STATUS_GET;
}

export function parseCanonicalChangeRequest(value: unknown): StudioCanonicalChangeRequest {
  if (!isRecord(value) || typeof value.type !== "string") {
    throw new StudioOperationContractError("Request body must contain an operation type.");
  }

  if (value.type === STUDIO_CANONICAL_CHANGE_PROPOSE) {
    requireExactKeys(value, ["type", "idempotencyKey", "payload"]);
    const idempotencyKey = parseChangeRequestId(value.idempotencyKey);
    if (!isRecord(value.payload)) {
      throw new StudioOperationContractError("Canonical change payload is required.");
    }
    requireExactKeys(value.payload, [
      "semanticId",
      "canonicalPath",
      "contentType",
      "baseRevision",
      "operation",
      "changeSummary",
    ]);
    if (value.payload.canonicalPath !== CANONICAL_STORY_PATH) {
      throw new StudioOperationContractError("Canonical path is not allowlisted.");
    }
    if (value.payload.contentType !== CANONICAL_STORY_NODE_CONTENT_TYPE) {
      throw new StudioOperationContractError("Canonical content type is not allowlisted.");
    }
    const baseRevision = requiredText(value.payload.baseRevision, "Base revision", 40, 40);
    if (!/^[0-9a-f]{40}$/.test(baseRevision)) {
      throw new StudioOperationContractError("Base revision must be a full Git SHA.");
    }
    const semanticId = requiredText(value.payload.semanticId, "Semantic ID", 1, 200);
    if (/\s/.test(semanticId)) {
      throw new StudioOperationContractError("Semantic ID is invalid.");
    }
    const changeSummary = requiredText(value.payload.changeSummary, "Change summary", 1, 500);
    if (!isRecord(value.payload.operation)) {
      throw new StudioOperationContractError("Canonical change operation is required.");
    }
    requireExactKeys(value.payload.operation, ["kind", "summary"]);
    if (value.payload.operation.kind !== CANONICAL_STORY_NODE_OPERATION) {
      throw new StudioOperationContractError("Canonical change operation is not allowlisted.");
    }
    const summary = requiredText(value.payload.operation.summary, "Story node summary", 1, 4000);

    return {
      type: STUDIO_CANONICAL_CHANGE_PROPOSE,
      idempotencyKey,
      payload: {
        semanticId,
        canonicalPath: CANONICAL_STORY_PATH,
        contentType: CANONICAL_STORY_NODE_CONTENT_TYPE,
        baseRevision,
        operation: { kind: CANONICAL_STORY_NODE_OPERATION, summary },
        changeSummary,
      },
    };
  }

  if (value.type === STUDIO_CANONICAL_CHANGE_STATUS_GET) {
    requireExactKeys(value, ["type", "payload"]);
    if (!isRecord(value.payload)) {
      throw new StudioOperationContractError("Proposal status payload is required.");
    }
    requireExactKeys(value.payload, ["changeRequestId"]);
    return {
      type: STUDIO_CANONICAL_CHANGE_STATUS_GET,
      payload: { changeRequestId: parseChangeRequestId(value.payload.changeRequestId) },
    };
  }

  throw new StudioOperationContractError("Unsupported Studio operation.", 404);
}
