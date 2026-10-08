# Cloudflare deployment

Fantasia's current browser build is a static Vite SPA. Deployment uses **Cloudflare Workers Static Assets** so the playtest can be hosted without choosing the final game renderer or adding server authority.

## Cloudflare Git integration (recommended)

1. In the Cloudflare dashboard, create a Workers application by importing an existing Git repository and connect the private `drakeshard/fantasia` repository through Cloudflare's GitHub integration.
2. Keep the repository root as the build root.
3. Set the production branch to `main`.
4. Configure the build command exactly as:

```sh
corepack enable && node scripts/prepare-shared-packages.mjs && node scripts/verify-shared-packages.mjs && pnpm install --frozen-lockfile && pnpm --filter @fantasia/web build
```

The shared-package preparation and provenance steps must run before the workspace install because the Fantasia lockfile intentionally consumes exact generated RPG/Tactical tarballs.

5. Configure the deploy command as:

```sh
npx --yes wrangler@4.148.0 deploy
```

6. Use Node `24.21.0` for the build environment. The repository's package manager is pnpm `12.8.1` through Corepack.
7. Save the integration. Pull requests can use Cloudflare preview deployments; pushes to `main` are the production deployment path.

The root `wrangler.jsonc` points Workers Static Assets at `apps/web/dist` and enables SPA fallback to `index.html`.

Cloudflare will assign a `workers.dev` hostname after the first successful deployment. A custom domain can be attached later in the Worker settings without changing Fantasia's authoritative game code.

## Manual deploy from a developer machine

Authenticate once:

```sh
npx --yes wrangler@4.148.0 login
```

Then, from the repository root:

```sh
corepack enable
node scripts/prepare-shared-packages.mjs
node scripts/verify-shared-packages.mjs
pnpm install --frozen-lockfile
pnpm --filter @fantasia/web build
npx --yes wrangler@4.148.0 deploy
```

No Cloudflare account ID, API token, domain credential, or GitHub token belongs in the repository.

## What this deployment is

- a static playtest/presentation deployment;
- backed by the same deterministic Fantasia domain/runtime code tested in CI;
- safe to replace later with the GAME-I08 production renderer while preserving the domain boundary.

It is **not** a backend authority, multiplayer host, final renderer commitment, or public-source release.
