# `/devenir-vendeur/boutique` rebuild — discovery

**Figma calls spent: 1.** `555:37034` ("right", the child node given directly this time — no guessing needed). A single call returned the full recursive subtree — `content` → `column` → every leaf text/instance node — at no extra cost.

**Provenance key — same inversion as `devenir-freelance-discovery.md`.** This doc leans on memory first (a prior discovery pass already exists for this exact frame) and uses its one call to check that memory against current reality:
- 🧠 MEMORY/INFERRED — carried from `project_figma_g1g2_shop_onboarding.md` (24–25 days old, auto-flagged stale). Treated as a starting hypothesis, cross-checked against the fresh call and current code below.
- 📐 MEASURED — from the one `get_metadata` call on `555:37034`, cited by node id.

Founder framing (this task): same situation as the freelance sibling just fixed — the page still renders pre-rebuild v1 content (4 benefit cards, `HowItWorks`, `FAQ`, `FinalCTA`). #128 moved it unchanged; #133 migrated only its shell. `devenir-freelance-discovery.md` is the template, including its two recorded divergences (age-gate cut, CTA relocated into hero).

---

## 1. Region order, top to bottom — measured geometry

📐 Measured tree, `555:37032` → `right` (`555:37034`, 1200×858) → `content` (0,64, 1200×794) → `column` (240,32, 720×722, centered — `(1200-720)/2=240`):

```
column (720×722)
├─ hero (0,0, 720×127)
│  ├─ "DEVENIR VENDEUR" — eyebrow (300.5,0, 119×17)
│  ├─ "Vendez vos produits sur Servyou" — H1 (0,25, 720×38)
│  └─ "Vous fabriquez, vous revendez, vous créez ? Ouvrez votre boutique en
│      ligne et vendez partout en Tunisie, avec paiement à la livraison."
│      — subline (0,71, 720×56)
├─ value-cards (0,159, 720×277) — THREE cards, 229.33 each, 16px gap
│  │  (3×229.33 + 2×16 = 720 — exact-fit, zero slack, identical arithmetic
│  │  to the freelance sibling)
│  ├─ card 1 (0,0, 229×277): icon-store · "Votre boutique en ligne" ·
│  │  "Une vitrine que vous partagez sur Instagram, Facebook, TikTok. Vos
│  │  clients commandent en quelques clics."
│  ├─ card 2 (245,0, 229×277): icon-wallet · "Paiement à la livraison" ·
│  │  "Pas de commission sur vos ventes. Le client paie en espèces à la
│  │  réception, vous êtes payé directement."
│  └─ card 3 (491,0, 229×277): icon-package · "Gérez tout au même
│     endroit" · "Produits, stock, commandes, bons de livraison — un seul
│     tableau de bord pour toute votre activité."
│  (all three cards are the SAME height here — 277 — unlike freelance's
│  uneven 256/256/235; not a structural difference, just longer body copy)
└─ age-gate (120,468, 480×254) — centered under the cards, (720-480)/2=120
   ├─ "Avant de commencer" — heading (24,24, 202×26)
   ├─ "Vous devez avoir 18 ans ou plus pour vendre sur Servyou." (24,66,
   │   432×21)
   ├─ dob (24,103, 339×21)
   │  ├─ "Date de naissance : 12/05/1995 · 18 ans ou plus" (0,0, 315×21)
   │  │   — READ-ONLY TEXT, not an input
   │  └─ icon-check-circle (323,2.5, 16×16) — VISIBLE (confirms passing state)
   ├─ Button instance (24,140, 432×40) — no recoverable label (instance)
   └─ "En continuant, vous acceptez les conditions d'utilisation
       vendeur." (24,196, 432×34)
```

Column arithmetic closes exactly: hero (0–127) + 32px gap + value-cards (159–436) + 32px gap + age-gate (468–722) = 722, matching the column height with **zero remaining content** — the identical "closes with nothing left over" signature the freelance frame had.

**Against the founder's screenshot description (hero, 3 cards, "Avant de commencer" block, CTA + terms line beneath) — confirmed exactly, nothing more.** The four regions named in the task prompt are the complete frame. No fifth region exists.

**Against the current 5 live sections** (`RoleUpgradeHero`, `BenefitGrid`×4, `HowItWorks`, `FAQ`, `FinalCTA`): identical verdict to the freelance sibling — hero survives reshaped, 4 cards cut and replaced with 3 different ones, and `HowItWorks`/`FAQ`/`FinalCTA` have no counterpart in the frame at all. See §2 for what that means for these three specifically, since here — unlike freelance — this page was their *last* caller.

---

## 2. THE FATE OF THREE COMPONENTS — `HowItWorks`, `FAQ`, `FinalCTA`

**The frame draws none of them.** The column ends at the age-gate (722 = column height, confirmed above). No step-list, no accordion, no separate final-CTA band anywhere in the measured tree.

**Both of the founder's stated conditions are already checked and both point the same way:**
- Frame draws none of the three → per the ruling as given, **all three become dead code in this PR.**
- Each already has exactly one remaining caller — this page. Verified directly (not assumed from the freelance PR's own notes): `grep` for the literal import statements shows `HowItWorks`, `FAQ`, and `FinalCTA` are each imported **only** by `DevenirVendeurContent.tsx` now. (`DevenirFreelanceContent.tsx` mentions their names only in an explanatory code comment, not an import — checked to be sure that wasn't a false read.)

So this PR is the one that deletes `src/components/devenir/HowItWorks.tsx`, `FAQ.tsx`, and `FinalCTA.tsx` outright, plus their `devenir.vendeur.*` i18n keys (`how.*`/`step1-3.*`/`faq.*`/`faq1-5.*`/`final.*`) — this page was the thing keeping them alive. This is the "one cleanup pass, not two" the freelance PR's discovery doc flagged as deferred to here.

**One thing worth a founder's attention, not a blocker:** `HowItWorks.tsx`/`FAQ.tsx`/`FinalCTA.tsx` are generic, content-agnostic components (they take `steps`/`faqs`/`headline` as props — nothing freelance- or boutique-specific baked in). Deleting them removes the *only* "how it works" / FAQ / closing-CTA pattern that exists anywhere in the `devenir/` folder. If a future onboarding surface wants any of these shapes again, it's a rebuild from scratch, not a resurrection. Not a reason to keep them (nothing currently needs them, and dead code with zero callers is exactly what the project's own conventions say to delete), just naming the tradeoff.

---

## 3. The age block — read-only, and it orphans the CTA the same way

**📐 Confirmed exactly as predicted:** the frame's `dob` node is plain text ("Date de laissance : 12/05/1995 · 18 ans ou plus") with a *visible* checkmark icon — a read-only display, not an input. This matches `project_figma_g1g2_shop_onboarding.md`'s 24-day-old description precisely, and is the opposite of the freelance frame's `Input` instance.

**Same ruling applies, for the same reason.** `/devenir-vendeur` already runs the age check once, before either card renders (`isOldEnoughToSignup`, `src/app/devenir-vendeur/page.tsx:39`) — nobody reaches this page without having passed. Whether the age-gate re-displays the DOB (boutique's shape) or re-collects it (freelance's shape), it's telling or asking the visitor something the previous screen already resolved. Cut it, per the same reasoning already ruled on for freelance.

**Yes — cutting it orphans the CTA exactly the way it did on freelance.** The `Button` instance (24,140, 432×40, no recoverable label) sits *inside* the `age-gate` node, not the hero — the hero, as measured, has no button at all (same shape as freelance's hero). Cutting the age-gate wholesale removes the only CTA the frame draws, same failure mode.

**One thing the freelance PR did NOT do, worth catching before it repeats: the age-gate's terms line traveled with the button, silently, and never got flagged.** Checked directly against the shipped freelance page (`grep` for "conditions"/"utilisation" in `DevenirFreelanceContent.tsx` and its i18n keys): the freelance rebuild relocated the CTA into the hero but **dropped its own terms line** ("En continuant, vous acceptez les conditions d'utilisation freelance.") entirely — it exists nowhere in the shipped page. That wasn't a recorded decision in that PR's discovery doc or its "Build rulings" section; it just didn't happen. This page's frame has the identical structure (Button + terms line, both inside the age-gate), so the same silent drop would repeat here unless it's deliberately decided one way or the other before building. Flagging, not fixing either page here.

---

## 4. The terms line — does a seller terms page exist? (Not resolved here.)

**No dedicated seller/vendor terms page exists anywhere in the app.** Checked three ways: no file or directory under `src/app` matching `condition`/`cgu`/`terms`; no string match anywhere in `src` for "conditions d'utilisation vendeur" (or any seller/vendor-terms variant) outside this frame's own measured copy and the i18n files; no terms-link pattern in the signup flows (`src/app/inscription/**`, `src/components/auth/**`) to borrow a convention from.

**The only candidate is the generic `/conditions` page** (`src/app/(marketing)/conditions/page.tsx`, backed by `LEGAL_DOCS.conditions` in `src/lib/legal/legal-structure.ts`). It's a single 14-section terms-of-service document shared by every user type — section 6 is "Achats et ventes" (purchases *and* sales together), but there is no seller-specific carve-out, no section titled anything like "Vendeurs" or "Conditions vendeur". It would **technically resolve** (the route exists, renders real content) but the frame's own copy promises something more specific — *"conditions d'utilisation **vendeur**"* — than what's actually there. Linking to it would be a route that works but a promise that's slightly false; not linking anything (like the freelance page currently does, per §3) avoids the false promise but drops the disclaimer entirely.

This is exactly the kind of call this discovery pass isn't making. Options, not a recommendation: (a) link to `/conditions` anyway, accepting the mismatch between "vendeur" and generic copy, (b) get a seller-specific terms section or page written and link there, (c) drop the line, matching what freelance already (silently) did. Founder call.

---

## 5. Does `BenefitGrid`'s `columns` prop cover this frame's card row?

**Yes, fully — no further change to `BenefitGrid.tsx` needed.** Card anatomy is structurally identical to freelance's, position-for-position: icon `Frame` at `(24,24, 48×48)`, title at `(24,84, 181.33×52)`, description starting at `(24,148, 181.33×N)`. The row arithmetic is the same 3×229.33+2×16=720 exact-fit shape `columns={3}` was already built for. No per-card link/CTA/badge exists in either sibling's cards — same "informational card, whole grid uses one shared `columns` value" shape.

The only difference is content-driven, not structural: boutique's three description strings are longer (all render at 105px body-text height vs freelance's 52–84px, which is why boutique's cards measure a uniform 277 against freelance's uneven 256/256/235) — `BenefitGrid`'s cards have no fixed or max height, so this is absorbed automatically by CSS Grid's default row-stretch behavior, not something requiring a code change. `columns={3}`, `sectionTitle`/`sectionSubtitle` omitted (same as freelance — this row has no heading of its own either), is the complete call.

---

## 6. Breakpoint plan — same lesson, same conclusion, now confirmed twice

Identical D1-shape hard-fit signature as the freelance sibling: `3 × 229.33px + 2 × 16px gap = 720px`, exactly the column width, zero slack. This is now the *second* frame in this exact family to draw this precise arithmetic — reinforcing (not just repeating) that `BenefitGrid`'s fluid `columns={3}` → `grid-cols-1 sm:grid-cols-3` approach is the right shape for this row, not a one-off fix.

**No Figma ground truth below 1440 here either.** `555:37032` is 1440×900, desktop-only, joining the same missing-375-frame list `devenir-freelance-discovery.md` and `docs/follow-ups.md` already log (the freelance frame was "an eleventh"; this one is a twelfth). The mobile/tablet stacking plan — hero font steps, the 3-card row's stack breakpoint, whatever the age-gate region becomes below `lg` if it survives in any form — is entirely inferred, not designed, same as freelance. Whatever gets built should mark every responsive value INFERRED in-code and log it in `docs/follow-ups.md` next to the other two entries, not present it as spec.

Real decision for whoever scopes the build, not answered here: does this row reuse freelance's exact inferred breakpoint (`sm:grid-cols-3`), or does a different choice make sense given boutique's longer card copy needs slightly more per-card width before 3-up looks comfortable? Both frames share the arithmetic; they don't have to share the answer.

---

## Build rulings — closed on `feat/devenir-boutique-rebuild`

**1. `HowItWorks.tsx`, `FAQ.tsx`, `FinalCTA.tsx` deleted outright**, plus their `devenir.vendeur.*`
copy keys (`benefits`/`benefit1-4`/`how`/`step1-3`/`faq`/`faq1-5`/`final` — 30 keys). §2's
verification held: grepping actual `import` statements after deletion shows zero remaining
importers of any of the three (the only surviving "HowItWorks" match anywhere is the unrelated
`landing/HowItWorks.tsx`).

**2. Age gate cut**, same reasoning as freelance: `/devenir-vendeur` already runs the age check
once, before either card renders — nobody reaches this page without having passed. The frame's
read-only DOB redisplay would just repeat what the previous screen already showed.

**3. CTA relocated into the hero** — the frame's Button lived inside the age-gate module here
too, exactly as §3 predicted, so cutting the block orphaned it the same way it did on freelance.

**4. Terms line restored, on both pages, via a new shared `TermsLine` component**
(`src/components/devenir/TermsLine.tsx`) — one copy string, one target, both pitch pages.
Dropped the role word ("vendeur"/"freelance") from the copy rather than link a document that
doesn't exist; both now point at the general `/conditions` page. **Freelance's own silent drop
(caught during this discovery pass) was fixed in this same PR**, not left for later — its hero
now renders `<TermsLine />` too. A seller-specific terms document is logged in
`docs/follow-ups.md`, not invented here.

**5. `BenefitGrid` used unchanged** — `columns={3}`, no `sectionTitle`/`sectionSubtitle` (this
row has no heading in either frame). §5's prediction held: zero further changes to
`BenefitGrid.tsx` were needed: the row-stretch behavior already noted absorbed boutique's
longer card copy without any code change.

**6. Value-cards built fluid** (`grid-cols-1 sm:grid-cols-3`, matching freelance's inferred
breakpoint rather than choosing a different one — no measured reason to diverge between the two
siblings' identical arithmetic).

**7. Mobile stacking: INFERRED, logged in `docs/follow-ups.md`** next to the freelance entry and
the ten-seller-pages entry — not re-litigated here.

**One side effect, logged not fixed:** rebuilding both heroes single-column (neither reuses
`RoleUpgradeHero`) leaves that component at zero remaining callers. Not named in this PR's
rulings, so not deleted here — logged in `docs/follow-ups.md` as a safe-to-delete-on-sight
follow-up rather than folded in silently.
