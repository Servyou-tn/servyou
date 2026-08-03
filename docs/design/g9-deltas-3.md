# G9 « Détail de la commande » — third delta pass, all nine regions

**Report only. Nothing here is fixed.** This is the input to a scope call.

**Measured** 2026-08-03 against `main` @ `6a9d4c2` (the PR #107 merge), dev server on `:3000` with a
deleted `.next`, headless Chrome at 1440×900, FR, authenticated as the real shop owner, on seeded
order **`2acd2c95`** — a **case-B product order**: `unit_price_tnd = 45`, `delivery_fee_tnd = 7`,
`quantity = 3`. That order is what makes `priceBreakdown` observable for the first time; every one
of the 14 pre-existing orders has `delivery_fee_tnd = NULL` and renders no block at all.

## 💰 MEASUREMENT BUDGET: zero connector calls were spent

Every one of the nine regions was already measured, and the Figma column below is sourced entirely
from records in the repo:

| source | what it settles |
|---|---|
| `docs/design/g9-deltas-2.md` (2026-07-30, live plugin-bridge, full node dump) | all nine regions incl. the complete `priceBreakdown` spec, both build specs, and the F1–F7 Figma-fix list |
| `docs/design/g9-deltas.md` (2026-07-28) | the five items closed in that pass, and the scrollbar-gutter rule |
| `docs/design/figma-registry.md` (generated from the file) | the typography ramp (`leading/*`, `size/*`, `weight/*`) and the StatusPill variant set |
| `src/components/ui/status-pill.tsx:4` | StatusPill provenance — measured from COMPONENT_SET `41:694` in the F3 pass |

**No region genuinely needs a fresh call.** The one candidate — the title-row pill's colour, where
the frame says blue and the page renders amber — was settled from the F3 provenance instead (see
**T-3**). Two regions have *no Figma target at all* and a call would not create one: the rail's date
line (the layer does not exist — F2 retraction) and every 375px value (no mobile frame).

> **Method rule this pass earns.** PB-1 and PB-2 below are defects that shipped **because the build
> did not grep `docs/design/*-deltas*.md` for the node id**. Pass 2 had the exact answer, measured, a
> week earlier. Three passes of measurement now exist and they are indexed nowhere else. Grep them
> first — it is cheaper than a connector call and more complete than one.

## How to read the classes

| class | meaning |
|---|---|
| **STRUCTURAL** | the page and the frame disagree about what elements exist or how they are laid out |
| **SPACING** | same elements, different geometry |
| **COLOUR** | same elements, different paint |
| **COPY** | same elements, different words |
| **BLOCKED** | cannot exist yet — a named blocker, with the named unblock |
| **DESIGN OWES** | the page asserts something the frame does not describe. Not a page defect; design has no target to match |
| **FIGMA STALE** | the page is right and the frame is wrong. Closing the delta would regress working code |

**Not defects, established in passes 1 and 2 and not re-litigated:** every horizontal measurement is
15px narrower than Figma (`scrollbar-gutter: stable`; the grid re-adds exactly —
741.844 + 24 + 355.156 = 1121). All panel chrome is byte-identical (pad 24 · gap 16 · radius 12 ·
1px `#e2e8f0` · `#ffffff`) on all **six** built panels. Document overflow at 1440 is **0**.

---

# 🔴 THE HEADLINE: two defects shipped in PR #107, an hour before this pass

Both were **already measured** in `g9-deltas-2.md` §panel-produit (lines 292-295) and both were
missed. They are the sharpest "we got this wrong" on the page.

| # | region | Figma | page | class |
|---|---|---|---|---|
| **PB-1** | breakdown row 1-2 **values** (`497:26385`/`26389`) | 16/26 Regular **`#0f172a`** | 16/24 · 400 · **`rgb(71,85,105)`** = `#475569` | **COLOUR** |
| **PB-2** | breakdown **Total** label + value (`497:26393`/`26394`) | 16/25 **Inter Bold** `#0f172a` | 16/24 · **600** (`font-semibold`) · `#0f172a` | **COLOUR** (weight) |

**PB-1** — the frame contrasts the row: a muted label against a **primary-tier value**. The page
paints both `#475569`, so the money column reads at the same weight as its own labels. One class per
`dd`.

**PB-2** — the frame's Total is **Bold (700)**, the page ships **Semi Bold (600)**. The Total is the
one row that has to out-rank the others; it currently out-ranks them by less than designed.

### What this also settles — the 25-vs-26 question is answered, and the shipped explanation is wrong

PR #107's call-site comment hypothesises that the Total's 25px box versus the rows' 26px is
"font-metric rounding between regular and semibold," and its followups entry said a REST read was
owed. **Neither is right.** Pass 2 read it directly: rows are `16/26`, the Total is `16/25`, because
the Total is **Bold** and carries its own line-height. 25 is a spec, not an artefact.

⚑ The stale hypothesis is still in `page.tsx` and in `docs/follow-ups.md`. The followups entry has
been corrected to point here; **the in-code comment has not been touched** (report only) and is owed
a correction whenever PB-1/PB-2 are closed.

### What survives, and is vindicated

The **size** derivation was right. `text-body` (16px) was reached without a connector call, from
`leading/body = 26` matching the frame's 26px rows plus an advance-width cross-check (RMS **1.19px
at 16px** against **9.02px at 14px** over the frame's six measured strings). Pass 2's independently
measured **`16/26 Regular`** confirms it exactly. The method was sound; the failure was not reading
the file that already held the answer.

| # | region | Figma | page | class |
|---|---|---|---|---|
| **PB-3** | breakdown rows line-height | 26 | **24** | **SPACING** — the platform token drift, see X-1 |
| **PB-4** | breakdown container | 704×102 | 691.84×**97** | ✅ width = the 15px gutter · height = PB-3 exactly (2+2+1) |
| **PB-5** | breakdown row gap | 8 | **8px** | ✅ |
| **PB-6** | Divider | 704×1 `#e2e8f0` | 1px `rgb(226,232,240)` | ✅ |
| **PB-7** | row 1-2 **labels** | 16/26 Regular `#475569` | 16/24 · 400 · `#475569` | ✅ colour correct (line-height is PB-3) |
| **PB-8** | label/value alignment | labels x0, values flush x704 | `justify-between`, values end-side, RTL-correct | ✅ |

---

# Region 1 — Breadcrumb

Figma `495:26273`. **All five deltas from pass 2 are still open**; nothing has touched this region.

| # | Figma | page | class |
|---|---|---|---|
| **B-1** | gap **8** | **4px** (`gap-1`) | SPACING |
| **B-2** | 14 Inter Medium | **12 / 16.8** (`text-caption`) · 400 | SPACING |
| **B-3** | link `#1f5fe0` | `rgb(100,116,139)` = `#64748b` | COLOUR |
| **B-4** | current `#0f172a` | `rgb(71,85,105)` = `#475569` | COLOUR |
| **B-5** | chevron 14×14 | **12×12** | SPACING |

Correct: `aria-label="Fil d'Ariane"`, `aria-current="page"` on the leaf, RTL chevron mirroring
(`rtl:-scale-x-100`), and the reference format `#2ACD2C` (`#` + 6 upper hex).

**FIGMA STALE — F6 (from pass 2):** the instance carries two `visible: false` layers from the
component's 3-level demo, which is why its bounding box reads wider than it draws. Prune or accept;
flagged so a later measurement is not confused.

---

# Region 2 — Title row

| # | Figma | page | class |
|---|---|---|---|
| **T-1** | h1 32 / **38** Inter Bold `#0f172a` | 32 / **40** · 700 · `#0f172a` | SPACING — 2px, platform-wide (X-1) |
| **T-2** | date line 14/21 Regular `#475569` | 14/21 · 400 · `rgb(71,85,105)` | ✅ exact |
| **T-3** | StatusPill 80×25, pad 4/12, r9999, **`#dbe6fe`** / label **`#1f5fe0`** | 82.45×24, pad `4px 12px`, r9999, **`rgb(254,243,199)`** / label **`rgb(245,158,11)`** | **FIGMA STALE** — see below |
| **T-4** | h1 copy "Commande #A4F729" | "Commande #2ACD2C" | ✅ format matches |

### T-3 — the frame's pill is a stale instance, and the page is right

The frame paints `pending` **blue** (`#dbe6fe` / `#1f5fe0`). The page paints it **amber**
(`warning/100` + `warning/500`). Settled without a connector call:
`src/components/ui/status-pill.tsx:4` records the primitive as **measured from Figma COMPONENT_SET
`41:694` (37 statuses)** during the F3 pass, and its tone map sends `pending → warning`. So amber is
the component set's own measured treatment, and the G9 frame is instantiating a blue variant against
it.

**This is the same species as F6 and the vestigial stepper props (F7): a G9 instance drifting from a
measured component set.** Worth a sweep of the frame's instances rather than a single fix.

**Unobservable on this specimen:** `"Reçue le {date}"` (T-2's other branch). Per pass 2 **C8** it can
**never** render on a product order today — `received_at` is written only by two buyer-side client
call sites and `nextSellerStatus` returns `null` at `received`, so the seller path provably cannot
reach it. Already filed 🔴 in `follow-ups.md` with the `set_received_at_on_transition` fix.

---

# Region 3 — Stepper

Figma `495:26288` → `495:26289`. The rail now carries per-stage timestamps (PR #105), so the
built node is taller than pass 2 recorded.

| # | Figma | page | class |
|---|---|---|---|
| **ST-1** | label 14 / 20 Inter Medium | **12 / 16** (`text-caption`) | SPACING — pass 2 S1, still open |
| **ST-2** | node gap 4 | **8px** (`gap-2`) | SPACING — S2 |
| **ST-3** | node width hug-content **42–77** | **fixed 80** (`lg:w-20`) | STRUCTURAL — S6 |
| **ST-4** | stepper 903.5, centred in 1136 | **1071, full-width** | STRUCTURAL — S7 |
| **ST-5** | connector ahead `#cbd5e1` | `rgb(226,232,240)` = `#e2e8f0` | COLOUR — S9 |
| **ST-6** | circles 32 r9999; current white + 2px `#1f5fe0`; upcoming white + 1.5px `#cbd5e1` | 32 / 32; current white + **2px `rgb(31,95,224)`**; upcoming white + **1px `rgb(203,213,225)`** | ✅ except upcoming border **1px vs 1.5** — SPACING, new |
| **ST-7** | current label `#1f5fe0` Semi Bold | 12/16 · **600** · `rgb(31,95,224)` | ✅ (S4 closed) |
| **ST-8** | upcoming label `#64748b` Medium | 12/16 · 500 · `rgb(100,116,139)` | ✅ (S5) |
| **ST-9** | 7 nodes / 6 connectors | **7 / 6** | ✅ |

Node boxes measured **80×80.8** for the current stage (it carries a date) and **80×56** for the
other six — the 56 that pass 2 established as matching Figma's *content* height exactly.

### ST-10 — the date line · DESIGN OWES

The page renders `"3 août"` at **12 / 16.8 · 500 · `rgb(100,116,139)`** under the current stage.
**Figma has no `date` layer at all** — pass 2's "seven hidden date layers" reading was retracted
2026-07-31 after direct inspection found an empty `hiddenNodes`. So this line has **no Figma target,
and a connector call cannot create one**.

The type is a deliberate code-side inheritance of the rail's own Figma-verified *upcoming-label*
treatment (ST-8). Defensible, but design must confirm or replace it — **on the main component
`140:9067`, not the instance**, or it will not propagate. This is **F2**, still open.

### Unobservable on this specimen

`2acd2c95` is `pending`, so stage 1 is *current* and the other six are *upcoming*. **No completed
stage exists**, therefore:
- **S3** (completed label colour — Figma `#0f172a`, page `#475569`) could **not** be observed.
- **S8** (traversed connector — Figma `#1f5fe0`, page `border-strong`) could **not** be observed.

Both remain open on pass 2's authority, not re-confirmed here. Observing them needs an order at
`dispatched` or later.

**Still open and not this pass's call — S8/S9 touch E3.** `OrderRail` is shared with
`/mes-commandes`; repainting the connectors repaints the buyer's rail against a frame nobody has
measured (`709:59662`).

---

# Region 4 — Le produit

Panel **741.84 × 318** against Figma **752 × 325**. Pass 2 measured 205 — the breakdown closed
**113 of the 120px** gap; the residual −7 is PB-3 plus PR4 (line-height drift), not missing content.

| # | Figma | page | class |
|---|---|---|---|
| **LP-1** | **thumb 28×80 frame, r8, fill `#f1f5f9`, 1px `#e2e8f0`**, icon 28×28 stroke `#8faef9` | **no container at all** — bare 28×28 `Package`, `rgb(184,184,184)` | **STRUCTURAL** + COLOUR — pass 2 PR2 |
| **LP-2** | item title 16 / **25** Semi Bold `#0f172a` | 16 / **24** · 600 · `#0f172a` | SPACING — 1px, PR4 |
| **LP-3** | "Prix unitaire" 14/21 Regular **`#64748b`** | 14/21 · 400 · **`rgb(71,85,105)`** = `#475569` | **COLOUR** — wrong tier, PR6 |
| **LP-4** | "Quantité : n" 14/21 Regular `#475569` | 14/21 · 400 · `rgb(71,85,105)` | ✅ |
| **LP-5** | COD note 14/21 `#64748b` | 14/21 · 400 · `rgb(100,116,139)` | ✅ |
| **LP-6** | prodRow 704×80 gap 16 | 691.84×74, gap 16 | ✅ shape |
| **PB-1…8** | the price breakdown | — | **see the headline section** |

### LP-1 is blocked on design, not on code — F5

The thumb is **28 wide inside an 80-tall row**: a hug-width sliver holding a 28×28 icon, on a frame
plainly meant to be a square thumbnail. **The code cannot close PR2 until design picks the square**,
because building 28×80 literally would ship a sliver. F5, still open.

## 🚫 LP-7 — Product photo · **BLOCKED**, and the blocker is three layers deep

Confirmed as asked, and it is **more than the bucket**. All three layers must clear before a real
product photo renders here:

| layer | state | evidence |
|---|---|---|
| **1. Storage has no writer** | `product-images` bucket **exists** — public, 2 MiB cap, `image/webp` only — with **INSERT** ("shop owner inserts under own shop") and **DELETE** policies. **`storage.objects` = 0 across every bucket.** Nothing has ever been uploaded. | `storage.buckets` + `pg_policies` + `storage.objects` count |
| **2. The 8 `product_images` rows are broken pointers** | All 8 rows carry repo-static paths (`/products/iphone.jpg`, `/products/nike.jpg`, `/products/skincare.jpg`), **not** storage URLs — and **`public/products/` does not exist in the repo**. They are demo seed pointing at files that are not there. Not a working fallback. | `product_images ⋈ products`; `ls public/products` |
| **3. G9 never asks for an image** | `getSellerOrderDetail` selects `products ( title, price_tnd )` and joins `product_images` **not at all**. Even given a valid URL today, this page would render nothing. | `src/lib/marche/seller-order-detail.ts` |

**Unblock:** **G6 « Ajouter un produit »** is the writer — it is the surface that uploads to
`product-images` and writes the rows, and it does not exist. That clears layer 1 and, for
new products, layer 2.

⚑ **Layer 3 survives G6.** It is a separate, small page-side gap: G9's query and its `SellerOrderDetail`
type must add the image before the panel can show one, and G6 landing will not do that. Worth its
own line in the G6 follow-through so the photo does not silently stay absent after the writer ships.

⚑ **Layer 2 is a latent trap.** The 8 seed rows resolve to 404s. Any surface that starts rendering
`product_images` before G6 backfills them will show broken images on 8 of 8 products — including the
one on this seeded order.

---

# Region 5 — Livraison

Panel **741.84 × 362.8** against Figma **752 × 345** — the only panel *taller* than the frame, as in
pass 2 (the buyer-note quote block plus looser line-heights).

| # | Figma | page | class |
|---|---|---|---|
| **LV-1** | `fields` gap **12** | **16px** (`gap-4`) | SPACING |
| **LV-2** | field label 14/21 Regular **`#64748b`** | 14/21 · 400 · **`rgb(71,85,105)`** | **COLOUR** — wrong tier |
| **LV-3** | field value 16 / **26** Regular `#0f172a` | 16 / **24** · 400 · `#0f172a` | SPACING — 2px (X-1) |
| **LV-4** | each `lv` block gap 4 | **4px** | ✅ |

Correct: the `dl`/`dt`/`dd` semantics, the address parse (`"{street}, {governorate}"` → **Adresse**
`12 rue de Marseille` + **Ville** `Tunis`), and the buyer-note quote block.

---

# Region 6 — Suivi de livraison

Figma `497:26411`, 752×254. Panel renders **741.84 × 261**.

| # | Figma | page | class |
|---|---|---|---|
| **SV-1** | carrier label 14/21 Regular `#64748b` | 14/21 · 400 · `rgb(100,116,139)` | ✅ exact |
| **SV-2** | carrier value 16 / **26** Regular `#0f172a` | 16 / **24** · 400 · `#0f172a` (renders `—`) | SPACING — 2px (X-1) |
| **SV-3** | field 704×44, pad 0/16, r10, 1px `#cbd5e1` | **566.45**×44, pad `0px 16px`, r10, 1px `rgb(203,213,225)` | **STRUCTURAL** — see SV-5 |
| **SV-4** | placeholder "Sera saisi à l'expédition", helper 14/21 `#64748b`, counter hidden, asterisk hidden | identical copy, no counter, not required | ✅ |

### SV-5 — the `Enregistrer` button · DESIGN OWES

The frame's `Input` is a label row + a **704-wide** field + a helper, and **no submit control**. The
page puts a 117×44 `Enregistrer` button beside the field, which is why the field measures 566 rather
than 704. The width delta is a *consequence*, not an independent defect.

The page is not wrong to have it — a value the seller types has to be committable, and the frame
does not say how. But the page is **asserting an affordance the frame does not describe**, so design
owes either a submit control in the frame or an explicit auto-save/blur-commit behaviour. Filing the
566-vs-704 as a spacing delta without this would send someone to widen a field that is the right
width for the layout it is in.

### SV-6 — the carrier is a value with no writer · **BLOCKED** (partially)

Renders `—` and always will. `carrier` **is** seller-writable in the schema, but **no surface can
populate it**: `shops.preferred_carriers` is free text with no edit route, and the frame renders the
carrier as static text rather than a control, so building the frame literally ships a column nothing
can fill.

**Unblock:** a founder call first — either add a carrier control here (a Select; the schema supports
it) or feed it from **G3 « Modifier ma boutique »**. Recorded in pass 2 and in `follow-ups.md`; still
open. This is a *design decision* blocker, not a missing-capability one.

---

# Region 7 — Historique de la commande

Figma `504:27042`, 752×185. Panel renders **741.84 × 115** — **−70**, entirely the two excluded
entries.

| # | Figma | page | class |
|---|---|---|---|
| **H-1** | entry gap **8** | **4px** (`gap-1`) | SPACING |
| **H-2** | dot 10×10 r9999 `#1f5fe0` | 10×10, `rgb(31,95,224)` | ✅ exact |
| **H-3** | label 14/21 Regular `#0f172a` | 14/21 · 400 · `rgb(15,23,42)` | ✅ exact |
| **H-4** | time 14/21 Regular `#64748b`, format "· 18/07 09h12" | 14/21 · 400 · `rgb(100,116,139)`, "· 03/08 12h31" | ✅ exact, format matches |
| **H-5** | `cr` inner gap 6 | **6px** (`gap-1.5`) | ✅ |
| **H-6** | timeline gap 16 | **16px** | ✅ |

### Unobservable on this specimen

`2acd2c95` has exactly **one** event (`created`), so:
- **the `timelineLine` (`504:27060`, 2×74 `#cbd5e1`, centred on the dots) could not be measured** —
  with one entry there is nothing to connect. Whether the page draws it, and whether it centres on
  the dots, needs an order with ≥2 events, i.e. one the seller has advanced at least once.

### 🚫 H-7 / H-8 — two of Figma's three specimen entries are **BLOCKED**

| entry | blocker | unblock |
|---|---|---|
| **"Bon de livraison imprimé"** (`504:27058`) | no RPC writes `event_type='print'`. The CHECK vocabulary **already admits** `'print'` — it was deliberately left in when the print RPC was deferred | the **delivery-documents PR** (see A-5) |
| **"Confirmée sur WhatsApp"** (`504:27052`) | **nothing records it, and nothing can.** Per the schema discovery we could only ever record *"the seller opened the prefilled link"* — never *"a message was sent"* | ⛔ **NOT unblockable as specified.** Rendering it would assert a fact the platform cannot hold. **The frame should drop it**, or design should redefine it as "lien WhatsApp ouvert" — a founder call |

**H-8 is the one item on this page that is blocked permanently rather than pending work.** It belongs
in the Figma-fix list, not the backlog.

Also: the frame shows **no status-change entry at all** — its three specimens are one creation plus
two we cannot source — so the built status-change row's copy has **no Figma reference**. It reuses
the locked `statusLabelKey` vocabulary so the timeline and the pill cannot drift. **DESIGN OWES** a
reference, or an explicit blessing of the reuse.

---

# Region 8 — Client

Panel renders **355.16 × 265** against Figma **360 × 309** — **−44**, the phone block.

| # | Figma | page | class |
|---|---|---|---|
| **CL-1** | name 16 / **25** Semi Bold `#0f172a` | 16 / **24** · 600 · `#0f172a` | SPACING — 1px |
| **CL-2** | city 14/21 **`#64748b`** | 14/21 · 400 · **`rgb(71,85,105)`** | **COLOUR** — wrong tier |
| **CL-3** | disclosure **12 / 17 Inter Medium** | **14 / 21** · 400 (`text-body-sm`) | SPACING |
| **CL-4** | WhatsApp button 312×48, r10, `#25d366`, label 16/24 Semi Bold `#0f172a` | 305.16×48, r10, `rgb(37,211,102)`, label `rgb(15,23,42)` | ✅ — contrast **9.00:1, AA passes** |

### CL-5 — the phone number · **FIGMA STALE**, not a page miss

Figma renders `"+216 20 123 456"` as **static text** (`497:26447`). The page does not, deliberately:
`get_contact_phone` is relationship-gated and reveals on click inside `WhatsAppContactButton`.
Server-rendering the number would defeat the gate on every seller's screen.

**The frame should absorb this** — replace the value row with the reveal affordance the code already
ships, or drop the row and keep the disclosure line. This is **F4**, still open.

---

# Region 9 — Prochaine étape

Panel renders **355.16 × 237** against Figma **360 × 334** — **−97**, the print button and stamp.

| # | Figma | page | class |
|---|---|---|---|
| **A-1** | primary 312×48, r10, `#1f5fe0`, label 16/26 Semi Bold `#ffffff` | 305.16×48, r10, `rgb(31,95,224)`, 16/24 · 600 · `#fff` | ✅ (line-height is X-1) |
| **A-2** | cancel `#e5484d`, centred, full width | `rgb(229,72,77)`, `text-align: center`, **305.16** | ✅ closed in pass 1 |
| **A-3** | hint 14/21 **`#475569`** | 14/21 · 400 · **`rgb(100,116,139)`** = `#64748b` | **COLOUR** — wrong tier, new this pass |
| **A-4** | hint copy references the print flow | different copy (WhatsApp confirmation) | ✅ correct while A-5 is blocked |

## 🚫 A-5 — « Imprimer le bon de livraison » · **BLOCKED**

Confirmed as asked. The button (`504:27030`), its stamp (`504:27041` "Bon imprimé ✓ le 18/07 à
14h02") and the matching timeline entry (`504:27058`, = H-7) are all absent.

**Blocker:** no RPC writes `event_type='print'`, so nothing can stamp a print or record one. The
`order_events` CHECK vocabulary **already admits `'print'`** — it was left in deliberately when the
RPC was deferred out of the schema PR.

**Confirmed: the schema-level blocker is now GONE.** Every number the bordereau `504:27094` prints
exists in the database today:

| bordereau needs | source | state |
|---|---|---|
| order reference | `shortRef(orders.id)` | ✅ shipped |
| buyer name + delivery address + phone | `orders.delivery_*` | ✅ |
| item title + quantity | `orders.item_title`, `.quantity` | ✅ frozen snapshot |
| unit price, **delivery fee, COD total** | `orders.unit_price_tnd`, **`.delivery_fee_tnd`** | ✅ **the last one landed in migration `20260801112027`** |
| carrier | `orders.carrier` | ⚠ column exists, **always NULL** — see SV-6 |
| print stamp + timeline entry | `order_events` + a `'print'` RPC | ❌ **the only thing missing** |

**Unblock:** the **delivery-documents PR** — a `record_order_print()` RPC emitting
`event_type='print'`, plus the print view. It is now a *pure application* PR: no migration is
needed except whatever the RPC itself is. **Caveat:** the bordereau will print an empty carrier
until SV-6 is decided, so the two should be scoped together.

---

# Cross-cutting

| # | item | class | state |
|---|---|---|---|
| **X-1** | **Line-height token drift.** `leading/body = 26` in Figma, `--text-body--line-height: 1.5` ⇒ **24** in `globals.css` (should be 1.625). Same 2px on h1 (38→40) and headings (26→28). `body-sm` is correct (21 = 14×1.5) | SPACING | 🔴 **platform-wide.** Drives PB-3, T-1, LV-3, SV-2, LP-2, CL-1, A-1 — **7 of this pass's rows are one token.** Typography was deferred by F1; this is the bill |
| **X-2** | The page collapses Figma's **12 / 24 / 32** vertical rhythm into a flat 16 / 24 | SPACING | open — pass 2 P2/P3/P4. Measured again: header gap **16** (Figma 12 and 24 both map here), content gap **24** (Figma 32) |
| **X-3** | 375px overflow **58px** — `OrderRail`'s 7 `shrink-0` stages + the topbar avatar cluster | STRUCTURAL | 🔴 filed in `follow-ups.md`. **No mobile frame exists**, so there is no target to match — the fix is a product decision |
| **X-4** | Money renders raw: `12.5 TND`, not `12,50` | COPY | platform-wide, filed |

---

# The one list the founder asked for

## A. We got this wrong — page-side defects with a Figma target

Ordered by how much they change what the seller sees.

| # | region | class | note |
|---|---|---|---|
| **PB-2** | Total weight 600 vs **Bold 700** | COLOUR | shipped in PR #107; spec was already on file |
| **PB-1** | breakdown values `#475569` vs **`#0f172a`** | COLOUR | same |
| **LP-1** | thumb: **no container at all** vs a filled, bordered frame | STRUCTURAL | blocked on F5 for the target size |
| **ST-3 / ST-4** | fixed 80 nodes, full-width rail vs hug labels on a centred 903.5 | STRUCTURAL | layout-model change; touches E3 |
| **ST-1 / ST-2** | label 12/16 vs 14/20; gap 8 vs 4 | SPACING | **close together** — 4+20 and 8+16 both give 56, so one alone moves the panel |
| **B-1…B-5** | breadcrumb gap, size, both colours, chevron | SPACING + COLOUR | five one-liners |
| **LP-3 / LV-2 / CL-2 / A-3** | four labels at `#475569` where Figma says `#64748b` | COLOUR | one consistent wrong-tier pattern |
| **CL-3** | disclosure 14/21 vs 12/17 | SPACING | |
| **ST-6** | upcoming circle border 1px vs 1.5 | SPACING | new this pass |
| **ST-5** | connector ahead `#e2e8f0` vs `#cbd5e1` | COLOUR | ⚠ shared with E3 |
| **H-1** | timeline entry gap 4 vs 8 | SPACING | |
| **LV-1** | fields gap 16 vs 12 | SPACING | |

## B. This cannot exist yet — blocked, with the named unblock

| # | what | blocker | unblock |
|---|---|---|---|
| **LP-7** | product photo | 3 layers: no storage writer (`objects = 0`); 8 seed rows point at a **non-existent** `public/products/`; **G9 never selects images** | **G6** clears layers 1-2. **Layer 3 is a separate page-side change that survives G6** |
| **A-5 / H-7** | print button, stamp, timeline entry | no `'print'` RPC | **delivery-documents PR.** Schema is ready — `delivery_fee_tnd` was the last missing number. Scope with SV-6 |
| **SV-6** | carrier value | no surface writes `carrier` | founder call: a control here, or feed from **G3** |
| **H-8** | "Confirmée sur WhatsApp" | ⛔ **unknowable.** We can only ever record that the link was *opened* | **not unblockable as specified** — frame drops it, or design redefines it |
| **T-2** | "Reçue le {date}" | `received_at` never populates on a product order | `set_received_at_on_transition` trigger (filed 🔴) |

## C. Design owes a target — the page asserts what the frame does not describe

| # | what | why it is not a page defect |
|---|---|---|
| **ST-10** | rail date line | Figma has **no `date` layer** (F2 retraction). Type inherits the Figma-verified upcoming-label treatment. Fix on main component `140:9067` |
| **SV-5** | `Enregistrer` button | frame shows an input with no submit control; a typed value must be committable |
| **H-*** | status-change timeline copy | frame has no status-change specimen; page reuses the locked `statusLabelKey` so pill and timeline cannot drift |

## D. Figma is stale — closing the delta would regress working code

| # | node | what is wrong |
|---|---|---|
| **T-3** | title-row StatusPill | frame paints `pending` **blue**; the measured component set `41:694` says **warning/amber**. A stale instance |
| **CL-5 / F4** | `497:26447` | renders a raw phone number, defeating the `get_contact_phone` gate |
| **F5** | `497:26373` thumb | 28×80 hug on a frame meant to be square — blocks LP-1 |
| **F1 / F3** | `495:26289`, `495:26288` | 77-tall frame holding 56 of content; **cause still unknown** after the hidden-layer retraction |
| **F7** | Order Stepper props | vestigial `showValues` / `minLabel: "20 TND"` / `maxLabel: "250 TND"` — price-slider props on a lifecycle rail |
| **F6** | `495:26273` breadcrumb | two `visible: false` demo layers inflating the bounding box |

**T-3, F6 and F7 are the same species** — G9 instances drifting from measured component sets. Worth
one sweep of the frame's instances rather than three separate fixes.

---

# Verified-equal this pass — recorded so a fourth pass does not re-measure

Panel chrome on **all six** panels (pad 24 · gap 16 · radius 12 · 1px `#e2e8f0` · `#ffffff`).
Content pad 32. twoCol `741.844px 355.156px` gap 24. Document overflow at 1440: **0**. Stepper node
and connector counts (7/6), circle size 32/r9999, current-state 2px `#1f5fe0` ring, current label
`#1f5fe0` 600, upcoming label `#64748b` 500. Breadcrumb semantics and reference format. Date-line
type and colour. StatusPill geometry (82.45×24, pad 4/12, r9999). "Quantité" line. COD note. The
whole `Livraison` field structure and the address parse. Carrier label colour. Tracking input
geometry (44 tall, r10, 1px `#cbd5e1`, pad 0/16) and every string in it. All six timeline
type/colour values and both its gaps. WhatsApp button geometry, fill and **9.00:1** label contrast.
Primary button and cancel link. Breakdown gap, divider, alignment and label colour.
