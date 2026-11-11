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
