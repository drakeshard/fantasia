# Content Studio registry advisor posture

The GAME-STUDIO01 registry intentionally enables RLS without browser policies. `anon` and ordinary `authenticated` roles receive no schema/table privileges; STUDIO02 will introduce explicit Studio membership and trusted operations rather than granting generic browser access.

Consequently, Supabase's `rls_enabled_no_policy` informational lint is expected for the eight `studio_registry` tables during STUDIO01 and should not be "fixed" by adding permissive placeholder policies.

Fresh registry indexes may also appear under the `unused_index` informational lint until real Studio traffic exists. Covering indexes for the two composite ownership foreign keys are present and the `unindexed_foreign_keys` lint is clear after the follow-up migration.
