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

if (foundationMigrationNames.length !== 1) {
  throw new Error(
    `Expected exactly one GAME-STUDIO01 registry foundation migration, found ${foundationMigrationNames.length}.`,
  );
}

const foundationSql = await readFile(path.join(migrationsDir, foundationMigrationNames[0]), "utf8");
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

function forbid(pattern, message) {
  if (pattern.test(sql)) {
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

console.log(`Studio registry contract check passed (${studioMigrationNames.join(", ")}).`);
