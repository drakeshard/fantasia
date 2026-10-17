# Content Studio registry security boundary

GAME-STUDIO01 stores registry data but does not define Studio-user authorization. The `studio_registry` schema is revoked from `public`, `anon`, and ordinary `authenticated` roles. Trusted server access is reserved for `service_role`; append-only validation and audit tables further remove UPDATE/DELETE and reject mutation with triggers.

GAME-STUDIO02 must add explicit Studio membership/roles and narrow Operations API methods. It must not solve authorization by granting generic browser access to the registry schema.
