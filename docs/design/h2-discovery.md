# Créer mon profil freelance (H2) — discovery record

**Provenance — read this before trusting a number.** This file was written in ONE pass and that
pass is split by what actually got read. Every value is tagged inline: **📐 MEASURED** (via
`get_design_context`, this session, 2026-08-14) or **🧠 MEMORY** (`project_figma_h1h2_devenir_freelance.md`,
written ~2026-07-19, flagged point-in-time and unverified). A third tag, **📁 REPO**, marks facts
read live from the working tree / Supabase schema on 2026-08-14 — trust these like 📐.

**Half the brief could not be measured. Read this before the rest of the file.** The Figma MCP
connection for this project is on a **Starter plan, View seat — 20 read-calls per month, shared
across `get_design_context` / `get_metadata` / `get_screenshot`, hard cap, no per-minute reset.**
Three calls were attempted this pass:

| # | node | tool | result |
|---|---|---|---|
| 1 | `466:20244` (H2 step 1 "right") | `get_design_context` | ✅ returned — full subtree, one call closed the whole frame |
| 2 | `467:20404` (H2 step 2 "box") | `get_design_context` | ✅ returned — full subtree, one call closed the whole frame |
| 3 | `468:20502` (H2 step 3 "box") | `get_design_context` | ❌ **`mcp_rate_limit_paywall` — monthly quota exhausted** |

A 4th call, `whoami`, is exempt from the rate limit (confirmed against `file://figma/docs/rate-limits-access.md`)
and was used to diagnose the failure — it does not count as a measurement. **`468:20538` (success
screen) was never attempted** — the quota was already exhausted before reaching it, and there was
no point spending the call-failure round-trip twice.

**Net result: steps 1 and 2 are 📐 MEASURED, complete, field-level, one call each — exactly what the
brief asked for. Step 3 and the success screen are 🧠 MEMORY ONLY** (26 days old, unverified), backed
where possible by 📁 REPO facts (routes, schema) that don't depend on Figma at all. Nothing below is
guessed to paper over the gap — every step-3/success claim is tagged and the exact call that closes
it is named in place.

The registry (`docs/design/figma-registry.md:542-552`) confirms all four node IDs and adds nothing
below depth 1 — same limitation `d1-discovery.md` already documents for this file.

---

## 1. The four frames

`figma-registry.md:537-552`:

```
Devenir freelance — 1440 = 466:19958  (1440×934, x=41219)
Créer mon profil freelance — 1440 = 466:20159  (1440×1156, x=43699)
  Sidebar = 466:20160
  right = 466:20244                              ← node 1, MEASURED
H2 — étape 2 Compétences & langues = 467:20384  (824×1064, x=45379)
  Stepper = 467:20386
  box = 467:20404                                ← node 2, MEASURED
H2 — étape 3 Détails (facultatif) = 468:20481  (824×875, x=45379)
  Stepper = 468:20483
  box = 468:20502                                ← node 3, BLOCKED (quota)
  footer = 468:20528
H2 — succès (profil créé) = 468:20536  (824×458, x=45379)
  box = 468:20538                                ← node 4, BLOCKED (quota, not attempted)
```

Step 1 lives inside the full page frame (with Sidebar/Topbar); steps 2/3/succès are cropped
**specimen** frames (824 wide) holding only their own Stepper + box (+ footer for step 3) — same
"specimen" convention as D1's four galerie/rupture/partager/signaler crops.

---

## 2. Step 1 — 📐 MEASURED (`466:20244`, one `get_design_context` call)

### 2a. Geometry, top to bottom

```
right (1200 wide within the 1440 page, per registry)
├ Topbar                              h=64
└ content                             pt=32 px=32 pb=40
   └ column                           w=760
      ├ top                           gap=24
      │  ├ page-header                gap=8
      │  │  ├ Breadcrumb               "Devenir freelance › Créer mon profil"
      │  │  ├ H1                       32px/38px bold — "Créer mon profil freelance"
      │  │  └ subline                  14px regular — "Trois étapes pour lancer votre profil.
      │  │                              Vous pourrez tout modifier plus tard."
      │  └ Stepper                    h=100, LEFT-PACKED not full-width-distributed
      │     step(100w) → conn(40w) → step(100w) → conn(40w) → step(100w)
      │     circle 36×36 (active: blue/600 fill + white number;
      │                   inactive: white fill + 2px border/subtle + muted number)
      │     label 14px (active: semibold primary "Bases";
      │                 inactive: regular muted "Compétences" / "Détails")
      │     connector = 2px rule, border/subtle
      ↓ 32 (boxWrap pt)
      └ box                           white, border/subtle, radius-xl(12), p=24, gap=20, w=760
         ├ field-avatar                h=100, gap=16
         │  ├ 120×120 circle (surface/sunken) + 32×32 camera icon, centered
         │  └ Button "Ajouter une photo" (secondary/sm, h=32) + helper, gap=8
         ├ Input      "Nom complet"              state=filled, h=44 field
         ├ Input      "Titre professionnel"      h=44 field, counter
         ├ Textarea   "À propos"                 h=120 field, counter
         └ SelectTrigger "Ville"                 h=44 field
└ footer                              border-t, px=32, py=20, justify-between
   ├ Button "Enregistrer et continuer plus tard"   (ghost)
   └ Button "Suivant"                              (primary, disabled — greyed in the screenshot)
```

**Every text field is 44px tall** (Input, Textarea excepted at 120), matching the same `h-44` field
convention already measured on D1/E1. **Inner box gap is a flat 20** between all five field groups —
no per-field variance. **Stepper is left-packed at 380px total width** (`3×100 + 2×40`) inside a
760px column, not spread edge-to-edge — do not `justify-between` it.

### 2b. Full field list — 📐 label, helper, required marker, control type all confirmed

| field | control | required | placeholder / value | helper | counter |
|---|---|---|---|---|---|
| Avatar | image upload (120×120 circle + camera icon) + secondary-sm Button "Ajouter une photo" | no — helper says "(optionnel)" | — | "Recommandée. Les profils avec photo reçoivent bien plus de contacts. (optionnel)" | — |
| Nom complet | Input, `state=filled` | ✅ `*` | "Moatez Sahbeni" (demo, pre-filled) | "Tel qu'il apparaîtra sur votre profil public." | — |
| Titre professionnel | Input | ✅ `*` | "Ex: Développeur web full-stack — boutiques en ligne pour artisans" | "[Rôle] + [Spécialité] + [Différenciateur]. Le champ le plus important." | 0/100 |
| À propos | Textarea, h=120 | ✅ `*` | "Racontez qui vous êtes, ce que vous faites, et pour qui." | "Minimum 100 caractères. Votre argumentaire." | 0/2000 |
| Ville | SelectTrigger | ✅ `*` | "Choisissez votre gouvernorat" | "Aide les clients à vous trouver." | — |

**Nom complet arrives pre-filled from the account** (`state=filled`, "Moatez Sahbeni" — the same
demo identity used across every other authenticated frame in this file), consistent with H1's own
resolved pattern of reading identity off the account rather than re-collecting it (`project_figma_h1h2_devenir_freelance.md`,
the 18+ DOB gate). The other three required fields start empty.

---

## 3. Step 2 — 📐 MEASURED (`467:20404`, one `get_design_context` call)

### 3a. Geometry

```
box                                    white, border/subtle, radius-xl(12), p=24, gap=20, size-full
├ field-comp                           gap=8
│  ├ label row  "Compétences *" ⋯ "3/15"      ⚑ see artifact note below
│  ├ combobox   h=44, icon-search 18×18, placeholder "Tapez pour ajouter une compétence…"
│  ├ chips row  flex-wrap gap=8 — 3 dismissible Badge chips (blue/50 bg, blue/600 text, rounded-full)
│  └ helper     "Minimum 3, maximum 15. Elles alimentent la recherche."
├ field-langues                        gap=8
│  ├ label      "Langues *"
│  ├ row 1      [Select langue "Français"] [Select niveau "Natif"] [× remove]   ⚑ see artifact note
│  ├ row 2      [Select langue "Arabe"]    [Select niveau "Natif"] [× remove]
│  ├ "+ Ajouter une langue"             blue/600, 14px medium — repeater-add affordance
│  └ helper     "Au moins une. Critique en Tunisie (FR/AR/EN/IT)."
├ field-exp                            gap=8
│  ├ label      "Années d'expérience (optionnel)"
│  ├ NumberStepper  [−] [1] [+], h=40
│  └ helper     "S'affiche comme « X années d'expérience »."
└ Input "Lien portfolio externe (optionnel)"   placeholder "https://"
   helper "Behance, GitHub, site perso — si vous en avez un."
```

**⚑ Artifact, not spec — three wrapper `Frame`s are declared `h-[100px]` despite rendering ~44px
tall in the screenshot.** The Compétences label+counter row, and BOTH language rows
(`467:20433`/`467:20445`), all carry an explicit 100px height class, but the rendered screenshot
shows a single-line label row and two ~44px select rows with normal spacing between them — nothing
close to 100px each. This reads as a stale/copy-pasted component-default height (the same class of
issue D1 flagged for its `fav-circle`/thumb-strip), not an authored row height. **Do not build a
100px-tall label row or a 100px-tall language row** — build to what the screenshot shows (~44px),
not to the class name. Step 1's genuinely-100px Stepper is a separate, shared, cross-reused
component and is not flagged the same way — that height plausibly is intentional there.

### 3b. Full field list

| field | control | required | value shown | helper | cap |
|---|---|---|---|---|---|
| Compétences | tag-combobox (search input + dismissible chips) | ✅ `*` | 3 demo chips: "Design graphique", "Rédaction web", "Community management" | "Minimum 3, maximum 15. Elles alimentent la recherche." | 3–15, counter shown live |
| Langues | **repeater**, each row = `[Select langue][Select niveau][× remove]` | ✅ `*` | row1 "Français"/"Natif", row2 "Arabe"/"Natif" | "Au moins une. Critique en Tunisie (FR/AR/EN/IT)." | min 1, no stated max |
| Années d'expérience | NumberStepper | optional (label says so) | 1 (demo default) | "S'affiche comme « X années d'expérience »." | — |
| Lien portfolio externe | Input (URL) | optional (label says so) | empty, placeholder "https://" | "Behance, GitHub, site perso — si vous en avez un." | — |

**Neither the langue nor the niveau Select's full option set is visible from this call.** A closed
`Select`/`SelectTrigger` only exposes its *current* value in `get_design_context`'s output, not its
option list (same limitation noted for E1's Ville/Gouvernorat selects in `d1-discovery.md §6e`).
The helper copy names "FR/AR/EN/IT" — that is a hint about intended scope, read from prose, **not a
measured enum**. "Natif" is the only niveau value observed, on both rows — the proficiency value set
(Natif / Courant / ? / ?) is unknown from this frame.

### 3c. Langue and niveau option lists — 🟠 RULED, not measured (founder, 2026-08-14)

The Figma quota was exhausted before either option list could be measured (§3b) and stayed
exhausted for this build pass. Both lists below are **founder-ruled**, not read off a frame — do
not treat them as if `get_design_context` confirmed them, and re-measure against `467:20433`/
`467:20445` if the quota ever resets and a discrepancy is suspected.

**Langue** (`freelancer_languages.language`, CHECK-constrained codes):

| label (FR) | stored code |
|---|---|
| Français | `fr` |
| Arabe | `ar` |
| Anglais | `en` |
| Italien | `it` |
| Allemand | `de` |
| Espagnol | `es` |
| Autre | `autre` |

**Niveau** (`freelancer_languages.proficiency`, CHECK-constrained codes):

| label (FR) | stored code |
|---|---|
| Natif | `natif` |
| Courant | `courant` |
| Intermédiaire | `intermediaire` |
| Notions | `notions` |

The stored codes are unaccented ASCII (`intermediaire`, not `Intermédiaire`) — the accented form
is a display label only, built in `src/lib/freelancer/language-options.ts` mirroring
`GOVERNORATES`' `{value, fr, ar}` shape, never written to the column.

### 3d. Migration applied — `freelancer_languages`, 2026-08-14

`db/migrations/20260814114009_freelancer_languages.sql` (Supabase version `20260814114009`)
closes the §5b structural mismatch: `freelancer_profile_id` FK cascade, `language`/`proficiency`
CHECK-constrained per §3c, `UNIQUE (freelancer_profile_id, language)` (the niveau-change-without-
language-change case needs this to resolve as one row, not two — see the diff-logic note in
`docs/follow-ups.md`'s H2 step 2 section). RLS is `FOR ALL` owner-scoped, matching
`shop_payment_methods`/`shop_categories`, deliberately not `freelancer_skills`' narrower
insert/delete-only shape (that gap is logged, not fixed, in the same follow-ups section).
`freelancer_profiles.languages` (the superseded scalar) is left in place, unwritten from this PR
forward; its 10 pre-existing values are dumped verbatim in `docs/follow-ups.md` rather than
backfilled — parsing free text into two enums under a real user's name was judged not worth it
for 10 rows.

---

## 4. Step 3 and the success screen — 🧠 MEMORY ONLY, blocked by quota

Neither `468:20502` (step 3 box) nor `468:20538` (success box) could be read this pass. Everything
below is carried from `project_figma_h1h2_devenir_freelance.md` (~2026-07-19), which itself is
built from a founder-facing summary, not a field-by-field `get_metadata`/`get_design_context` read —
**lower confidence than anything in §2/§3, and it predates this file's own step-1/step-2 measurement,
so it has not been cross-checked against anything real.**

**Step 3, per memory:** a "facultative note" followed by **4 collapsed accordions, each individually
suffixed "(optionnel)": Formation, Certifications, Outils, Horaires**, then a "Créer mon profil"
submit button (this is the terminal step — no "Suivant"). Whether these accordions match G2 step 2's
accordion PATTERN (`project_figma_g2_step2_configuration.md` — 4 accordions, no migration,
server-re-derived state) is **not verifiable from memory alone**; memory records only that they are
accordions and are all optional, not their internal shape, expand/collapse behavior, or whether any
of the four holds sub-repeaters (a real possibility — Certifications and Formation are both naturally
repeating in the schema, see §5). **The call that closes this: one `get_design_context` on `468:20502`.**

**Success screen, per memory:** 96px success-circle + check-circle glyph + H2 "Votre profil est créé
!" + two CTAs, **"Voir mon profil public" and "Aller à mon tableau de bord."** These CTA *labels* are
🧠 only — not re-confirmed this pass. **The call that closes this: one `get_design_context` on
`468:20538`.**

### 4a. What IS verifiable without Figma — 📁 REPO, 2026-08-14

The two CTA target routes are a filesystem/schema question, not a Figma question, and were checked
directly:

| CTA (🧠 label) | target route (inferred) | route status — 📁 REPO |
|---|---|---|
| "Voir mon profil public" | `/freelance/[slug]` (D4) | **Does not exist.** `src/app/freelance/` has no directory at all. `admin/utilisateurs/[id]/page.tsx:142` already links to `` `/freelance/${freelancerId}` `` — that link is dead today too. |
| "Aller à mon tableau de bord" | `/tableau-de-bord` | **Route exists, renders a stub.** `src/app/tableau-de-bord/page.tsx:12-14`: *"Freelance dashboard stub (PR-DS-2). The real designed dashboard ships in PR-PAGE-DASHBOARD-FREELANCER; for now the sidebar item resolves to an honest placeholder inside the new shell instead of a 404."* Renders `<ComingSoon>`. |

**Neither CTA lands on a finished page today.** One is a hard 404-shaped gap (no route file at all),
the other is a soft gap (route exists, shell renders, content is `ComingSoon`).

---

## 5. Field ↔ schema mapping

📁 REPO, live `list_tables` read against Supabase project `xggomcitqrkaylqezjjz`, 2026-08-14.
`freelancer_profiles` columns: `profile_id, headline, bio, city, portfolio_link, years_experience,
languages, working_hours, current_workplace, preferred_payment_method, admin_hidden_at,
admin_hidden_reason` (+ id/timestamps). Its four FK-linked child tables: `freelancer_skills`,
`freelancer_tools`, `freelancer_education`, `freelancer_certifications`.

### 5a. Step 1 — 📐 measured field → 📁 schema

| field | column | table | note |
|---|---|---|---|
| Avatar photo | `avatar_url` | `profiles` | **not** on `freelancer_profiles` — shared identity field, same as every other seller type |
| Nom complet | `full_name` | `profiles` | shared identity field, pre-filled from account (matches the `state=filled` demo) |
| Titre professionnel | `headline` | `freelancer_profiles` | direct match |
| À propos | `bio` | `freelancer_profiles` | direct match |
| Ville | `city` | `freelancer_profiles` **⚑** | direct match exists, **but `profiles.city` is a separate, also-nullable column.** Two city fields exist platform-wide; which one this Select writes to is not resolved by this pass — flagged, not decided |

### 5b. Step 2 — 📐 measured field → 📁 schema

| field | maps to | note |
|---|---|---|
| Compétences (3–15 chips) | `freelancer_skills` (child table: `freelancer_profile_id, skill`) | ✅ **shape matches** — one row per chip, exactly what a repeating chip list needs |
| **Langues + niveau (repeater)** | 🔴 **`freelancer_profiles.languages` — single nullable `text` column. No `freelancer_languages` table exists.** | **This is the structural mismatch the brief asked to flag, confirmed, not resolved.** The frame draws a 1-to-many relation (language × proficiency, unbounded rows via "+ Ajouter une langue") against a column that can hold exactly one string. A migration decision, not a build detail — and note the proficiency enum itself is unmeasured (§3b), so even the migration's value domain isn't fully specified yet |
| Années d'expérience | `years_experience` (int, nullable) | ✅ direct match |
| Lien portfolio externe | `portfolio_link` (text, nullable) | ✅ direct match — **and this settles the "portfolio items" question:** the frame draws exactly one optional URL scalar here, not a repeating gallery/items list. No portfolio-items table exists, and none is needed for what steps 1–2 actually draw |

### 5c. Step 3 — 🧠 memory-tier accordions → 📁 schema (tentative, unmeasured)

| accordion (🧠) | maps to | table/column |
|---|---|---|
| Formation | `freelancer_education` (`institution, degree, field, year_start, year_end`) | child table |
| Certifications | `freelancer_certifications` (`name, issuing_org, year_obtained, credential_url`) | child table |
| Outils | `freelancer_tools` (`name`) | child table |
| Horaires | `freelancer_profiles.working_hours` (text, nullable) | **scalar column on the parent table, not a 5th child table** |

**Of the "four child tables," three (`freelancer_education`, `freelancer_certifications`,
`freelancer_tools`) plausibly correspond to three of step 3's four accordions — but this is a
schema-shape correspondence inferred from naming, not a confirmed field-by-field match, since step
3 itself was never read this pass.** `freelancer_skills` (the 4th child table) is not a step-3
accordion at all — it belongs to step 2's Compétences field (§5b). The fourth accordion, Horaires,
targets a plain column on `freelancer_profiles`, not a child table.

**No "professional accounts" concept appears anywhere in what was actually measured.** Steps 1–2
draw zero account/link fields beyond the single portfolio URL. `freelancer_tools` holds only a bare
`name` column — per `project_figma_h3_profil_modifier.md` (the H3 editor, built from the same
frames), its populated demo values are software names ("VS Code / Figma / Git / Vercel"), not
account/login pairs. Whether step 3's "Outils" accordion draws anything account-shaped (a login,
a profile URL, a platform name) is unresolved — the same `468:20502` call that closes step 3's
pattern question closes this too.

**Columns on `freelancer_profiles` that no measured H2 field touches:** `current_workplace`,
`preferred_payment_method`, `admin_hidden_at`, `admin_hidden_reason`. The first two plausibly belong
to H3's "Contexte de travail" additions (`project_figma_h3_profil_modifier.md` §CLOSE-OUT-PASS) —
edit-only fields with no H2 creation-time counterpart. The moderation pair is admin-only by design.

---

## 6. Direct answers

**Does step 2 draw a structured language picker with proficiency, or free text?**
**Structured — confirmed, 📐 measured, not inferred.** Two repeater rows, each
`[Select langue][Select niveau][× remove]`, plus a "+ Ajouter une langue" affordance and a helper
that says "Au moins une" (implying unbounded rows, not a fixed pair). This is a real 1-to-many
relation against `freelancer_profiles.languages`, which is one nullable `text` column with no child
table. **Flagged per instruction, not resolved:** a migration (`freelancer_languages`: profile_id,
language, proficiency) would be needed to hold what the frame draws, and the proficiency enum itself
is not fully known from this pass (only "Natif" was observed).

**Does any step draw professional accounts or portfolio items?**
**Not in steps 1–2 — confirmed 📐.** Portfolio is exactly one optional URL input
(`portfolio_link`, already a matching scalar column), not a repeating item gallery. No accounts field
of any kind appears in steps 1–2. **Step 3 is unresolved (🧠 only)** — memory names an "Outils"
accordion, which in the sibling H3 editor draws simple tool names (VS Code, Figma…), not
account/login pairs, but H2 step 3's own shape was never read this pass. `freelancer_tools`'s
single `name` column would fit either a bare tools list or a light "accounts" list equally well,
so this doesn't discriminate.

**Does step 3 use accordions like G2 step 2, or a different pattern?**
**🧠 Memory only, low confidence.** Memory says "4 collapsed accordions" for step 3, which is
consistent with G2 step 2's accordion pattern at the label level, but the actual expand/collapse
behavior, internal field shapes, and whether any accordion nests a repeater were never measured for
H2 (memory is a founder-summary, not a field read) — **cannot be confirmed as "the same pattern" vs
"a different pattern" from what exists today.** Closing call: `get_design_context` on `468:20502`.

**What does the success screen's CTA target, and does that route exist?**
**CTA labels are 🧠 only** ("Voir mon profil public" / "Aller à mon tableau de bord"), **but their
target routes were checked directly against the repo (📁), independent of Figma:**
- "Voir mon profil public" → `/freelance/[slug]` — **route does not exist** (no `src/app/freelance/`
  directory at all; an existing admin-panel link to this path is already dead).
- "Aller à mon tableau de bord" → `/tableau-de-bord` — **route exists but is a stub**
  (`ComingSoon`, per its own in-file comment: real dashboard ships in a separate,
  not-yet-built PR).

Neither CTA lands on a finished surface today, regardless of what the success screen's own copy
turns out to say once `468:20538` can be read.

---

## 7. Route state today — 📁 REPO, 2026-08-14

**H2's own route, `/mon-profil-freelance/creer`, does not exist.** `src/app/` has no
`mon-profil-freelance` directory at all. The CTA that should reach it is already wired:
`src/components/devenir/DevenirFreelanceContent.tsx:34-39` —

> "CTA target: `/mon-profil-freelance/creer` does not exist yet (H2 is a later build — the same
> position `/ma-boutique/creer` was in before G2 shipped). Wired anyway, not disabled: the
> canonical freelancer-workspace root (`/mon-profil-freelance`, no `/creer`) is already referenced
> elsewhere (`src/lib/roles.ts:76`, `ProfileAvatarMenu.tsx:104,133`) with the identical
> '404 until built' posture…"

This is the **shop-side precedent repeating exactly**: `/ma-boutique/creer` was a wired-but-404 link
before G2 shipped it (per that PR's own memory record), and H2 is in the identical position today.
`/mon-profil-freelance` (workspace root, no `/creer`) is referenced in four more places
(`roles.ts:76`, `ProfileAvatarMenu.tsx:104,133`, `ma-boutique/creer/page.tsx:50`) with the same
posture — this is a known, named gap across the codebase, not a surprise this pass surfaced.

**A legacy, pre-redesign i18n string set already exists and is orphaned.** `src/lib/i18n/fr.ts:1537-1549`
carries a `// Create profile` block (`freelance.create_title`, `freelance.field_headline`,
`freelance.field_bio`, `freelance.field_portfolio`, `freelance.field_experience`,
`freelance.field_languages`, error strings) — **zero `.tsx` files reference any of these keys.**
This is flat-field vocabulary (one Headline, one Bio, one Portfolio link, one Experience number, one
free-text Languages string) — it predates the 3-step wizard and the `freelancer_skills` child table,
and does not describe what the measured H2 frames actually draw. Logged as an observation per the
"bugs found out-of-scope get logged, not fixed inline" rule — not touched.

---

## 8. Build note — step 1 shipped, `feat/h2-step1-bases`, 2026-08-14

Step 1 (`466:20244`) built at `/mon-profil-freelance/creer`. One deliberate divergence from the
📐 measured geometry in §2a, recorded here with the arithmetic per the founder's ruling — the
Figma quota (§ provenance header) cannot re-verify this pass, so the decision is logged rather
than silently shipped:

**Stepper column width: built at 80px, not the measured 100px.** §2a measured the frame's own
`step` column at `w-100`, giving `3×100 + 2×40 = 380px` total for the 3-step row, left-packed.
G2's already-shipped `Stepper` (`ma-boutique/creer/_components/Stepper.tsx`) uses `w-20` (80px)
columns for its own 2 steps. At H2's 3 steps, 80px columns total `3×80 + 2×40 = 320px`.

Against a 375px viewport with the standard 16px side padding (343px available content width):
**380px overflows by 37px; 320px fits with 23px to spare.** Built to the proven 320px shape
(G2's own component, copied pixel-for-pixel) rather than the measured-but-unverifiable 380px —
inventing new mobile-only stepper behavior (compaction, wrapping, horizontal scroll) to preserve
a value that cannot be re-measured this pass was judged the wrong trade. `Compétences` (the
label that drove the frame's wider 100px column) renders at 80px without truncation in the
shipped build — verified at 375/1024/1280/1440, §9 below.

**Stepper stays route-local**, not promoted to a shared component, despite this being its
documented third consumer (G2's own `Stepper.tsx:4-8` names "promote at third consumer" as the
rule). Promoting would mean editing G2's two existing files from inside an H2 PR — logged as a
follow-up (`docs/follow-ups.md`) instead of done inline, per "one PR, one focus."

**`h-[100px]` on both flagged wrappers (Stepper container, `field-avatar`) built without a forced
height** — natural flex-content height, per §3a's artifact finding extended to step 1's own
`field-avatar` (a 120×120 circle cannot fit inside a genuinely-100px `overflow-clip` box without
visible cropping; the step-1 screenshot shows none).

**City:** `freelancer_profiles.city` written directly (not `profiles.city`) — the seller entity's
own city wins on the entity's public surface, mirroring G2's `shops.city` precedent (§ report,
not repeated in this doc; see the PR's own commit message).

**Guard:** keyed on `freelancer_profiles` existence via `resolveOwnedFreelancerProfileId`
(`src/lib/freelancer/owner-profile.ts`), not `seller_type` — mirrors G2's shop-existence guard.
Live-verified 2026-08-14: 11 profiles are `seller_type='freelancer'`, 10 of them already have a
`freelancer_profiles` row, exactly 1 does not — the "freelancer-with-no-profile" retry state this
guard exists for is real, not theoretical, just a smaller count than first assumed.

**🔴 Redirect target corrected during the live QA walk — `/tableau-de-bord-vendeur` does not
render for a freelancer.** The original plan (both the guard's "already has a profile" branch and
the post-submit redirect) was `/tableau-de-bord-vendeur`, mirroring G2 literally. That route calls
`requireShopOwner` (`src/lib/auth/require-seller.ts:39`), which redirects anyone whose
`seller_type !== 'shop_owner'` to `/devenir-vendeur` — a real freelancer who just created their
profile would be bounced straight back to the role chooser. Caught only by actually logging in as
a freelancer and clicking through, not by code review. **Fixed to `/tableau-de-bord`** (the
freelance dashboard stub, `src/app/tableau-de-bord/page.tsx`) — its own guard is just
`if (!shell) redirect('/connexion')`, seller_type-agnostic, so it is the destination that
genuinely renders today, even though what it renders is still `ComingSoon`. The
`AlreadyHaveRole` shop_owner-blocked branch's `manageHref="/tableau-de-bord-vendeur"` is
unaffected — that link is only ever shown to an actual `shop_owner`, who does pass
`requireShopOwner`.
