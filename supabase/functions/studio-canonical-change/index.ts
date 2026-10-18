import {
  isCanonicalChangeOperationType,
  parseCanonicalChangeRequest,
  STUDIO_CANONICAL_CHANGE_PROPOSE,
  STUDIO_CANONICAL_CHANGE_STATUS_GET,
} from "../studio-operations/canonical-change-contract.ts";
import { StudioOperationContractError } from "../studio-operations/contract.ts";
import {
  createCanonicalGitProposal,
  GitHubProposalError,
  refreshCanonicalGitProposalStatus,
} from "../studio-operations/github-proposals.ts";

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
  throw new StudioOperationContractError(
    `Missing required Edge Function environment key: ${directName}/${collectionName}`,
    503,
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

type StoredProposal = {
  readonly actor_user_id?: unknown;
  readonly change_request_id?: unknown;
  readonly semantic_id?: unknown;
  readonly canonical_git_path?: unknown;
  readonly content_type?: unknown;
  readonly base_revision?: unknown;
  readonly operation_kind?: unknown;
  readonly status?: unknown;
  readonly branch_name?: unknown;
  readonly commit_sha?: unknown;
  readonly pull_request_number?: unknown;
  readonly pull_request_url?: unknown;
  readonly validation_message?: unknown;
  readonly created_at?: unknown;
  readonly updated_at?: unknown;
};

function asProposal(value: unknown): StoredProposal {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Canonical change proposal response was malformed.");
  }
  return value as StoredProposal;
}

function normalizeProposal(proposal: StoredProposal): Record<string, unknown> {
  return {
    changeRequestId: proposal.change_request_id ?? null,
    semanticId: proposal.semantic_id ?? null,
    canonicalPath: proposal.canonical_git_path ?? null,
    contentType: proposal.content_type ?? null,
    baseRevision: proposal.base_revision ?? null,
    operationKind: proposal.operation_kind ?? null,
    status: proposal.status ?? null,
    branchName: proposal.branch_name ?? null,
    commitSha: proposal.commit_sha ?? null,
    pullRequestNumber: proposal.pull_request_number ?? null,
    pullRequestUrl: proposal.pull_request_url ?? null,
    validationMessage: proposal.validation_message ?? null,
    createdAt: proposal.created_at ?? null,
    updatedAt: proposal.updated_at ?? null,
  };
}

async function authenticateUser(
  request: Request,
  supabaseUrl: string,
  publishableKey: string,
): Promise<string> {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    throw new StudioOperationContractError("Authentication required.", 401);
  }
  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { apikey: publishableKey, authorization },
  });
  if (!response.ok) throw new StudioOperationContractError("Authentication required.", 401);
  const user = (await response.json()) as { id?: unknown };
  if (typeof user.id !== "string") {
    throw new StudioOperationContractError("Authentication required.", 401);
  }
  return user.id;
}

async function recordResult(input: {
  readonly supabaseUrl: string;
  readonly secretKey: string;
  readonly actorUserId: string;
  readonly changeRequestId: string;
  readonly status: string;
  readonly eventType: string;
  readonly branchName?: string | null;
  readonly commitSha?: string | null;
  readonly pullRequestNumber?: number | null;
  readonly pullRequestUrl?: string | null;
  readonly validationMessage?: string | null;
  readonly details?: Record<string, unknown>;
}): Promise<StoredProposal> {
  const result = await callRpc(
    input.supabaseUrl,
    input.secretKey,
    "record_studio_canonical_change_proposal_result",
    {
      p_actor_user_id: input.actorUserId,
      p_change_request_id: input.changeRequestId,
      p_status: input.status,
      p_event_type: input.eventType,
      p_branch_name: input.branchName ?? null,
      p_commit_sha: input.commitSha ?? null,
      p_pull_request_number: input.pullRequestNumber ?? null,
      p_pull_request_url: input.pullRequestUrl ?? null,
      p_validation_message: input.validationMessage ?? null,
      p_details: input.details ?? {},
    },
  );
  return asProposal(result);
}

async function createProposal(input: {
  readonly actorUserId: string;
  readonly supabaseUrl: string;
  readonly secretKey: string;
  readonly githubToken: string;
  readonly request: Extract<
    ReturnType<typeof parseCanonicalChangeRequest>,
    { type: typeof STUDIO_CANONICAL_CHANGE_PROPOSE }
  >;
}): Promise<Record<string, unknown>> {
  const payload = input.request.payload;
  const preparedValue = await callRpc(
    input.supabaseUrl,
    input.secretKey,
    "prepare_studio_canonical_change_proposal",
    {
      p_actor_user_id: input.actorUserId,
      p_change_request_id: input.request.idempotencyKey,
      p_semantic_id: payload.semanticId,
      p_canonical_git_path: payload.canonicalPath,
      p_content_type: payload.contentType,
      p_base_revision: payload.baseRevision,
      p_operation_kind: payload.operation.kind,
      p_request_json: payload,
    },
  );
  const prepared = preparedValue as { replayed?: unknown; proposal?: unknown };
  const proposal = asProposal(prepared.proposal);
  if (prepared.replayed === true && proposal.status !== "VALIDATING") {
    return { replayed: true, proposal: normalizeProposal(proposal) };
  }

  try {
    const git = await createCanonicalGitProposal({
      token: input.githubToken,
      actorUserId: input.actorUserId,
      changeRequestId: input.request.idempotencyKey,
      request: payload,
    });
    const saved = await recordResult({
      supabaseUrl: input.supabaseUrl,
      secretKey: input.secretKey,
      actorUserId: input.actorUserId,
      changeRequestId: input.request.idempotencyKey,
      status: git.status,
      eventType: "proposal.git-pr-opened",
      branchName: git.branchName,
      commitSha: git.commitSha,
      pullRequestNumber: git.pullRequestNumber,
      pullRequestUrl: git.pullRequestUrl,
      validationMessage: git.validationMessage,
      details: {
        branchName: git.branchName,
        commitSha: git.commitSha,
        pullRequestNumber: git.pullRequestNumber,
        pullRequestUrl: git.pullRequestUrl,
        status: git.status,
      },
    });
    return { replayed: false, proposal: normalizeProposal(saved) };
  } catch (error) {
    if (error instanceof GitHubProposalError) {
      const status =
        error.kind === "stale"
          ? "STALE"
          : error.kind === "validation"
            ? "VALIDATION_FAILED"
            : "FAILED";
      const saved = await recordResult({
        supabaseUrl: input.supabaseUrl,
        secretKey: input.secretKey,
        actorUserId: input.actorUserId,
        changeRequestId: input.request.idempotencyKey,
        status,
        eventType: `proposal.${error.kind}`,
        validationMessage: error.message,
        details: error.details,
      });
      const httpStatus = error.kind === "stale" ? 409 : error.kind === "validation" ? 422 : 502;
      throw new StudioOperationContractError(
        `${error.message} Proposal status: ${String(saved.status)}.`,
        httpStatus,
      );
    }
    throw error;
  }
}

async function getProposalStatus(input: {
  readonly actorUserId: string;
  readonly supabaseUrl: string;
  readonly secretKey: string;
  readonly githubToken: string;
  readonly changeRequestId: string;
}): Promise<Record<string, unknown>> {
  const value = await callRpc(
    input.supabaseUrl,
    input.secretKey,
    "get_studio_canonical_change_proposal",
    {
      p_actor_user_id: input.actorUserId,
      p_change_request_id: input.changeRequestId,
    },
  );
  let proposal = asProposal(value);
  if (typeof proposal.pull_request_number === "number" && proposal.pull_request_number >= 1) {
    try {
      const liveStatus = await refreshCanonicalGitProposalStatus({
        token: input.githubToken,
        pullRequestNumber: proposal.pull_request_number,
      });
      if (liveStatus !== proposal.status) {
        proposal = await recordResult({
          supabaseUrl: input.supabaseUrl,
          secretKey: input.secretKey,
          actorUserId: input.actorUserId,
          changeRequestId: input.changeRequestId,
          status: liveStatus,
          eventType: "proposal.git-status-observed",
          details: { status: liveStatus, pullRequestNumber: proposal.pull_request_number },
        });
      }
    } catch (error) {
      if (!(error instanceof GitHubProposalError)) throw error;
    }
  }
  return { proposal: normalizeProposal(proposal) };
}

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return jsonResponse({ message: "Method not allowed." }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")?.replace(/\/$/, "");
    if (!supabaseUrl) throw new Error("Missing SUPABASE_URL.");
    const publishableKey = environmentKey("SUPABASE_PUBLISHABLE_KEY", "SUPABASE_PUBLISHABLE_KEYS");
    const secretKey = environmentKey("SUPABASE_SECRET_KEY", "SUPABASE_SECRET_KEYS");
    const githubToken = Deno.env.get("STUDIO_GITHUB_TOKEN")?.trim();
    if (!githubToken) {
      throw new StudioOperationContractError(
        "Canonical Git proposal service is not configured.",
        503,
      );
    }
    const actorUserId = await authenticateUser(request, supabaseUrl, publishableKey);
    const raw = await request.json();
    if (!isCanonicalChangeOperationType((raw as { type?: unknown } | null)?.type)) {
      throw new StudioOperationContractError("Unsupported Studio operation.", 404);
    }
    const operation = parseCanonicalChangeRequest(raw);
    if (operation.type === STUDIO_CANONICAL_CHANGE_PROPOSE) {
      return jsonResponse(
        await createProposal({
          actorUserId,
          supabaseUrl,
          secretKey,
          githubToken,
          request: operation,
        }),
      );
    }
    if (operation.type === STUDIO_CANONICAL_CHANGE_STATUS_GET) {
      return jsonResponse(
        await getProposalStatus({
          actorUserId,
          supabaseUrl,
          secretKey,
          githubToken,
          changeRequestId: operation.payload.changeRequestId,
        }),
      );
    }
    return jsonResponse({ message: "Unsupported Studio operation." }, 404);
  } catch (error) {
    if (error instanceof StudioOperationContractError) {
      return jsonResponse({ message: error.message }, error.status);
    }
    console.error(
      "studio-canonical-change failed",
      error instanceof Error ? error.message : "unknown error",
    );
    return jsonResponse({ message: "Canonical Git proposal service failed." }, 500);
  }
});
