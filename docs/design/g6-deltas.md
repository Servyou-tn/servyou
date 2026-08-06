# G6 « Ajouter un produit » — fidelity deltas

**Frame:** `530:31784` (1440×1643) · **Specimens:** `532:32191` (stock non suivi) · `532:32201` (galerie remplie) · `532:32245` (cascade catégorie)
**Built page:** `/mes-produits/ajouter`, measured at **1440×900, logged in as the shop owner**
**Date:** 2026-08-06 · **Branch:** `fix/g6-figma-fidelity` off `origin/main` @ `a4073bf` (the #114 merge)
**Status: REPORT ONLY. Nothing fixed yet — the founder decides what gets closed.**

---

## 0. ⚑ The one APPROVED divergence — not a miss

**Sous-catégorie is deliberately absent.** The frame's Section 1 is a two-column row of
`Catégorie` + `Sous-catégorie` Selects, and specimen `532:32245` documents the cascade in three
states (empty→disabled · Mode→7 subs · Électronique→7 subs).

**It is not built, on purpose, and it is not a delta.** The live `categories` table is flat —
`parent_id` is NULL on all 14 rows — so there is no second level to cascade to.
`src/lib/taxonomy/product-categories.ts` describes an 11-sector / 57-subcategory taxonomy the
database does not have; reconciling them is its own migration PR (`g6-discovery.md` §6 B2). Founder
call, carried into #114.

**Do not read anything below as reopening this.** The only live consequence is D11.

---

## 1. Measurement budget — **0 calls spent, and 0 spendable**

**The Figma connector is not reachable from this session at all.** No Figma tool is exposed here
(`ToolSearch` for `+figma` returns nothing; `DesignSync` is claude.ai design-system projects, a
different thing). So the ~6/month rolling budget was not drawn down — not by restraint, by absence.

That makes the record the only source, which is why the audit below separates what is *settled* from
what rests on an eyeball. **Every structural delta except copy strings was already on file.**

### What the record already covered — no call needed

| source | what it settled here |
|---|---|
| `figma-registry.md:624-635` | all four node ids, frame sizes, child anchors, x-positions, **no mobile frame** |
| `figma-registry.md:216` | `Toggle = 75:1840` — 12 variants, props `showLabel(bool)` `label(text)`. **Built.** → D5 |
| `figma-registry.md:187` | `Price Input = 202:15487` — 4 variants, `state[default,focus,error,disabled]`. **Built.** → D4 |
| `figma-registry.md:264` | `icon-grip-vertical = 197:14956` — adjacent to the memory's `Dropzone = 197:14957`, corroborating that node id from an independent source → D6 |
| **G6 build memory** | **the section names verbatim**, the 760px column, the field spec, counters, the two-CTA gate list, `tracks_stock` toggle default-ON, thumb geometry (4×96), ribbon relabel, buyer-total copy → D3, D5, D6, D7, D12 |
| `g6-discovery.md` §3 | the breadcrumb caveat — the parent route **does not exist** → D1 |
| `g6-discovery.md` §2 | named `532:32204` as the ONE deferred measurement candidate, for exactly this pass |

### The gap the record cannot close

**Copy strings.** The registry stores geometry; the build memory stores structure and a few quoted
strings, but not per-field helper text, not the breadcrumb label, not the page subtitle, not the
toggle label, not the dropzone copy. **Five of the nine deltas turn on an exact string** (D1, D2, D5,
D6, D9). Those are marked **evidence class C** below: the founder's reading is the only source, so
the *divergence* is confirmed by measurement (the string is missing or different) but the
*replacement text* is theirs, not measured.

⚑ **Stale-record warning.** The build memory says the bucket is `product-media`. **It is
`product-images`** (migration `20260731073614`, and #114 ships against it). The memory is 17 days
old and wrong on this one point. Do not "fix" the code to match it.

---

## 2. Evidence classes

| class | meaning |
|---|---|
| **A** | Settled by the registry or the build memory — the Figma side is on record |
| **B** | Measured in the built page today — the code side is certain |
| **C** | Founder eyeball only — divergence confirmed by B, replacement text unverified |

Every delta below is **B-confirmed** (the built state is measured). The class shown is the strength
of the *Figma* side.

---

## 3. Region-by-region

Built page measured at 1440 with a real session. Form column **760px — matches the frame.**

| region | Figma (per record) | built today (measured) | delta |
|---|---|---|---|
| breadcrumb | "Mes produits › Ajouter un produit" | **absent** — zero `nav`/`ol` with a separator anywhere on the page | **D1** |
| page title | plain "Ajouter un produit" + subtitle | `h1` "Ajoutez un produit à votre boutique", per-character `.ph-reveal` spans, `text-brand-blue-600` on *produit*, underline span, wrapped in a `border-b … pb-8 pt-6` panel | **D2** |
| §1 heading | **Informations** | "Informations de base" | **D3a** |
| §2 heading | **Prix & livraison** | "Prix et livraison" | **D3c** ⚑ new |
| §3 heading | Stock | "Stock" | ✅ matches |
| §4 heading | **Images** | "Photos du produit" | **D3b** |
| §1 fields | Titre /100 · Catégorie (+Sous-cat) · Description /2000 | Titre /100 ✅ · Catégorie (full-width) · Description /2000 ✅ | **D11** |
| §2 money fields | TND **inside** both fields (Price Input `202:15487` carries a `TND` text node in its `field` frame) | **no adornment inside either field** — `adornmentsInsideField: []` for both; "TND" sits in the label text instead | **D4** |
| §2 preview | "Le client paiera : 45 + 7 = 52 TND à la livraison" | "Le client paiera : 0 + 7 = 7 TND à la livraison" | ✅ same template |
| §3 control | Toggle `75:1840`, `showLabel`, default ON | `<input type="checkbox">`, no `role`, no `aria-checked`, label "Gérer le stock" | **D5** |
| §3 off-state | specimen `532:32191` — "Stock illimité…" | "Le produit restera affiché comme disponible en permanence." | **D5b** |
| §4 empty | full-width dashed Dropzone `197:14957`, upload-cloud icon | **165×165 tile** inside the grid — `fullWidth: false` | **D6** |
| §4 filled | specimen `532:32201` — 4×**96** thumbs + dashed "+Ajouter" tile | responsive `grid-cols-2 sm:grid-cols-4`, tiles 165px at 1440 | **D12** ⚑ new |
| required marks | red asterisks on required labels | **`asteriskCount: 0`** across the whole form | **D8** |
| helper text | helper under most fields | 2 counters (§1), 1 helper + 1 preview (§2), **0 in §3**, 1 hint (§4) | **D9** |
| footer | [Enregistrer le brouillon] **left** · [Publier le produit] **right** · no third control | DOM+visual order **Publier (x=292, disabled) → Brouillon (x=458) → Annuler (x=662)** | **D7** |
| form width | 760 | **760** | ✅ matches |
| mobile | **no frame exists** (registry) | — | not a fidelity question |

---

## 4. The nine, adjudicated

**All nine confirmed.** Measurement disagrees with none of them. Three corrections/additions below.

| # | delta | class | verdict |
|---|---|---|---|
| **D1** | No breadcrumb | **C** (label) / A (route problem) | ✅ confirmed — **but see the caveat** |
| **D2** | Title treatment | **B**+C | ✅ confirmed, and worse than described |
| **D3** | Section headings | **A** | ✅ confirmed — and there are **three**, not two |
| **D4** | No TND suffix in the fields | **A** | ✅ confirmed |
| **D5** | Checkbox not toggle | **A** (control) / C (label) | ✅ confirmed |
| **D6** | Tile not dropzone | **A** (component) / C (copy) | ✅ confirmed |
| **D7** | Footer order + extra control | **A** | ✅ confirmed exactly |
| **D8** | No asterisks | **A** | ✅ confirmed — zero in the form |
| **D9** | Helper text missing/reworded | **B**+C | ✅ confirmed |

### D1 — ⚑ the breadcrumb links to a 404

The breadcrumb is genuinely absent and should exist. **But "Mes produits" has no route.**
`src/app/mes-produits/` contains only `ajouter/`; G5 is unbuilt; and the sidebar entry is already
`disabled: true` (`sidebar-items.ts:84`). `g6-discovery.md` §3 flagged this before the build.

Shipping the Figma label verbatim ships a dead link. **Recommend:** render the breadcrumb, point the
parent at `/tableau-de-bord-vendeur` until G5 lands, and keep the "Mes produits" *label* only if you
want the text to match Figma exactly — otherwise label it for where it actually goes. **Founder call:
match the label, or match the destination.** They cannot both be right until G5 exists.

### D2 — the title is the wrong component, not just wrong copy

`PageHeader` is not a neutral title. Its own header comment reads *"Premium animated subtitle row
for the **consumer dashboard shell**"* — it splits the string into per-character `.ph-reveal` spans,
colours the emphasis word, draws an underline, and sits in a bordered panel. It was built for
`/marche`-style consumer surfaces, and G6 is a seller form.

So the fix is not "change the string": it is **stop using `PageHeader` here** and render a plain
title + subtitle. That also disposes of the coloured word, the underline and the panel in one move.
⚑ The subtitle copy is **class C** — no record of it.

### D3 — three heading deltas, not two

The build memory names the sections verbatim: **Informations · Prix & livraison · Stock · Images.**

| built | Figma | |
|---|---|---|
| Informations de base | **Informations** | your #3 |
| Prix et livraison | **Prix & livraison** | ⚑ **you did not list this one** — "et" vs "&" |
| Stock | Stock | ✅ |
| Photos du produit | **Images** | your #3 |

### D5 — and the control is already built

`Toggle 75:1840` exists with `showLabel(bool)` + `label(text)` props (registry:216). G6 hand-rolled
a checkbox instead of using it. Default-ON is correct in the build and matches. Two sub-deltas: the
**control** (A) and the **off-state helper copy** (C — memory records "Stock illimité…", the build
says "Le produit restera affiché comme disponible en permanence.").

### D6 — two states collapsed into one

Figma has **two** gallery states and the build has one:

- **empty** (main frame) → full-width dashed **Dropzone `197:14957`** with an upload-cloud icon
- **filled** (specimen `532:32201`) → grid of 96px thumbs **plus** a dashed "+Ajouter" tile

The build renders a single grid whose first cell is a 165×165 "Ajouter une photo" tile, in both
states. The empty state never shows a dropzone at all. Dropzone copy is **class C**.

### D7 — confirmed to the pixel

Measured left offsets: **Publier 292 · Brouillon 458 · Annuler 662.** Figma is Brouillon left,
Publier right, and no third control. So the two CTAs are transposed *and* there is an extra `<a>`.

⚑ **Build gotcha that applies the moment this is rebuilt:** the Button component is a *sparse*
42-variant matrix — **`primary/lg/disabled` does not exist; use size `md` for disabled buttons.**
Publier ships disabled by default (it is gated on ≥1 image), so it will hit exactly that hole.

---

## 5. Three more the eyeball did not catch

| # | delta | class | note |
|---|---|---|---|
| **D10** | G6 uses **no design-system primitives** — raw Tailwind for every button, input, select and textarea | B | `ui/button` is adopted in **7** files including `ServiceRequestForm` (E1, a form). `MissionForm` also hand-rolls, so there is precedent both ways. Relevant because D4/D5/D7 all mean touching these controls anyway. **Founder call: adopt the primitives in this pass, or keep raw and log it.** |
| **D11** | `Catégorie` renders **full-width**; Figma's row was a two-column cell | A | A *consequence* of the approved §0 divergence, not a miss. With Sous-catégorie gone the row has one occupant. **Founder call: let it span 760, or keep it half-width and leave the right cell empty.** |
| **D12** | Gallery thumbs are **165px** responsive, not the **96px** the specimen records | A | `grid-cols-2 sm:grid-cols-4` on a 760 column yields 165 at 1440. Reorder/grip stays deferred (approved in #114). |

---

## 6. What closing these costs

Grouped by blast radius, so scope can be cut cleanly.

| group | deltas | touches | risk |
|---|---|---|---|
| **Copy only** | D3 (×3), D5b, D9 | `fr.ts` + `ar.ts` | none — string edits, AR parity required |
| **Structure, local to G6** | D1, D2, D7, D8, D11 | `page.tsx`, `ProductForm.tsx` | low — D2 removes a `PageHeader` call; D7 reorders and drops the `Annuler` link |
| **Controls** | D4, D5, D10 | `ProductForm.tsx` (+ primitives) | medium — a TND adornment and a real toggle; D10 decides whether these become `ui/*` imports |
| **Gallery** | D6, D12 | `ImageUploadGrid.tsx` | medium — adds an empty-state dropzone distinct from the filled grid; **no action or storage change** |

**Nothing here touches the write path.** `createProductAction`, `uploadProductImageAction`, the
compensating delete, the `imagePaths` prefix check and every test from #114 are untouched by all
twelve. This is a presentation pass.

⚑ **Two C-class items need a string from you before they can be built**: the page subtitle (D2) and
the dropzone copy + format/size hint (D6). Everything else I can close from the record.

---

## 7. Not deltas — verified matching

Recorded so a later pass does not "fix" them: form column **760px** ✅ · title counter **/100** ✅ ·
description counter **/2000** ✅ · buyer-total preview template ✅ · `tracks_stock` **default ON** ✅ ·
sticky footer ✅ · cover badge on the first image ✅ · gallery max **8** ✅ · delivery fee default
**7** ✅ · publish gated on ≥1 image ✅ · **no mobile frame exists**, so 375px is a product decision,
not a fidelity one.
