# CH01-B01 — Strangers on the Road — Layout Candidate v001

Status: **Provisional / Layout Candidate / not GAME-D222 compliant**.

This is an inspectable geometry proposal for owner review. It follows the frozen GAME-D221 geometry-first rule and current repository narrative authority, but the original approved GAME-D222 prompt text is still unavailable. Merging or validating this candidate does not approve the map and does not make CH01-B01 production-executable.

Authoritative candidate coordinate data lives in `content/encounters/candidates/ch01-b01.layout-candidate.json`. This document is only a readable review view of that data.

## Story constraints preserved

- First mandatory France battle in the wooded farmland / Loire approaches east of Orléans.
- Civilians and a supply cart are threatened by armed foragers/stragglers.
- MC is injured and can move, assist, interact, and survive, but normal Attack remains disabled.
- Julie and local escorts are already defending the group.
- Hangaku Gozen first enters under the knowledge-gated label **Unknown Warrior** through a precise ranged intervention.
- La Hire later enters under **Rough Swordsman** from the side during the rear-pressure escalation.
- The final objective shifts to getting the civilians and cart through the opened route toward shelter.
- Hangaku/La Hire names are revealed after the danger has passed, not by the map data.

## Coordinate convention

- Grid: **18 × 12** candidate footprint.
- Bounds: `x = 0..17`, `y = 0..11`.
- `(0,0)` is north-west; X increases east; Y increases south.
- Ground movement remains four-cardinal.
- The 18×12 size is a first playtest assumption, not a project-wide map-size standard.

## Readable blueprint

```text
   012345678901234567
00 ####...........###
01 #####...^^^^...###
02 ######..^^H^^...##
03 ###..##..^^^^.....
04 ....E..f..f.======
05 ==c===J=f=========
06 ====CC============
07 ..cM.E...f........
08 ..r.c..f..........
09 ##.r....##########
10 ###.....##########
11 ####.L..##########
```

Legend:

- `#` static impassable woodland/field-boundary footprint.
- `=` functional road / cart corridor.
- `^` candidate elevation +1 north ridge.
- `C` starting 2×1 cart footprint.
- `M` MC.
- `J` Julie.
- `E` local escort.
- `c` protected civilian.
- `f` initial forager/straggler pressure marker.
- `H` Hangaku candidate entry cell at `(10,2)`.
- `r` candidate rear-pressure reinforcement entry.
- `L` La Hire candidate side-entry cell at `(5,11)`.
- `.` ordinary passable candidate ground with no additional rule authored here.

The symbols are review overlays only. They do not add unit-facing, cover, LoS, weather, hazard, or difficult-ground rules.

## Cart route

The candidate cart is a **2×1 east-west footprint** whose anchor is the western occupied cell. This footprint exists only to validate clearance; current production runtime does not yet implement cart objective movement semantics.

Candidate anchor route:

```text
(4,6) → (5,6) → (6,6) → (7,6) → (8,6) → (9,6)
      → (10,6) → (11,6) → (12,6) → (12,5) → (13,5)
      → (14,5) → (15,5) → (16,5)
```

At every anchor, both the anchor cell and its eastern footprint cell must stay in-bounds, passable, and inside the functional road corridor. The final footprint `(16,5)+(17,5)` is inside the east exit zone.

## Phase-to-geometry intent

| Approved story beat | Candidate geometry use |
| --- | --- |
| `CH01-B01-BEAT-01` — Protect the Cart | Cart/civilians begin on the west approach while initial enemy pressure occupies the central/east road edges. MC starts south-west of the cart and remains attack-limited. |
| `CH01-B01-BEAT-02` — An Arrow From Nowhere | Hangaku enters from the north ridge at `(10,2)`. The elevation makes the intervention spatially readable without defining universal LoS/cover or a mandatory high-ground bonus. |
| `CH01-B01-BEAT-03` — A Loud Reinforcement | Rear pressure arrives through south-west entries `(2,8)` and `(3,9)`; La Hire enters independently from the southern side at `(5,11)`. |
| `CH01-B01-BEAT-04` — Get Them Through | Focus changes from holding the cart to moving the cart/civilians through the two-cell-wide east corridor and exit zone. |
| `CH01-B01-BEAT-05` — Names After Danger | No new battlefield geometry. Identity reveal is narrative state after the group clears danger. |

## Candidate-only assumptions

The following are **not frozen** by this layout: 18×12 size, exact obstacle cells, five initial attackers, two rear-pressure reinforcements, deployment cells, the 2×1 cart footprint, the +1 north ridge, and all numeric balance. They exist so the map can be inspected and pressure-tested rather than remaining prose-only.

No difficult-ground costs, cover values, LoS rules, hazards, destructibles, Weather, secret routes, reward rules, or stage-clear semantics are introduced.

## Runtime gaps before production B01

Even after geometry approval, production routing still requires title-local implementation for:

1. cart/objective footprint and movement semantics;
2. protected-civilian behavior and defeat/failure semantics;
3. phase/reinforcement triggers;
4. MC's battle restriction that disables normal Attack here;
5. the exact B01 victory/failure predicate; and
6. B01-specific actors, AI/content values, and encounter composition.

The current generic production battle remains a development/renderer fixture and must not be silently reused as canonical CH01-B01.

## Review gate

Owner review should decide whether to **accept, correct, or reject** the geometry. Only an explicit acceptance may promote this from Layout Candidate. Decorative environment art and production battle execution remain later gates.
