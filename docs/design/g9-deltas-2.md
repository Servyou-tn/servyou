# G9 « Détail de la commande » — second delta pass (structural)

**Report only.** Nothing here is fixed except where a row says **CLOSED** — those were closed in
`feat/orders-snapshot-wiring` before this file was written, and each says so.

**Measured** 2026-07-30 against `feat/orders-snapshot-wiring` @ `2b6808d`.

- **Page side:** real authenticated DOM at **1440×900** and **375×800**, logged in as the shop owner,
  via `scripts/gate/authed.mjs` (committed this PR). Measured across **all four product order
  states** — `pending` `f14bbb38`, `prepared` `739f6e46`, `arrived` `b6817c30`, `received`
  `33b822ec` — not just one specimen.
- **Figma side:** live plugin bridge (Safe Mode), full node-tree dump with absolute geometry, paints,
  strokes, auto-layout and text metrics. Not a cached read. **Unlike the first pass, no measurement
  here is inferred.**

| node | region |
|---|---|
| `495:26112` | Order detail — desktop (main frame), 1440×1533 |
| `495:26116` → `495:26271` → `495:26272` | content → topGroup → header |
| `495:26288` → `495:26289` | panel-stepper → Order Stepper |
| `497:26370` / `497:26396` / `497:26426` / `497:26456` | panel-produit / -livraison / -client / -action |
| `497:26411` | **panel-suivi** — built by this PR |
| `504:27042` | **panel-historique** — built by this PR |

> **Node-id correction.** The brief cited `495:26411` for panel-suivi. **That node does not exist**
> (`getNodeByIdAsync` → null). The real id is **`497:26411`**, which sits with the other four panels
> under `main`. The `495:*` range is the frame and topGroup anchors. Founder's typo hypothesis
> confirmed by query, not assumed.

---

## ⚠ Read this before filing anything — three regions are OUT OF SCOPE BY DECISION

A later pass must not read these as misses. They are **in the Figma and deliberately not built**:

1. **The `Livraison` and `Total` rows** of `panel-produit`'s price breakdown (`497:26388`/`26389`,
   `497:26392`/`26393`/`26394`, plus the `Divider` `497:26390`). `orders.delivery_fee_tnd` was cut
   from the schema PR pending the **per-governorate rate-table decision**. A COD total that omits
   the fee is a wrong number, so neither ships.
2. **The print button** (`504:27030` "Imprimer le bon de livraison"), **the print stamp**
   (`504:27041` "Bon imprimé ✓ le 18/07 à 14h02") and **the "Bon de livraison imprimé" timeline
   entry** (`504:27058`). All three belong to the **delivery-documents PR**; the print RPC was
   explicitly deferred out of the schema PR with `'print'` left in the `order_events` CHECK
   vocabulary.
3. **The "Confirmée sur WhatsApp" timeline entry** (`504:27053`). Nothing records it, and per the
   schema discovery we could only ever record *"the seller opened the prefilled link"* — never
   *"a message was sent."* Rendering it would assert a fact we do not have.

Also **not a defect**: every horizontal page measurement is **15px narrower** than Figma
(inner 1136 → 1121, main 752 → 741.84, rail 360 → 355.16). `scrollbar-gutter: stable` reserves it;
the grid re-adds exactly (741.844 + 24 + 355.156 = 1121). Same note as the first pass, G4 and G8.

---

## ⚑ THE HEADLINE: Figma's stepper is 77 tall, its CONTENT is 56, and the page is right

The brief asked where the other ~45px go, with three candidates: a bigger gap, a larger label face,
or two-line labels. **It is none of them — it is dead space in the Figma.**

Every one of the seven nodes measures **exactly 56 tall**: `circle 32` + `gap 4` + `label 20`. All
seven. But each node also carries a **third child, `date`, with `visible: false`** — a per-stage
timestamp (`"6 juil."`, 12/17 Inter Medium `#64748b`). With the dates visible the node would be
`32 + 4 + 20 + 4 + 17 = 77`. **The `Order Stepper` instance is a fixed-size frame that was authored
at 77 and never resized after the dates were hidden.**

So the arithmetic inverts:

| | Figma | page |
|---|---|---|
| stepper **content** height | **56** | **56** ✅ **exact** |
| stepper **frame** height | 77 (21px of it dead) | — |
| panel height | **125** (= 77 + 48 pad) | **106** (= 56 + 48 pad + 2 border) |

**The page's 106 is correct and Figma's 125 is stale.** Had the panel been "corrected" to 122–125 it
would have been padded to match hidden layers. This is a **Figma fix, not a code fix**: either
resize `495:26289` to 56, or unhide the dates.

**And the hidden layer is a live opportunity.** That `date` line is exactly the per-step timestamp
that was unbuildable when G9 shipped — `orders` had no per-step timestamps. **`order_events` now
provides it.** It stays out of this PR because a hidden Figma layer is not an approved design, but it
is the cheapest real win available on this screen and it should be a founder call, not a silent
omission.

---

## STRUCTURAL — panel-stepper internals

Circle treatment is **exactly right** and needs nothing:

| | Figma | page | |
|---|---|---|---|
| circle size / radius | 32, r9999 | 32, r9999 | ✅ |
| completed | `#1f5fe0` fill + 16×16 white check (2px vector) | `bg-brand-blue-600` + 16px `Check`, `text-inverse` | ✅ |
| current | `#ffffff` + **2px `#1f5fe0`** | white + 2px `brand-blue-600` | ✅ |
| upcoming | `#ffffff` + **1.5px `#cbd5e1`** | white + `1.5px border-strong` | ✅ |
| node / connector count | 7 / 6 | 7 / 6 | ✅ |

The labels and the geometry are where it diverges:

| # | region | Figma | page | state |
|---|---|---|---|---|
| **S1** | label type | **14 / 20 Inter Medium** | **12 / 16** | ⚠ **CLOSED-PARTIAL** — was 16/16 (`text-caption` evicted by tailwind-merge, see below); now 12/16. **Figma wants 14/20**, so one step remains |
| **S2** | node gap | **4** | **8** (`gap-2`) | open |
| **S3** | label colour — completed | **`#0f172a`** | `#475569` (`text-secondary`) | open |
| **S4** | label colour+weight — current | **`#1f5fe0` Inter Semi Bold** | `#475569` Medium | open — **the "you are here" emphasis is lost entirely** |
| **S5** | label colour — upcoming | `#64748b` Medium | `#64748b` Medium | ✅ |
| **S6** | node width | **hug-content, 42–77** (`WIDTH_AND_HEIGHT`) | **fixed 80** (`lg:w-20`) | open — see note |
| **S7** | stepper width | **903.5, centred** in the 1136 panel | **1071, full-width** | open |
| **S8** | connector traversed | **`#1f5fe0`** (blue) | `#cbd5e1` (`border-strong`) | open — **shared-component risk** |
| **S9** | connector ahead | `#cbd5e1` | `#e2e8f0` (`border-subtle`) | open — same |

### S1 — the eviction, and why 12px is a way-point not a destination

The labels shipped at **16px in a 16px line box**. Cause, verified in the live DOM rather than
inferred — the rendered class attribute was `text-center leading-4 font-medium text-text-secondary`,
with **`text-caption` absent**. `twMerge` cannot classify our `@theme` size tokens (neither a
built-in name nor an arbitrary value), so it files them in the catch-all `text-*` **colour** group
and the later colour class deletes the size:

```js
twMerge('text-caption text-text-secondary') === 'text-text-secondary'
```

Closed in `2b6808d` by removing the merge (a plain template makes the collision structurally
impossible, not merely order-dependent). **This is the third eviction to ship in this codebase** — a
size, then a colour, now a size — and the class is logged in `docs/follow-ups.md` with the systemic
fix proposed (`extendTailwindMerge` classGroups + a lint rule; approved for its own PR because it
needs a full VRT re-baseline).

The fix landed on `text-caption` (12px) because that is what the source asked for. **Figma says
14/20.** Note the height is unaffected either way — `gap 4 + label 20 = 24` and `gap 8 + label 16 =
24` both give a 56 node — so S1 and S2 should be closed *together* or the panel height moves.

### S6 / S7 — the layout model differs, not just the numbers

Figma does not use a fixed node width at all. The **circles sit on a fixed 141.33 pitch**, the
connectors run **circle-edge to circle-edge** (109.33 each), and each label **hugs its own text and
is centred on its circle**, free to be wider than the circle (42 → 77). Node boxes and connectors
therefore *overlap* horizontally — verified: connector 1 starts at 53601.75, exactly circle 1's
right edge, and ends 0.5px shy of circle 2's left edge; last node's right edge is `54454.75` =
stepper `x + 903.5` exactly.

The page instead gives each node a fixed width and lets six `flex-1` connectors absorb the
remainder. That produces an even pitch too, but **a label that outgrows its box wraps instead of
overflowing** — which is what made "En attente" and "En livraison" two lines. The `lg:w-20` fix
raised the box above the widest Figma label (77), so nothing wraps at 1440 now; matching Figma
properly means hug-width labels and a centred 903.5 rail.

> **Recorded per founder instruction:** the "nearly double" reading (mine ~130 vs Figma 77) was a
> **panel-vs-stepper mis-comparison** — a page *panel* measured against a Figma *stepper*. The
> correct pairing is panel 122→106 vs panel 125, and stepper 72→56 vs content 56. The `w-14` node
> width was the real defect, not the panel.

### S8 / S9 — cannot be closed unilaterally

`OrderRail` is **shared with E3** (`/mes-commandes`), and its current colours are E3's measured
treatment (`border-strong` behind, `border-subtle` ahead). G9's frame says **blue behind, `#cbd5e1`
ahead**. Changing them repaints the buyer's rail against a frame nobody measured in this pass
(`709:59662`). **Scope call, not a tweak.**

---

## SPACING — the scaffolding, and a correction to the brief

| # | region | Figma | page | state |
|---|---|---|---|---|
| **P1** | content pad | 32 | 32 | ✅ |
| **P2** | content gap (topGroup → twoCol) | **32** | **24** (`gap-6`) | open |
| **P3** | topGroup gap (header → panel-stepper) | **24** | **16** (`gap-4`) | open |
| **P4** | header gap (breadcrumb → titleRow) | **12** | **16** (`gap-4`) | open |
| **P5** | twoCol gap · main gap · rail gap | 24 · 16 · 16 | 24 · 16 · 16 | ✅ |
| **P6** | every panel: pad · gap · radius · border · fill | 24 · 16 · 12 · 1px `#e2e8f0` · `#ffffff` | identical on all four built panels | ✅ |

P2–P4 are three different gaps where the page uses one value (16/24) for all of them — the page
collapses Figma's 12 / 24 / 32 rhythm into a flat `gap-4`/`gap-6`.

### ⚑ Correction: the panels are NOT taller. Three of four are SHORTER

The brief said *"every panel in mine looks taller than Figma's."* Measured, that reproduces on
**one** panel out of four, and the direction is mostly the opposite:

| panel | Figma | page | Δ | why |
|---|---|---|---|---|
| panel-produit | **325** | **205** | **−120** | the entire `priceBreakdown` (102 + 16 gap = **118**) is absent |
| panel-livraison | **345** | **362.8** | **+17.8** | the only taller one — buyer-note quote block + looser line-heights |
| panel-client | **309** | **265** | **−44** | the phone-number block is not rendered (deliberate) |
| panel-action | **334** | **237** (pending) | **−97** | print button 48 + stamp 21 + two gaps 32 = **101**, all excluded |

**So there is no global spacing inflation.** Padding, gap, radius and border are byte-identical on
every panel (P6). The height differences are almost entirely **missing content**, and each one
accounts for itself to within ~4px. What makes the page *read* as looser is the per-line
line-heights — see P7 — not the boxes.

| # | region | Figma | page | state |
|---|---|---|---|---|
| **P7** | panel headings | **20 / 26 Inter Semi Bold `#0f172a`** | **20 / 28 · 600 · `rgb(15,23,42)`** | open — 2px |
| **P8** | h1 | **32 / 38 Inter Bold `#0f172a`** | **32 / 40 · 700** | open — 2px |

### ⚑ Correction: the heading ratio is NOT wrong "in the other direction"

The brief expected the first pass's 20-vs-26 finding to invert on screen. It does not. **Figma's
headings are 20px too** — font-size, weight and colour all match exactly. The *only* difference is
line-height, **28 vs 26**, on all four headings, exactly as the first pass recorded (P1). Same 2px on
the h1 (40 vs 38). This is the platform-wide typography-token gap, **not G9-specific** and not
reversed.

---

## COPY / DATA

| # | region | Figma | page | state |
|---|---|---|---|---|
| **C1** | breadcrumb gap | **8** | **4** (`gap-1`) | open |
| **C2** | breadcrumb type | **14 Inter Medium** | **12** (`text-caption`) | open |
| **C3** | breadcrumb link colour | **`#1f5fe0`** | `#64748b` (`text-muted`) | open |
| **C4** | breadcrumb current colour | **`#0f172a`** | `#475569` (`text-secondary`) | open |
| **C5** | breadcrumb chevron | **14×14** | **12×12** (`h-3 w-3`) | open |
| **C6** | h1 reference | "Commande #A4F729" | "Commande #F14BBB" | ✅ format matches (`#` + 6 upper hex) |
| **C7** | StatusPill | 80×**25**, pad 4/12, r9999, `#dbe6fe`, label 12/17 Semi Bold `#1f5fe0` | 82.45×**24** | ✅ within 1px |
| **C8** | **date line** | **"Reçue le 18 juillet 2026"** · 14/21 Regular `#475569` | **"Créée le 3 juin 2026"** · 14/21 · 400 · `#475569` | ⚑ **type and colour match exactly — see below** |
| **C9** | COD note | 14/21 `#64748b` | 14/21 `#64748b` | ✅ |

### ⚑ C8 is a DATA-INTEGRITY finding, not a layout delta

The page is **correct**. `[id]/page.tsx:111-114` renders `order.receivedAt ? "Reçue le …" : "Créée
le …"`, and the type and colour match Figma to the pixel. It falls through to "Créée le" because
**the data is absent**: order `33b822ec` is at status `received` and its `received_at` is **NULL**.

`received_at` is written **only in app code**, at two client call sites — `ReceiptConfirmButton.tsx:33`
and `OrdersList.tsx:253`. Nothing in the database stamps it, and `nextSellerStatus` returns `null` at
`received` so the seller path provably cannot reach the state. Across all 14 live orders, 4 are
`received` and **only one got its timestamp from a real buyer click** (the tell is precision:
`toISOString()` yields milliseconds, Postgres arithmetic on `created_at` carries microseconds —
`191d4307` has `.544`, the two seeded ones carry their own `created_at`'s `.284896` / `.407`, and the
one **product** order has NULL).

**Consequence: "Reçue le" can never render on a product order today.** Filed as its own 🔴 entry in
`docs/follow-ups.md` with the fix — a `set_received_at_on_transition` trigger mirroring the shipped
`trg_set_cancelled_at_on_transition`, named to sort *before* the `order_events` emitter or the
emitted event carries a null stamp. Urgent because both stamping sites are the buyer-side client
`.update()` calls already queued for migration to server actions, and `admin/statistiques` already
aggregates on `received_at`.

---

## panel-produit — item 3, and the money column is mostly out of scope

| # | region | Figma | page | state |
|---|---|---|---|---|
| **PR1** | prodRow | 704×80, HORIZONTAL gap 16, MIN/MIN | 691.84×74, flex gap 16, items-start | ✅ shape |
| **PR2** | **thumb** | **28×80 frame, r8, fill `#f1f5f9`, 1px `#e2e8f0`**, icon 28×28 stroke **`#8faef9`** | **no container at all** — a bare 28×28 `Package`, `text-icon-muted` | open |
| **PR3** | info gap | 4 | 4 | ✅ |
| **PR4** | item title | 16 / **25** Semi Bold `#0f172a` | 16 / **24** · 600 · `#0f172a` | open — 1px |
| **PR5** | "Quantité : n" | 14/21 Regular `#475569` | 14/21 · 400 · `#475569` | ✅ |
| **PR6** | "Prix unitaire : … TND" | 14/21 Regular **`#64748b`** | 14/21 · 400 · **`#475569`** | open — wrong tier |
| **PR7** | **priceBreakdown** | **704×102**, VERTICAL gap 8 | **absent** | see below |

**The brief's "right-aligned money column" is `priceBreakdown` (`497:26383`)** — a `SPACE_BETWEEN`
stack of three rows plus a divider:

| row | left | right |
|---|---|---|
| `497:26384` | "Produit (× 1)" 16/26 Regular `#475569` | "160 TND" 16/26 Regular `#0f172a` |
| `497:26387` | "Livraison" | "7 TND" |
| `497:26390` | `Divider` 704×1 `#e2e8f0` | |
| `497:26392` | "**Total**" 16/25 **Inter Bold** `#0f172a` | "167 TND" 16/25 Inter Bold |

**Two of the three rows plus the divider are the excluded region.** Only row 1 is buildable — it
needs `unit_price_tnd × quantity`, which the snapshot now supplies.

⚠ **This is a scope question, not a fix.** Building row 1 alone yields a "breakdown" with one row,
no divider and no total — a *subtotal presented as a breakdown with nothing to break down*, in a
panel whose prose line (`PR6`, "Prix unitaire : 160 TND") already states the same number. **My
recommendation is to leave the whole block out** until `delivery_fee` lands, and to keep the prose
line — which is in Figma too, so nothing is being substituted. Founder call.

---

## panel-livraison

| # | region | Figma | page | state |
|---|---|---|---|---|
| **LV1** | `fields` gap | **12** | **16** (`gap-4` on the `dl`) | open |
| **LV2** | each `lv` block gap | 4 | 4 | ✅ |
| **LV3** | field label (`dt`) | 14/21 Regular **`#64748b`** | 14/21 · 400 · **`#475569`** | open — wrong tier |
| **LV4** | field value (`dd`) | 16 / **26** Regular `#0f172a` | 16 / **24** · 400 · `#0f172a` | open — 2px |

---

## panel-client

| # | region | Figma | page | state |
|---|---|---|---|---|
| **CL1** | name | 16 / **25** Semi Bold `#0f172a` | 16 / **24** · 600 | open — 1px |
| **CL2** | city | 14/21 **`#64748b`** | 14/21 **`#475569`** | open — wrong tier |
| **CL3** | **phone block** | "Téléphone" 14/21 `#64748b` + **the number itself, "+216 20 123 456", 16/26 `#0f172a`** | **number not rendered** | ⚑ **deliberate divergence** — `get_contact_phone` is relationship-gated and reveals on click inside `WhatsAppContactButton`. Rendering a phone number statically in a server component would defeat the gate. **The Figma should absorb this.** |
| **CL4** | disclosure | **12 / 17 Inter Medium** | **14 / 21** (`text-body-sm`) | open |
| **CL5** | WhatsApp button | 312×48, r10, `#25d366`, glyph 20, label 16/24 Semi Bold `#0f172a` | 305.16×48, r10, `#25d366`, label `#0f172a` | ✅ — and **C1 from pass 1 still holds: 9.00:1, AA passes** |

---

## panel-action

| # | region | Figma | page | state |
|---|---|---|---|---|
| **AC1** | primary button | 312×48, r10, `#1f5fe0`, label 16/26 Semi Bold `#ffffff` | 305.16×48, r10, `rgb(31,95,224)` | ✅ |
| **AC2** | print button + stamp | `504:27030` + `504:27041` | absent | **EXCLUDED** (documents PR) |
| **AC3** | hint | 14/21 `#475569` — copy references the print flow | 14/21 `text-muted` — different copy | ✅ correct given AC2 is excluded |
| **AC4** | **cancel link** | **`#e5484d` (red), `textAlign: CENTER`, full 312 wide** | **`brand-blue-600`, start-aligned, 144.22 wide** | open — **a destructive action rendered in the primary action colour** |

**AC4 is the most serious open item in this pass.** "Annuler la commande" is destructive and Figma
paints it `#e5484d`; the page paints it the same blue as "Accepter" directly above it. It reads as a
peer of the primary action rather than as a destructive one.

---

## panel-suivi — `497:26411`, 752×254 — BUILD SPEC (this PR)

Panel chrome is the standard 24 pad / 16 gap / r12 / 1px `#e2e8f0`.

| slot | spec |
|---|---|
| heading | "Suivi de livraison" — 20/26 Inter Semi Bold `#0f172a` |
| `lv` block `497:26413` | VERTICAL gap 4 · label "Société de livraison" 14/21 Regular `#64748b` · value "First Delivery" **16/26 Regular `#0f172a`** |
| `Input` `497:26416` | 704×97, VERTICAL gap 8 |
| ↳ label row | gap 2 · "Numéro de suivi" 14/21 **Inter Medium `#475569`** · asterisk **HIDDEN** ⇒ **not a required field** |
| ↳ field | 704×**44**, pad `0/16`, **r10**, fill `#ffffff`, **1px `#cbd5e1`** · value 16/26 Regular `#64748b`, placeholder **"Sera saisi à l'expédition"** |
| ↳ helper | 14/21 Regular `#64748b` — "Saisissez le numéro de suivi fourni par votre transporteur (à l'expédition)." · counter **HIDDEN** ⇒ no character count |

⚑ **The carrier is a VALUE, not an input.** Figma renders `Société de livraison` as static text in an
`lv` block — the same label/value shape as panel-livraison — while only `tracking_number` gets an
`Input`. But the schema made **`carrier` seller-writable**, and there is no other surface that could
write it (`shops.preferred_carriers` exists but is free text and has no edit route). **So the frame
does not say where the carrier comes from.** Founder call needed: either add a carrier control (a
Select would suit, and the schema supports it), or render it read-only and accept that it stays NULL
until a shop-settings surface exists. Building the frame literally ships a column nothing can
populate — the exact "dead input" defect this panel was originally withheld to avoid.

---

## panel-historique — `504:27042`, 752×185 — BUILD SPEC (this PR)

| slot | spec |
|---|---|
| heading | "Historique de la commande" — 20/26 Inter Semi Bold `#0f172a` |
| `timeline` `504:27044` | 704×95, VERTICAL **gap 16** |
| `timelineLine` `504:27060` | **2×74** `#cbd5e1`, x-offset +4 from content left ⇒ centred on the dots (dot centre and line centre both land at 53464) |
| `entry` ×3 | HORIZONTAL **gap 8**, h21, MIN/CENTER |
| ↳ dot | **10×10**, r9999, **`#1f5fe0` on all three** — no per-state colour |
| ↳ `cr` | HORIZONTAL **gap 6** · label 14/21 Regular `#0f172a` · time 14/21 Regular `#64748b`, format **"· 18/07 09h12"** |

Specimen entries and what each can actually source:

| Figma entry | data | verdict |
|---|---|---|
| "Commande créée" | `order_events` `event_type='created'` | ✅ buildable |
| "Confirmée sur WhatsApp" | nothing records it | **EXCLUDED** (see exclusion 3) |
| "Bon de livraison imprimé" | print RPC deferred | **EXCLUDED** (documents PR) |

So the built timeline renders `created` plus each `status_change`. **Note the frame therefore shows
no status-change entry at all** — its three specimens are one creation and two events we cannot
source — so the status-change row's copy has no Figma reference and will be a decision, not a
measurement. Say so in-code when building it.

**Empty state:** all 14 existing orders have **zero** `order_events` rows (verified). There is no
empty-state frame for this panel.

---

## Verified-equal, swept and recorded so a later pass does not re-measure

Panel pad **24**, gap **16**, radius **12**, border **1px `#e2e8f0`**, fill **`#ffffff`** — on all
four built panels. twoCol gap **24**, main/rail gap **16**. Stepper circle sizes, radii, and all
three state treatments (fill, 2px ring, 1.5px outline). Node and connector counts (7 / 6). h1
font-size, weight and colour. Heading font-size, weight and colour. StatusPill geometry and paints.
COD note type and colour. `Quantité` line. WhatsApp button geometry, fill and **label contrast
(9.00:1)**. Order reference format (`#` + 6 upper hex). Document overflow at 1440: **zero**.

---

## Suggested scope

**Cheap and unambiguous (type/colour tiers, no layout risk):** S1+S2 together (label 14/20 + gap 4),
S3, S4, PR6, LV3, CL2, CL4, PR4, LV4, CL1, C1–C5.

**Should close — behavioural, not cosmetic:** **AC4** (destructive action in the primary colour) and
**S4** (the current stage has no emphasis, so the rail no longer answers "where am I?").

**Scope calls, listed because they are not mine to make:**
- **S6/S7** — hug-width labels + a centred 903.5 rail. A layout-model change, and it touches E3.
- **S8/S9** — connector colours. Repaints E3's rail against an unmeasured frame.
- **PR7** — whether row 1 of `priceBreakdown` ships alone. I recommend not.
- **panel-suivi's carrier** — value or control. Blocks a faithful build either way.
- **The hidden stepper `date` layer** — now sourceable from `order_events`.

**Figma fixes owed (code is right, design is stale):**
- `495:26289` is 77 tall with 56 of content — resize it or unhide the `date` layers.
- `497:26426` renders a raw phone number that the platform's contact gating forbids.
- `497:26373` `thumb` is **28×80** — a hug-width sliver where a square thumbnail is plainly intended.

**Out of scope, already logged:** P7/P8 typography tokens (platform-wide); the tailwind-merge
eviction class; the 375 rail overflow; `received_at`.
