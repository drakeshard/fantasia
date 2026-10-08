# Cloudflare deployment

Fantasia deploys the built web application as **Cloudflare Workers Static Assets**. The repository does not deploy automatically when `main` changes. Deployment is an explicit manual action.

## Repository deployment shape

- Cloudflare config: `wrangler.jsonc`
- Worker name: `drakeshard-fantasia`
- static asset source: `apps/web/dist`
- SPA fallback: `single-page-application`
- deployment CLI: exact `wrangler@4.148.0`
- GitHub workflow: `Deploy Cloudflare`
- workflow trigger: manual `workflow_dispatch` only

The deployment workflow first rebuilds the exact pinned RPG/Tactical artifacts, verifies their provenance, installs the Fantasia workspace with the frozen lockfile, and builds the repository before invoking Wrangler.

## One-time Cloudflare setup

1. Sign in to the Cloudflare dashboard and select the account that will own Fantasia.
2. Copy that account's **Account ID**.
3. Create a Cloudflare API token with permission to edit Workers for only that account. Keep the token scope as narrow as practical.
4. In GitHub, open the private `drakeshard/fantasia` repository and go to **Settings → Secrets and variables → Actions**.
5. Add these repository secrets:
   - `CLOUDFLARE_ACCOUNT_ID` — the Cloudflare account ID.
   - `CLOUDFLARE_API_TOKEN` — the narrowly scoped Workers API token.

Never commit either value to the repository.

## Deploy from GitHub

After the two secrets exist:

1. Open **Actions** in `drakeshard/fantasia`.
2. Select **Deploy Cloudflare**.
3. Choose **Run workflow** on `main`.
4. Review the workflow log. Wrangler prints the deployed Worker/version and the resulting `workers.dev` target when deployment succeeds.

The first successful deployment creates or updates the Worker named `drakeshard-fantasia`. A custom domain can be attached later without changing the game-domain architecture.

## Deploy from a local checkout

Use the repository's pinned Node/pnpm toolchain, then authenticate Wrangler interactively:

```sh
corepack enable
node scripts/prepare-shared-packages.mjs
node scripts/verify-shared-packages.mjs
pnpm install --frozen-lockfile
pnpm build
pnpm dlx wrangler@4.148.0 login
pnpm dlx wrangler@4.148.0 deploy --config wrangler.jsonc
```

`wrangler login` is for a developer's local interactive session. GitHub Actions uses `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` instead.

## Current non-goals

This path does not select a production renderer, add Worker backend/API logic, configure a custom domain, configure Cloudflare Access, or enable automatic deploy-on-main. Those decisions should be added only when the production game needs them.
