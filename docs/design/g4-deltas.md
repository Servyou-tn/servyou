# G4 « Tableau de bord vendeur » — Figma ↔ page delta pass

**Report only.** Nothing in this file has been fixed. It is the input to a scope call, not a work
order.

**Measured** 2026-07-28 against `feat/g4-seller-dashboard` @ `90479f3`, dev server on :3000, fresh
`.next`. Page side is computed geometry from a headless Chrome at 1440×900, FR
(`servyou_lang=fr`), **logged in as the real shop owner** (`moatezsahbeni500@gmail.com`, OM shop) —
not eyeballed from a screenshot. Figma side is the live node tree read over the **Figma MCP**
(file `jDNjJ8D1gnXiW7Ry3GkN4U`); the figma-cli CDP bridge was down (port 9222 closed) and
reconnecting it means killing a running Figma, which the MCP path avoids entirely.

| node | region |
|---|---|
| `475:21134` | Seller dashboard — desktop (mocked, busy day) |
| `484:24205` | Specimen — « journée calme (rien à traiter) », the built-to target |
| `475:21223` | Topbar instance (1200×64) |
| `484:24207` | Header (title · subline · CTA) |
| `484:24212` | Stats row (4 × glance tile) |
| `484:24217` | Action Center |
| `484:24290` | Rail (Stock faible · Actions rapides) |

**Classes.** `STRUCTURAL` — an element is absent, extra, or reordered, or the layout shape itself
differs. `SPACING` — a size, gap, padding or line-height that differs numerically. `COLOUR` — a
paint-level value. `COPY` — wording. `DATA` — differs **only** because the database holds different
content than the mock; not a defect.

---

## ⚠ Read this before filing any width delta

Every horizontal measurement on the page side is **exactly 15px narrower** than Figma, at every
level of the tree:

| region | Figma | page | Δ |
|---|---|---|---|
| content row | 1136 | 1121 | −15 |
| action-center | 1136 | 1121 | −15 |
| main panel | 752 | 742 | −10 |
| rail panel | 360 | 355 | −5 |
| glance tile | 272 | 268 | −4 |

This is **not** a defect and must not be "fixed". `scrollbar-gutter: stable` on the app root
(shipped in `fix/e3-filter-and-rail`) reserves 15px, so the real viewport is 1425, and
1425 − 240 sidebar = 1185 of chrome → 1121 of content. The `−10 / −5 / −4` figures are that same
15px distributed by the `752fr/360fr` grid and the 4-up tile row; they re-add exactly
(742 + 24 + 355 = 1121; 4×268 + 3×16 = 1120). Figma assumes a 1440 canvas with no scrollbar.

---

## STRUCTURAL — 4

| # | region | Figma | page | note |
|---|---|---|---|---|
| **S1** | Sidebar — nav labels + scroller | full labels, **no scrollbar track** | labels **clipped to 87px** → "Mes pr…", "Comm…"; a **15px scrollbar track** on short viewports | ⚑ **TWO independent causes — my first pass reported only one and got it wrong.** See the correction note below. |
| **S2** | Glance tile — value slot | a **number** ("0", "2 840 TND", "12", "28"), one line | "Bénéfice net" renders the string **"Bientôt disponible"** at 28px Bold → **wraps to 2 lines** (84px), which stretches the whole 4-up grid row | the deferred-state copy does not fit a slot designed for a number. Deliberate divergence (no `delivery_fee` column) — but the *presentation* needs a decision, not the value. |
| **S3** | Header CTA | label text is **"+ Ajouter un produit"** (the `+` is part of the string; `Button.icon = false`) | lucide `Plus` **icon** + "Ajouter un produit" | visually near-identical; the difference is whether the glyph is text or an icon |
| **S4** | Topbar — bottom edge | instance is **64** tall, total | **65** — `header` carries `border-b` *outside* an inner `div.h-16` | 1px. Shared shell (`Topbar.tsx:35-36`), affects all ~20 AppShell routes, not just G4 |

### S1 — correction, and how the first measurement was wrong

The first pass reported "there is no scrollbar; the badge is the only cause". **Half right.** The
founder pushed back with a screenshot showing a grey track. Both things are true:

1. **The badge clips the label at every viewport height.** The row is 208 wide; `px-3` (24) + a
   20px icon + `gap-3` (12) left exactly **152px** for the label, and the `ms-auto` "Bientôt" badge
   took 65 of it. Both badged rows measured exactly **87px** against the 100 / 153 they need, while
   every unbadged row rendered at natural width.
2. **The nav really does scroll, below a ~616px viewport.** Its content is **508px** tall. Measured:
   at 620 → `clientHeight` 512, no scroll; at **600 → `scrollHeight` 508 vs `clientHeight` 492,
   `offsetWidth − clientWidth` = 15**. A classic 15px Windows track then eats *another* 15px out of
   the row, compounding cause 1.

**Why the first pass missed it.** Two probe defects, both mine:
- It swept 900 / 800 / 700 only — every one of those is *above* the 616 threshold, so "no scroller"
  was true for the heights tested and false for the founder's actual window.
- Its negative control was **broken and reported a false pass**: it appended a `height:2000px` div
  to the nav to prove the probe could see a scroller, but the nav is `flex flex-col`, so the
  injected div was shrunk by flexbox and `scrollHeight` never grew. The control returned "no
  offenders" — indistinguishable from the real result. Fixed by injecting with
  `flex: 0 0 2000px`, after which the control correctly reported `scrollH 2510 / clientH 613 /
  scrollbarW 15`. **A negative control that cannot fail is not a control**; this one silently
  validated a blind probe.

## SPACING — 6

| # | region | Figma | page | note |
|---|---|---|---|---|
| **P1** | Glance tile — value line-height | `leading-[normal]` ⇒ **≈34px** for 28px Inter | **42px** | ⚑ root cause of the tall tile: Tailwind's `leading-normal` is **1.5** (=42px), *not* CSS `line-height: normal` (≈1.21). Different thing, same word. |
| **P2** | Glance tile — total height | **196** | **248** | 196 = 24+24 pad + 48 icon + 16 gap + 84 stack. Page = same, but stack is 92 (P1) **and** the row is stretched by S2's wrap. Fixing P1 alone lands a non-wrapping tile at exactly 196. |
| **P3** | Rail — "Actions rapides" row height | **100** (authored fixed) | **52** (`py-8` + 36 chip, hugs) | deliberate at build time and flagged in-code: with live data the rail holds 1 row, not 3, and a fixed 100 leaves ~48px dead space per row. Listed so the call is explicit, not silent. |
| **P4** | Rail — "Stock faible" row height | **100** (authored fixed) | **49** | same reasoning as P3 |
| **P5** | H1 line-height | `leading/h1` = **38** | **40** | the documented typography-token gap — `tokens.css` deliberately does not emit typography, so the shipped ramp diverges. Not G4-specific. |
| **P6** | H3 line-height (panel + AC titles) | `leading/h3` = **26** | **28** | same token gap as P5 |

## COLOUR — 0

No paint-level differences found. Fills, borders, radii and weights match the measured Figma at
every region checked (tile `border/subtle` + `shadow/xs` + `radius/xl`; action-center `blue/50` +
1.5px `blue/200`; panels `surface/base` + `border/subtle`; CTA `blue/600` + `radius/lg` = 10px —
the radius resolves correctly here despite the older `SidebarItem.tsx` note claiming
`rounded-lg` still falls back to 8px).

## COPY — 2

| # | region | Figma | page |
|---|---|---|---|
| **C1** | Header title | **"Bienvenue, {shop} 👋"** | "Bonjour, {shop}" — different verb, **no emoji** |
| **C2** | Header subline | **"Voici ce qui se passe dans votre boutique aujourd'hui."** | "Voici ce qui demande votre attention aujourd'hui." |

## DATA — 4 (not defects)

The frames mock a busy shop; the live shop is quiet. Recorded so nobody files these as gaps.

| # | region | Figma mock | live |
|---|---|---|---|
| D1 | Action Center | specimen: empty state, count chip hidden · main frame: 4 rows | **1 row** ("Confirmer" on the pending order) + count chip "1" |
| D2 | Commandes en cours | 5 List Rows (574 tall) | **0 in flight** → empty state (473 tall) |
| D3 | Stock faible | 3 rows (414 tall) | **1 row** (143 tall) |
| D4 | Glance values | 0 / 2 840 TND / 12 / 28 | 1 / — / 0 / 8 |

---

## Suggested scope

**Close (cheap, clearly right):** S1 (badge overlap — a G4 regression), P1 (line-height, one class,
lands the tile on 196 exactly), C1 + C2 (copy, FR + AR).

**Founder call:** S2 — the deferred "Bénéfice net" copy needs a presentation that fits a numeric
slot. Options: shorten to "—" with the subtitle carrying the explanation; render the deferred label
at `text-body` instead of 28px; or drop the tile until `delivery_fee` lands.

**Out of scope here (shared shell / tokens, own PR):** S4 (topbar 1px, all routes), P5 + P6
(typography token gap, platform-wide).

**Already decided, listed for completeness:** P3 + P4 — the fixed-100 rail rows were deliberately
not replicated; reversing that is a design call, not a bug fix.

---

## Closed in `fix/g4-figma-deltas`

Founder scope call, 2026-07-28. Every "after" figure below is re-measured, not predicted.

| # | fix | after |
|---|---|---|
| **S1a** | Inline "Bientôt" badge removed from the nav row; the deferred affordance now rides on the muted treatment + `title` + `aria-disabled`, which costs zero horizontal space | no clipped label in **either** locale |
| **S1b** | `gap-3` → `gap-2.5` on the nav row (12 → 10px). "Commandes reçues" needs **153** and had **152** — a 1px shortfall that still drew an ellipsis | FR "Commandes reçues" **153/153**, exact fit |
| **S1c** | Scrollbar **chrome** hidden (`[scrollbar-width:none]` + WebKit pseudo) while `overflow-y-auto` stays | at 600: `scrolls: true`, `scrollbarW: **0**` — scrolling preserved, track gone, #91's no-clip intent intact |
| **P1** | `leading-normal` → `leading-[normal]` on the tile value | tile **248 → 198** (Figma 196; the residual 2px is the P5/P6 typography-token gap, out of scope) |
| **S2** | Value slot is now **"—"**; "Bientôt disponible" moved to the caption line | no wrap, all four tiles equal height. "—" reads as *no value yet*, not as zero — unbuilt profit and zero profit are different claims |
| **C1** | "Bonjour, {shop}" → **"Bienvenue, {shop} 👋"** | FR + AR, emoji included |
| **C2** | subline → **"Voici ce qui se passe dans votre boutique aujourd'hui."** / **"إليك ما يجري في متجرك اليوم."** | FR + AR |

Dead key `seller.dashboard.tile.profit_sub` ("Commandes livrées") removed from both dictionaries —
S2 left it with no consumer.

**Deliberately still open:** S3 (CTA icon-vs-text `+`), S4 (topbar 1px — rides with the 375px
topbar-overflow fix, same component), P3 + P4 (fixed-100 rail rows), P5 + P6 (typography tokens).

**AR note:** tiles measure **216** in Arabic vs 198 in French — one label wraps to a second line at
the 268px tile width. Expected: the frames are FR-only and Arabic runs longer. All four tiles stay
equal height and nothing clips, so this is recorded, not filed.
