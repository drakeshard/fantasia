create table public.account_talent_progress (
  account_id uuid primary key references public.accounts(id) on delete cascade,
  schema_version smallint not null default 1 check (schema_version = 1),
  state jsonb not null default '{"trees":[]}'::jsonb check (
    jsonb_typeof(state) = 'object'
    and state ? 'trees'
    and jsonb_typeof(state -> 'trees') = 'array'
  ),
  revision bigint not null default 0 check (revision >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.account_talent_progress enable row level security;

revoke all on table public.account_talent_progress from anon, authenticated;
grant select on table public.account_talent_progress to authenticated;
grant insert (account_id) on table public.account_talent_progress to authenticated;

create policy account_talent_progress_select_own
on public.account_talent_progress
for select
to authenticated
using ((select auth.uid()) = account_id);

create policy account_talent_progress_insert_empty_own
on public.account_talent_progress
for insert
to authenticated
with check ((select auth.uid()) = account_id);

insert into public.account_talent_progress (account_id)
select id
from public.accounts
on conflict (account_id) do nothing;

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

  insert into public.account_talent_progress (account_id)
  values (v_user_id)
  on conflict (account_id) do nothing;

  return query
  select p.account_id, p.display_name, p.revision, p.created_at, p.updated_at
  from public.account_profiles as p
  where p.account_id = v_user_id;
end;
$$;

revoke all on function public.bootstrap_account(text) from public, anon;
grant execute on function public.bootstrap_account(text) to authenticated;
