create table public.campaign_progress (
  account_id uuid primary key references public.accounts(id) on delete cascade,
  schema_version smallint not null default 1 check (schema_version = 1),
  saga_id text not null check (char_length(saga_id) between 1 and 120 and saga_id = btrim(saga_id)),
  chapter_id text not null check (
    char_length(chapter_id) between 1 and 120 and chapter_id = btrim(chapter_id)
  ),
  stage_id text not null check (char_length(stage_id) between 1 and 120 and stage_id = btrim(stage_id)),
  revision bigint not null default 0 check (revision >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.campaign_progress enable row level security;

revoke all on table public.campaign_progress from anon, authenticated;
grant select, insert on table public.campaign_progress to authenticated;
grant update (saga_id, chapter_id, stage_id) on table public.campaign_progress to authenticated;

create policy campaign_progress_select_own
on public.campaign_progress
for select
to authenticated
using ((select auth.uid()) = account_id);

create policy campaign_progress_insert_own
on public.campaign_progress
for insert
to authenticated
with check ((select auth.uid()) = account_id);

create policy campaign_progress_update_own
on public.campaign_progress
for update
to authenticated
using ((select auth.uid()) = account_id)
with check ((select auth.uid()) = account_id);

create or replace function public.touch_campaign_progress()
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

revoke all on function public.touch_campaign_progress() from public, anon, authenticated;

drop trigger if exists campaign_progress_touch on public.campaign_progress;
create trigger campaign_progress_touch
before update on public.campaign_progress
for each row
execute function public.touch_campaign_progress();
