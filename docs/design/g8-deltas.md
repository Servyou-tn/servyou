# G8 « Commandes reçues » — Figma ↔ page delta pass

**Report only.** Nothing in this file has been fixed. It is the input to a scope call, not a work
order.

**Measured** 2026-07-28 against `feat/g8-commandes-recues` @ `a392337`, dev server on :3000, fresh
`.next`. Page side is computed geometry from a headless Chrome at 1440×900, FR
(`servyou_lang=fr`), **logged in as the real shop owner** (OM shop) — not eyeballed. Figma side is
the live node tree read over the **Figma MCP** (file `jDNjJ8D1gnXiW7Ry3GkN4U`).

| node | region |
|---|---|
| `489:25211` | Commandes reçues — desktop (main frame) |
| `490:25690` | Specimen — filtre « À traiter » (the no-multi-select layout, build target) |
| `490:26034` | Specimen — vide |
| `490:26058` | Specimen — Annuler (modal) |
| `489:25350` | filterArea (status-tabs + metaRow) |
| `489:25347` | header |
| `488:24951` | OrderActionRow (9 variants), instance `490:25700` |

**Classes.** `STRUCTURAL` · `SPACING` · `COLOUR` · `COPY` · `DATA` (differs only because the
database holds different content than the mock — not a defect).

---

## ⚠ Read this before filing any width delta — same as G4

Every horizontal measurement is **exactly 15px narrower** than Figma: content row **1136 → 1121**.
`scrollbar-gutter: stable` on the app root reserves 15px, so the real viewport is 1425 and
1425 − 240 sidebar = 1185 of chrome → 1121 of content. Figma assumes a 1440 canvas with no
scrollbar. **Not a defect. Do not "fix" it.**

---

## STRUCTURAL — 5

| # | region | Figma | page | note |
|---|---|---|---|---|
| **S1** | Status tabs — control type | **5 underlined text tabs** on a 1px `border/subtle` rule: Tab Item h44, px16; active = `blue/600` **Semi Bold** + a **2px `blue/600` bottom indicator**; inactive = `text/muted` Medium 16/26 | **6 filled pills**, active = solid `blue/600` fill, `radius 10`, white label | different control entirely |
| **S2** | Status tabs — set and order | **Toutes · À traiter · En livraison · Terminées · Annulées** (5). **Toutes is FIRST and is the active/default tab.** | **À traiter · Toutes · En attente · En cours · Terminées · Annulées** (6), default `à traiter` | mine splits Figma's single "En livraison" into "En attente" + "En cours" and leads with À traiter |
| **S3** | Status tabs — count chips | **none, on any tab** — including the active one | **every tab carries a count chip** | see the correction note below |
| **S4** | Sort control | **one Select Trigger** (`compact`/`single`), **148×40**, `surface/base`, 1px `border/strong`, `radius/lg` 10, px16, label `text/muted` 16/26 + 18px chevron, reading "Plus récentes" | **two text links** side by side, "Plus récentes" / "Plus anciennes" | |
| **S5** | Row — status pill | pill inline before the action controls on **every** row | **absent on `prepared`, `dispatched`, `in_delivery`**; present on `pending`, `accepted`, `arrived`, `received`, `cancelled` | ⚑ root cause below — this is a real bug, not a styling gap |

### S3 — correction to the brief

The brief said "no count chips except one on the active". **Measured: there are no count chips at
all** — the active "Toutes" tab is a bare label plus its 2px indicator. Every Tab Item in
`489:25351` contains exactly one text node. So closing S3 means removing all six chips, not
keeping one.

### S5 — why the pill vanishes on three states

`STATUS_PILL` in `lib/orders/order-status.ts` has **five keys**: `pending, accepted, arrived,
received, cancelled`. It is E3's **service-shaped** map — its own header says
`prepared / dispatched / in_delivery` "are product-chain-only and cannot appear", which is true
for a buyer's service order and false for a seller's product inbox.

G8 reused it for the full 7-step product chain, so `STATUS_PILL[order.status]` is `undefined` for
exactly those three, and the row renders no pill. The live inbox proves both halves: the
`prepared` row has **no pill**, the `received` row renders **"Reçue"** correctly.

This is my error from the G8 build. When promoting the module I documented that `RAIL_STAGES` was
buyer-shaped and must not be widened — and then missed that `STATUS_PILL` has the same problem.

Closing it needs three things, not one:
1. `prepared` / `dispatched` / `in_delivery` entries (pill tokens `préparée` / `expediee` /
   `in-transit` all exist in the F3 StatusPill set, and `common.status_*` keys exist in both
   locales).
2. **`arrived` is order-type-dependent.** It currently maps to `common.status_arrived_service`
   = "Travail livré" — correct for a service, wrong on a product parcel, where it should read
   "Arrivée". The map needs the order type, or a per-type override.
3. A test asserting every status the seller chain can produce has a pill — the same class of
   guard as the tab-partition test.

## SPACING — 2

| # | region | Figma | page |
|---|---|---|---|
| **P1** | filterArea → list gap | **24** (list at y=243, filterArea ends 219) | **24** ✅ matches |
| **P2** | header → filterArea gap | **24** (filterArea y=119, header ends 95) | **24** ✅ matches |
| **P3** | Tab Item height | **44** | **44** ✅ matches |
| **P4** | H1 line-height | `leading/h1` **38** | **40** — the platform-wide typography-token gap (G4 P5), not G8-specific |

Only P4 is a difference; P1–P3 are recorded as verified-equal so the next pass does not re-measure
them.

## COLOUR — 0

No paint-level differences on the regions checked.

## COPY — 2

| # | region | Figma | page |
|---|---|---|---|
| **C1** | Subline | **"Suivez et traitez vos commandes."** | "Gérez et suivez vos commandes." |
| **C2** | H1 | **"Commandes reçues"** | "Commandes reçues" — ✅ **identical**, no change needed |

## DATA — 3 (not defects)

The frame mocks a busy inbox with all nine row states. The live inbox holds **two** orders:
one `prepared`, one `received`.

| # | region | Figma mock | live |
|---|---|---|---|
| D1 | Row count | 10 rows across all 9 states + pagination | **2 rows**, pagination correctly hidden |
| D2 | **WhatsApp confirm button** | green `wa/brand` "Confirmer sur WhatsApp" on `pending` rows | **not rendered — there is no `pending` order** |
| D3 | "En attente de confirmation acheteur" | inline muted text on `arrived` rows | **not rendered — there is no `arrived` order** |

⚑ **D2/D3 are unverified, not verified-absent.** Both are implemented (`OrderActionRow` renders
the wa/brand skin when `status === 'pending'`, and the muted awaiting-buyer text when
`status === 'arrived'`), but neither state exists in the live data, so I could **not** confirm the
rendered treatment empirically. Say the word and I will seed one order in each state to prove it
rather than leaving it on inspection.

The two states that ARE observable both check out: the `received` row renders the **"Reçue" pill
and the green check glyph** (`lucide-circle-check`), and the `prepared` row renders **"Marquer
expédiée" + "Annuler" + "Voir détails"**.

## Item 3 — SEARCH: the brief is mistaken, and there is a smaller real gap behind it

**There is no page-level search field in G8.** `filterArea` (`489:25350`) contains exactly two
children: `status-tabs` and `metaRow` (count ⟷ sort). Nothing else. The search visible in the
frame is the **Topbar instance's** own Search — `489:25314 → Search 821×40 at x=24, y=12` inside
the 1200×64 Topbar — which the page already renders. So it was neither dropped nor missed.

The real gap is one line: `searchPlaceholderKey()` in `components/shell/shell-search.ts` has
branches for `/mes-services`, `/trouver-des-missions`, `/mes-engagements`, `/mes-propositions`,
`/mes-commandes` and `/marche`, but **none for `/commandes-recues`** — so the seller's inbox falls
through to the generic `shell.topbar.search.default` = **"Rechercher..."**. Measured live.
Note the topbar search is not wired to filter this list either way; it is shell furniture.

---

## Suggested scope

**Close (clearly right):** S5 (the pill bug — a real defect, three states render no status at all),
C1 (copy), and the `searchPlaceholderKey` branch.

**Close if you want frame fidelity:** S1 + S2 + S3 (tabs → underlined text tabs, 5 of them,
Toutes-first-and-default, no count chips) and S4 (sort → a single Select). These are a coherent
group — doing S1 without S3 leaves chips on a control that has no room for them.

⚑ **S2 has a product consequence worth deciding, not just a visual one.** Figma's 5-tab set drops
the "À traiter" default in favour of "Toutes", and merges my "En attente" + "En cours" into one
"En livraison". "À traiter" as the landing tab is what makes the inbox answer *"what needs me?"*
on open — which is the same reasoning behind G4's Action Center. Matching Figma exactly means the
seller lands on an undifferentiated list. My recommendation: adopt Figma's **control** (underlined
tabs, no chips, single select) and its **5-tab set**, but keep **À traiter as the default landing
tab** while leaving Toutes first in the strip. That is a one-line divergence, and it is the kind
the Figma should probably absorb.

**Out of scope (already logged):** P4 typography tokens; the multi-select checkbox column (bulk
deferred with the delivery documents).

---

## Closed in `fix/g8-figma-deltas`

Founder scope call, 2026-07-28: close all of it. Every "after" below is re-measured from the DOM.

| # | fix | after |
|---|---|---|
| **S1** | Underlined text tabs on a 1px `border/subtle` rule; active = `blue/600` Semi Bold + 2px indicator | active tab measures **bg transparent · `rgb(31,95,224)` · 16px/600 · h44 · px16** — no filled pill |
| **S2** | 5-tab set in frame order; "En attente" + "En cours" merged into "En livraison" | **Toutes · À traiter · En livraison · Terminées · Annulées** |
| **S3** | All count chips removed — **six, not five** | labels carry no trailing count |
| **S4** | Single native `<select>`, 148 **min**-width with a 224 ceiling, `border/strong`, radius 10, nowrap + truncate | the two text links are gone; label cannot wrap (the E3 lesson applied) |
| **S5** | `statusPillFor(status, orderType)` covers all nine states; `arrived` is type-aware | the `prepared` row now renders **"Préparée"**; `arrived` renders **"Arrivée"** on a parcel and keeps "Travail livré" for a service |
| **C1** | subline → "Suivez et traitez vos commandes." | FR + AR |
| **item 3** | `searchPlaceholderKey()` gains a `/commandes-recues` branch | topbar reads **"Rechercher une commande reçue..."** instead of the generic "Rechercher..." |

**Default tab — the approved divergence.** A bare `/commandes-recues` lands on **À traiter**, while
`all` stays first in the strip as drawn. Pinned by a test so it reads as deliberate, not drift. The
Figma should absorb this.

### D2 / D3 are now observed, not inferred

Two product orders were seeded on OM shop at the founder's request, so the two unobservable
treatments could be measured rather than reasoned about:

| id | status | proves |
|---|---|---|
| `f14bbb38-82c5-44ac-9b8b-fc0547848b98` | `pending` | the **wa/brand "Confirmer sur WhatsApp"** button renders, with the **"En attente"** pill beside it |
| `b6817c30-ac14-4f04-a058-8623827f6c91` | `arrived` | the muted **"En attente de confirmation acheteur"** text renders, with the **"Arrivée"** pill |

Both carry `buyer_note` = "G8 delta seed — … safe to delete". **Delete when done:**
`delete from orders where id in ('f14bbb38-82c5-44ac-9b8b-fc0547848b98','b6817c30-ac14-4f04-a058-8623827f6c91');`

### One defect found and fixed during the fix pass

The first cut of `SortSelect` took a `buildHref(value)` callback from the page. **A function cannot
cross the RSC boundary** — Next.js throws "Functions cannot be passed directly to Client
Components" and the route returned **HTTP 500**. Caught because the DOM probe rendered the error
page instead of the inbox; a grep of the flight payload had looked fine, which is a good reminder
that grepping the RSC stream is not the same as loading the page. Options now carry their own
precomputed `href` and the page still owns query-param composition.

**Still open by decision:** P4 (typography tokens, platform-wide) and the multi-select checkbox
column (deferred with the delivery documents).

---

## Follow-up — the sort select's PANEL (same branch, after the pass above)

The delta pass checked the sort **trigger** against Figma and passed it. It never opened the
control, so it never checked the **panel** — and the panel was wrong in the way only an open
dropdown reveals.

**Measured before.** The sort was a native `<select>`, so its open list is drawn by the operating
system: the page had **no `[role="menu"]` in the DOM at all**. Nothing to style, and it inherited
none of the app's tokens.

**Measured reference** — ServicesFilterBar « Catégorie », the shipped pattern:

| property | Catégorie (reference) | G8 sort, before | G8 sort, after |
|---|---|---|---|
| element | `div[role=menu]` | **none — OS-drawn** | `div[role=menu]` ✅ |
| background | `rgb(255,255,255)` | n/a | `rgb(255,255,255)` ✅ |
| border | `1px solid rgb(226,232,240)` | n/a | identical ✅ |
| radius | `12px` | n/a | `12px` ✅ |
| padding | `4px` | n/a | `4px` ✅ |
| item element | `div[role=menuitemradio]` | n/a | identical ✅ |
| item height | `32` | n/a | `32` ✅ |
| item radius | `10px` | n/a | `10px` ✅ |
| item padding | `6px 8px 6px 32px` | n/a | identical ✅ |
| item type | `14px/20px 400` | n/a | identical ✅ |
| selected | `aria-checked` on the radio item | n/a | `aria-checked` ✅ |

Panel **width** differs by design: Catégorie sets `w-64` and Ville `w-56` explicitly; the sort
panel carries no width class and sizes to its trigger (150), exactly as E3's Statut does.

**Reconciled to the established pattern:** `DropdownMenu` + `DropdownMenuContent` with the shared
`MENU_CONTENT` / `MENU_ITEM` overrides and `align="start"`, `DropdownMenuRadioGroup` for
single-select — the same construction as ServicesFilterBar's Catégorie/Ville and E3's Statut/Trier.

**Both constraints held**, re-measured on the trigger: `min-width 148px` / `max-width 224px` (it
hugs at 160 for "Plus récentes"), label `white-space: nowrap` + `text-overflow: ellipsis`; and the
options still carry **precomputed hrefs** — no callback prop crosses the RSC boundary. The
`onValueChange` handler is created inside the client component, which is a different thing.

**Promotion.** `MENU_CONTENT` / `MENU_ITEM` were duplicated **byte-for-byte** (verified by hash) in
`ServicesFilterBar` and E3's `OrdersFilterBar`. G8 is the third consumer, which is this project's
documented threshold, so they moved to `components/ui/menu-styles.ts` with the strings unchanged
and both existing consumers repointed. The Catégorie panel re-measures identically after the move
(radius 12, border 1px #e2e8f0, item h32).

**Other selects on G8:** none. The only remaining choice control is the cancel modal's radio group,
which is a form control inside a dialog, not a dropdown — different pattern, left alone.
