create table public.account_equipment_instances (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  schema_version smallint not null default 1 check (schema_version = 1),
  equipment_definition_id text not null check (
    char_length(equipment_definition_id) between 1 and 128
    and equipment_definition_id = btrim(equipment_definition_id)
  ),
  created_at timestamptz not null default now()
);

create index account_equipment_instances_account_id_idx
on public.account_equipment_instances (account_id);

alter table public.account_equipment_instances enable row level security;

revoke all on table public.account_equipment_instances from anon, authenticated;
grant select on table public.account_equipment_instances to authenticated;

create policy account_equipment_instances_select_own
on public.account_equipment_instances
for select
to authenticated
using ((select auth.uid()) = account_id);
