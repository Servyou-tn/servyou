# G9 « Détail de la commande » — Figma ↔ page delta pass

**Report only.** Nothing in this file has been fixed. It is the input to a scope call.

**Measured** 2026-07-28 against `feat/g9-order-detail` @ `adeed3d`, dev server on :3000, fresh
`.next`, headless Chrome at 1440×900, FR, logged in as the real shop owner, on the seeded
`pending` order `f14bbb38…`.

⚠ **The Figma MCP hit its plan rate limit mid-pass.** The Figma column below is therefore the
node-tree metadata captured earlier in this session (geometry: sizes, positions, text-node
heights), not a fresh read. Geometry is reliable; **paint-level values for the stepper could not be
re-read**, and where a Figma colour is inferred rather than measured it says so. The CDP bridge was
not used because reconnecting it means killing a running Figma.

| node | region |
|---|---|
| `495:26112` | Order detail — desktop (main frame) |
| `498:26471` / `498:26622` | Specimens — pending / in_delivery |
| `495:26288` → `495:26289` | panel-stepper → Order Stepper (903.5×77) |
| `497:26370` / `497:26396` / `497:26426` / `497:26456` | panel-produit / -livraison / -client / -action |

---

## ⚠ Read this before filing any width delta — same as G4 and G8

Every horizontal measurement is **15px narrower** than Figma: main **752 → 742**, rail
**360 → 355**, content **1136 → 1121**. `scrollbar-gutter: stable` reserves 15px, so the real
viewport is 1425. The grid re-adds exactly (741.844 + 24 + 355.156 = 1121). **Not a defect.**

## ⚠ Three omissions are DELIBERATE — not misses

Founder call, pending the schema PR. A later pass must not read these as gaps:

- **`panel-suivi`** (carrier + tracking-number input) — no carrier column, no tracking column.
- **`panel-historique`** (event timeline) — no per-step timestamps, nothing records a WhatsApp
  confirmation or a print. **Exception shipped:** the cancellation entry renders.
- **The `Livraison` and `Total` rows** in the price breakdown — no `delivery_fee`, and a total
  silently equal to the subtotal is a wrong number on a COD invoice.

---

## STRUCTURAL — 3

| # | region | Figma | page | note |
|---|---|---|---|---|
| **S1** | Lifecycle stepper | connected rail: `Order Stepper` **903.5×77**, centred in a 1136×125 panel — completed filled + check, current highlighted, upcoming grey, **with connectors** | **7 flat 24×24 numbered circles, zero connectors** (`aria-hidden` connector count = **0**), current = blue-600 fill, others `gray-100`, done = a literal `'✓'` text character | ⚑ see below — the component IS wired, it is the wrong component |
| **S2** | Rail action button | `Button` **312×48**, full-width, filled primary | **88×32**, `variant="secondary"` (white + `border-strong`), **right-aligned** inside a `flex flex-col items-end` wrapper | the WhatsApp button beside it is already 305×48 full-width, so the two read as different ranks when the frame gives them the same weight |
| **S3** | Rail cancel | "Annuler la commande" as a **21px text link** at the panel foot | a **305×32 ghost Button** | lower priority; the frame's is plainly a link |

### S1 — the component is wired, but it is the wrong one

`OrderLifecycleStepper` **is** being used (`[id]/page.tsx:112`). The problem is that component: it
predates the design system. Its source uses **raw Tailwind palette classes** — `bg-green-100`,
`text-green-700`, `border-gray-200`, `text-gray-400`, `border-red-200`, `bg-red-50` — none of which
are app tokens, renders `{done ? '✓' : i + 1}` as text in a 24px circle, and draws **no connectors
at all**. Its only other consumer is `admin/litiges/[id]`.

**E3 already solved this properly** and G9 did not reuse it: `stageState()` in
`lib/orders/order-status.ts` + the rail markup in `OrdersList.tsx:165` gives completed / current /
upcoming states with connectors, token-bound. That is the implementation the frame describes.

Two ways to close it, and the choice matters:
1. **Extract E3's rail** into a shared component and point G9 at it. E3's `RAIL_STAGES` is the
   4-stage *service* rail, so the extraction must take the chain as a prop (G9 needs the 7-step
   product chain via `lifecycleFor`).
2. Rewrite `OrderLifecycleStepper` in tokens. Touches `admin/litiges` too.

(1) is the better trade — E3's is the shipped, measured treatment. It is also more work than a
delta fix, so it is a scope call rather than a tweak.

## SPACING / TYPE — 4

| # | region | Figma | page | note |
|---|---|---|---|---|
| **P1** | Panel headings | text nodes measure **26** tall ⇒ `leading/h3` = **26** (consistent with the H3 measured on G4 and G8) | **20px/28px 600** | the platform-wide typography-token gap, **not** G9-specific — same 2px as G4 P6 |
| **P2** | Panel heading colour | `text/primary` `#0f172a` | **`rgb(15, 23, 42)`** | ✅ **identical — the brief's "darker" does not reproduce**, see the correction below |
| **P3** | Panel padding / gap / radius | pad 24 · radius 12 | pad **24** · gap **16** · radius **12** | ✅ matches |
| **P4** | Two-column split | main 752 + rail 360, gap 24 | **741.8 + 355.2, gap 24** | ✅ the 15px gutter, correct |

### P2 — correction to the brief

The brief said the headings measure "larger **and darker**". Measured, they are **larger only**:
line-height 28 vs 26 (the token gap), while the colour is `rgb(15,23,42)` on both sides — the same
`text/primary`. Nothing is darker. Worth stating because "darker" would send a fix at the colour,
which is already right.

## COLOUR — 1, and it is the most serious finding in this pass

| # | region | expected | rendered | note |
|---|---|---|---|---|
| **C1** | **WhatsApp button label** | `text/primary` `#0f172a` on `wa/brand` `#25d366` — **9.00 : 1** | **`rgb(237,237,237)`** on `#25d366` — **1.69 : 1** | ⚑ **fails WCAG AA badly** (needs 4.5:1). Near-white text on mid-green. |

**Cause — my own documented gotcha, hit again.** In `WhatsAppContactButton` the class list is
`… text-text-primary … , size === 'lg' ? 'h-12 w-full px-4 text-body' : '… text-body-sm'`, all
passed through `cn()` → tailwind-merge. **tailwind-merge treats `text-*` as ONE group**, so the
later `text-body` / `text-body-sm` *evicts* `text-text-primary`, and the label falls back to the
inherited `rgb(237,237,237)`. Exactly the "tailwind-merge drops text-body-sm" trap recorded during
the /marche/services rebuild — this time it dropped the colour instead of the size.

This affects **both** surfaces the component serves: G9's rail button and G8's row button.

## COPY / DATA — 2

| # | region | Figma | page |
|---|---|---|---|
| **C2** | Order reference | **"Commande #A4F729"** — hash, **UPPERCASE**, 6 chars | **"Commande f14bbb38"** — no hash, lowercase, 8 chars. Breadcrumb likewise reads `f14bbb38` |
| **C3** | COD note / helper text | 14/21 muted | ✅ **14/21 `rgb(100,116,139)`** — matches |

### C2 — correction to the brief, and a scope question

`shortRef(id) = id.slice(0, 8)` — 8 lowercase hex characters, no hash. The brief said "G8 and E3
both use it and both render the hash". Measured: **neither renders it at all.** Both call sites
(`OrderActionRow.tsx:111`, `OrdersList.tsx:147`) interpolate `shortRef` into a **WhatsApp message**
only. **G9 is the first surface to display an order reference on screen**, and no call site adds a
`#` or uppercases.

So the fix has a scope choice:
- **Change `shortRef` itself** (add `#`, uppercase, 6 chars) — G9 renders correctly *and* both
  WhatsApp messages start quoting `#A4F729` instead of `f14bbb38`, which is better and consistent.
  But it silently changes E3's shipped buyer message.
- **Format at G9's call site only** — leaves the two WhatsApp messages quoting a lowercase
  8-char fragment while the page shows `#A4F729`, i.e. the seller and buyer would be discussing
  two different-looking references for the same order.

I recommend changing `shortRef`, precisely because the reference should be *one* string everywhere
it appears — that is the point of a reference.

## Verified-equal (swept, not named in the brief)

Recorded so a later pass does not re-measure them: panel padding **24**, panel gap **16**, panel
radius **12**, panel border **1px `rgb(226,232,240)`**, panel background **white**, two-column
split and gap, COD note and helper text type/colour (**14/21 `rgb(100,116,139)`**), heading colour,
H1 (**32px/40px 700 `rgb(15,23,42)`** — line-height is the known token gap, weight and colour
correct), the WhatsApp button's own **305×48** geometry and `#25d366` fill.

---

## Suggested scope

**Close now (defects):** **C1** — the contrast failure is an accessibility bug on two shipped
surfaces and is a two-line fix. **C2** — the reference format, with the `shortRef` change. **S2** —
the rail button to full-width primary 48, which also makes it and the WhatsApp button read as
equals. **S3** — cancel to a text link.

**Scope call:** **S1** — the stepper needs E3's rail extracted into a shared component taking the
chain as a prop. Bigger than a delta fix, and it touches E3 and `admin/litiges`.

**Out of scope (platform-wide, already logged):** **P1** typography tokens.

---

## Closed in this pass

Founder scope call: close all five. Every "after" is re-measured from the DOM.

| # | fix | after (measured) |
|---|---|---|
| **C1** | Label colour lifted onto its own `<span>` so tailwind-merge cannot evict it | **`rgb(15,23,42)` on `rgb(37,211,102)` = 9.00 : 1 — PASSES AA**, on BOTH surfaces (G9 rail and G8 row). Was 1.69 : 1. |
| **C2** | `shortRef` → `#` + six UPPERCASE hex | h1 renders **"Commande #F14BBB"**; both WhatsApp templates now quote the same string |
| **S1** | `OrderRail` extracted from E3, chain as a prop; G9 walks `lifecycleFor()` | **7 nodes + 6 connectors** (was 7 nodes, **0** connectors) |
| **S2** | Rail action → full-width filled primary | **"Accepter" 305×48, `rgb(31,95,224)`** — same size as the WhatsApp button beside it. Was 88×32 secondary, right-aligned. |
| **S3** | Cancel → text link at the panel foot | **"Annuler la commande" 144×21**, transparent. Was a 305×32 ghost button. |

### C1 — the cause, not the symptom

The colour now lives on a **separate element** from the size. tailwind-merge treats every `text-*`
utility as one group, so a colour and a size in the same merged string collide and the later wins —
which is how `text-text-primary` was evicted by `text-body`. Splitting them across two elements
makes the collision **impossible rather than order-dependent**: reordering the button's classes can
no longer bring it back. Class-order alone would not have been a guard rail, as the brief said.

This is the second eviction by that group in this codebase — a size during the /marche/services
rebuild, a colour here.

### S1 — reuse, not a copy

`OrderRail` is now the single implementation and **E3 was migrated onto it** in the same pass. Had
E3 kept its local `Rail`, the "extraction" would have been a second copy of the same markup — the
exact thing this delta was about. E3 keeps its own 4-stage buyer chain; G9 passes the 7-step seller
chain. Only the treatment is shared.

`OrderLifecycleStepper` is untouched and still serves `admin/litiges/[id]` — migrating that is a
follow-up, not this PR's business. `stageState` now has no live consumer and is marked as such in
place rather than deleted, since removing a public export is its own cleanup.

### Note on C2's test

The brief asked to update "the E3 test that pins the current shape". **There was none** — no test
referenced `shortRef`, which is part of why an 8-char lowercase reference survived unnoticed. Four
tests were added instead, pinning the new shape and asserting the WhatsApp templates interpolate
the same string the page displays.

**Still open by decision:** P1 typography tokens (platform-wide).
