create table public.accounts (
  id uuid primary key references auth.users(id) on delete cascade,
  schema_version smallint not null default 1 check (schema_version = 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.account_profiles (
  account_id uuid primary key references public.accounts(id) on delete cascade,
  display_name text null check (
    display_name is null
    or (char_length(display_name) between 1 and 40 and display_name = btrim(display_name))
  ),
  revision bigint not null default 0 check (revision >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.accounts enable row level security;
alter table public.account_profiles enable row level security;

revoke all on table public.accounts from anon, authenticated;
revoke all on table public.account_profiles from anon, authenticated;

grant select, insert on table public.accounts to authenticated;
grant select, insert on table public.account_profiles to authenticated;
grant update (display_name) on table public.account_profiles to authenticated;

create policy accounts_select_own
on public.accounts
for select
to authenticated
using ((select auth.uid()) = id);

create policy accounts_insert_own
on public.accounts
for insert
to authenticated
with check ((select auth.uid()) = id);

create policy account_profiles_select_own
on public.account_profiles
for select
to authenticated
using ((select auth.uid()) = account_id);

create policy account_profiles_insert_own
on public.account_profiles
for insert
to authenticated
with check ((select auth.uid()) = account_id);

create policy account_profiles_update_own
on public.account_profiles
for update
to authenticated
using ((select auth.uid()) = account_id)
with check ((select auth.uid()) = account_id);

create or replace function public.touch_account_profile()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at := now();
  new.revision := old.revision + 1;
  return new;
end;
$$;

revoke all on function public.touch_account_profile() from public, anon, authenticated;

drop trigger if exists account_profiles_touch on public.account_profiles;
create trigger account_profiles_touch
before update on public.account_profiles
for each row
execute function public.touch_account_profile();

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
  on conflict (id) do nothing;

  insert into public.account_profiles (account_id, display_name)
  values (v_user_id, v_display_name)
  on conflict (account_id) do nothing;

  return query
  select p.account_id, p.display_name, p.revision, p.created_at, p.updated_at
  from public.account_profiles as p
  where p.account_id = v_user_id;
end;
$$;

revoke all on function public.bootstrap_account(text) from public, anon;
grant execute on function public.bootstrap_account(text) to authenticated;
