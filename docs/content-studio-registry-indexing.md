# Content Studio registry indexing

The registry includes explicit lookup/history indexes plus covering indexes for the two composite ownership/provenance foreign keys:

- `assets_current_version_owner_idx (current_version_id, semantic_id)`
- `runtime_derivatives_source_owner_idx (source_asset_version_id, asset_id)`

These match the corresponding foreign-key column order and keep provider/version integrity checks efficient as registry volume grows. Fresh empty-table indexes may remain reported as unused until Studio traffic begins.
