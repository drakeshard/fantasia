create schema if not exists private;

revoke all on schema private from public, anon, authenticated;
grant usage on schema private to service_role;

create table private.trusted_command_receipts (
  account_id uuid not null references public.accounts(id) on delete cascade,
  command_name text not null check (char_length(command_name) between 1 and 120),
  idempotency_key text not null check (char_length(idempotency_key) between 8 and 128),
  request_json jsonb not null check (jsonb_typeof(request_json) = 'object'),
  response_json jsonb not null check (jsonb_typeof(response_json) = 'object'),
  created_at timestamptz not null default now(),
  primary key (account_id, command_name, idempotency_key)
);

alter table private.trusted_command_receipts enable row level security;

revoke all on table private.trusted_command_receipts from public, anon, authenticated;
grant select, insert on table private.trusted_command_receipts to service_role;

create or replace function public.execute_profile_display_name_command(
  p_account_id uuid,
  p_idempotency_key text,
  p_display_name text
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_command_name constant text := 'profile.update_display_name';
  v_idempotency_key text := btrim(p_idempotency_key);
  v_display_name text := btrim(p_display_name);
  v_request jsonb;
  v_existing_request jsonb;
  v_existing_response jsonb;
  v_profile public.account_profiles%rowtype;
  v_response jsonb;
begin
  if p_account_id is null then
    raise exception 'account id is required' using errcode = '22023';
  end if;

  if v_idempotency_key is null or char_length(v_idempotency_key) not between 8 and 128 then
    raise exception 'idempotency key must be 8 to 128 characters' using errcode = '22023';
  end if;

  if v_display_name is null or char_length(v_display_name) not between 1 and 40 then
    raise exception 'display name must be 1 to 40 characters' using errcode = '22023';
  end if;

  v_request := jsonb_build_object('displayName', v_display_name);

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      p_account_id::text || ':' || v_command_name || ':' || v_idempotency_key,
      0
    )
  );

  select r.request_json, r.response_json
  into v_existing_request, v_existing_response
  from private.trusted_command_receipts as r
  where r.account_id = p_account_id
    and r.command_name = v_command_name
    and r.idempotency_key = v_idempotency_key;

  if found then
    if v_existing_request <> v_request then
      raise exception 'idempotency key already used for a different request' using errcode = '22023';
    end if;

    return jsonb_build_object(
      'command', v_command_name,
      'idempotencyKey', v_idempotency_key,
      'replayed', true,
      'result', v_existing_response
    );
  end if;

  update public.account_profiles
  set display_name = v_display_name
  where account_id = p_account_id
  returning * into v_profile;

  if not found then
    raise exception 'account profile not found' using errcode = 'P0002';
  end if;

  v_response := jsonb_build_object(
    'accountId', v_profile.account_id,
    'displayName', v_profile.display_name,
    'revision', v_profile.revision,
    'createdAt', v_profile.created_at,
    'updatedAt', v_profile.updated_at
  );

  insert into private.trusted_command_receipts (
    account_id,
    command_name,
    idempotency_key,
    request_json,
    response_json
  ) values (
    p_account_id,
    v_command_name,
    v_idempotency_key,
    v_request,
    v_response
  );

  return jsonb_build_object(
    'command', v_command_name,
    'idempotencyKey', v_idempotency_key,
    'replayed', false,
    'result', v_response
  );
end;
$$;

revoke all on function public.execute_profile_display_name_command(uuid, text, text)
from public, anon, authenticated;
grant execute on function public.execute_profile_display_name_command(uuid, text, text)
to service_role;
