# English (EN) — freelancer area follow-ups (`feat/i18n-en-freelancer`, 2026-11-11)

## Data label tables have no English column — English pages show French names

**What:** several lookup tables only carry `{ fr, ar }` (or `name_fr` / `name_ar`), so on an English page the label falls back to French: Tunisian governorates / cities, service and mission categories, sectors, and skill names.
**Why deferred:** each table is shared across the freelancer, shop and common areas (or comes from the database), and the English names are a content decision, not a translation of a UI string. This PR added English only to the freelancer-owned language and proficiency lists (`src/lib/freelancer/language-options.ts`).
**Where it lives:** `src/lib/tunisia-governorates.ts` (`GOVERNORATES`, read in `CreateFreelancerProfileForm`, `AnnonceForm`, `trouver-des-missions`, `ProductRequestForm`…) · categories `name_fr` / `name_ar` (`ServicesFilterBar`, `AnnonceForm`, `MissionChips`, `AnnonceRow`, `ProposalRow`) · sectors and skills `labelFr` / `labelAr` (`lib/taxonomy/service-categories.ts`, `lib/freelance/service-draft.ts`, `StepMetier`, `StepPublication`, `EngagementRow`, `FreelancerCard`).
**Trigger:** before English is announced to users. Needs an owner and the English names; the clean shape is an `en` field next to `ar` plus one shared `optionLabel(option, lang)` (the helper added in `language-options.ts` can be lifted) with a French fallback.

## Shared shell and common keys still French on English pages

**What:** top bar and sidebar (« Découvrir & achats », « Mes commandes », « Devenir vendeur », « Paramètres »), the cookie banner, the report dialog on a service page, « Catégorie » (`search.filters.category`), « Filtres » (`search.filters.title`), « Affichage x à y sur N » (`search.pagination.showing`), « En continuant, vous acceptez les conditions d'utilisation » on the become-freelancer page.
**Why deferred:** `common` keys and shared components belong to the architect (README rules 1 and 6).
**Where it lives:** `src/lib/i18n/en/common.ts` (keys) · `src/components/layout`, `shell`, `consent`.
**Trigger:** when `en/common.ts` lands, re-check `/marche/services`, `/services/<id>`, `/devenir-vendeur/freelance` in English; log again only what is still French.

## Signed-in freelancer pages not looked at in English

**What:** job board, job detail and proposal pages, my services (list, create wizard, edit), my job posts, my proposals, my projects, freelancer dashboard, profile create and edit all need a session. Strings are 100 % covered and unit-tested for keys and placeholders, but nobody has looked at them in English at 375 and 1440 (text cut off, long English labels in tabs and table headers).
**Why deferred:** no sign-in allowed for this job.
**Where it lives:** `/trouver-des-missions`, `/missions/<id>`, `/mes-services`, `/mes-annonces`, `/mes-propositions`, `/mes-engagements`, `/tableau-de-bord`, `/mon-profil-freelance/*`.
**Trigger:** a founder-led walk-through in English.

## Free text typed by sellers is not translated

**What:** « Delivered in 5 jours » on a service page mixes the English template with the seller's own « 5 jours ». Same for titles, descriptions and tags.
**Why deferred:** user-entered content; a structured delivery time (number + unit) would be needed to localise it.
**Where it lives:** `service.detail.deliveryIn`, `listing.service.deliveryTime`, `serviceDetail.deliveredIn` with the free-text `delivery_time` column.
**Trigger:** only if a structured delivery-time field is ever added.

## « 1 years » and the French « 1 ans »: two year labels have no plural form

**What:** `freelance.public.years_value` (« {years} ans ») and `freelance.edit.years_suffix` (« ans ») print "1 years" in English (and « 1 ans » in French) for a single year.
**Why deferred:** `t()` cannot pluralise; the fix is turning `years_value` into a `tn()` plural for all three languages, which touches `fr.ts`, `ar.ts` and `plurals.ts` (outside this translation PR).
**Where it lives:** `src/lib/i18n/fr.ts` · `src/app/freelance/[id]/_components/FreelancerDetail.tsx` · profile edit form.
**Trigger:** next time the public profile header or the edit form is touched.

## Price formatting hard-codes the French locale

**What:** `tndPriceGrouped` in `src/components/listings/listing-utils.ts` calls `toLocaleString('fr-FR')`, so English shows « 1 250,50 TND » (narrow space, decimal comma) instead of « 1,250.50 TND ». Deliberate for FR / AR (see the #304 review comment), not for English.
**Why deferred:** shared listings component (the architect's).
**Where it lives:** `src/components/listings/listing-utils.ts`; used by the service and product cards.
**Trigger:** with the architect's English pass over shared components.

## « Chaque projet livré renforce votre note » promises ratings

**What:** `devenir.freelance.card3.desc` says delivered projects strengthen the freelancer's rating, but ratings and reviews are deferred to Phase 3+. The English now says « builds your reputation »; French and Arabic were left unchanged (no FR / AR edits in this PR).
**Why deferred:** founder decision on the FR and AR wording.
**Where it lives:** `devenir.freelance.card3.desc` in `fr.ts` and `ar.ts`.
**Trigger:** founder OK, then change all three languages together.
