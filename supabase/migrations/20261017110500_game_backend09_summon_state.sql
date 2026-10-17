create table public.account_summon_state (
  account_id uuid not null references public.accounts(id) on delete cascade,
  summon_definition_id text not null check (
    char_length(summon_definition_id) between 1 and 128
    and summon_definition_id = btrim(summon_definition_id)
  ),
  schema_version smallint not null default 1 check (schema_version = 1),
  revision bigint not null check (revision between 1 and 9007199254740991),
  state_json jsonb not null check (jsonb_typeof(state_json) = 'object'),
  updated_at timestamptz not null default now(),
  primary key (account_id, summon_definition_id)
);

create table public.account_summon_history (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  summon_definition_id text not null check (
    char_length(summon_definition_id) between 1 and 128
    and summon_definition_id = btrim(summon_definition_id)
  ),
  schema_version smallint not null default 1 check (schema_version = 1),
  revision bigint not null check (revision between 1 and 9007199254740991),
  state_json jsonb not null check (jsonb_typeof(state_json) = 'object'),
  created_at timestamptz not null default now(),
  unique (account_id, summon_definition_id, revision)
);

alter table public.account_summon_state enable row level security;
alter table public.account_summon_history enable row level security;

revoke all on table public.account_summon_state from public, anon, authenticated, service_role;
revoke all on table public.account_summon_history from public, anon, authenticated, service_role;

grant select on table public.account_summon_state to authenticated;
grant select on table public.account_summon_history to authenticated;

grant select, insert, update on table public.account_summon_state to service_role;
grant select, insert on table public.account_summon_history to service_role;

create policy account_summon_state_select_own
on public.account_summon_state
for select
to authenticated
using ((select auth.uid()) = account_id);

create policy account_summon_history_select_own
on public.account_summon_history
for select
to authenticated
using ((select auth.uid()) = account_id);

create or replace function private.advance_summon_state(
  p_account_id uuid,
  p_summon_definition_id text,
  p_state_json jsonb
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_summon_definition_id text := p_summon_definition_id;
  v_revision bigint;
  v_new_revision bigint;
  v_entry_id uuid;
begin
  if p_account_id is null then
    raise exception 'account id is required' using errcode = '22023';
  end if;

  if v_summon_definition_id is null
    or char_length(v_summon_definition_id) not between 1 and 128
    or v_summon_definition_id <> btrim(v_summon_definition_id)
  then
    raise exception 'summon definition id must be a trimmed 1 to 128 character string' using errcode = '22023';
  end if;

  if p_state_json is null or pg_catalog.jsonb_typeof(p_state_json) <> 'object' then
    raise exception 'summon state must be a JSON object' using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      p_account_id::text || ':' || v_summon_definition_id,
      0
    )
  );

  select s.revision
  into v_revision
  from public.account_summon_state as s
  where s.account_id = p_account_id
    and s.summon_definition_id = v_summon_definition_id
  for update;

  if found then
    if v_revision >= 9007199254740991 then
      raise exception 'summon state revision exceeds JavaScript safe integer range' using errcode = '22003';
    end if;
    v_new_revision := v_revision + 1;
    update public.account_summon_state
    set revision = v_new_revision,
        state_json = p_state_json,
        updated_at = now()
    where account_id = p_account_id
      and summon_definition_id = v_summon_definition_id;
  else
    v_new_revision := 1;
    insert into public.account_summon_state (
      account_id,
      summon_definition_id,
      revision,
      state_json
    ) values (
      p_account_id,
      v_summon_definition_id,
      v_new_revision,
      p_state_json
    );
  end if;

  insert into public.account_summon_history (
    account_id,
    summon_definition_id,
    revision,
    state_json
  ) values (
    p_account_id,
    v_summon_definition_id,
    v_new_revision,
    p_state_json
  )
  returning id into v_entry_id;

  return v_entry_id;
end;
$$;

revoke all on function private.advance_summon_state(uuid, text, jsonb)
from public, anon, authenticated, service_role;
grant execute on function private.advance_summon_state(uuid, text, jsonb)
to service_role;
