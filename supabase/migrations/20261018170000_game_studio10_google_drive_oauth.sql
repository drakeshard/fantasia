create table studio_registry.google_drive_oauth_states (
  state_hash text primary key,
  actor_user_id uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint google_drive_oauth_states_hash_check check (state_hash ~ '^[0-9a-f]{64}$')
);

create table studio_registry.google_drive_connection (
  singleton boolean primary key default true,
  connected_by_user_id uuid not null references auth.users(id),
  account_email text not null,
  account_display_name text,
  refresh_token_secret_id uuid not null,
  root_folder_id text not null,
  production_assets_folder_id text not null,
  source_masters_folder_id text not null,
  scopes text[] not null,
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint google_drive_connection_singleton_check check (singleton),
  constraint google_drive_connection_email_check check (char_length(btrim(account_email)) between 3 and 320),
  constraint google_drive_connection_source_folder_check check (char_length(btrim(source_masters_folder_id)) between 10 and 200)
);

revoke all on studio_registry.google_drive_oauth_states from anon, authenticated;
revoke all on studio_registry.google_drive_connection from anon, authenticated;

grant select, insert, update, delete on studio_registry.google_drive_oauth_states to service_role;
grant select, insert, update on studio_registry.google_drive_connection to service_role;

create or replace function public.create_studio_google_drive_oauth_state(
  p_actor_user_id uuid,
  p_state_hash text,
  p_expires_at timestamptz
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if p_actor_user_id is null or p_state_hash is null or p_expires_at is null then
    raise exception 'OAuth state parameters are required' using errcode = '22023';
  end if;
  if not studio_registry.has_capability(p_actor_user_id, 'studio.membership.manage') then
    raise exception 'Studio Admin capability required to connect Google Drive' using errcode = '42501';
  end if;
  if p_state_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'OAuth state hash is invalid' using errcode = '22023';
  end if;
  if p_expires_at <= now() or p_expires_at > now() + interval '15 minutes' then
    raise exception 'OAuth state expiry is invalid' using errcode = '22023';
  end if;

  delete from studio_registry.google_drive_oauth_states
  where consumed_at is not null or expires_at <= now();

  insert into studio_registry.google_drive_oauth_states (state_hash, actor_user_id, expires_at)
  values (p_state_hash, p_actor_user_id, p_expires_at);

  return jsonb_build_object('created', true, 'expiresAt', p_expires_at);
end;
$$;

create or replace function public.consume_studio_google_drive_oauth_state(
  p_state_hash text
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_state studio_registry.google_drive_oauth_states%rowtype;
begin
  update studio_registry.google_drive_oauth_states
  set consumed_at = now()
  where state_hash = p_state_hash
    and consumed_at is null
    and expires_at > now()
  returning * into v_state;

  if not found then
    raise exception 'Google Drive OAuth state is invalid or expired' using errcode = '22023';
  end if;

  return jsonb_build_object('actorUserId', v_state.actor_user_id);
end;
$$;

create or replace function public.upsert_studio_google_drive_connection(
  p_connected_by_user_id uuid,
  p_account_email text,
  p_account_display_name text,
  p_refresh_token text,
  p_root_folder_id text,
  p_production_assets_folder_id text,
  p_source_masters_folder_id text,
  p_scopes text[]
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_existing_secret_id uuid;
  v_secret_id uuid;
begin
  if p_connected_by_user_id is null or not studio_registry.has_capability(p_connected_by_user_id, 'studio.membership.manage') then
    raise exception 'Studio Admin capability required to connect Google Drive' using errcode = '42501';
  end if;
  if nullif(btrim(p_account_email), '') is null
    or nullif(btrim(p_refresh_token), '') is null
    or nullif(btrim(p_source_masters_folder_id), '') is null
  then
    raise exception 'Google Drive connection metadata is incomplete' using errcode = '22023';
  end if;

  select connection.refresh_token_secret_id
  into v_existing_secret_id
  from studio_registry.google_drive_connection as connection
  where connection.singleton = true
  for update;

  if found then
    perform vault.update_secret(
      v_existing_secret_id,
      p_refresh_token,
      'fantasia_content_studio_google_drive_refresh_token',
      'OAuth refresh token for the active Fantasia Content Studio personal Google Drive connection',
      null
    );
    v_secret_id := v_existing_secret_id;
  else
    select vault.create_secret(
      p_refresh_token,
      'fantasia_content_studio_google_drive_refresh_token',
      'OAuth refresh token for the active Fantasia Content Studio personal Google Drive connection',
      null
    ) into v_secret_id;
  end if;

  insert into studio_registry.google_drive_connection (
    singleton,
    connected_by_user_id,
    account_email,
    account_display_name,
    refresh_token_secret_id,
    root_folder_id,
    production_assets_folder_id,
    source_masters_folder_id,
    scopes,
    connected_at,
    updated_at
  ) values (
    true,
    p_connected_by_user_id,
    btrim(p_account_email),
    nullif(btrim(p_account_display_name), ''),
    v_secret_id,
    btrim(p_root_folder_id),
    btrim(p_production_assets_folder_id),
    btrim(p_source_masters_folder_id),
    p_scopes,
    now(),
    now()
  )
  on conflict (singleton) do update set
    connected_by_user_id = excluded.connected_by_user_id,
    account_email = excluded.account_email,
    account_display_name = excluded.account_display_name,
    refresh_token_secret_id = excluded.refresh_token_secret_id,
    root_folder_id = excluded.root_folder_id,
    production_assets_folder_id = excluded.production_assets_folder_id,
    source_masters_folder_id = excluded.source_masters_folder_id,
    scopes = excluded.scopes,
    connected_at = excluded.connected_at,
    updated_at = now();

  return jsonb_build_object(
    'connected', true,
    'accountEmail', btrim(p_account_email),
    'sourceFolderId', btrim(p_source_masters_folder_id)
  );
end;
$$;

create or replace function public.get_studio_google_drive_connection(
  p_actor_user_id uuid
)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_connection studio_registry.google_drive_connection%rowtype;
begin
  if p_actor_user_id is null or not studio_registry.has_capability(p_actor_user_id, 'studio.read') then
    raise exception 'Studio membership required' using errcode = '42501';
  end if;

  select * into v_connection
  from studio_registry.google_drive_connection
  where singleton = true;

  if not found then
    return jsonb_build_object('connected', false);
  end if;

  return jsonb_build_object(
    'connected', true,
    'accountEmail', v_connection.account_email,
    'accountDisplayName', v_connection.account_display_name,
    'sourceFolderId', v_connection.source_masters_folder_id,
    'scopes', to_jsonb(v_connection.scopes),
    'connectedAt', v_connection.connected_at,
    'updatedAt', v_connection.updated_at
  );
end;
$$;

create or replace function public.get_studio_google_drive_credentials(
  p_actor_user_id uuid
)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_connection studio_registry.google_drive_connection%rowtype;
  v_refresh_token text;
begin
  if p_actor_user_id is null or not studio_registry.has_capability(p_actor_user_id, 'studio.read') then
    raise exception 'Studio membership required' using errcode = '42501';
  end if;

  select * into v_connection
  from studio_registry.google_drive_connection
  where singleton = true;

  if not found then
    raise exception 'Google Drive is not connected to Content Studio' using errcode = 'P0002';
  end if;

  select secret.decrypted_secret
  into v_refresh_token
  from vault.decrypted_secrets as secret
  where secret.id = v_connection.refresh_token_secret_id;

  if v_refresh_token is null then
    raise exception 'Google Drive refresh token is unavailable' using errcode = '55000';
  end if;

  return jsonb_build_object(
    'refreshToken', v_refresh_token,
    'sourceFolderId', v_connection.source_masters_folder_id,
    'accountEmail', v_connection.account_email
  );
end;
$$;

revoke execute on function public.create_studio_google_drive_oauth_state(uuid, text, timestamptz) from public, anon, authenticated;
revoke execute on function public.consume_studio_google_drive_oauth_state(text) from public, anon, authenticated;
revoke execute on function public.upsert_studio_google_drive_connection(uuid, text, text, text, text, text, text, text[]) from public, anon, authenticated;
revoke execute on function public.get_studio_google_drive_connection(uuid) from public, anon, authenticated;
revoke execute on function public.get_studio_google_drive_credentials(uuid) from public, anon, authenticated;

grant execute on function public.create_studio_google_drive_oauth_state(uuid, text, timestamptz) to service_role;
grant execute on function public.consume_studio_google_drive_oauth_state(text) to service_role;
grant execute on function public.upsert_studio_google_drive_connection(uuid, text, text, text, text, text, text, text[]) to service_role;
grant execute on function public.get_studio_google_drive_connection(uuid) to service_role;
grant execute on function public.get_studio_google_drive_credentials(uuid) to service_role;
