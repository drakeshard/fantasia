# Content Studio registry verification commands

Repository contract guard:

```sh
pnpm check:studio-registry
```

Normal repository gate includes the registry guard through:

```sh
pnpm check
pnpm verify
```

Hosted verification must additionally confirm migration presence, exact lifecycle ordering, all eight registry tables, RLS/grants, composite ownership/provenance foreign keys, append-only validation/audit history, and Supabase advisor results. Do not seed invented production content to prove the schema; use transaction-local fixtures and roll them back.
