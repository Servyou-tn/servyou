# English category names — follow-ups (`feat/i18n-en-category-names`, 2026-11-11)

## Mission category chips still pass French / Arabic only
**What:** the freelancer-side mission screens (`MissionCard`, `/missions/[id]`, `/missions/[id]/proposer`, `SentRecap`, `ProposalRow`, `EngagementRow`) build their chip from `categoryNameFr` / `categoryNameAr`. The queries now select `name_en`, and `CategoryChip` accepts an optional `nameEn`, but these mappings don't carry it yet, so freelancers see the French category in English.
**Why deferred:** those pages belong to the freelancer English translation pass (agent A), which is open at the same time. Touching them here would cause merge conflicts.
**Where it lives:** `src/lib/marche/{missions-query,mission-detail-query,proposals-query,sent-proposal-query}.ts` → add `categoryNameEn`; pass `nameEn` at each `CategoryChip`.
**Trigger:** after the freelancer English PR merges.

## The admin category form does not set `name_en`
**What:** `categories.name_en` is nullable; a category created from the admin panel has no English name, and the site shows its French name in English.
**Why deferred:** admin stays French (founder decision 2026-11-10).
**Where it lives:** the admin categories form; display fallback in `src/lib/i18n/local-name.ts`.
**Trigger:** the next time a category is added, or an admin pass.

## Other data labels still French in English mode
**What:** governorates (`src/lib/tunisia-governorates.ts`), freelancer languages and levels (`src/lib/freelancer/language-options.ts`), the « Site web » platform label (`src/lib/social/platforms.ts`), skill labels (`src/lib/taxonomy/service-categories.ts`, ~279), and times shown as « 15h30 » (`src/lib/datetime.ts`) have no English yet.
**Why deferred:** one focus per PR. These lists live in code, not in the database.
**Where it lives:** the files above; each render site picks `lang === 'ar' ? x.ar : x.fr`.
**Trigger:** the next English PR (client side first: governorates, languages, platform label, time format; skills with the freelancer pass).
