import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const migrationsDir = path.join(root, "supabase", "migrations");
const allMigrationNames = await readdir(migrationsDir);
const foundationMigrationNames = allMigrationNames.filter((name) =>
  name.endsWith("_game_studio01_registry_foundation.sql"),
);
const studioMigrationNames = allMigrationNames
  .filter((name) => name.includes("_game_studio01_") && name.endsWith(".sql"))
  .sort();
const assetOperationMigrationNames = allMigrationNames.filter((name) =>
  name.endsWith("_game_studio10_asset_source_operations.sql"),
);

if (foundationMigrationNames.length !== 1) {
  throw new Error(
    `Expected exactly one GAME-STUDIO01 registry foundation migration, found ${foundationMigrationNames.length}.`,
  );
}
if (assetOperationMigrationNames.length !== 1) {
  throw new Error(
    `Expected exactly one GAME-STUDIO10 asset operation migration, found ${assetOperationMigrationNames.length}.`,
  );
}

const foundationSql = await readFile(path.join(migrationsDir, foundationMigrationNames[0]), "utf8");
const assetOperationSql = await readFile(
  path.join(migrationsDir, assetOperationMigrationNames[0]),
  "utf8",
);
const sql = (
  await Promise.all(
    studioMigrationNames.map((name) => readFile(path.join(migrationsDir, name), "utf8")),
  )
).join("\n");

function requireText(fragment, message, source = sql) {
  if (!source.includes(fragment)) {
    throw new Error(message ?? `Missing required registry contract fragment: ${fragment}`);
  }
}

function forbid(pattern, message, source = sql) {
  if (pattern.test(source)) {
    throw new Error(message);
  }
}

const tables = [
  "content_entities",
  "assets",
  "asset_versions",
  "entity_relations",
  "asset_relations",
  "runtime_derivatives",
  "validation_results",
  "change_events",
];

requireText(
  "create schema if not exists studio_registry;",
  "Registry must use the isolated studio_registry schema.",
  foundationSql,
);
for (const table of tables) {
  requireText(
    `create table studio_registry.${table}`,
    `Missing Layer 2B registry table: ${table}.`,
    foundationSql,
  );
  requireText(
    `alter table studio_registry.${table} enable row level security;`,
    `RLS must be enabled on studio_registry.${table}.`,
    foundationSql,
  );
}

const lifecycle = [
  "WORKING",
  "CANDIDATE",
  "IN REVIEW",
  "APPROVED",
  "FROZEN",
  "RUNTIME READY",
  "PUBLISHED",
  "RETIRED",
];
const lifecycleBlock = foundationSql.match(
  /create type studio_registry\.lifecycle_state as enum \(([\s\S]*?)\);/,
)?.[1];
if (!lifecycleBlock) {
  throw new Error("Missing studio_registry.lifecycle_state enum.");
}
const enumValues = [...lifecycleBlock.matchAll(/'([^']+)'/g)].map((match) => match[1]);
if (JSON.stringify(enumValues) !== JSON.stringify(lifecycle)) {
  throw new Error(
    `Lifecycle enum must exactly match frozen order. Got: ${enumValues.join(" -> ")}`,
  );
}

const readinessDimensions = [
  "Source Valid",
  "Metadata Complete",
  "Visual Approved",
  "Relations Valid",
  "Runtime Derivatives Valid",
  "Ready for Runtime",
  "Runtime Verified",
  "Published",
];
for (const dimension of readinessDimensions) {
  requireText(`'${dimension}'`, `Missing frozen readiness dimension: ${dimension}.`, foundationSql);
}

requireText(
  "foreign key (current_version_id, semantic_id)",
  "Asset current-version ownership must be enforced with a composite foreign key.",
  foundationSql,
);
requireText(
  "references studio_registry.asset_versions(id, asset_id)",
  "Asset/version ownership must reference the exact owning asset.",
  foundationSql,
);
requireText(
  "foreign key (source_asset_version_id, asset_id)",
  "Runtime derivative provenance must be bound to the exact source asset version.",
  foundationSql,
);
requireText(
  "create index assets_current_version_owner_idx",
  "Asset current-version ownership foreign key must have a covering index.",
);
requireText(
  "on studio_registry.assets (current_version_id, semantic_id)",
  "Asset current-version covering index must preserve foreign-key column order.",
);
requireText(
  "create index runtime_derivatives_source_owner_idx",
  "Runtime derivative provenance foreign key must have a covering index.",
);
requireText(
  "on studio_registry.runtime_derivatives (source_asset_version_id, asset_id)",
  "Runtime derivative provenance index must preserve foreign-key column order.",
);
requireText(
  "num_nonnulls(entity_id, asset_id, asset_version_id, runtime_derivative_id) = 1",
  "Validation and audit records must target exactly one registry subject.",
  foundationSql,
);
requireText(
  "create trigger validation_results_append_only",
  "Validation history must be append-only.",
  foundationSql,
);
requireText(
  "create trigger change_events_append_only",
  "Change-event history must be append-only.",
  foundationSql,
);
requireText(
  "revoke all on schema studio_registry from public, anon, authenticated;",
  "Browser roles must not receive direct schema access in STUDIO01.",
  foundationSql,
);
requireText(
  "revoke all on all tables in schema studio_registry from public, anon, authenticated, service_role;",
  "Registry table grants must start from explicit least privilege.",
  foundationSql,
);
requireText(
  "grant select, insert, update, delete on all tables in schema studio_registry to service_role;",
  "Only the trusted service role should receive direct registry DML in STUDIO01.",
  foundationSql,
);
requireText(
  "revoke update, delete on table studio_registry.validation_results from service_role;",
  "Validation evidence must remain append-only for the trusted application path.",
  foundationSql,
);
requireText(
  "revoke update, delete on table studio_registry.change_events from service_role;",
  "Change events must remain append-only for the trusted application path.",
  foundationSql,
);

forbid(
  /grant\s+[^;]+\s+to\s+(anon|authenticated)\b/i,
  "GAME-STUDIO01 must not grant direct registry privileges to anon/authenticated browser roles.",
);
forbid(
  /references\s+(public\.accounts|auth\.users|public\.account_)/i,
  "Studio registry identity must remain separate from player/Auth identity.",
);
forbid(
  /config\/runtime-assets\.json/i,
  "Registry migration must not mutate or embed the Git-owned runtime manifest.",
);
forbid(
  /\bready\s+boolean\b/i,
  "Registry readiness must derive from validation evidence, not a ready boolean.",
);

requireText(
  "create trigger asset_versions_source_immutable",
  "GAME-STUDIO10 must make registered source/version provenance immutable.",
  assetOperationSql,
);
for (const protectedColumn of [
  "new.asset_id is distinct from old.asset_id",
  "new.version_number is distinct from old.version_number",
  "new.provider_kind is distinct from old.provider_kind",
  "new.provider_ref is distinct from old.provider_ref",
  "new.media_type is distinct from old.media_type",
  "new.checksum is distinct from old.checksum",
]) {
  requireText(
    protectedColumn,
    `GAME-STUDIO10 source immutability is missing ${protectedColumn}.`,
    assetOperationSql,
  );
}
requireText(
  "create or replace function public.execute_studio_asset_source_register_command",
  "GAME-STUDIO10 must expose the trusted asset source registration operation.",
  assetOperationSql,
);
requireText(
  "if v_provider_kind <> 'google-drive' then",
  "GAME-STUDIO10 must preserve Google Drive as current source/master authority.",
  assetOperationSql,
);
requireText(
  "insert into studio_registry.asset_versions",
  "Asset replacement must create a retained asset_version row.",
  assetOperationSql,
);
requireText(
  "set current_version_id = v_new_version_id",
  "Asset replacement must move the current pointer only after the new version exists.",
  assetOperationSql,
);
requireText(
  "'Source Valid'",
  "Source registration must record Source Valid evidence.",
  assetOperationSql,
);
requireText(
  "'Metadata Complete'",
  "Source registration must record Metadata Complete evidence.",
  assetOperationSql,
);
requireText(
  "where version.id = p_version_id\n    and version.asset_id = v_asset_semantic_id",
  "Retained-version selection must prove the selected version belongs to the semantic asset.",
  assetOperationSql,
);
requireText(
  "'reason', 'retained-version-selection'",
  "Retained-version selection must be explicitly auditable.",
  assetOperationSql,
);
requireText(
  "create or replace function public.execute_studio_asset_relation_set_command",
  "GAME-STUDIO10 must use semantic asset relations through the trusted registry operation.",
  assetOperationSql,
);
requireText(
  "from public, anon, authenticated;",
  "GAME-STUDIO10 trusted RPCs must be revoked from browser database roles.",
  assetOperationSql,
);
forbid(
  /grant\s+execute\s+on\s+function[\s\S]*?\s+to\s+(anon|authenticated)\b/i,
  "GAME-STUDIO10 must not grant trusted asset RPC execution directly to browser roles.",
  assetOperationSql,
);
forbid(
  /insert\s+into\s+studio_registry\.runtime_derivatives/i,
  "GAME-STUDIO10 must not create runtime derivatives.",
  assetOperationSql,
);
forbid(
  /\b('APPROVED'|'FROZEN'|'RUNTIME READY'|'PUBLISHED')\b/i,
  "GAME-STUDIO10 source operations must not grant approval, freeze, runtime-ready, or published lifecycle states.",
  assetOperationSql,
);
forbid(
  /config\/runtime-assets\.json/i,
  "GAME-STUDIO10 must not mutate or embed the Git-owned runtime manifest.",
  assetOperationSql,
);

console.log(
  `Studio registry contract check passed (${studioMigrationNames.join(", ")}; ${assetOperationMigrationNames[0]}).`,
);
