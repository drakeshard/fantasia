create or replace function public.bootstrap_account(p_display_name text default null)
returns table (
  account_id uuid,
  display_name text,
  revision bigint,
  created_at timestamptz,
  updated_at timestamptz
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_display_name text := nullif(btrim(p_display_name), '');
begin
  if v_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  if v_display_name is not null and char_length(v_display_name) > 40 then
    raise exception 'display name must be at most 40 characters' using errcode = '22023';
  end if;

  insert into public.accounts (id)
  values (v_user_id)
  on conflict on constraint accounts_pkey do nothing;

  insert into public.account_profiles (account_id, display_name)
  values (v_user_id, v_display_name)
  on conflict on constraint account_profiles_pkey do nothing;

  insert into public.account_talent_progress (account_id)
  values (v_user_id)
  on conflict on constraint account_talent_progress_pkey do nothing;

  return query
  select p.account_id, p.display_name, p.revision, p.created_at, p.updated_at
  from public.account_profiles as p
  where p.account_id = v_user_id;
end;
$$;

revoke all on function public.bootstrap_account(text) from public, anon;
grant execute on function public.bootstrap_account(text) to authenticated;
