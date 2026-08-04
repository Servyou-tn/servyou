# G6 « Ajouter un produit » — where the build diverges from frame `530:31784`

**REPORT ONLY.** Nothing built. Companion to `docs/design/g6-discovery.md`.
**Date:** 2026-08-04

Three reconciliations, each stating what the frame asserts, what ships, and what that costs.

---

## D-1 — Category picker: **one level, not two.** Visible divergence.

### What the frame asserts

Section 1 renders **two Selects side by side** — Catégorie + Sous-catégorie — and specimen
`532:32245` documents the cascade in three states: ① empty → Sous-catégorie **disabled**,
② "Mode" → its 7 subs, ③ "Électronique" → its 7 subs. The caption fills them from
`src/lib/taxonomy/product-categories.ts` (11 sectors / 57 subcategories).

### What ships

**One Select.** No Sous-catégorie control at all. Per the founder call of 2026-08-04: G6 ships
against the live `categories` table rather than reseeding the taxonomy, because reseeding means
remapping live URL slugs, seeding 57 rows, and changing the shipped `/marche/produits` filter
derivation — a migration plus a routing change plus a regression surface, to make a picker prettier.

`product-categories.ts` is untracked, has **zero consumers**, and its slugs overlap the live table
**1 of 11**. The live table is flat: 14 rows, `parent_id` NULL on every one, **zero subcategories**.

**So specimen `532:32245` is unbuildable as drawn.** Not deferred-and-approximated — the second
control has no data behind it in any form. Dropping the control entirely is more honest than
shipping a permanently-disabled Select that looks broken.

### 🔴 But the divergence is bigger than one missing control

The live `categories` table is **shared between products and services and has no `kind`
discriminator.** Measured:

| inferable kind | count | slugs |
|---|---:|---|
| product-used | 3 | `mode`, `electronique`, `beaute-soins` |
| **service-used** | **7** | `developpement`, `design-creation`, `marketing`, `montage-video`, `redaction`, `business-conseil`, `ugc` |
| **?? UNKNOWABLE** | **4** | `automobile-accessoires`, `maison`, `sante`, `data-science-analyse` |

**A one-level picker over all 14 rows offers a shop owner "Montage Vidéo" and "Développement" as
categories for a physical product.** That is not a cosmetic shortfall — it is a data-integrity
defect the frame never had, because the frame's source was product-only.

And it cannot be inferred away. The 4 unknowable rows have neither products nor services, so
usage-scoping (the trick `filter-categories.ts:24-44` uses for the marketplace filter) cannot
classify them — and usage-scoping is wrong for a *picker* anyway: it would offer only the 3
categories that already have products and make every other category permanently unreachable.

### Three ways out — this needs a call before the picker is built

| # | option | cost | verdict |
|---|---|---|---|
| **A** | Offer all 14 | zero | ❌ ships the defect above |
| **B** | Hardcode a product-sector allowlist in G6 | zero migration | ❌ violates "never hardcode the taxonomy"; drifts the moment a category is added |
| **C** | **Add `categories.kind` (`'product'｜'service'｜'both'`)** | **one small ADDITIVE migration** — no slug remap, no URL change, no filter-derivation change, ~14 backfill UPDATEs (4 need a judgment call) | ✅ **recommended** |

**C is not the deferred taxonomy migration.** What was deferred was reseeding: remapping 5 live
slugs, inserting 57 subcategory rows, and changing what `/marche/produits` derives its filter from.
Adding a discriminator column touches none of that — it is additive, breaks no URL, and is exactly
the thing the shared tree has been missing since it was created. It also makes the eventual
taxonomy reseed *easier*, because the product/service split will already be expressed.

Without C, the honest fallback is **B behind a single named constant with a TODO**, which I would
rather not ship silently.

### Logged

- **Frame `532:32245` (cascade, 3 states) is not built.** It becomes buildable when the taxonomy
  reseed lands, not before.
- **The second Select is absent, not disabled.**
- Design should be told the frame's category source does not exist in the database, so the
  specimen is not treated as a fidelity gap by a later measurement pass.

---

## D-2 — Gallery: building 3 of 4 affordances. Reorder deferred.

Specimen `532:32201` (`gallery = 532:32204`) shows four affordances.

| affordance | ships? | why |
|---|---|---|
| **× to remove** | ✅ **BUILD** | DELETE policies exist on `product_images` (public) and — as of PR-1 — on `storage.objects`. Removes the row *and* the object, matching the avatar writer's rollback pattern. |
| **"Couverture" badge on the first image** | ✅ **BUILD** | Free. It is a derived label on the lowest `display_order`, not a stored flag. Note the frame relabels the Product-Card ribbon "Principale" → **"Couverture"**. |
| **Per-file progress (the "uploading" tile)** | ✅ **BUILD — and it is mandatory, not optional** | Vercel caps a function request at **4.5 MB total**, and `MAX_INPUT_BYTES` is 4 MB for one file. **Eight files cannot share one submit.** The write path must be one file per server-action call, which makes per-file state structural rather than decorative. The frame already anticipates it with an uploading tile. |
| **Drag-to-reorder** | ❌ **DEFER to G7** | see cost below |

### What reorder costs, stated before deciding

Reordering means writing `display_order` on existing rows. **`product_images` has no UPDATE
policy** — SELECT (`true`), INSERT and DELETE only. So today a `display_order` UPDATE is refused by
RLS. Two ways to get it:

| approach | cost |
|---|---|
| **Add an UPDATE policy** | a small additive migration mirroring the existing INSERT/DELETE join. But it is an **RLS change**, so it needs its own discovery + approval, and it widens what an authenticated shop owner may write on that table — for an affordance that has no use on a *create* form. |
| **Delete + reinsert every row on each reorder** | no migration, but genuinely bad: it destroys `created_at` (the documented tie-break when `display_order` collides — and there is **no unique constraint** on `(product_id, display_order)`), churns row ids, and leaves a window where the product has fewer images than the seller sees. |

**Deferring is nearly free on a create form**, because the seller controls upload order: first
uploaded is the cover. Reorder's real use case is *editing an existing gallery*, which is **G7**.
Recommend the UPDATE policy ships there, with its own discovery, rather than being bought here for
a screen that does not need it.

### Logged (per the founder's call to keep these with G6's discovery)

- **No UPDATE policy on `product_images`** → reorder needs one, or delete+reinsert.
- **No unique constraint on `(product_id, display_order)`** → duplicate positions are legal; all 8
  live rows are `0`, so ordering has never actually sorted anything.

---

## D-3 — Price block: **yes, live from the two inputs.** No divergence.

The frame's Section 2 renders `Prix` + `Frais de livraison` and, below them, a surface/subtle box
reading:

> **Le client paiera : 45 + 7 = 52 TND à la livraison.**

**Confirmed: computed live from the two controlled inputs**, recalculating on every keystroke. It
is where the profit model becomes concrete for the seller — he pays nothing, the buyer pays
price + delivery at the door, and at `received` the seller's profit is the product price while the
fee goes to the delivery agency. Both numbers are copied onto the order at purchase and feed G4's
Bénéfice net and the G8/G9 bordereau.

The section is a client component regardless (the stock toggle and the picker need state), so the
preview costs nothing structurally.

### Four things the frame does not specify, which the build must decide

| case | frame | proposed |
|---|---|---|
| **Empty / partial input** | shows both filled | render nothing until *both* parse as numbers — a preview reading "0 + 0 = 0" teaches the wrong thing |
| **Decimals** | integers only (`45 + 7 = 52`) | both columns are `numeric(10,2)`, so `45.5 + 7 = 52.5` is reachable. Render what the seller typed |
| **Fee = 0** | not shown | legal (`CHECK delivery_fee_tnd >= 0`). Recommend the arithmetic still renders rather than a special "livraison gratuite" string — inventing copy design has not written |
| **AR rendering** | FR only | the sentence embeds three numerals, so it needs a **parameterised** i18n key (`{price}`, `{fee}`, `{total}`), never string concatenation, and the numerals must sit correctly in RTL |

⚑ **Money format — a known platform-wide divergence, and this PR should not fix it.**
`g9-deltas-3.md` **X-4** records that money renders raw (`12.5 TND`, not `12,50`) across the
platform, and it is filed. The frame's own preview shows bare integers, so **matching the frame
here also matches the current platform behaviour**. Flagging only so the preview is not "fixed" in
isolation, which would make G6 the one screen formatting money differently from every other.

---

## Summary — what design should be told

| # | divergence | class |
|---|---|---|
| **D-1a** | Sous-catégorie Select **absent**; specimen `532:32245` not built | STRUCTURAL — the frame's data source does not exist |
| **D-1b** | 🔴 The live category list mixes **7 service categories** into a product picker | **blocks the picker** until `categories.kind` or an allowlist is decided |
| **D-2** | Drag-to-reorder **not built**; other three gallery affordances built | deferred to G7, cost stated |
| **D-3** | none — preview ships live | ✅ |

**One decision blocks the build: D-1b.** D-1a is settled, D-2 and D-3 are settled.
