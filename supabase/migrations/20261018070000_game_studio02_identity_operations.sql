create type studio_registry.studio_role as enum (
  'Viewer',
  'Editor',
  'Approver',
  'Admin'
);

create table studio_registry.studio_memberships (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role studio_registry.studio_role not null,
  active boolean not null default true,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table studio_registry.operation_receipts (
  actor_user_id uuid not null,
  operation_name text not null check (char_length(operation_name) between 1 and 120),
  idempotency_key text not null check (char_length(idempotency_key) between 8 and 128),
  request_json jsonb not null check (jsonb_typeof(request_json) = 'object'),
  response_json jsonb not null check (jsonb_typeof(response_json) = 'object'),
  created_at timestamptz not null default now(),
  primary key (actor_user_id, operation_name, idempotency_key)
);

create table studio_registry.membership_events (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid not null,
  target_user_id uuid not null,
  event_type text not null check (char_length(event_type) between 1 and 120),
  before_state jsonb,
  after_state jsonb not null check (jsonb_typeof(after_state) = 'object'),
  created_at timestamptz not null default now(),
  constraint membership_events_before_state_object check (
    before_state is null or jsonb_typeof(before_state) = 'object'
  )
);

create index studio_memberships_role_active_idx
on studio_registry.studio_memberships (role, active);

create index membership_events_target_created_idx
on studio_registry.membership_events (target_user_id, created_at desc);

create trigger studio_memberships_touch_updated_at
before update on studio_registry.studio_memberships
for each row execute function studio_registry.touch_updated_at();

create trigger operation_receipts_append_only
before update or delete on studio_registry.operation_receipts
for each row execute function studio_registry.reject_history_mutation();

create trigger membership_events_append_only
before update or delete on studio_registry.membership_events
for each row execute function studio_registry.reject_history_mutation();

alter table studio_registry.studio_memberships enable row level security;
alter table studio_registry.operation_receipts enable row level security;
alter table studio_registry.membership_events enable row level security;

revoke all on table studio_registry.studio_memberships from public, anon, authenticated, service_role;
revoke all on table studio_registry.operation_receipts from public, anon, authenticated, service_role;
revoke all on table studio_registry.membership_events from public, anon, authenticated, service_role;

grant select, insert, update on table studio_registry.studio_memberships to service_role;
grant select, insert on table studio_registry.operation_receipts to service_role;
grant select, insert on table studio_registry.membership_events to service_role;

create or replace function studio_registry.role_capabilities(
  p_role studio_registry.studio_role
)
returns text[]
language sql
immutable
security invoker
set search_path = ''
as $$
  select case p_role
    when 'Viewer'::studio_registry.studio_role then array['studio.read']::text[]
    when 'Editor'::studio_registry.studio_role then array[
      'studio.read',
      'registry.metadata.edit'
    ]::text[]
    when 'Approver'::studio_registry.studio_role then array[
      'studio.read',
      'registry.metadata.edit',
      'review.approve',
      'review.freeze'
    ]::text[]
    when 'Admin'::studio_registry.studio_role then array[
      'studio.read',
      'registry.metadata.edit',
      'studio.membership.manage'
    ]::text[]
  end;
$$;

create or replace function studio_registry.has_capability(
  p_user_id uuid,
  p_capability text
)
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select exists (
    select 1
    from studio_registry.studio_memberships as membership
    where membership.user_id = p_user_id
      and membership.active
      and p_capability = any(studio_registry.role_capabilities(membership.role))
  );
$$;

create or replace function public.get_studio_session(
  p_user_id uuid
)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_membership studio_registry.studio_memberships%rowtype;
begin
  if p_user_id is null then
    raise exception 'user id is required' using errcode = '22023';
  end if;

  select membership.*
  into v_membership
  from studio_registry.studio_memberships as membership
  where membership.user_id = p_user_id;

  if not found or not v_membership.active then
    return jsonb_build_object(
      'authorized', false,
      'role', null,
      'capabilities', '[]'::jsonb
    );
  end if;

  return jsonb_build_object(
    'authorized', true,
    'role', v_membership.role,
    'capabilities', to_jsonb(studio_registry.role_capabilities(v_membership.role))
  );
end;
$$;

create or replace function public.execute_studio_entity_note_command(
  p_actor_user_id uuid,
  p_idempotency_key text,
  p_semantic_id text,
  p_note text
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_operation constant text := 'registry.entity_note.set';
  v_idempotency_key text := btrim(p_idempotency_key);
  v_semantic_id text := btrim(p_semantic_id);
  v_note text := case when p_note is null then null else btrim(p_note) end;
  v_request jsonb;
  v_existing_request jsonb;
  v_existing_response jsonb;
  v_before_note jsonb;
  v_after_metadata jsonb;
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
  if v_semantic_id is null
    or char_length(v_semantic_id) not between 1 and 200
    or v_semantic_id ~ '[[:space:]]'
  then
    raise exception 'semantic id is invalid' using errcode = '22023';
  end if;
  if v_note is not null and char_length(v_note) > 1000 then
    raise exception 'operator note must be at most 1000 characters' using errcode = '22023';
  end if;

  v_request := jsonb_build_object('semanticId', v_semantic_id, 'note', v_note);

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

  select entity.metadata -> 'operatorNote'
  into v_before_note
  from studio_registry.content_entities as entity
  where entity.semantic_id = v_semantic_id
  for update;

  if not found then
    raise exception 'content entity not found' using errcode = 'P0002';
  end if;

  update studio_registry.content_entities
  set metadata = case
    when v_note is null then metadata - 'operatorNote'
    else jsonb_set(metadata, '{operatorNote}', to_jsonb(v_note), true)
  end
  where semantic_id = v_semantic_id
  returning metadata into v_after_metadata;

  insert into studio_registry.change_events (
    entity_id,
    event_type,
    source_kind,
    source_ref,
    actor_kind,
    actor_ref,
    before_state,
    after_state,
    context
  ) values (
    v_semantic_id,
    v_operation,
    'studio-operations',
    v_idempotency_key,
    'studio_user',
    p_actor_user_id::text,
    jsonb_build_object('operatorNote', v_before_note),
    jsonb_build_object('operatorNote', v_after_metadata -> 'operatorNote'),
    jsonb_build_object('capability', 'registry.metadata.edit')
  );

  v_response := jsonb_build_object(
    'semanticId', v_semantic_id,
    'operatorNote', v_after_metadata -> 'operatorNote'
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

create or replace function public.execute_studio_membership_set_command(
  p_actor_user_id uuid,
  p_idempotency_key text,
  p_target_user_id uuid,
  p_role text,
  p_active boolean
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_operation constant text := 'studio.membership.set';
  v_idempotency_key text := btrim(p_idempotency_key);
  v_role studio_registry.studio_role;
  v_request jsonb;
  v_existing_request jsonb;
  v_existing_response jsonb;
  v_before jsonb;
  v_membership studio_registry.studio_memberships%rowtype;
  v_response jsonb;
begin
  if p_actor_user_id is null or p_target_user_id is null then
    raise exception 'actor and target user ids are required' using errcode = '22023';
  end if;
  if not studio_registry.has_capability(p_actor_user_id, 'studio.membership.manage') then
    raise exception 'studio capability denied' using errcode = '42501';
  end if;
  if v_idempotency_key is null or char_length(v_idempotency_key) not between 8 and 128 then
    raise exception 'idempotency key must be 8 to 128 characters' using errcode = '22023';
  end if;
  if p_active is null then
    raise exception 'active flag is required' using errcode = '22023';
  end if;

  begin
    v_role := p_role::studio_registry.studio_role;
  exception
    when invalid_text_representation then
      raise exception 'studio role is invalid' using errcode = '22023';
  end;

  if not exists (select 1 from auth.users where id = p_target_user_id) then
    raise exception 'target auth user not found' using errcode = 'P0002';
  end if;

  v_request := jsonb_build_object(
    'userId', p_target_user_id,
    'role', v_role,
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

  select jsonb_build_object(
    'role', membership.role,
    'active', membership.active,
    'updatedAt', membership.updated_at
  )
  into v_before
  from studio_registry.studio_memberships as membership
  where membership.user_id = p_target_user_id
  for update;

  insert into studio_registry.studio_memberships (
    user_id,
    role,
    active,
    created_by,
    updated_by
  ) values (
    p_target_user_id,
    v_role,
    p_active,
    p_actor_user_id,
    p_actor_user_id
  )
  on conflict (user_id) do update
  set role = excluded.role,
      active = excluded.active,
      updated_by = excluded.updated_by
  returning * into v_membership;

  v_response := jsonb_build_object(
    'userId', v_membership.user_id,
    'role', v_membership.role,
    'active', v_membership.active,
    'updatedAt', v_membership.updated_at
  );

  insert into studio_registry.membership_events (
    actor_user_id,
    target_user_id,
    event_type,
    before_state,
    after_state
  ) values (
    p_actor_user_id,
    p_target_user_id,
    v_operation,
    v_before,
    v_response
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

revoke all on function studio_registry.role_capabilities(studio_registry.studio_role)
from public, anon, authenticated;
revoke all on function studio_registry.has_capability(uuid, text)
from public, anon, authenticated;
revoke all on function public.get_studio_session(uuid)
from public, anon, authenticated;
revoke all on function public.execute_studio_entity_note_command(uuid, text, text, text)
from public, anon, authenticated;
revoke all on function public.execute_studio_membership_set_command(uuid, text, uuid, text, boolean)
from public, anon, authenticated;

grant execute on function studio_registry.role_capabilities(studio_registry.studio_role) to service_role;
grant execute on function studio_registry.has_capability(uuid, text) to service_role;
grant execute on function public.get_studio_session(uuid) to service_role;
grant execute on function public.execute_studio_entity_note_command(uuid, text, text, text) to service_role;
grant execute on function public.execute_studio_membership_set_command(uuid, text, uuid, text, boolean) to service_role;
