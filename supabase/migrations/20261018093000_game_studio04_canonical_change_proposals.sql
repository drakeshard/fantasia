create table studio_registry.canonical_change_proposals (
  actor_user_id uuid not null references auth.users(id) on delete restrict,
  change_request_id text not null,
  semantic_id text not null,
  canonical_git_path text not null,
  content_type text not null,
  base_revision text not null,
  operation_kind text not null,
  request_json jsonb not null,
  status text not null default 'VALIDATING',
  branch_name text,
  commit_sha text,
  pull_request_number bigint,
  pull_request_url text,
  validation_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (actor_user_id, change_request_id),
  constraint canonical_change_proposals_request_id_valid check (
    char_length(change_request_id) between 8 and 128
    and change_request_id = btrim(change_request_id)
  ),
  constraint canonical_change_proposals_semantic_id_valid check (
    char_length(semantic_id) between 1 and 200
    and semantic_id = btrim(semantic_id)
    and semantic_id !~ '[[:space:]]'
  ),
  constraint canonical_change_proposals_path_valid check (
    canonical_git_path = 'content/narrative/story.json'
  ),
  constraint canonical_change_proposals_content_type_valid check (
    content_type = 'fantasia.story.node.v1'
  ),
  constraint canonical_change_proposals_operation_valid check (
    operation_kind = 'set-node-summary'
  ),
  constraint canonical_change_proposals_request_object check (
    jsonb_typeof(request_json) = 'object'
  ),
  constraint canonical_change_proposals_status_valid check (
    status in (
      'VALIDATING',
      'VALIDATION_FAILED',
      'STALE',
      'PR_OPEN',
      'CHECKS_PENDING',
      'CHECKS_FAILED',
      'MERGED',
      'CLOSED',
      'SUPERSEDED',
      'FAILED'
    )
  ),
  constraint canonical_change_proposals_branch_valid check (
    branch_name is null
    or (
      char_length(branch_name) between 1 and 240
      and branch_name = btrim(branch_name)
      and branch_name <> 'main'
    )
  ),
  constraint canonical_change_proposals_commit_valid check (
    commit_sha is null or commit_sha ~ '^[0-9a-f]{40}$'
  ),
  constraint canonical_change_proposals_pr_number_valid check (
    pull_request_number is null or pull_request_number >= 1
  )
);

create table studio_registry.canonical_change_proposal_events (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid not null,
  change_request_id text not null,
  event_type text not null,
  details jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  constraint canonical_change_proposal_events_proposal_fk
    foreign key (actor_user_id, change_request_id)
    references studio_registry.canonical_change_proposals(actor_user_id, change_request_id)
    on delete restrict,
  constraint canonical_change_proposal_events_type_valid check (
    char_length(event_type) between 1 and 120
    and event_type = btrim(event_type)
  ),
  constraint canonical_change_proposal_events_details_object check (
    jsonb_typeof(details) = 'object'
  )
);

create index canonical_change_proposals_semantic_updated_idx
on studio_registry.canonical_change_proposals (semantic_id, updated_at desc);

create index canonical_change_proposal_events_request_idx
on studio_registry.canonical_change_proposal_events (actor_user_id, change_request_id, occurred_at desc);

create trigger canonical_change_proposals_touch_updated_at
before update on studio_registry.canonical_change_proposals
for each row execute function studio_registry.touch_updated_at();

create trigger canonical_change_proposal_events_append_only
before update or delete on studio_registry.canonical_change_proposal_events
for each row execute function studio_registry.reject_history_mutation();

alter table studio_registry.canonical_change_proposals enable row level security;
alter table studio_registry.canonical_change_proposal_events enable row level security;

revoke all on table studio_registry.canonical_change_proposals
from public, anon, authenticated, service_role;
revoke all on table studio_registry.canonical_change_proposal_events
from public, anon, authenticated, service_role;

grant select, insert, update on table studio_registry.canonical_change_proposals to service_role;
grant select, insert on table studio_registry.canonical_change_proposal_events to service_role;

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
      'registry.metadata.edit',
      'canonical.change.propose'
    ]::text[]
    when 'Approver'::studio_registry.studio_role then array[
      'studio.read',
      'registry.metadata.edit',
      'canonical.change.propose',
      'review.approve',
      'review.freeze'
    ]::text[]
    when 'Admin'::studio_registry.studio_role then array[
      'studio.read',
      'registry.metadata.edit',
      'canonical.change.propose',
      'studio.membership.manage'
    ]::text[]
  end;
$$;

create or replace function public.prepare_studio_canonical_change_proposal(
  p_actor_user_id uuid,
  p_change_request_id text,
  p_semantic_id text,
  p_canonical_git_path text,
  p_content_type text,
  p_base_revision text,
  p_operation_kind text,
  p_request_json jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_existing studio_registry.canonical_change_proposals%rowtype;
  v_row studio_registry.canonical_change_proposals%rowtype;
begin
  if p_actor_user_id is null then
    raise exception 'actor user id is required' using errcode = '22023';
  end if;
  if not studio_registry.has_capability(p_actor_user_id, 'canonical.change.propose') then
    raise exception 'studio capability denied' using errcode = '42501';
  end if;
  if p_change_request_id is null or char_length(btrim(p_change_request_id)) not between 8 and 128 then
    raise exception 'change request id must be 8 to 128 characters' using errcode = '22023';
  end if;
  if p_semantic_id is null or char_length(btrim(p_semantic_id)) not between 1 and 200 or btrim(p_semantic_id) ~ '[[:space:]]' then
    raise exception 'semantic id is invalid' using errcode = '22023';
  end if;
  if p_canonical_git_path <> 'content/narrative/story.json'
     or p_content_type <> 'fantasia.story.node.v1'
     or p_operation_kind <> 'set-node-summary' then
    raise exception 'canonical change target is not allowlisted' using errcode = '22023';
  end if;
  if p_base_revision is null or btrim(p_base_revision) !~ '^[0-9a-f]{40}$' then
    raise exception 'base revision must be a full Git SHA' using errcode = '22023';
  end if;
  if p_request_json is null or jsonb_typeof(p_request_json) <> 'object' then
    raise exception 'request json must be an object' using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_actor_user_id::text || ':canonical-change:' || btrim(p_change_request_id), 0)
  );

  select proposal.*
  into v_existing
  from studio_registry.canonical_change_proposals as proposal
  where proposal.actor_user_id = p_actor_user_id
    and proposal.change_request_id = btrim(p_change_request_id);

  if found then
    if v_existing.request_json <> p_request_json
       or v_existing.semantic_id <> btrim(p_semantic_id)
       or v_existing.base_revision <> btrim(p_base_revision) then
      raise exception 'change request id already used for a different request' using errcode = '22023';
    end if;
    return jsonb_build_object('replayed', true, 'proposal', to_jsonb(v_existing));
  end if;

  insert into studio_registry.canonical_change_proposals (
    actor_user_id,
    change_request_id,
    semantic_id,
    canonical_git_path,
    content_type,
    base_revision,
    operation_kind,
    request_json
  ) values (
    p_actor_user_id,
    btrim(p_change_request_id),
    btrim(p_semantic_id),
    p_canonical_git_path,
    p_content_type,
    btrim(p_base_revision),
    p_operation_kind,
    p_request_json
  ) returning * into v_row;

  insert into studio_registry.canonical_change_proposal_events (
    actor_user_id,
    change_request_id,
    event_type,
    details
  ) values (
    p_actor_user_id,
    v_row.change_request_id,
    'proposal.created',
    jsonb_build_object(
      'semanticId', v_row.semantic_id,
      'path', v_row.canonical_git_path,
      'baseRevision', v_row.base_revision
    )
  );

  return jsonb_build_object('replayed', false, 'proposal', to_jsonb(v_row));
end;
$$;

create or replace function public.record_studio_canonical_change_proposal_result(
  p_actor_user_id uuid,
  p_change_request_id text,
  p_status text,
  p_event_type text,
  p_branch_name text default null,
  p_commit_sha text default null,
  p_pull_request_number bigint default null,
  p_pull_request_url text default null,
  p_validation_message text default null,
  p_details jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_row studio_registry.canonical_change_proposals%rowtype;
begin
  if p_actor_user_id is null or p_change_request_id is null then
    raise exception 'actor and change request id are required' using errcode = '22023';
  end if;
  if p_status not in ('VALIDATION_FAILED','STALE','PR_OPEN','CHECKS_PENDING','CHECKS_FAILED','MERGED','CLOSED','SUPERSEDED','FAILED') then
    raise exception 'proposal status is invalid' using errcode = '22023';
  end if;
  if p_event_type is null or char_length(btrim(p_event_type)) not between 1 and 120 then
    raise exception 'proposal event type is invalid' using errcode = '22023';
  end if;
  if p_details is null or jsonb_typeof(p_details) <> 'object' then
    raise exception 'proposal event details must be an object' using errcode = '22023';
  end if;

  update studio_registry.canonical_change_proposals
  set status = p_status,
      branch_name = coalesce(p_branch_name, branch_name),
      commit_sha = coalesce(p_commit_sha, commit_sha),
      pull_request_number = coalesce(p_pull_request_number, pull_request_number),
      pull_request_url = coalesce(p_pull_request_url, pull_request_url),
      validation_message = p_validation_message
  where actor_user_id = p_actor_user_id
    and change_request_id = btrim(p_change_request_id)
  returning * into v_row;

  if not found then
    raise exception 'canonical change proposal not found' using errcode = 'P0002';
  end if;

  insert into studio_registry.canonical_change_proposal_events (
    actor_user_id,
    change_request_id,
    event_type,
    details
  ) values (
    p_actor_user_id,
    v_row.change_request_id,
    btrim(p_event_type),
    p_details
  );

  return to_jsonb(v_row);
end;
$$;

create or replace function public.get_studio_canonical_change_proposal(
  p_actor_user_id uuid,
  p_change_request_id text
)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_row studio_registry.canonical_change_proposals%rowtype;
begin
  if p_actor_user_id is null or p_change_request_id is null then
    raise exception 'actor and change request id are required' using errcode = '22023';
  end if;
  if not studio_registry.has_capability(p_actor_user_id, 'studio.read') then
    raise exception 'studio capability denied' using errcode = '42501';
  end if;

  select proposal.* into v_row
  from studio_registry.canonical_change_proposals as proposal
  where proposal.actor_user_id = p_actor_user_id
    and proposal.change_request_id = btrim(p_change_request_id);

  if not found then
    raise exception 'canonical change proposal not found' using errcode = 'P0002';
  end if;

  return to_jsonb(v_row);
end;
$$;

revoke all on function public.prepare_studio_canonical_change_proposal(uuid, text, text, text, text, text, text, jsonb)
from public, anon, authenticated;
revoke all on function public.record_studio_canonical_change_proposal_result(uuid, text, text, text, text, text, bigint, text, text, jsonb)
from public, anon, authenticated;
revoke all on function public.get_studio_canonical_change_proposal(uuid, text)
from public, anon, authenticated;

grant execute on function public.prepare_studio_canonical_change_proposal(uuid, text, text, text, text, text, text, jsonb)
to service_role;
grant execute on function public.record_studio_canonical_change_proposal_result(uuid, text, text, text, text, text, bigint, text, text, jsonb)
to service_role;
grant execute on function public.get_studio_canonical_change_proposal(uuid, text)
to service_role;
