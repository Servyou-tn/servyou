# English (EN) — the third interface language

Founder decisions, 2026-11-10:
- English joins French and Arabic on every page. Switch order everywhere: **FR | EN | AR**.
- Plain international English, British spelling, dates like « 10 Nov 2026 » (`LOCALES.en = 'en-GB'`).
- The admin area stays French (`admin.*` keys are never translated; English falls back to French there).
- `profiles.language` accepts `en` (migration `20261110220642_profiles_language_en`).

## How it works

- `src/lib/i18n/en/` holds the English strings, split into **three owner files**:

  | File | Owner | What it covers |
  |---|---|---|
  | `en/common.ts` | the architect | landing, top bar / sidebar / footer, auth (signup, sign-in, passwords, email check), settings and account, search, categories, help / FAQ / contact / legal, cookies, system pages, reports |
  | `en/freelancer.ts` | **Freelancer agent** | everything freelance: profile wizard and edit, services, missions board and detail, proposals, engagements, dashboard, « devenir freelance » — and the client side of the same journeys: browsing services and freelancers, posting and managing a mission (annonces) |
  | `en/shop.ts` | **Shop agent** | everything shop: shop creation and edit, products, orders received, seller dashboard, « devenir vendeur » — and the buyer side: browsing products and shops, ordering, my orders, receipt, disputes |

- `en/ownership.ts` decides who owns a key, by prefix. **Never write a key in another owner's file**; the test
  `src/lib/i18n/en.test.ts` fails if you do.
- `t(key, 'en')` falls back to the French text while a key has no English yet, and `tn()` does the same for plurals.
  So every PR can ship part of the work.
- Coverage: `npx vitest run src/lib/i18n/en.coverage.test.ts --silent=false --reporter=verbose`.
  Add `EN_OWNER=freelancer` (PowerShell: `$env:EN_OWNER="freelancer"`) to list every missing key for an owner.

## Rules for every owner

1. **Values only.** You add `'key': "English"` lines to YOUR file (and plural variants to its `plurals` object). You do not
   touch `fr.ts`, `ar.ts`, `plurals.ts`, `index.ts`, `ownership.ts`, or another owner's file.
2. **Same keys, same placeholders.** Copy each key exactly from `fr.ts` and keep every `{placeholder}` with the same
   name. Plurals: give `one` and `other` (English has no `two` / `zero` forms; leave them out).
3. **Translate the meaning, not the words.** Short, clear UI English. Sentence case for headings and buttons
   (« Create a service », not « Create A Service »). Keep `ServYou`, `TND`, `WhatsApp`, `UGC`, brand names, city names as is.
4. **Honest claims stay honest.** No « verified », no « secure payment », no escrow or payment protection, no invented
   numbers. If the French says « paiement à la livraison », English says « cash on delivery ».
5. **Glossary below is locked.** Use it exactly; if a term is missing, pick the closest plain word and list it in your
   PR body under « Decisions ».
6. **Code changes are the exception.** Only when a page in YOUR area shows French or breaks in English because of code
   (a hardcoded French string, a `lang === 'ar' ? … : …` that should also cover English, a locale written by hand),
   fix it in the component of your own route, and list it in the PR. Shared components (`src/components/layout`,
   `shell`, `landing`, `ui`, `LanguageToggle`…) are the architect's: log the problem instead.
7. Repo rules still apply (`.claude/CLAUDE.md`): branch first, max 3 commits, no AI attribution, no force-push, never
   push to `main`, never run `rls-smoke`, no migrations.

## Glossary (locked)

From design system reference Section 6 (its English column), simplified to sentence case.

| French | English |
|---|---|
| Tableau de bord | Dashboard |
| Mon profil | My profile |
| Mes services | My services |
| Créer un service | Create a service |
| Mes engagements | My projects |
| Mes propositions | My proposals |
| Mes revenus | My earnings |
| Avis clients | Client reviews |
| Mes commandes | My orders |
| Commandes reçues | Orders received |
| Mes favoris | Saved items |
| Paramètres | Settings |
| Aide & support | Help & support |
| Statistiques | Analytics |
| Mes annonces / une annonce (a client's request) | My job posts / a job post |
| Mission | Job |
| Trouver des missions | Find jobs |
| Proposition (a freelancer's answer to a job post) | Proposal |
| Freelance (the person) | Freelancer |
| Boutique | Shop |
| Ma boutique | My shop |
| Vendeur / propriétaire de boutique | Seller / shop owner |
| Client / zboun | Client |
| Produit | Product |
| Paiement à la livraison | Cash on delivery |
| Gratuit pendant la bêta | Free during the beta |
| Marketplace / Marché | Marketplace |
| Catégorie | Category |
| Actif · En attente · En attente d'approbation · Mis en pause · Brouillon | Active · Pending · Pending review · Paused · Draft |
| Livré · En cours de livraison · En préparation · En cours · Terminé | Delivered · Out for delivery · Preparing · In progress · Completed |
| Annulé · Refusé · Retiré · Nouveau | Cancelled · Declined · Withdrawn · New |
| Enregistrer · Annuler · Voir les détails · Voir tout · Modifier | Save · Cancel · View details · View all · Edit |
| Appliquer les filtres · Effacer tout · Trier par · Plus récent · Plus ancien · Tous | Apply filters · Clear all · Sort by · Newest · Oldest · All |
| Se connecter · S'inscrire · Se déconnecter | Sign in · Sign up · Sign out |
| Commencer gratuitement | Get started for free |
| Contacter sur WhatsApp | Contact on WhatsApp |
