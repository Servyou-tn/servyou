# /marche/services — Figma ↔ page delta pass

**Report only.** Nothing in this file has been fixed. It is the input to a scope call, not a work order.

**Measured** 2026-07-27 against `main` @ `919bfaf` (PR #89 merged), dev server on :3000, fresh
`.next`. Page side is computed geometry from a headless Chrome at 1440×900 and 375×812, FR
(`servyou_lang=fr`), not eyeballed from a screenshot. Figma side is the live node tree read over the
figma-cli CDP bridge (file `jDNjJ8D1gnXiW7Ry3GkN4U`), not a summary.

| node | region |
|---|---|
| `611:45637` | Services browse — desktop |
| `621:49740` | Services browse — mobile |
| `611:45640` | Topbar |
| `611:45644` | Filter bar (services) · shared Filter Bar `150:10825` |
| `124:6200` | Service Card v3.7 (variant `123:6120`) |
| `188:14219` | Pagination |
| `611:47916` | Empty state |

**Classes.** `STRUCTURAL` — an element is absent, extra, or reordered, or the layout shape itself
differs. This is the only class that costs real time. `SPACING` — a size, gap, or padding that
differs numerically. `COLOUR` — a paint-level value: fill, text or border colour, font weight,
radius. A fourth block, `COPY`, is appended: those differences are none of the three, and dropping
them to fit the taxonomy would have lost them.

---

## STRUCTURAL — 8

| # | region | Figma | page | note |
|---|---|---|---|---|
| S1 | Pagination — stack order | `pages` row first, caption **below** it | caption **above** the `nav` | `Pagination.tsx:104-108` renders `{caption}` before `<nav>` |
| S2 | Pagination — prev/next | icon-only **36×36** bordered arrows (`r=8`, stroke 1 `#e2e8f0`, chevron 16 `#475569`) | labelled text buttons "Précédent" / "Suivant" + chevron, **112.73×36** / **94.09×36**, no border | the label is `hidden sm:inline`, so mobile already matches Figma and desktop does not |
| S3 | Empty state — icon | **112×112** circle (`r-full`, fill `#f1f5f9`) wrapping a **64×64** icon | bare **40×40** svg, `#b8b8b8`, no circle | |
| S4 | Empty state — container edge | stroke **1 `#e2e8f0`** | **no border at all** — a drop shadow instead (`CARD_SHADOW` = `0 2px 8px rgba(0,0,0,0.04)`) | source-confirmed, so not a `ring-`-vs-`border` artifact. **Pointer corrected:** the services empty state is inline at `ServicesBrowsePage.tsx:107`, not `marche/EmptyState.tsx:18` — the two carried an identical class string and the original attribution named the wrong file. `marche/EmptyState` is imported only by `/mes-missions`. |
| S5 | Lens toggle — width | **HUG, 188** wide | **fills** the 1136 content row | segments stretch 82→106.33 as a consequence |
| S6 | Mobile — page header | page-level header (`pad 16`, `gap 12`): **"Marketplace" 20/Semi Bold `#0f172a`** + search | shared shell topbar (hamburger · logo · FR/AR · user) + search; **no page title** | 109 tall in Figma vs 117 live |
| S7 | Mobile — "Filtres" button | absent | rendered (opens the filter sheet) | functionally required; Figma frame simply has no filter affordance at 375 |
| S8 | Mobile — pagination | absent from the frame | full pagination block rendered | Figma shows 6 cards and stops; likely spec incompleteness, not a page defect |

## SPACING — 11

| # | region | Figma | page |
|---|---|---|---|
| P1 | Filter bar — search field height | **44** | **40** (selects are 40 in both) |
| P2 | Pagination — wrap gap | **10** | **8** (`gap-2`) |
| P3 | Pagination — cell gap | **4** | **6** (`gap-1.5`) |
| P4 | Pagination — caption size | **13** | **14** (`text-body-sm`) |
| P5 | Lens toggle — segment inner gap | **4** | **8** |
| P6 | Empty state — container padding | **48 40 48 40** | **48** all round |
| P7 | Empty state — title size | **20**/auto | **16**/24 |
| P8 | Empty state — body size | **16**/auto | **14**/21 |
| P9 | Empty state — CTA label size | **16**/26 | **14**/20 |
| P10 | Empty state — CTA padding | **0 16**, height 40 | **10 20**, height 40 |
| P11 | Mobile — card gap | **16** | **24** |

## COLOUR — 6

| # | region | Figma | page |
|---|---|---|---|
| C1 | Pagination — idle page cell | stroke **1 `#e2e8f0`** + fill **`#ffffff`** | transparent, no border |
| C2 | Pagination — idle page number | **Semi Bold** `#475569` | **w500** `#64748b` |
| C3 | Pagination — cell radius | **8** | **9999** (pill) |
| C4 | Lens toggle — segment radius | **8** | **10** |
| C5 | Empty state — CTA radius | **10** | **9999** (pill) |
| C6 | Topbar LangToggle — segment radius | **8** | **10** |

## COPY — 4 *(outside the three classes; cheap, but real)*

| # | region | Figma | page |
|---|---|---|---|
| T1 | Topbar search placeholder | "Rechercher une boutique, un produit…" | "Rechercher des produits..." — also the mobile instance |
| T2 | Empty state — title | "Aucun service trouvé" | "Aucun résultat" |
| T3 | Empty state — body | "Essayez d'élargir vos filtres ou de réinitialiser votre recherche" | "Ajustez votre recherche ou parcourez nos catégories" |
| T4 | Empty state — CTA | "Réinitialiser les filtres" | "Tout effacer" |

---

## CLEAN — verified, not re-measured

Both regions were already measured; this pass confirmed them against their documented values and
found no drift. Per the task framing they were treated as verification, not discovery.

- **Shell** — `611:45637` / `611:45640` vs `docs/design/marche-services-measurements.md`. Nav item
  44 / `r=10` / pad 0 12 / gap 12, active fill `#1f5fe0`; section cap 32 tall, 12px/600,
  letter-spacing **0.72px = 0.06em**, colour `#8faef9`; topbar 64 + 1px border, search 40 / `r=10` /
  border `#e2e8f0` / fill `#f8fafc` / `ps-9`. Every documented value matches. **CLEAN**, with one
  carve-out below.
  - ⚠ **The measurements doc is stale on one row, and the page is right.**
    `marche-services-measurements.md:31` files the language control with the *40×40 radius-10 icon
    buttons* (bell / lang / user). Figma `611:45640` shows `LangToggle` as a **93×32** pill
    (`r=10`, fill `#f1f5f9`, pad 4) holding two **42×24** / **43×24** segments — a different
    component entirely. The page renders the Figma shape (measured **92.33×32**, r=10, `#f1f5f9`,
    pad 4; segments 41.33/43×24, 14/21 w500, active `#0f172a` on white, idle `#475569`) and matches
    it on every value except segment radius (row **C6**). So the doc row wants correcting, not the
    page. Also unrelated to fidelity: that 24px-tall segment is the LangToggle touch-target
    follow-up already logged against the v2 shell.
- **Empty state CTA fill and body colour** were checked and are correct (`#1f5fe0` / `#64748b`) —
  recorded here rather than in the tables, which carry only differences.
- **ServiceListingCard** — `124:6200` vs the component's own header comment. Height **279** fixed,
  width fills the grid column (362.66 at 1440, 343 at 375), radius **12**, **2px `#1f5fe0`**
  outline, white fill. Every documented value matches. **CLEAN.**

## Deliberate — do not "fix" from this list

- **Rating row** absent from the card — founder decision C1, phase-aware (`servyou-phase-aware-features`).
- **"Bientôt" badge** on the Freelances segment — founder-directed and load-bearing while that lens
  is deferred; it is why the toggle stays bespoke rather than using the shared `SegmentedControl`.
- **Grid/list toggle** omitted — founder decision C6.
- **14 DB categories** vs the Figma's 13 hardcoded parents — reconciliation is its own migration.

## Not comparable

- **Topbar bell, user name, and role** render in Figma's logged-in mock; the gate ran anonymous, so
  the page shows only FR/AR + a user icon. Not a delta — re-check when a logged-in gate exists.
- **Page counts** (Figma 104 pages / 1 248 items vs live 2 / 21) are seed data.
- **Filter chips row** — present in Figma, and **verified present on the page** once filters are
  active (`?ville=Sfax&categorie=developpement-web` renders the chips and "Tout effacer"). Absent
  from the default view in both. Not a delta.

## Figma-side note

`611:45637` › `browseHead` contains a stray empty **`Frame 1` 100×100** sitting above the lens
toggle. It has no content and no counterpart in the design; it is what opens the large blank band
between the topbar and the toggle in the exported render. It looks like leftover scaffolding in the
Figma file rather than anything the page should implement — worth deleting at the source.
