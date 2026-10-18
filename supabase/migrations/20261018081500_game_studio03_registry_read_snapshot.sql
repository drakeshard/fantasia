create or replace function public.get_studio_registry_read_snapshot(
  p_user_id uuid
)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
begin
  if p_user_id is null then
    raise exception 'user id is required' using errcode = '22023';
  end if;

  if not studio_registry.has_capability(p_user_id, 'studio.read') then
    raise exception 'studio capability denied' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'observedAt', pg_catalog.clock_timestamp(),
    'contentEntities', coalesce((
      select jsonb_agg(to_jsonb(entity) order by entity.semantic_id)
      from studio_registry.content_entities as entity
    ), '[]'::jsonb),
    'assets', coalesce((
      select jsonb_agg(to_jsonb(asset) order by asset.semantic_id)
      from studio_registry.assets as asset
    ), '[]'::jsonb),
    'assetVersions', coalesce((
      select jsonb_agg(to_jsonb(version) order by version.asset_id, version.version_number)
      from studio_registry.asset_versions as version
    ), '[]'::jsonb),
    'entityRelations', coalesce((
      select jsonb_agg(to_jsonb(relation) order by relation.source_entity_id, relation.relation_type, relation.target_entity_id)
      from studio_registry.entity_relations as relation
    ), '[]'::jsonb),
    'assetRelations', coalesce((
      select jsonb_agg(to_jsonb(relation) order by relation.source_asset_id, relation.relation_type, relation.target_asset_id)
      from studio_registry.asset_relations as relation
    ), '[]'::jsonb),
    'runtimeDerivatives', coalesce((
      select jsonb_agg(to_jsonb(derivative) order by derivative.semantic_id)
      from studio_registry.runtime_derivatives as derivative
    ), '[]'::jsonb),
    'validationResults', coalesce((
      select jsonb_agg(to_jsonb(validation) order by validation.checked_at desc, validation.id)
      from studio_registry.validation_results as validation
    ), '[]'::jsonb),
    'changeEvents', coalesce((
      select jsonb_agg(to_jsonb(event) order by event.occurred_at desc, event.id)
      from studio_registry.change_events as event
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.get_studio_registry_read_snapshot(uuid)
from public, anon, authenticated;

grant execute on function public.get_studio_registry_read_snapshot(uuid) to service_role;
