create or replace function public.get_studio_dashboard_canonical_proposals(
  p_user_id uuid
)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_items jsonb;
begin
  if p_user_id is null then
    raise exception 'user id is required' using errcode = '22023';
  end if;

  if not studio_registry.has_capability(p_user_id, 'studio.read') then
    raise exception 'studio capability denied' using errcode = '42501';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'changeRequestId', proposal.change_request_id,
        'semanticId', proposal.semantic_id,
        'status', proposal.status,
        'branchName', proposal.branch_name,
        'commitSha', proposal.commit_sha,
        'pullRequestNumber', proposal.pull_request_number,
        'pullRequestUrl', proposal.pull_request_url,
        'validationMessage', proposal.validation_message,
        'updatedAt', proposal.updated_at
      ) order by proposal.updated_at desc, proposal.change_request_id
    ),
    '[]'::jsonb
  )
  into v_items
  from studio_registry.canonical_change_proposals as proposal
  where proposal.status in (
    'VALIDATING',
    'VALIDATION_FAILED',
    'STALE',
    'PR_OPEN',
    'CHECKS_PENDING',
    'CHECKS_FAILED',
    'FAILED'
  );

  return jsonb_build_object(
    'state', 'available',
    'observedAt', pg_catalog.clock_timestamp(),
    'items', v_items
  );
end;
$$;

revoke all on function public.get_studio_dashboard_canonical_proposals(uuid)
from public, anon, authenticated;
grant execute on function public.get_studio_dashboard_canonical_proposals(uuid)
to service_role;
