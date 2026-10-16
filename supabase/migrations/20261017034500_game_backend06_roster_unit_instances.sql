create table public.account_unit_instances (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  schema_version smallint not null default 1 check (schema_version = 1),
  character_definition_id text not null check (
    char_length(character_definition_id) between 1 and 128
    and character_definition_id = btrim(character_definition_id)
  ),
  created_at timestamptz not null default now()
);

create index account_unit_instances_account_created_idx
on public.account_unit_instances (account_id, created_at, id);

alter table public.account_unit_instances enable row level security;

revoke all on table public.account_unit_instances from anon, authenticated;
grant select on table public.account_unit_instances to authenticated;

create policy account_unit_instances_select_own
on public.account_unit_instances
for select
to authenticated
using ((select auth.uid()) = account_id);
