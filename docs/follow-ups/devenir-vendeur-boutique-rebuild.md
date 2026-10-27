# `/devenir-vendeur/boutique` rebuild (`feat/devenir-boutique-rebuild`, 2026-08-13)

## No seller-specific terms document exists — both pitch pages now link the general one instead
- Both `/devenir-vendeur/{freelance,boutique}` frames drew a role-specific phrase in their
  (now-cut) age-gate module — *"conditions d'utilisation freelance"* / *"... vendeur"*. No such
  document exists anywhere in the app: no route, no file, no string match for a seller- or
  freelancer-specific terms concept outside these two frames' own copy. The only terms document
  that exists is the general one (`src/app/(marketing)/conditions/page.tsx`,
  `LEGAL_DOCS.conditions`, 14 sections, one "Achats et ventes" section covering buying *and*
  selling together — no seller-specific carve-out).
- **Resolution taken (founder ruling):** both pages now share one `TermsLine` component and one
  copy string ("En continuant, vous acceptez les conditions d'utilisation.") linking to the
  general `/conditions` page — the role word ("freelance"/"vendeur") dropped rather than
  promising a document that doesn't exist.
- **Still owed:** a real seller-specific terms document (and, symmetrically, a freelancer one) —
  what it should say is a legal/product question, not an engineering one. Belongs with the
  pre-launch legal-pages pass, not invented here.
- **Trigger:** whenever the pre-launch legal review happens, or before the platform actually
  takes its first seller signups at scale.

## `RoleUpgradeHero.tsx` is now fully orphaned — 0 remaining callers
- Both `/devenir-vendeur/freelance` (`f92d793`) and `/devenir-vendeur/boutique` (this PR)
  rebuilt their heroes single-column, matching their respective frames — neither reuses
  `RoleUpgradeHero` (it's 2-column, wrong shape for either measured frame). Confirmed by grep:
  zero files import it besides its own definition.
- **Not deleted here** — this PR's rulings named `HowItWorks`/`FAQ`/`FinalCTA` specifically for
  deletion (the discovery doc's own finding); `RoleUpgradeHero` going to zero callers is a side
  effect of executing those rulings, not something ruled on directly. Logged rather than deleted
  inline, per "one PR, one focus."
- **Trigger:** next `devenir/` cleanup pass — safe to delete on sight, already confirmed
  zero-caller.
