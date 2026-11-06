# Follow-ups — G3 + system pages at 375 (`feat/m375-g3-system`, 2026-11-05)

## G3: the six optional accordions, the « Publiée » pill, the dirty indicator

**What** The G3 375 frame draws everything on one page:
- the six optional sections (type, livraison, horaires, adresse, paiement, catégories) as accordions with a status pill each;
- a « Publiée » StatusPill under the H1;
- a « Voir ma boutique » link in the header;
- an unsaved-changes line in the footer.

The built page is identity-only and links to `/ma-boutique/creer/configuration` for the six sections. `shops.is_published` does not exist, and the form has no dirty tracking.

**Why deferred** New sections, data and state; asked as Q1 / Q2 in `docs/design/m375-g3-system-deltas.md`.

**Where it lives** `src/app/ma-boutique/modifier/_components/EditShopForm.tsx`, `src/app/ma-boutique/creer/configuration/`.

✅ CLOSED — founder, 2026-11-05: keep the identity-only page with the link to configuration; no unsaved-changes line for now.

## Touch targets under 44 px on the system pages and C2

**What** Four controls are under the 44 px touch rule at 375:
- the `SystemStateScreen` secondary action is 40 tall (K1, K2, K3, A9, A10);
- C2's sub-category chips are 35 tall;
- C2's breadcrumb links are 21 tall;
- the service-card heart (`FavoriteButton`, icon variant) is 20 × 20.

**Why deferred** All four live in shared components, and the sizes come from the frames; asked as Q3. The G5 kebab's invisible `absolute -inset-1` span is the pattern, and it leaves pixels unchanged.

**Where it lives** `src/components/system/SystemStateScreen.tsx`, `src/components/categories/SubcategoryStrip.tsx`, `src/components/categories/CategoryServicesPage.tsx` (breadcrumb), `src/components/FavoriteButton.tsx`.

**Trigger** Approved (founder, 2026-11-05): one small PR before the beta, invisible hit areas only (no pixel change) — started when the
founder says so.
