# Content Studio canonical Git proposal workflow

## Scope

GAME-STUDIO04 adds the first trusted write path from Content Studio into Git-canonical structured content. It is a proposal workflow, not a direct editor proxy and not a content-approval workflow.

The first supported mutation surface is intentionally narrow:

- repository: `drakeshard/fantasia`
- accepted branch: `main`
- canonical path: `content/narrative/story.json`
- content type: `fantasia.story.node.v1`
- operation: `set-node-summary`
- proposal branches: `studio/story/*`

No other repository path, content type, or mutation kind is accepted by this issue.

## Authority boundaries

Git remains authoritative for canonical structured story content and accepted repository history. Supabase Studio Registry records proposal metadata and append-only proposal events; it does not become the canonical story database.

Repository PR merge/CI status is not Layer-4 content approval. The Studio proposal state deliberately contains no `approved` or `frozen` state. Narrative approval/freeze continues to use the separately controlled review/approval contract.

Provider credentials remain server-side. Browser code receives Supabase publishable credentials only and never receives `STUDIO_GITHUB_TOKEN`, a GitHub installation token, or a Supabase secret/service-role key.

## Authorization

The existing four Studio roles remain unchanged. GAME-STUDIO04 adds one capability:

- `canonical.change.propose`

Viewer does not receive it. Editor, Approver, and Admin receive proposal capability, but that capability does not grant repository merge, Layer-4 approval/freeze, or membership administration unless the role already owns those separate capabilities.

The database RPC `prepare_studio_canonical_change_proposal` is the authoritative capability check. Browser-supplied actor IDs, roles, or capability claims are not accepted.

## Request contract

A proposal create request contains:

- authenticated actor from Supabase Auth (derived server-side)
- idempotency/change-request key
- semantic story node ID
- exact allowlisted canonical path
- exact allowlisted content type
- full 40-character base Git revision
- typed `set-node-summary` operation
- human-readable change summary

The request parser rejects unsupported fields and arbitrary paths before a provider operation begins.

## Validation and optimistic concurrency

Before mutation, the Git adapter reads the current `main` revision and compares it with `baseRevision`. A mismatch is recorded as `STALE` and no branch/file mutation occurs.

For a current base, the adapter fetches `story.json` at the exact base revision, parses it, validates the controlled story structure, verifies the target semantic node exists exactly once, applies only the requested summary update, validates the result again, and asserts that the ordered set of stable node/beat IDs is unchanged.

Malformed canonical data, unsupported targets, missing semantic IDs, or invalid summaries are recorded as `VALIDATION_FAILED` and do not create a PR.

## Trusted Git workflow

Only the server-side `studio-canonical-change` Edge Function performs Git provider calls.

For a valid current proposal it:

1. creates/reuses a deterministic `studio/story/*` branch from the requested base revision;
2. writes the validated `story.json` only to that proposal branch;
3. creates an auditable Git commit;
4. creates or updates a PR whose base is `main`;
5. returns and stores branch, commit, PR number/URL, validation evidence, and proposal status.

There is no API path that writes canonical content directly to `main`, and the adapter contains no merge call. Acceptance remains ordinary repository review/CI/merge.

## Proposal state model

Reusable authoring/proposal UI state is exported separately from content lifecycle:

`clean -> edited -> validating -> validation-failed | stale | proposal-creating -> pr-open | checks-pending | checks-failed -> merged | closed | superseded | failed`

The persisted registry statuses are the server-observable subset: `VALIDATING`, `VALIDATION_FAILED`, `STALE`, `PR_OPEN`, `CHECKS_PENDING`, `CHECKS_FAILED`, `MERGED`, `CLOSED`, `SUPERSEDED`, and `FAILED`.

A status read may refresh the referenced PR/check state from GitHub and append a new observation event when the state changes.

## Audit/history

`studio_registry.canonical_change_proposals` stores the request identity and current proposal result metadata. `studio_registry.canonical_change_proposal_events` is append-only and records creation, stale/validation/provider failures, PR creation, and observed status changes.

These records refer to the Git-owned semantic ID/path but do not require a duplicate `content_entities` row. This preserves the boundary that registry workflow metadata does not become a second canonical copy of story content.

Both tables and all proposal RPCs are private to the trusted service boundary; anon/authenticated roles receive no direct table/RPC access.

## Deployment requirements

The `studio-canonical-change` Edge Function requires the standard Supabase function environment plus a server-side `STUDIO_GITHUB_TOKEN` with the minimum repository permissions needed to read contents/status and create/update branches, commits, and pull requests in `drakeshard/fantasia`.

The token is not committed to Git and must be collected/stored as a Supabase Edge Function secret. JWT verification remains enabled for the function.

If the Git provider credential is absent, the service returns `503` and performs no Git operation. Do not replace this with a browser token or embed a credential in source.

## Non-goals

GAME-STUDIO04 does not provide:

- arbitrary file/path editing;
- generic JSON patching;
- direct writes or force pushes to `main`;
- automatic PR merge;
- Layer-4 approve/freeze behavior;
- Drive document mutation;
- runtime asset processing/publishing;
- Foundation, RPG, or Tactical contract changes;
- retirement of the legacy Story Studio.
