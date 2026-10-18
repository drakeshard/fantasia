create or replace function studio_registry.protect_asset_version_source_immutability()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.asset_id is distinct from old.asset_id
    or new.version_number is distinct from old.version_number
    or new.provider_kind is distinct from old.provider_kind
    or new.provider_ref is distinct from old.provider_ref
    or new.media_type is distinct from old.media_type
    or new.width_px is distinct from old.width_px
    or new.height_px is distinct from old.height_px
    or new.byte_size is distinct from old.byte_size
    or new.checksum_algorithm is distinct from old.checksum_algorithm
    or new.checksum is distinct from old.checksum
  then
    raise exception 'asset source/version provenance is immutable; create a new asset version instead'
      using errcode = '55000';
  end if;
  return new;
end;
$$;

create trigger asset_versions_source_immutable
before update on studio_registry.asset_versions
for each row execute function studio_registry.protect_asset_version_source_immutability();

create or replace function public.get_studio_operation_receipt(
  p_actor_user_id uuid,
  p_operation_name text,
  p_idempotency_key text
)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_response jsonb;
begin
  if p_actor_user_id is null then
    raise exception 'actor user id is required' using errcode = '22023';
  end if;
  if not studio_registry.has_capability(p_actor_user_id, 'studio.read') then
    raise exception 'studio capability denied' using errcode = '42501';
  end if;

  select receipt.response_json
  into v_response
  from studio_registry.operation_receipts as receipt
  where receipt.actor_user_id = p_actor_user_id
    and receipt.operation_name = btrim(p_operation_name)
    and receipt.idempotency_key = btrim(p_idempotency_key);

  if not found then
    return null;
  end if;
  return v_response;
end;
$$;

create or replace function public.get_studio_asset_version_source(
  p_actor_user_id uuid,
  p_version_id uuid
)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_version studio_registry.asset_versions%rowtype;
begin
  if p_actor_user_id is null or p_version_id is null then
    raise exception 'actor user id and version id are required' using errcode = '22023';
  end if;
  if not studio_registry.has_capability(p_actor_user_id, 'studio.read') then
    raise exception 'studio capability denied' using errcode = '42501';
  end if;

  select version.*
  into v_version
  from studio_registry.asset_versions as version
  where version.id = p_version_id;

  if not found then
    raise exception 'asset version not found' using errcode = 'P0002';
  end if;

  return jsonb_build_object(
    'assetId', v_version.asset_id,
    'versionId', v_version.id,
    'versionNumber', v_version.version_number,
    'providerKind', v_version.provider_kind,
    'providerRef', v_version.provider_ref,
    'mediaType', v_version.media_type,
    'byteSize', v_version.byte_size,
    'checksumAlgorithm', v_version.checksum_algorithm,
    'checksum', v_version.checksum,
    'sourceName', v_version.metadata ->> 'sourceName'
  );
end;
$$;

create or replace function public.execute_studio_asset_source_register_command(
  p_actor_user_id uuid,
  p_idempotency_key text,
  p_owner_semantic_id text,
  p_owner_entity_type text,
  p_owner_display_label text,
  p_owner_canonical_git_path text,
  p_asset_semantic_id text,
  p_role text,
  p_variant text,
  p_derivative_required boolean,
  p_provider_kind text,
  p_provider_ref text,
  p_source_name text,
  p_media_type text,
  p_width_px integer,
  p_height_px integer,
  p_byte_size bigint,
  p_checksum_algorithm text,
  p_checksum text,
  p_provider_observed_at timestamptz
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_operation constant text := 'registry.asset_source.register';
  v_idempotency_key text := btrim(p_idempotency_key);
  v_owner_semantic_id text := btrim(p_owner_semantic_id);
  v_owner_entity_type text := btrim(p_owner_entity_type);
  v_owner_display_label text := btrim(p_owner_display_label);
  v_owner_canonical_git_path text := btrim(p_owner_canonical_git_path);
  v_asset_semantic_id text := btrim(p_asset_semantic_id);
  v_role text := btrim(p_role);
  v_variant text := case when p_variant is null then null else nullif(btrim(p_variant), '') end;
  v_provider_kind text := btrim(p_provider_kind);
  v_provider_ref text := btrim(p_provider_ref);
  v_source_name text := btrim(p_source_name);
  v_media_type text := btrim(p_media_type);
  v_checksum_algorithm text := lower(btrim(p_checksum_algorithm));
  v_checksum text := lower(btrim(p_checksum));
  v_request jsonb;
  v_existing_request jsonb;
  v_existing_response jsonb;
  v_existing_owner studio_registry.content_entities%rowtype;
  v_existing_asset studio_registry.assets%rowtype;
  v_previous_current_id uuid;
  v_new_version_id uuid;
  v_new_version_number integer;
  v_response jsonb;
begin
  if p_actor_user_id is null then
    raise exception 'actor user id is required' using errcode = '22023';
  end if;
  if not studio_registry.has_capability(p_actor_user_id, 'registry.metadata.edit') then
    raise exception 'studio capability denied' using errcode = '42501';
  end if;
  if v_idempotency_key is null or char_length(v_idempotency_key) not between 8 and 128 then
    raise exception 'idempotency key must be 8 to 128 characters' using errcode = '22023';
  end if;
  if v_owner_semantic_id is null
    or char_length(v_owner_semantic_id) not between 1 and 200
    or v_owner_semantic_id ~ '[[:space:]]'
  then
    raise exception 'owner semantic id is invalid' using errcode = '22023';
  end if;
  if v_owner_entity_type is null or char_length(v_owner_entity_type) not between 1 and 80 then
    raise exception 'owner entity type is invalid' using errcode = '22023';
  end if;
  if v_owner_display_label is null or char_length(v_owner_display_label) not between 1 and 240 then
    raise exception 'owner display label is invalid' using errcode = '22023';
  end if;
  if v_owner_canonical_git_path is null or char_length(v_owner_canonical_git_path) not between 1 and 512 then
    raise exception 'owner canonical Git path is invalid' using errcode = '22023';
  end if;
  if v_asset_semantic_id is null
    or char_length(v_asset_semantic_id) not between 1 and 240
    or v_asset_semantic_id ~ '[[:space:]]'
  then
    raise exception 'asset semantic id is invalid' using errcode = '22023';
  end if;
  if v_role is null or char_length(v_role) not between 1 and 100 then
    raise exception 'asset role is invalid' using errcode = '22023';
  end if;
  if v_variant is not null and char_length(v_variant) > 120 then
    raise exception 'asset variant is invalid' using errcode = '22023';
  end if;
  if p_derivative_required is null then
    raise exception 'derivative-required flag is required' using errcode = '22023';
  end if;
  if v_provider_kind <> 'google-drive' then
    raise exception 'current source/master provider must be google-drive' using errcode = '22023';
  end if;
  if v_provider_ref is null or char_length(v_provider_ref) > 1024 then
    raise exception 'provider reference is invalid' using errcode = '22023';
  end if;
  if v_source_name is null or char_length(v_source_name) > 512 then
    raise exception 'source name is invalid' using errcode = '22023';
  end if;
  if v_media_type is null or char_length(v_media_type) > 160 then
    raise exception 'media type is invalid' using errcode = '22023';
  end if;
  if (p_width_px is null) <> (p_height_px is null)
    or (p_width_px is not null and p_width_px < 1)
    or (p_height_px is not null and p_height_px < 1)
  then
    raise exception 'source dimensions are invalid' using errcode = '22023';
  end if;
  if p_byte_size is null or p_byte_size < 1 then
    raise exception 'byte size is invalid' using errcode = '22023';
  end if;
  if v_checksum_algorithm <> 'sha256' or v_checksum !~ '^[0-9a-f]{64}$' then
    raise exception 'source checksum must be sha256' using errcode = '22023';
  end if;
  if p_provider_observed_at is null then
    raise exception 'provider observation timestamp is required' using errcode = '22023';
  end if;

  v_request := jsonb_build_object(
    'ownerSemanticId', v_owner_semantic_id,
    'ownerEntityType', v_owner_entity_type,
    'ownerCanonicalGitPath', v_owner_canonical_git_path,
    'assetSemanticId', v_asset_semantic_id,
    'role', v_role,
    'variant', v_variant,
    'derivativeRequired', p_derivative_required,
    'providerKind', v_provider_kind,
    'providerRef', v_provider_ref,
    'sourceName', v_source_name,
    'mediaType', v_media_type,
    'widthPx', p_width_px,
    'heightPx', p_height_px,
    'byteSize', p_byte_size,
    'checksumAlgorithm', v_checksum_algorithm,
    'checksum', v_checksum,
    'providerObservedAt', p_provider_observed_at
  );

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      p_actor_user_id::text || ':' || v_operation || ':' || v_idempotency_key,
      0
    )
  );

  select receipt.request_json, receipt.response_json
  into v_existing_request, v_existing_response
  from studio_registry.operation_receipts as receipt
  where receipt.actor_user_id = p_actor_user_id
    and receipt.operation_name = v_operation
    and receipt.idempotency_key = v_idempotency_key;

  if found then
    if v_existing_request <> v_request then
      raise exception 'idempotency key already used for a different request' using errcode = '22023';
    end if;
    return jsonb_build_object(
      'operation', v_operation,
      'idempotencyKey', v_idempotency_key,
      'replayed', true,
      'result', v_existing_response
    );
  end if;

  select entity.*
  into v_existing_owner
  from studio_registry.content_entities as entity
  where entity.semantic_id = v_owner_semantic_id
  for update;

  if found then
    if v_existing_owner.entity_type <> v_owner_entity_type
      or v_existing_owner.canonical_git_path is distinct from v_owner_canonical_git_path
    then
      raise exception 'owner registry metadata conflicts with canonical source' using errcode = '22023';
    end if;
  else
    insert into studio_registry.content_entities (
      semantic_id,
      entity_type,
      display_label,
      canonical_git_path,
      lifecycle,
      metadata
    ) values (
      v_owner_semantic_id,
      v_owner_entity_type,
      v_owner_display_label,
      v_owner_canonical_git_path,
      'WORKING',
      jsonb_build_object('registeredBy', 'studio.asset_source.register')
    );
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('asset:' || v_asset_semantic_id, 0)
  );

  select asset.*
  into v_existing_asset
  from studio_registry.assets as asset
  where asset.semantic_id = v_asset_semantic_id
  for update;

  if found then
    if v_existing_asset.owning_entity_id <> v_owner_semantic_id
      or v_existing_asset.role <> v_role
      or v_existing_asset.variant is distinct from v_variant
    then
      raise exception 'asset semantic identity conflicts with existing owner/role/variant' using errcode = '22023';
    end if;
    v_previous_current_id := v_existing_asset.current_version_id;
    if v_existing_asset.derivative_required <> p_derivative_required then
      update studio_registry.assets
      set derivative_required = p_derivative_required
      where semantic_id = v_asset_semantic_id;
    end if;
  else
    insert into studio_registry.assets (
      semantic_id,
      owning_entity_id,
      role,
      variant,
      derivative_required,
      metadata
    ) values (
      v_asset_semantic_id,
      v_owner_semantic_id,
      v_role,
      v_variant,
      p_derivative_required,
      jsonb_build_object('sourceAuthority', 'google-drive')
    );
    v_previous_current_id := null;
  end if;

  select coalesce(max(version.version_number), 0) + 1
  into v_new_version_number
  from studio_registry.asset_versions as version
  where version.asset_id = v_asset_semantic_id;

  insert into studio_registry.asset_versions (
    asset_id,
    version_number,
    lifecycle,
    provider_kind,
    provider_ref,
    media_type,
    width_px,
    height_px,
    byte_size,
    checksum_algorithm,
    checksum,
    metadata
  ) values (
    v_asset_semantic_id,
    v_new_version_number,
    'WORKING',
    v_provider_kind,
    v_provider_ref,
    v_media_type,
    p_width_px,
    p_height_px,
    p_byte_size,
    v_checksum_algorithm,
    v_checksum,
    jsonb_build_object(
      'sourceName', v_source_name,
      'providerObservedAt', p_provider_observed_at
    )
  ) returning id into v_new_version_id;

  update studio_registry.assets
  set current_version_id = v_new_version_id
  where semantic_id = v_asset_semantic_id;

  insert into studio_registry.validation_results (
    asset_version_id,
    dimension,
    outcome,
    is_blocking,
    validator_key,
    evidence,
    checked_at
  ) values
  (
    v_new_version_id,
    'Source Valid',
    'PASSED',
    false,
    'studio.google-drive.source',
    jsonb_build_object(
      'providerKind', v_provider_kind,
      'providerObservedAt', p_provider_observed_at,
      'checksumAlgorithm', v_checksum_algorithm,
      'checksum', v_checksum
    ),
    p_provider_observed_at
  ),
  (
    v_new_version_id,
    'Metadata Complete',
    case
      when v_media_type like 'image/%' and p_width_px is null then 'WARNING'
      else 'PASSED'
    end,
    false,
    'studio.asset-source.metadata',
    jsonb_build_object(
      'mediaType', v_media_type,
      'dimensionsRegistered', p_width_px is not null,
      'byteSize', p_byte_size
    ),
    p_provider_observed_at
  );

  insert into studio_registry.change_events (
    asset_version_id,
    event_type,
    source_kind,
    source_ref,
    actor_kind,
    actor_ref,
    after_state,
    context
  ) values (
    v_new_version_id,
    'registry.asset_version.created',
    'google-drive',
    v_provider_ref,
    'studio_user',
    p_actor_user_id::text,
    jsonb_build_object(
      'assetId', v_asset_semantic_id,
      'versionNumber', v_new_version_number,
      'lifecycle', 'WORKING',
      'checksum', v_checksum
    ),
    jsonb_build_object('operation', v_operation)
  );

  insert into studio_registry.change_events (
    asset_id,
    event_type,
    source_kind,
    source_ref,
    actor_kind,
    actor_ref,
    before_state,
    after_state,
    context
  ) values (
    v_asset_semantic_id,
    'registry.asset.current_version.set',
    'studio-operations',
    v_idempotency_key,
    'studio_user',
    p_actor_user_id::text,
    jsonb_build_object('currentVersionId', v_previous_current_id),
    jsonb_build_object('currentVersionId', v_new_version_id),
    jsonb_build_object(
      'reason', case when v_previous_current_id is null then 'initial-source' else 'source-replacement' end,
      'providerKind', v_provider_kind
    )
  );

  v_response := jsonb_build_object(
    'assetSemanticId', v_asset_semantic_id,
    'ownerSemanticId', v_owner_semantic_id,
    'versionId', v_new_version_id,
    'versionNumber', v_new_version_number,
    'previousCurrentVersionId', v_previous_current_id,
    'currentVersionId', v_new_version_id,
    'lifecycle', 'WORKING',
    'providerKind', v_provider_kind,
    'sourceName', v_source_name,
    'checksumAlgorithm', v_checksum_algorithm,
    'checksum', v_checksum
  );

  insert into studio_registry.operation_receipts (
    actor_user_id,
    operation_name,
    idempotency_key,
    request_json,
    response_json
  ) values (
    p_actor_user_id,
    v_operation,
    v_idempotency_key,
    v_request,
    v_response
  );

  return jsonb_build_object(
    'operation', v_operation,
    'idempotencyKey', v_idempotency_key,
    'replayed', false,
    'result', v_response
  );
end;
$$;

create or replace function public.execute_studio_asset_version_select_command(
  p_actor_user_id uuid,
  p_idempotency_key text,
  p_asset_semantic_id text,
  p_version_id uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_operation constant text := 'registry.asset_version.select';
  v_idempotency_key text := btrim(p_idempotency_key);
  v_asset_semantic_id text := btrim(p_asset_semantic_id);
  v_request jsonb;
  v_existing_request jsonb;
  v_existing_response jsonb;
  v_previous_current_id uuid;
  v_version studio_registry.asset_versions%rowtype;
  v_response jsonb;
begin
  if p_actor_user_id is null or p_version_id is null then
    raise exception 'actor user id and version id are required' using errcode = '22023';
  end if;
  if not studio_registry.has_capability(p_actor_user_id, 'registry.metadata.edit') then
    raise exception 'studio capability denied' using errcode = '42501';
  end if;
  if v_idempotency_key is null or char_length(v_idempotency_key) not between 8 and 128 then
    raise exception 'idempotency key must be 8 to 128 characters' using errcode = '22023';
  end if;
  if v_asset_semantic_id is null
    or char_length(v_asset_semantic_id) not between 1 and 240
    or v_asset_semantic_id ~ '[[:space:]]'
  then
    raise exception 'asset semantic id is invalid' using errcode = '22023';
  end if;

  v_request := jsonb_build_object(
    'assetSemanticId', v_asset_semantic_id,
    'versionId', p_version_id
  );

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      p_actor_user_id::text || ':' || v_operation || ':' || v_idempotency_key,
      0
    )
  );

  select receipt.request_json, receipt.response_json
  into v_existing_request, v_existing_response
  from studio_registry.operation_receipts as receipt
  where receipt.actor_user_id = p_actor_user_id
    and receipt.operation_name = v_operation
    and receipt.idempotency_key = v_idempotency_key;

  if found then
    if v_existing_request <> v_request then
      raise exception 'idempotency key already used for a different request' using errcode = '22023';
    end if;
    return jsonb_build_object(
      'operation', v_operation,
      'idempotencyKey', v_idempotency_key,
      'replayed', true,
      'result', v_existing_response
    );
  end if;

  select asset.current_version_id
  into v_previous_current_id
  from studio_registry.assets as asset
  where asset.semantic_id = v_asset_semantic_id
  for update;

  if not found then
    raise exception 'semantic asset not found' using errcode = 'P0002';
  end if;

  select version.*
  into v_version
  from studio_registry.asset_versions as version
  where version.id = p_version_id
    and version.asset_id = v_asset_semantic_id;

  if not found then
    raise exception 'asset version does not belong to semantic asset' using errcode = '22023';
  end if;

  update studio_registry.assets
  set current_version_id = p_version_id
  where semantic_id = v_asset_semantic_id;

  insert into studio_registry.change_events (
    asset_id,
    event_type,
    source_kind,
    source_ref,
    actor_kind,
    actor_ref,
    before_state,
    after_state,
    context
  ) values (
    v_asset_semantic_id,
    'registry.asset.current_version.set',
    'studio-operations',
    v_idempotency_key,
    'studio_user',
    p_actor_user_id::text,
    jsonb_build_object('currentVersionId', v_previous_current_id),
    jsonb_build_object('currentVersionId', p_version_id),
    jsonb_build_object(
      'reason', 'retained-version-selection',
      'selectedVersionLifecycle', v_version.lifecycle
    )
  );

  v_response := jsonb_build_object(
    'assetSemanticId', v_asset_semantic_id,
    'previousCurrentVersionId', v_previous_current_id,
    'currentVersionId', p_version_id,
    'selectedVersionNumber', v_version.version_number,
    'selectedVersionLifecycle', v_version.lifecycle
  );

  insert into studio_registry.operation_receipts (
    actor_user_id,
    operation_name,
    idempotency_key,
    request_json,
    response_json
  ) values (
    p_actor_user_id,
    v_operation,
    v_idempotency_key,
    v_request,
    v_response
  );

  return jsonb_build_object(
    'operation', v_operation,
    'idempotencyKey', v_idempotency_key,
    'replayed', false,
    'result', v_response
  );
end;
$$;

create or replace function public.execute_studio_asset_relation_set_command(
  p_actor_user_id uuid,
  p_idempotency_key text,
  p_source_asset_id text,
  p_relation_type text,
  p_target_asset_id text,
  p_active boolean
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_operation constant text := 'registry.asset_relation.set';
  v_idempotency_key text := btrim(p_idempotency_key);
  v_source_asset_id text := btrim(p_source_asset_id);
  v_relation_type text := btrim(p_relation_type);
  v_target_asset_id text := btrim(p_target_asset_id);
  v_request jsonb;
  v_existing_request jsonb;
  v_existing_response jsonb;
  v_existed boolean;
  v_response jsonb;
begin
  if p_actor_user_id is null then
    raise exception 'actor user id is required' using errcode = '22023';
  end if;
  if not studio_registry.has_capability(p_actor_user_id, 'registry.metadata.edit') then
    raise exception 'studio capability denied' using errcode = '42501';
  end if;
  if v_idempotency_key is null or char_length(v_idempotency_key) not between 8 and 128 then
    raise exception 'idempotency key must be 8 to 128 characters' using errcode = '22023';
  end if;
  if v_source_asset_id is null or char_length(v_source_asset_id) not between 1 and 240
    or v_source_asset_id ~ '[[:space:]]'
    or v_target_asset_id is null or char_length(v_target_asset_id) not between 1 and 240
    or v_target_asset_id ~ '[[:space:]]'
  then
    raise exception 'asset relation semantic ids are invalid' using errcode = '22023';
  end if;
  if v_source_asset_id = v_target_asset_id then
    raise exception 'asset relation cannot target itself' using errcode = '22023';
  end if;
  if v_relation_type is null or char_length(v_relation_type) not between 1 and 120 then
    raise exception 'asset relation type is invalid' using errcode = '22023';
  end if;
  if p_active is null then
    raise exception 'asset relation active flag is required' using errcode = '22023';
  end if;
  if not exists (select 1 from studio_registry.assets where semantic_id = v_source_asset_id)
    or not exists (select 1 from studio_registry.assets where semantic_id = v_target_asset_id)
  then
    raise exception 'asset relation references a missing semantic asset' using errcode = 'P0002';
  end if;

  v_request := jsonb_build_object(
    'sourceAssetId', v_source_asset_id,
    'relationType', v_relation_type,
    'targetAssetId', v_target_asset_id,
    'active', p_active
  );

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      p_actor_user_id::text || ':' || v_operation || ':' || v_idempotency_key,
      0
    )
  );

  select receipt.request_json, receipt.response_json
  into v_existing_request, v_existing_response
  from studio_registry.operation_receipts as receipt
  where receipt.actor_user_id = p_actor_user_id
    and receipt.operation_name = v_operation
    and receipt.idempotency_key = v_idempotency_key;

  if found then
    if v_existing_request <> v_request then
      raise exception 'idempotency key already used for a different request' using errcode = '22023';
    end if;
    return jsonb_build_object(
      'operation', v_operation,
      'idempotencyKey', v_idempotency_key,
      'replayed', true,
      'result', v_existing_response
    );
  end if;

  select exists (
    select 1
    from studio_registry.asset_relations as relation
    where relation.source_asset_id = v_source_asset_id
      and relation.relation_type = v_relation_type
      and relation.target_asset_id = v_target_asset_id
  ) into v_existed;

  if p_active then
    insert into studio_registry.asset_relations (
      source_asset_id,
      relation_type,
      target_asset_id,
      metadata
    ) values (
      v_source_asset_id,
      v_relation_type,
      v_target_asset_id,
      '{}'::jsonb
    ) on conflict (source_asset_id, relation_type, target_asset_id) do nothing;
  else
    delete from studio_registry.asset_relations
    where source_asset_id = v_source_asset_id
      and relation_type = v_relation_type
      and target_asset_id = v_target_asset_id;
  end if;

  insert into studio_registry.change_events (
    asset_id,
    event_type,
    source_kind,
    source_ref,
    actor_kind,
    actor_ref,
    before_state,
    after_state,
    context
  ) values (
    v_source_asset_id,
    'registry.asset_relation.set',
    'studio-operations',
    v_idempotency_key,
    'studio_user',
    p_actor_user_id::text,
    jsonb_build_object(
      'relationType', v_relation_type,
      'targetAssetId', v_target_asset_id,
      'active', v_existed
    ),
    jsonb_build_object(
      'relationType', v_relation_type,
      'targetAssetId', v_target_asset_id,
      'active', p_active
    ),
    jsonb_build_object('semanticRelation', true)
  );

  v_response := jsonb_build_object(
    'sourceAssetId', v_source_asset_id,
    'relationType', v_relation_type,
    'targetAssetId', v_target_asset_id,
    'active', p_active
  );

  insert into studio_registry.operation_receipts (
    actor_user_id,
    operation_name,
    idempotency_key,
    request_json,
    response_json
  ) values (
    p_actor_user_id,
    v_operation,
    v_idempotency_key,
    v_request,
    v_response
  );

  return jsonb_build_object(
    'operation', v_operation,
    'idempotencyKey', v_idempotency_key,
    'replayed', false,
    'result', v_response
  );
end;
$$;

revoke all on function studio_registry.protect_asset_version_source_immutability()
from public, anon, authenticated, service_role;
grant execute on function studio_registry.protect_asset_version_source_immutability() to service_role;

revoke all on function public.get_studio_operation_receipt(uuid, text, text)
from public, anon, authenticated;
revoke all on function public.get_studio_asset_version_source(uuid, uuid)
from public, anon, authenticated;
revoke all on function public.execute_studio_asset_source_register_command(
  uuid, text, text, text, text, text, text, text, text, boolean, text, text, text, text,
  integer, integer, bigint, text, text, timestamptz
) from public, anon, authenticated;
revoke all on function public.execute_studio_asset_version_select_command(uuid, text, text, uuid)
from public, anon, authenticated;
revoke all on function public.execute_studio_asset_relation_set_command(uuid, text, text, text, text, boolean)
from public, anon, authenticated;

grant execute on function public.get_studio_operation_receipt(uuid, text, text) to service_role;
grant execute on function public.get_studio_asset_version_source(uuid, uuid) to service_role;
grant execute on function public.execute_studio_asset_source_register_command(
  uuid, text, text, text, text, text, text, text, text, boolean, text, text, text, text,
  integer, integer, bigint, text, text, timestamptz
) to service_role;
grant execute on function public.execute_studio_asset_version_select_command(uuid, text, text, uuid) to service_role;
grant execute on function public.execute_studio_asset_relation_set_command(uuid, text, text, text, text, boolean) to service_role;
