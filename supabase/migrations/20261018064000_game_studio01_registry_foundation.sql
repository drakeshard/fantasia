create schema if not exists studio_registry;

revoke all on schema studio_registry from public, anon, authenticated;
grant usage on schema studio_registry to service_role;

create type studio_registry.lifecycle_state as enum (
  'WORKING',
  'CANDIDATE',
  'IN REVIEW',
  'APPROVED',
  'FROZEN',
  'RUNTIME READY',
  'PUBLISHED',
  'RETIRED'
);

create type studio_registry.validation_dimension as enum (
  'Source Valid',
  'Metadata Complete',
  'Visual Approved',
  'Relations Valid',
  'Runtime Derivatives Valid',
  'Ready for Runtime',
  'Runtime Verified',
  'Published'
);

create table studio_registry.content_entities (
  semantic_id text primary key,
  entity_type text not null,
  display_label text,
  canonical_git_path text,
  schema_version integer not null default 1 check (schema_version >= 1),
  lifecycle studio_registry.lifecycle_state not null default 'WORKING',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint content_entities_semantic_id_valid check (
    char_length(semantic_id) between 1 and 200
    and semantic_id = btrim(semantic_id)
    and semantic_id !~ '[[:space:]]'
  ),
  constraint content_entities_entity_type_valid check (
    char_length(entity_type) between 1 and 80
    and entity_type = btrim(entity_type)
  ),
  constraint content_entities_display_label_valid check (
    display_label is null
    or (char_length(display_label) between 1 and 240 and display_label = btrim(display_label))
  ),
  constraint content_entities_git_path_valid check (
    canonical_git_path is null
    or (char_length(canonical_git_path) between 1 and 512 and canonical_git_path = btrim(canonical_git_path))
  ),
  constraint content_entities_metadata_object check (jsonb_typeof(metadata) = 'object')
);

create table studio_registry.assets (
  semantic_id text primary key,
  owning_entity_id text not null references studio_registry.content_entities(semantic_id) on delete restrict,
  role text not null,
  variant text,
  current_version_id uuid,
  derivative_required boolean not null default false,
  schema_version integer not null default 1 check (schema_version >= 1),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint assets_semantic_id_valid check (
    char_length(semantic_id) between 1 and 240
    and semantic_id = btrim(semantic_id)
    and semantic_id !~ '[[:space:]]'
  ),
  constraint assets_role_valid check (
    char_length(role) between 1 and 100
    and role = btrim(role)
  ),
  constraint assets_variant_valid check (
    variant is null
    or (char_length(variant) between 1 and 120 and variant = btrim(variant))
  ),
  constraint assets_metadata_object check (jsonb_typeof(metadata) = 'object')
);

create table studio_registry.asset_versions (
  id uuid primary key default gen_random_uuid(),
  asset_id text not null references studio_registry.assets(semantic_id) on delete restrict,
  version_number integer not null check (version_number >= 1),
  lifecycle studio_registry.lifecycle_state not null default 'WORKING',
  provider_kind text not null,
  provider_ref text not null,
  media_type text not null,
  width_px integer check (width_px is null or width_px >= 1),
  height_px integer check (height_px is null or height_px >= 1),
  byte_size bigint not null check (byte_size >= 1),
  checksum_algorithm text not null,
  checksum text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint asset_versions_asset_version_unique unique (asset_id, version_number),
  constraint asset_versions_id_asset_unique unique (id, asset_id),
  constraint asset_versions_provider_kind_valid check (
    char_length(provider_kind) between 1 and 80
    and provider_kind = btrim(provider_kind)
  ),
  constraint asset_versions_provider_ref_valid check (
    char_length(provider_ref) between 1 and 1024
    and provider_ref = btrim(provider_ref)
  ),
  constraint asset_versions_media_type_valid check (
    char_length(media_type) between 1 and 160
    and media_type = btrim(media_type)
  ),
  constraint asset_versions_dimensions_pair check (
    (width_px is null and height_px is null)
    or (width_px is not null and height_px is not null)
  ),
  constraint asset_versions_checksum_algorithm_valid check (
    char_length(checksum_algorithm) between 1 and 40
    and checksum_algorithm = btrim(checksum_algorithm)
  ),
  constraint asset_versions_checksum_valid check (
    char_length(checksum) between 1 and 256
    and checksum = btrim(checksum)
  ),
  constraint asset_versions_metadata_object check (jsonb_typeof(metadata) = 'object')
);

alter table studio_registry.assets
add constraint assets_current_version_owned_by_asset_fk
foreign key (current_version_id, semantic_id)
references studio_registry.asset_versions(id, asset_id)
deferrable initially immediate;

create table studio_registry.entity_relations (
  id uuid primary key default gen_random_uuid(),
  source_entity_id text not null references studio_registry.content_entities(semantic_id) on delete restrict,
  relation_type text not null,
  target_entity_id text not null references studio_registry.content_entities(semantic_id) on delete restrict,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint entity_relations_unique unique (source_entity_id, relation_type, target_entity_id),
  constraint entity_relations_type_valid check (
    char_length(relation_type) between 1 and 120
    and relation_type = btrim(relation_type)
  ),
  constraint entity_relations_metadata_object check (jsonb_typeof(metadata) = 'object')
);

create table studio_registry.asset_relations (
  id uuid primary key default gen_random_uuid(),
  source_asset_id text not null references studio_registry.assets(semantic_id) on delete restrict,
  relation_type text not null,
  target_asset_id text not null references studio_registry.assets(semantic_id) on delete restrict,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint asset_relations_unique unique (source_asset_id, relation_type, target_asset_id),
  constraint asset_relations_type_valid check (
    char_length(relation_type) between 1 and 120
    and relation_type = btrim(relation_type)
  ),
  constraint asset_relations_metadata_object check (jsonb_typeof(metadata) = 'object')
);

create table studio_registry.runtime_derivatives (
  semantic_id text primary key,
  asset_id text not null references studio_registry.assets(semantic_id) on delete restrict,
  source_asset_version_id uuid not null,
  processing_profile text not null,
  processing_profile_version integer not null check (processing_profile_version >= 1),
  media_type text not null,
  output_format text not null,
  width_px integer check (width_px is null or width_px >= 1),
  height_px integer check (height_px is null or height_px >= 1),
  byte_size bigint not null check (byte_size >= 1),
  checksum_algorithm text not null,
  checksum text not null,
  runtime_path text,
  provider_kind text,
  provider_ref text,
  technical_state text not null default 'UNVERIFIED',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint runtime_derivatives_source_owned_by_asset_fk
    foreign key (source_asset_version_id, asset_id)
    references studio_registry.asset_versions(id, asset_id)
    on delete restrict,
  constraint runtime_derivatives_semantic_id_valid check (
    char_length(semantic_id) between 1 and 280
    and semantic_id = btrim(semantic_id)
    and semantic_id !~ '[[:space:]]'
  ),
  constraint runtime_derivatives_profile_valid check (
    char_length(processing_profile) between 1 and 160
    and processing_profile = btrim(processing_profile)
  ),
  constraint runtime_derivatives_media_type_valid check (
    char_length(media_type) between 1 and 160
    and media_type = btrim(media_type)
  ),
  constraint runtime_derivatives_format_valid check (
    char_length(output_format) between 1 and 80
    and output_format = btrim(output_format)
  ),
  constraint runtime_derivatives_dimensions_pair check (
    (width_px is null and height_px is null)
    or (width_px is not null and height_px is not null)
  ),
  constraint runtime_derivatives_checksum_algorithm_valid check (
    char_length(checksum_algorithm) between 1 and 40
    and checksum_algorithm = btrim(checksum_algorithm)
  ),
  constraint runtime_derivatives_checksum_valid check (
    char_length(checksum) between 1 and 256
    and checksum = btrim(checksum)
  ),
  constraint runtime_derivatives_runtime_path_valid check (
    runtime_path is null
    or (char_length(runtime_path) between 1 and 1024 and runtime_path = btrim(runtime_path))
  ),
  constraint runtime_derivatives_provider_pair check (
    (provider_kind is null and provider_ref is null)
    or (provider_kind is not null and provider_ref is not null)
  ),
  constraint runtime_derivatives_provider_kind_valid check (
    provider_kind is null
    or (char_length(provider_kind) between 1 and 80 and provider_kind = btrim(provider_kind))
  ),
  constraint runtime_derivatives_provider_ref_valid check (
    provider_ref is null
    or (char_length(provider_ref) between 1 and 1024 and provider_ref = btrim(provider_ref))
  ),
  constraint runtime_derivatives_technical_state_valid check (
    char_length(technical_state) between 1 and 80
    and technical_state = btrim(technical_state)
  ),
  constraint runtime_derivatives_metadata_object check (jsonb_typeof(metadata) = 'object')
);

create table studio_registry.validation_results (
  id uuid primary key default gen_random_uuid(),
  entity_id text references studio_registry.content_entities(semantic_id) on delete restrict,
  asset_id text references studio_registry.assets(semantic_id) on delete restrict,
  asset_version_id uuid references studio_registry.asset_versions(id) on delete restrict,
  runtime_derivative_id text references studio_registry.runtime_derivatives(semantic_id) on delete restrict,
  dimension studio_registry.validation_dimension not null,
  outcome text not null,
  is_blocking boolean not null default false,
  validator_key text not null,
  evidence jsonb not null default '{}'::jsonb,
  checked_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint validation_results_one_subject check (
    num_nonnulls(entity_id, asset_id, asset_version_id, runtime_derivative_id) = 1
  ),
  constraint validation_results_outcome_valid check (
    outcome in ('PASSED', 'WARNING', 'FAILED', 'UNKNOWN')
  ),
  constraint validation_results_validator_key_valid check (
    char_length(validator_key) between 1 and 160
    and validator_key = btrim(validator_key)
  ),
  constraint validation_results_evidence_object check (jsonb_typeof(evidence) = 'object')
);

create table studio_registry.change_events (
  id uuid primary key default gen_random_uuid(),
  entity_id text references studio_registry.content_entities(semantic_id) on delete restrict,
  asset_id text references studio_registry.assets(semantic_id) on delete restrict,
  asset_version_id uuid references studio_registry.asset_versions(id) on delete restrict,
  runtime_derivative_id text references studio_registry.runtime_derivatives(semantic_id) on delete restrict,
  event_type text not null,
  source_kind text,
  source_ref text,
  actor_kind text,
  actor_ref text,
  before_state jsonb,
  after_state jsonb,
  context jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint change_events_one_subject check (
    num_nonnulls(entity_id, asset_id, asset_version_id, runtime_derivative_id) = 1
  ),
  constraint change_events_event_type_valid check (
    char_length(event_type) between 1 and 160
    and event_type = btrim(event_type)
  ),
  constraint change_events_source_kind_valid check (
    source_kind is null
    or (char_length(source_kind) between 1 and 80 and source_kind = btrim(source_kind))
  ),
  constraint change_events_source_ref_valid check (
    source_ref is null
    or (char_length(source_ref) between 1 and 512 and source_ref = btrim(source_ref))
  ),
  constraint change_events_actor_kind_valid check (
    actor_kind is null
    or (char_length(actor_kind) between 1 and 80 and actor_kind = btrim(actor_kind))
  ),
  constraint change_events_actor_ref_valid check (
    actor_ref is null
    or (char_length(actor_ref) between 1 and 256 and actor_ref = btrim(actor_ref))
  ),
  constraint change_events_before_state_object check (
    before_state is null or jsonb_typeof(before_state) = 'object'
  ),
  constraint change_events_after_state_object check (
    after_state is null or jsonb_typeof(after_state) = 'object'
  ),
  constraint change_events_context_object check (jsonb_typeof(context) = 'object')
);

create index content_entities_type_lifecycle_idx
on studio_registry.content_entities (entity_type, lifecycle);
create index assets_owner_role_idx
on studio_registry.assets (owning_entity_id, role);
create index asset_versions_asset_version_idx
on studio_registry.asset_versions (asset_id, version_number desc);
create index asset_versions_lifecycle_idx
on studio_registry.asset_versions (lifecycle);
create index entity_relations_target_idx
on studio_registry.entity_relations (target_entity_id, relation_type);
create index asset_relations_target_idx
on studio_registry.asset_relations (target_asset_id, relation_type);
create index runtime_derivatives_source_idx
on studio_registry.runtime_derivatives (source_asset_version_id);
create index runtime_derivatives_asset_idx
on studio_registry.runtime_derivatives (asset_id);
create index validation_results_entity_idx
on studio_registry.validation_results (entity_id, dimension, checked_at desc)
where entity_id is not null;
create index validation_results_asset_idx
on studio_registry.validation_results (asset_id, dimension, checked_at desc)
where asset_id is not null;
create index validation_results_asset_version_idx
on studio_registry.validation_results (asset_version_id, dimension, checked_at desc)
where asset_version_id is not null;
create index validation_results_derivative_idx
on studio_registry.validation_results (runtime_derivative_id, dimension, checked_at desc)
where runtime_derivative_id is not null;
create index change_events_entity_idx
on studio_registry.change_events (entity_id, occurred_at desc)
where entity_id is not null;
create index change_events_asset_idx
on studio_registry.change_events (asset_id, occurred_at desc)
where asset_id is not null;
create index change_events_asset_version_idx
on studio_registry.change_events (asset_version_id, occurred_at desc)
where asset_version_id is not null;
create index change_events_derivative_idx
on studio_registry.change_events (runtime_derivative_id, occurred_at desc)
where runtime_derivative_id is not null;

create or replace function studio_registry.touch_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create or replace function studio_registry.reject_history_mutation()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  raise exception '% is append-only; create a new history record instead', tg_table_name
    using errcode = '55000';
end;
$$;

create trigger content_entities_touch_updated_at
before update on studio_registry.content_entities
for each row execute function studio_registry.touch_updated_at();
create trigger assets_touch_updated_at
before update on studio_registry.assets
for each row execute function studio_registry.touch_updated_at();
create trigger asset_versions_touch_updated_at
before update on studio_registry.asset_versions
for each row execute function studio_registry.touch_updated_at();
create trigger entity_relations_touch_updated_at
before update on studio_registry.entity_relations
for each row execute function studio_registry.touch_updated_at();
create trigger asset_relations_touch_updated_at
before update on studio_registry.asset_relations
for each row execute function studio_registry.touch_updated_at();
create trigger runtime_derivatives_touch_updated_at
before update on studio_registry.runtime_derivatives
for each row execute function studio_registry.touch_updated_at();

create trigger validation_results_append_only
before update or delete on studio_registry.validation_results
for each row execute function studio_registry.reject_history_mutation();
create trigger change_events_append_only
before update or delete on studio_registry.change_events
for each row execute function studio_registry.reject_history_mutation();

alter table studio_registry.content_entities enable row level security;
alter table studio_registry.assets enable row level security;
alter table studio_registry.asset_versions enable row level security;
alter table studio_registry.entity_relations enable row level security;
alter table studio_registry.asset_relations enable row level security;
alter table studio_registry.runtime_derivatives enable row level security;
alter table studio_registry.validation_results enable row level security;
alter table studio_registry.change_events enable row level security;

revoke all on all tables in schema studio_registry from public, anon, authenticated, service_role;
grant select, insert, update, delete on all tables in schema studio_registry to service_role;
revoke update, delete on table studio_registry.validation_results from service_role;
revoke update, delete on table studio_registry.change_events from service_role;

revoke all on function studio_registry.touch_updated_at() from public, anon, authenticated, service_role;
revoke all on function studio_registry.reject_history_mutation() from public, anon, authenticated, service_role;
grant execute on function studio_registry.touch_updated_at() to service_role;
grant execute on function studio_registry.reject_history_mutation() to service_role;
