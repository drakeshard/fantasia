# Content Studio registry authority note

The `studio_registry` database schema is workflow/metadata infrastructure only. It must never become mutable authority for character stats, skills, equipment balance, narrative, maps, encounters, combat rules, rewards, economy, or other canonical Fantasia content.

Git remains authoritative for structured definitions and the accepted runtime semantic manifest. Google Drive remains current source/master production-asset authority. Provider identifiers remain replaceable metadata. Existing player/account persistence remains separate from Studio content identity.
