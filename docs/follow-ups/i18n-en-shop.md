# English, shop area — things outside the Shop agent's files (`feat/i18n-en-shop`, 2026-11-11)

Found while looking at /marche/produits, /produits/<id>, /boutique/<id>, /devenir-vendeur and /categories/mode in English
(1440 and 375, signed out). The Shop agent's 725 keys are 100 % written; these are what still shows French or wrong.

## `devenir.choice.*` is nobody's key, so /devenir-vendeur stays French in English

**What**: the choice page « Comment voulez-vous vendre ? » (`devenir.choice.hero.*`, `devenir.choice.freelance.*`,
`devenir.choice.boutique.*`, about 15 keys at fr.ts 1388–1400) falls to `common` in `ownership.ts`, because only `devenir.vendeur`
and `devenir.freelance` are listed.
**Why deferred**: `ownership.ts` and `en/common.ts` are the architect's.
**Where it lives**: `src/lib/i18n/en/ownership.ts` (OWNER_PREFIXES), `src/lib/i18n/fr.ts`.
**Trigger**: before the EN launch. Either the architect writes them in `common.ts`, or adds `'devenir.choice'` to the shop list (then the
Shop agent writes the boutique half and the Freelancer agent the freelance half — so `common` is the simpler answer).

## Shared keys the page needs, still French until `en/common.ts` lands

**What**: `search.pagination.showing` (« Affichage 1 à 12 sur 25 »), `search.filters.title` (« Filtres » button on /marche/produits at 375),
`shell.topbar.search.*` (header search placeholder), the sidebar group titles and links, and the cookie banner.
**Why deferred**: `common` is at 0 % on this branch; all of them are architect-owned.
**Trigger**: they resolve themselves when `common.ts` merges. Re-check these pages in English afterwards.

## Category names have no English

**What**: categories only have `name_fr` / `name_ar` (no `name_en` in `database.types.ts`). In English every category chip, filter option,
the /categories/<slug> heading and the shop and product forms show the French name (« Électronique », « Beauté & Soins », « Mode »).
Code that picks the name: `ProduitsFilterBar`, `BoutiquesFilterBar`, `ProductForm`, `EditProductForm`, `ConfigurationForm`
(`lang === 'ar' ? name_ar : name_fr`).
**Why deferred**: needs a product decision and likely a migration (new `name_en` column, or a static English dictionary keyed by slug).
Not a Shop-agent job; no migrations allowed here.
**Trigger**: architect decision before EN goes live. User-written content (product titles, shop descriptions) stays as written.

## Sort label spacing in `ServicesFilterBar`

**What**: `src/components/marche/ServicesFilterBar.tsx:288` writes `{t('services.sort.label')} : {…}` with a French space before the colon.
This PR fixed the two product / shop twins (`ProduitsFilterBar`, `BoutiquesFilterBar`: « Sort by: Newest »); the services one belongs to the
Freelancer agent.
**Trigger**: same one-line fix, `lang === 'en' ? ': ' : ' : '`.
