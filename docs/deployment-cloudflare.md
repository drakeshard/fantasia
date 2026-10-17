# Cloudflare deployment

Fantasia uses **Cloudflare Workers Static Assets** for its browser surfaces. Repository merges do not deploy automatically; publication remains an explicit manual workflow action.

## Deployment targets

### Player game

- Cloudflare config: `wrangler.jsonc`
- Worker name: `drakeshard-fantasia`
- static asset source: `apps/web/dist`
- GitHub workflow: `Deploy Cloudflare`
- workflow trigger: manual `workflow_dispatch` only

The player deployment prepares and verifies the pinned RPG/Tactical artifacts, performs a frozen workspace install, builds the repository, and deploys with exact `wrangler@4.148.0`. Its Vite build also receives the configured public Supabase project URL/publishable key repository variables.

### Unified Content Studio

- Cloudflare config: `wrangler.content-studio.jsonc`
- Worker name: `drakeshard-fantasia-content-studio`
- static asset source: `apps/content-studio/dist`
- SPA fallback: `single-page-application`
- GitHub workflow: `Deploy Content Studio`
- workflow trigger: manual `workflow_dispatch` only
- deployment CLI: exact `wrangler@4.148.0`

The Content Studio deployment prepares and verifies the same pinned shared-library artifacts required by the repository's frozen install, performs `pnpm install --frozen-lockfile`, verifies the repository deployment contract, builds `@fantasia/content-studio`, checks for `apps/content-studio/dist/index.html`, and deploys only the dedicated Content Studio Worker.

The deployed Content Studio is initially the shared 00A–00D foundation/UI Lab. A successful deployment does **not** imply that Studio authentication, registry/provider operations, canonical mutation, Dashboard data, Story migration, or other production workspaces are complete.

### Legacy Story Studio

- Cloudflare config: `wrangler.story-studio.jsonc`
- Worker name: `drakeshard-fantasia-story-studio`
- static asset source: `apps/story-studio/dist`
- GitHub workflow: `Deploy Story Studio`
- workflow trigger: manual `workflow_dispatch` only

Story Studio is a temporary narrative-production fallback/rollback surface while its required capabilities are migrated into the unified Content Studio. Keep this deployment operational until the Story cutover gate is accepted.

## Shared Cloudflare credentials

The three workflows reuse the repository Actions secrets:

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`

Use a token scoped as narrowly as practical for the account's Worker deployment operations. Never commit either value or expose them to browser code.

## Deploy from GitHub

1. Open **Actions** in private repository `drakeshard/fantasia`.
2. Select the exact target workflow: **Deploy Cloudflare**, **Deploy Content Studio**, or **Deploy Story Studio**.
3. Choose **Run workflow** on `main`.
4. Review the workflow log and resulting Wrangler deployment evidence before treating that revision as live.

Repository merge alone is not deployment evidence.

## Content Studio Story cutover / retirement gate

Do not remove `apps/story-studio`, its workflow, or its Wrangler configuration merely because Content Studio is deployable. Story Studio may be retired only after all applicable gates are satisfied:

1. Content Studio has a working hosted deployment.
2. Real Studio authentication and role enforcement are operational before the unified Studio becomes the sole long-term internal production tool.
3. `content/narrative/story.json` remains canonical Story authority; migration does not fork the story source merely to fit the new UI.
4. The Content Studio Story workspace reaches accepted parity for required production capabilities, including relevant navigation, exact script review, beat/timeline inspection, scene/staging review, voice/cast scaffolding, asset references, inspector behavior, JSON/read-model inspection, and preview/player flow where still required.
5. Story functionality uses the shared Content Studio shell and lifecycle/version/review/readiness semantics rather than preserving a second product architecture.
6. Story migration passes normal Quality/browser coverage and hosted owner acceptance.
7. The old Story Studio deployment remains available during cutover as a rollback path.
8. A later focused retirement issue removes `apps/story-studio`, `.github/workflows/deploy-story-studio.yml`, `wrangler.story-studio.jsonc`, and obsolete Story-only implementation/tests only after accepted cutover.
9. Decommissioning the old Cloudflare Worker is an explicit post-cutover action; file removal alone does not authorize it.
10. Controlled Fantasia documentation is reconciled during retirement so Story Studio is no longer named as the active narrative viewer.

## Local deployment

Use the repository's pinned Node/pnpm toolchain, authenticate Wrangler interactively, and deploy only the intended target. For example, Content Studio:

```sh
corepack enable
node scripts/prepare-shared-packages.mjs
node scripts/verify-shared-packages.mjs
pnpm install --frozen-lockfile
pnpm check:content-studio-deployment
pnpm --filter @fantasia/content-studio build
test -f apps/content-studio/dist/index.html
pnpm dlx wrangler@4.148.0 login
pnpm dlx wrangler@4.148.0 deploy --config wrangler.content-studio.jsonc
```

`wrangler login` is for a developer's local interactive session. GitHub Actions uses the repository Cloudflare secrets instead.

## Current non-goals

These deployment paths do not by themselves add Worker backend/API logic, configure a custom domain, configure Cloudflare Access, enable automatic deploy-on-main, change gameplay/shared-library authority, or authorize premature Story Studio deletion. Add those decisions only through their own approved implementation work.
