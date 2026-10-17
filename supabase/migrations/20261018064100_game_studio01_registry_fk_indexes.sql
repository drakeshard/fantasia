create index assets_current_version_owner_idx
on studio_registry.assets (current_version_id, semantic_id)
where current_version_id is not null;

drop index studio_registry.runtime_derivatives_source_idx;

create index runtime_derivatives_source_owner_idx
on studio_registry.runtime_derivatives (source_asset_version_id, asset_id);
