# Fantasia Home UI asset manifest

Status: title-local reusable presentation assets for GAME-UI15. These files do not create gameplay, economy, campaign, character, or geography authority.

## Runtime vector family

All current vector assets use a 24px optical family unless noted otherwise. They intentionally contain no localized/player-readable text. Runtime coloring is applied by CSS masks so semantic state colors can change without duplicating files.

| Asset | Role | Notes |
| --- | --- | --- |
| `fantasia_ui_brand_crest_default_v001.svg` | Fantasia shell crest | 48×48 viewBox; brand/presentation only. |
| `fantasia_ui_icon_home_default_v001.svg` | Home navigation | Reusable primary-nav icon. |
| `fantasia_ui_icon_campaign_default_v001.svg` | Campaign/Saga navigation | Reusable campaign-content icon. |
| `fantasia_ui_icon_summon_default_v001.svg` | Summon presentation | Does not imply a working gacha system. |
| `fantasia_ui_icon_settings_default_v001.svg` | Settings utility | Reusable utility icon. |
| `fantasia_ui_icon_chevron_right_default_v001.svg` | Forward/Continue affordance | Decorative inside an already-labelled action. |
| `fantasia_ui_icon_lock_default_v001.svg` | Unavailable/locked cue | Must be paired with readable state text. |
| `fantasia_ui_ornament_corner_default_v001.svg` | Small frame/dock ornament | Decorative; never carries state by itself. |

## Existing raster derivatives

Existing `fantasia_ui_icon_*_v001.webp` and `fantasia_ui_home_kingdom_bg_v001.webp` assets remain valid title-local derivatives from GAME-UI10. The Home kingdom panorama is non-canonical ambience and must not be interpreted as Orléans, Saga I geography, or approved settlement geometry.

## CDN migration rule

UI components refer to stable semantic asset filenames under `/assets/ui/`. A later CDN migration should preserve the semantic filenames or introduce a single asset-base resolver. Do not encode CDN hosts into game/runtime domain state and do not change accessible labels when asset hosting changes.
