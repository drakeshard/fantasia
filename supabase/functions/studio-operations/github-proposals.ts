import {
  applyCanonicalChange,
  type CanonicalChangeRequest,
  CanonicalChangeValidationError,
  canonicalProposalBranchName,
} from "./canonical-change.ts";

const GITHUB_API = "https://api.github.com";
const REPOSITORY_OWNER = "drakeshard";
const REPOSITORY_NAME = "fantasia";
const BASE_BRANCH = "main";
const STUDIO_BRANCH_PREFIX = "studio/";

export type GitHubProposalStatus =
  | "PR_OPEN"
  | "CHECKS_PENDING"
  | "CHECKS_FAILED"
  | "MERGED"
  | "CLOSED";

export type GitHubProposalResult = {
  readonly branchName: string;
  readonly commitSha: string;
  readonly pullRequestNumber: number;
  readonly pullRequestUrl: string;
  readonly status: GitHubProposalStatus;
  readonly validationMessage: string;
};

export class GitHubProposalError extends Error {
  readonly kind: "stale" | "validation" | "provider";
  readonly details: Record<string, unknown>;

  constructor(
    kind: GitHubProposalError["kind"],
    message: string,
    details: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = "GitHubProposalError";
    this.kind = kind;
    this.details = details;
  }
}

type GitHubResponseError = { readonly message?: unknown };
type GitHubRef = { readonly object?: { readonly sha?: unknown } };
type GitHubContent = {
  readonly sha?: unknown;
  readonly content?: unknown;
  readonly encoding?: unknown;
};
type GitHubContentWrite = { readonly commit?: { readonly sha?: unknown } };
type GitHubPullRequest = {
  readonly number?: unknown;
  readonly html_url?: unknown;
  readonly state?: unknown;
  readonly merged_at?: unknown;
  readonly head?: { readonly sha?: unknown };
};
type GitHubCheckRuns = {
  readonly check_runs?: readonly { readonly status?: unknown; readonly conclusion?: unknown }[];
};

function githubHeaders(token: string): HeadersInit {
  return {
    accept: "application/vnd.github+json",
    authorization: `Bearer ${token}`,
    "content-type": "application/json",
    "x-github-api-version": "2022-11-28",
    "user-agent": "fantasia-content-studio",
  };
}

async function githubRequest<T>(
  token: string,
  path: string,
  init: RequestInit = {},
  acceptedStatuses: readonly number[] = [200],
): Promise<{ readonly status: number; readonly body: T | null }> {
  const response = await fetch(`${GITHUB_API}${path}`, {
    ...init,
    headers: githubHeaders(token),
  });
  let body: T | null = null;
  if (response.status !== 204) {
    try {
      body = (await response.json()) as T;
    } catch {
      body = null;
    }
  }
  if (!acceptedStatuses.includes(response.status)) {
    const error = body as GitHubResponseError | null;
    const message =
      typeof error?.message === "string"
        ? error.message
        : `GitHub request failed (${response.status}).`;
    throw new GitHubProposalError("provider", message, { status: response.status, path });
  }
  return { status: response.status, body };
}

function requiredString(value: unknown, label: string): string {
  if (typeof value !== "string" || !value)
    throw new GitHubProposalError("provider", `GitHub ${label} was missing.`);
  return value;
}

function requiredCommitSha(value: unknown, label: string): string {
  const sha = requiredString(value, label);
  if (!/^[0-9a-f]{40}$/.test(sha))
    throw new GitHubProposalError("provider", `GitHub ${label} was invalid.`);
  return sha;
}

function requiredNumber(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1)
    throw new GitHubProposalError("provider", `GitHub ${label} was missing.`);
  return value;
}

function decodeBase64(value: string): string {
  const binary = atob(value.replace(/\s+/g, ""));
  return new TextDecoder().decode(Uint8Array.from(binary, (character) => character.charCodeAt(0)));
}

function encodeBase64(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function repoPath(suffix: string): string {
  return `/repos/${REPOSITORY_OWNER}/${REPOSITORY_NAME}${suffix}`;
}

async function currentMainRevision(token: string): Promise<string> {
  const result = await githubRequest<GitHubRef>(token, repoPath(`/git/ref/heads/${BASE_BRANCH}`));
  return requiredCommitSha(result.body?.object?.sha, "main revision");
}

async function fetchCanonicalFile(
  token: string,
  canonicalPath: string,
  revision: string,
): Promise<{ readonly blobSha: string; readonly parsed: unknown }> {
  const result = await githubRequest<GitHubContent>(
    token,
    repoPath(`/contents/${canonicalPath}?ref=${encodeURIComponent(revision)}`),
  );
  const blobSha = requiredString(result.body?.sha, "content blob SHA");
  const encoded = requiredString(result.body?.content, "content body");
  if (result.body?.encoding !== "base64")
    throw new GitHubProposalError("provider", "GitHub canonical content encoding was not base64.");
  try {
    return { blobSha, parsed: JSON.parse(decodeBase64(encoded)) as unknown };
  } catch (error) {
    throw new GitHubProposalError(
      "validation",
      `Canonical JSON could not be parsed: ${error instanceof Error ? error.message : "invalid JSON"}`,
    );
  }
}

async function ensureProposalBranch(
  token: string,
  branchName: string,
  baseRevision: string,
): Promise<{ readonly existed: boolean; readonly headSha: string }> {
  if (!branchName.startsWith(STUDIO_BRANCH_PREFIX) || branchName === BASE_BRANCH)
    throw new GitHubProposalError("validation", "Proposal branch is outside the Studio namespace.");
  const refPath = repoPath(`/git/ref/heads/${encodeURIComponent(branchName)}`);
  const existing = await githubRequest<GitHubRef>(token, refPath, {}, [200, 404]);
  if (existing.status === 200)
    return {
      existed: true,
      headSha: requiredCommitSha(existing.body?.object?.sha, "proposal branch revision"),
    };
  await githubRequest(
    token,
    repoPath("/git/refs"),
    {
      method: "POST",
      body: JSON.stringify({ ref: `refs/heads/${branchName}`, sha: baseRevision }),
    },
    [201],
  );
  return { existed: false, headSha: baseRevision };
}

async function writeCanonicalFile(
  token: string,
  branchName: string,
  blobSha: string,
  content: string,
  request: CanonicalChangeRequest,
): Promise<string> {
  if (!branchName.startsWith(STUDIO_BRANCH_PREFIX) || branchName === BASE_BRANCH)
    throw new GitHubProposalError(
      "validation",
      "Direct writes to the accepted branch are forbidden.",
    );
  const result = await githubRequest<GitHubContentWrite>(
    token,
    repoPath(`/contents/${request.canonicalPath}`),
    {
      method: "PUT",
      body: JSON.stringify({
        message: `studio(content): propose ${request.semanticId} ${request.operation.kind}`,
        content: encodeBase64(content),
        sha: blobSha,
        branch: branchName,
        committer: {
          name: "Fantasia Content Studio",
          email: "content-studio@users.noreply.github.com",
        },
        author: {
          name: "Fantasia Content Studio",
          email: "content-studio@users.noreply.github.com",
        },
      }),
    },
    [200, 201],
  );
  return requiredCommitSha(result.body?.commit?.sha, "proposal commit SHA");
}

function proposalBody(
  request: CanonicalChangeRequest,
  actorUserId: string,
  changeRequestId: string,
): string {
  return [
    "## Content Studio canonical change proposal",
    "",
    `- Semantic ID: \`${request.semanticId}\``,
    `- Canonical path: \`${request.canonicalPath}\``,
    `- Content type: \`${request.contentType}\``,
    `- Operation: \`${request.operation.kind}\``,
    `- Base revision: \`${request.baseRevision}\``,
    `- Studio change request: \`${changeRequestId}\``,
    `- Authenticated Studio actor: \`${actorUserId}\``,
    "",
    "### Change summary",
    request.changeSummary,
    "",
    "> This PR is a repository proposal only. Merge/CI success does not grant Layer-4 content approval or freeze authority.",
  ].join("\n");
}

async function createOrUpdatePullRequest(
  token: string,
  branchName: string,
  request: CanonicalChangeRequest,
  actorUserId: string,
  changeRequestId: string,
): Promise<{ readonly number: number; readonly url: string }> {
  const headQuery = encodeURIComponent(`${REPOSITORY_OWNER}:${branchName}`);
  const list = await githubRequest<GitHubPullRequest[]>(
    token,
    repoPath(`/pulls?state=open&head=${headQuery}&base=${BASE_BRANCH}`),
  );
  const title = `[Studio] ${request.semanticId}: ${request.changeSummary}`.slice(0, 240);
  const body = proposalBody(request, actorUserId, changeRequestId);
  const existing = list.body?.[0];
  if (existing) {
    const number = requiredNumber(existing.number, "pull request number");
    const updated = await githubRequest<GitHubPullRequest>(token, repoPath(`/pulls/${number}`), {
      method: "PATCH",
      body: JSON.stringify({ title, body }),
    });
    return { number, url: requiredString(updated.body?.html_url, "pull request URL") };
  }
  const created = await githubRequest<GitHubPullRequest>(
    token,
    repoPath("/pulls"),
    {
      method: "POST",
      body: JSON.stringify({ title, body, head: branchName, base: BASE_BRANCH }),
    },
    [201],
  );
  return {
    number: requiredNumber(created.body?.number, "pull request number"),
    url: requiredString(created.body?.html_url, "pull request URL"),
  };
}

async function pullRequestStatus(
  token: string,
  pullRequestNumber: number,
): Promise<GitHubProposalStatus> {
  const pr = await githubRequest<GitHubPullRequest>(token, repoPath(`/pulls/${pullRequestNumber}`));
  if (pr.body?.merged_at) return "MERGED";
  if (pr.body?.state === "closed") return "CLOSED";
  const headSha = requiredCommitSha(pr.body?.head?.sha, "pull request head SHA");
  const checks = await githubRequest<GitHubCheckRuns>(
    token,
    repoPath(`/commits/${headSha}/check-runs?per_page=100`),
  );
  const runs = checks.body?.check_runs ?? [];
  if (runs.length === 0 || runs.some((run) => run.status !== "completed")) return "CHECKS_PENDING";
  const failureConclusions = new Set([
    "failure",
    "cancelled",
    "timed_out",
    "action_required",
    "startup_failure",
    "stale",
  ]);
  if (runs.some((run) => failureConclusions.has(String(run.conclusion)))) return "CHECKS_FAILED";
  return "PR_OPEN";
}

function jsonSemanticallyEqual(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

export async function createCanonicalGitProposal(input: {
  readonly token: string;
  readonly actorUserId: string;
  readonly changeRequestId: string;
  readonly request: CanonicalChangeRequest;
}): Promise<GitHubProposalResult> {
  const latestMain = await currentMainRevision(input.token);
  if (latestMain !== input.request.baseRevision)
    throw new GitHubProposalError("stale", "Canonical base revision is stale.", {
      expectedBaseRevision: input.request.baseRevision,
      currentBaseRevision: latestMain,
    });
  const canonical = await fetchCanonicalFile(
    input.token,
    input.request.canonicalPath,
    input.request.baseRevision,
  );
  let validated: ReturnType<typeof applyCanonicalChange>;
  try {
    validated = applyCanonicalChange(canonical.parsed, input.request);
  } catch (error) {
    if (error instanceof CanonicalChangeValidationError)
      throw new GitHubProposalError("validation", error.message);
    throw error;
  }
  const desired = JSON.parse(validated.content) as unknown;
  const branchName = canonicalProposalBranchName(input.request, input.changeRequestId);
  const branch = await ensureProposalBranch(input.token, branchName, input.request.baseRevision);
  let commitSha: string;
  if (branch.existed) {
    const branchCanonical = await fetchCanonicalFile(
      input.token,
      input.request.canonicalPath,
      branchName,
    );
    commitSha = jsonSemanticallyEqual(branchCanonical.parsed, desired)
      ? branch.headSha
      : await writeCanonicalFile(
          input.token,
          branchName,
          branchCanonical.blobSha,
          validated.content,
          input.request,
        );
  } else {
    commitSha = await writeCanonicalFile(
      input.token,
      branchName,
      canonical.blobSha,
      validated.content,
      input.request,
    );
  }
  const pullRequest = await createOrUpdatePullRequest(
    input.token,
    branchName,
    input.request,
    input.actorUserId,
    input.changeRequestId,
  );
  const status = await pullRequestStatus(input.token, pullRequest.number);
  return {
    branchName,
    commitSha,
    pullRequestNumber: pullRequest.number,
    pullRequestUrl: pullRequest.url,
    status,
    validationMessage: validated.validationMessage,
  };
}

export async function refreshCanonicalGitProposalStatus(input: {
  readonly token: string;
  readonly pullRequestNumber: number;
}): Promise<GitHubProposalStatus> {
  return pullRequestStatus(input.token, input.pullRequestNumber);
}
