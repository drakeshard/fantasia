# Fantasia title-local UI assets

These files are presentation assets owned by `apps/web`. They do not define campaign truth, gameplay rules, economy state, canonical geography, or story reveals.

## Runtime contract

- Player-readable/localizable text stays in DOM/UI code.
- Prefer one semantic derivative over loading a whole generated/source sheet.
- Reusable asset names follow `fantasia_ui_<component>_<variant>_<state>_v###.<ext>` where the omitted segments are not meaningful.
- SVG is preferred for interface glyphs and ornaments so the same asset survives responsive scaling.
- The current repository path is the runtime origin. A future CDN migration should preserve these semantic filenames/asset roles and only change the URL resolver/origin.

## GAME-UI15 core family

| Asset | Role | Status |
| --- | --- | --- |
| `core/fantasia_ui_brand_crest_v001.svg` | Fantasia wordmark/brand crest | production presentation |
| `core/fantasia_ui_icon_home_default_v001.svg` | Home dock glyph | production presentation |
| `core/fantasia_ui_icon_campaign_default_v001.svg` | Campaign/current-Saga glyph | production presentation |
| `core/fantasia_ui_icon_characters_default_v001.svg` | Characters/archive glyph | production presentation; added by GAME-UI20 |
| `core/fantasia_ui_icon_summon_default_v001.svg` | Summon glyph | production presentation; feature may remain unavailable |
| `core/fantasia_ui_icon_settings_default_v001.svg` | Settings utility glyph | production presentation |
| `core/fantasia_ui_icon_chevron_right_v001.svg` | Primary forward-action cue | production presentation |
| `core/fantasia_ui_icon_lock_v001.svg` | Explicit unavailable/locked cue | production presentation |
| `core/fantasia_ui_ornament_crest_ring_v001.svg` | Reusable emblem ring | production presentation |
| `core/fantasia_ui_ornament_corner_v001.svg` | Scalable panel corner accent | production presentation |
| `core/fantasia_ui_ornament_divider_v001.svg` | Thin ornamental divider | production presentation |

The existing `fantasia_ui_home_kingdom_bg_v001.webp` remains non-canonical lobby ambience only. Existing WEBP icon derivatives remain valid for earlier screens; GAME-UI15 introduces the SVG family as the preferred Home/runtime icon language without silently redefining other screens.