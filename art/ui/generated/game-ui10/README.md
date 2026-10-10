# GAME-UI10 generated UI art register

Status: owner-approved presentation integration pass, 2026-10-11.

This register records the generated Fantasia UI art used by GAME-UI10. The assets are title-local presentation material. They do not define campaign geography, story canon, progression, economy, rewards, or gameplay rules.

## Source generation set

The design pass produced four source images outside the runtime bundle:

- `sunset_over_the_fleur_de_lis_kingdom.png` — 1672×941 cinematic kingdom ambience.
- `gothic_royal_fantasy_ui_asset_sheet.png` — 1448×1086 RGBA UI chrome exploration.
- `gilded_fantasy_rpg_icon_sprite_sheet.png` — 1448×1086 RGBA icon exploration.
- `fantasy_map_icon_collection.png` — 1448×1086 RGBA map/marker exploration.

The generated source sheets are working visual source material, not a canonical atlas contract. Runtime pages use cropped/optimized derivatives rather than loading the full sheets.

## Runtime derivatives

Runtime derivatives live under `apps/web/public/assets/ui/` and use semantic stable names:

- `fantasia_ui_home_kingdom_bg_v001.webp`
- `fantasia_ui_icon_campaign_v001.webp`
- `fantasia_ui_icon_summon_v001.webp`
- `fantasia_ui_icon_settings_v001.webp`
- `fantasia_ui_icon_story_v001.webp`
- `fantasia_ui_icon_battle_v001.webp`

The Home kingdom derivative is deliberately presentation-only. It must not be described as Orléans, France, the Saga I map, or any other canonical location. Saga and Chapter route geometry continue to come from the existing campaign presentation/data, not from this illustration.

## Implementation rules

- Player-readable/localizable text remains DOM text.
- Icons and backgrounds are enhancement layers; essential navigation remains semantic without them.
- Generated imagery may be replaced by a later reviewed art revision without changing game/runtime contracts.
- No generated icon implies an implemented account, reward, summon, economy, shop, mail, event, stamina, or backend system.
- Summon remains unavailable until its gameplay/domain requirements exist.
- This register is presentation provenance, not Visual Reference Approved status for unrelated maps, characters, equipment, or environments.
