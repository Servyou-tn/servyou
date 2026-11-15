# i18n page weight — discovery and plan (`docs/i18n-page-weight-plan`, 2026-11-14)

Discovery and plan only: no code changes. It follows the speed item logged by PR #374 (`docs/follow-ups/mentions-legales.md`, « 🟠 SPEED »).
Measured on a local production build of `main` at 32eaf09, built with the same `NEXT_PUBLIC_SENTRY_DSN` placeholder as CI.
Its per-page totals match CI's budget table to 0.1 KB (`/` = 429.1 KB). All sizes are KB gzip (level 9), the unit of
`scripts/perf/first-load-js.mjs`.

## 1. The answer in five lines

- **One JavaScript chunk holds the three dictionaries:** 205.8 KB gzip, 848 KB raw. It contains FR 75.0 + AR 73.6 + EN 57.3 KB plus `t()`.
- **It is in the first load of all 93 routes:** 38–58 % of each route's first-load JS (median 48 %), and 38–52 % on the 19 public pages.
- **A route's client code reaches 6–196 keys,** about **0.2–4.2 KB** in the visitor's language. As whole namespaces, it is **0.7–25 KB**. These are lower bounds from the source code (§3.4).
- **The plan:** client components read their strings from React context. The server sends only the visitor's language, and only the namespaces the route needs.
  - Expected: **first-load JS −206 KB on every route** (`/` 429 → ~223 KB; the marketing pages 393 → ~187 KB).
  - The price: **+1 to 25 KB of strings in the HTML / RSC payload** of each full page load.
  - Net: **about −180 to −205 KB per first visit.**
- **Savings are all-or-nothing per route.** A route sheds the 205.8 KB chunk only when **none** of its client modules imports the dictionaries. The shared shell is on every route, so the foundation PR saves 0 KB, and the first real gain lands when a whole route group is migrated (§6).

## 2. Correction to the brief's premise

The dictionaries do **not** reach the client through `LangProvider`. `src/components/LangProvider.tsx` passes only the
language code (`createContext<Lang>('fr')`). They reach it because **150 client files import `t` (or `tn`) from
`@/lib/i18n`**, and `src/lib/i18n/index.ts` statically imports `fr`, `ar` and `en` into one `dicts` object.

The built chunk confirms it (`static/chunks/0f-i-1nsh3xbv.js` on this build). It is one module: the FR object, the AR object and the EN object, then
`t`, `toLang`, `LANGS`, `LOCALES` and `LANG_COOKIE`. So `LangProvider` is the natural **carrier** of the fix, not the cause.

## 3. Measurements

### 3.1 The dictionary chunk

| Part | Raw | Gzip (alone) |
|---|---:|---:|
| French object | 297.3 KB | 75.0 KB |
| Arabic object | 235.1 KB | 73.6 KB |
| English object (3,459 of 4,132 keys; the rest falls back to French) | 222.8 KB | 57.3 KB |
| **Whole chunk** (with `t()` and the constants) | **847.5 KB** | **205.8 KB** |

`plurals.ts` (`tn`, ~7 KB gzip of source) is a separate module, not counted above.

### 3.2 Per route

Every route's first load includes the chunk. The full table for the 93 routes is in **Appendix A**. Public pages (★ in the appendix):

| Public page | First-load JS | Dictionaries | Without them |
|---|---:|---:|---:|
| `/` | 429.1 | 205.8 (48 %) | 223.3 |
| the 9 `(marketing)` pages | 393.1–396.1 | 205.8 (52 %) | 187.3–190.3 |
| `/devenir-vendeur` (+ `/boutique`, `/freelance`) | 422.9–424.2 | 205.8 (49 %) | 217.1–218.4 |
| `/marche/services`, `/marche/produits`, `/categories/[slug]` | 541.3–542.3 | 205.8 (38 %) | 335.5–336.5 |
| `/freelance/[id]`, `/boutique/[id]`, `/produits/[id]` | 489.4–490.5 | 205.8 (42 %) | 283.6–284.7 |
| `/services/[id]` | 537.1 | 205.8 (38 %) | 331.3 |

The raw 848 KB is also **parsed and compiled on every full page load**, even when the browser has it cached. That is CPU time on
the mid-range phones most Tunisian visitors use. It was not measured here.

### 3.3 Weight by namespace (source text, three languages, gzip per namespace — a slight overestimate)

`legal` 25.3 · `aide` 18.7 · `freelance` 17.8 · `admin` 16.3 · `service` 10.4 · `lp` 10.3 · `product` 9.2 · `seller` 7.3 ·
`parametres` 7.1 · `proposal` 5.6 · `monCompte` 5.4 · `faq` 5.4 · … (87 namespaces, 4,132 French keys).

- `admin` (673 keys) is French and Arabic only, since the founder keeps admin in French. It ships to every public page today.
- **30 namespaces (635 keys, about 17 + 18 + 16 KB in FR / AR / EN) are never reached from any client module.**
  - The biggest: `legal` 25.4, `about` 3.8, `orders` 3.4, `category` 3.2, `seo` 2.8, `meta` 2.6, `job` 2.5, `missionboard` 2.0.
  - Server files render them (`generateMetadata`, `LegalPageShell`, `/a-propos`, category pages, …).
  - Whether one of those server files passes a raw **key** to a client component cannot be proven from the source (§3.4).

### 3.4 What the per-route key counts can and cannot see

They come from walking each route's **client** module graph:
- the entries are the route's `page_client-reference-manifest.js`;
- the walk follows static imports through `src/`;
- it collects every string literal that is a dictionary key, plus the namespace of every `` t(`ns.${x}`) `` template.

It **cannot** see a key that a Server Component passes as a prop to a client component that then calls `t(prop)`. The project's own rule
(« store keys, not text ») makes that pattern common. **67 of the 150 client files call `t(variable)`.** So the counts are lower bounds. The
plan's safety net (§5.3) exists for exactly this gap.

## 4. How strings reach the client today

Every file is listed in Appendix E, with its key count, dynamic calls and hooks.

| | Count |
|---|---:|
| Client files (`'use client'`) that call `t()` / `tn()` | **150** (of 198 client files) |
| … that also read the language with `useLang()` | 104 |
| … with at least one dynamic `t(variable)` / template call | 67 |
| … using **3 keys or fewer** | 48 |
| … with no React hook **and** no event handler (could become Server Components) | 13 |
| Render / unit tests that render one of them (each needs a provider wrapper later) | 32 |
| Storybook stories that import one of them | 0 |

The 13 hook-free files are listed in Appendix C. Converting them to Server Components saves nothing on its own: 137 other client files
still import the dictionaries. **The lever is how client `t()` gets its dictionary, not where components run.**

The client files by area are in Appendix B. The busiest are `mon-profil-freelance` (16), `admin` (12), `mes-services` (11),
`components/marche` (9) and `ma-boutique` (7).

Two special cases:
- **`src/lib/roles.ts`** maps roles to `admin.users.role_*` labels and is imported by the client `AppShell`. Under a per-namespace scheme it would pull
  the whole `admin` namespace (673 keys) into every signed-in page. Its four labels need a small namespace of their own.
- **`src/app/global-error.tsx`** renders without the root layout, so it has no context. It reads 6 French-only keys.
  `error.tsx` and `not-found` render inside the root layout and do get context.

## 5. Options

### 5.1 What « once built, stays built » keeps

- `fr.ts` / `ar.ts` / `en/*.ts` stay the single source of truth, with the parity tests, the EN ownership split and the vocabulary lock untouched.
- The `t(key, lang, vars)` / `tn(key, lang, count, vars)` signatures stay.
- Server Components keep calling `t()` exactly as today. Server code never reaches the browser, so nothing changes there.
- No i18n library. next-intl does this job, but adopting it means migrating the API, the parity tests, the EN ownership files and the
  plural rules (AR's several forms). It brings nothing the extension below cannot do.

### 5.2 The candidates

| | Mechanism | First-load JS | Strings added to each full page load | Net per first visit | Risk |
|---|---|---:|---:|---:|---|
| **A. Active language only, via context** | the root layout passes the visitor's whole dictionary to `LangProvider` | −206 KB | +75 (FR) / +74 (AR) / ~+65 (EN, with its French fallback merged) — in the HTML, not cacheable across pages | ≈ −131 to −141 KB | low: every key is present |
| **B. Per-language JS chunks** | three dictionary modules; only the active one is loaded before hydration | −131 to −149 KB | 0 (the active chunk stays cacheable JS) | ≈ −131 to −149 KB | high: depends on Next internals; without a reliable preload the first render has no strings |
| **C. Namespaces per route, active language, via context** ← recommended | each layout / page declares its namespaces; the server sends only those, in the visitor's language | **−206 KB** | **+1–25 KB** (Appendix A, last column) | **≈ −181 to −205 KB** | medium: a key missing from the declared namespaces shows as a raw key → safety net §5.3 |
| D. Server-only namespaces (stopgap) | move the 30 never-client namespaces out of the client dictionary | up to −50 KB | 0 | up to −50 KB | low–medium: each moved namespace must be proven key-free on the client side |

**Why C:**
- It removes almost the whole chunk.
- The strings it adds are small, and only for what the page shows.
- It reuses the existing `LangProvider`.

**Fallback if the safety net (§5.3) cannot be made reliable: A.** It needs the same client migration, and
switching C → A later is a one-line change in what the provider receives. B is not recommended.

### 5.3 C in detail

**Client API.**
- A new `useT()` hook returns `t(key, vars)` and `tn(key, count, vars)` bound to the context's language and messages.
- The 150 client files move from `import { t } from '@/lib/i18n'` + `t(key, lang)` to `const { t } = useT()` + `t(key)`.
- Calls inside module-level helpers (functions outside components) must receive `t` as an argument. Their number cannot be counted from the source; it is a migration risk.
- The dictionary-free constants (`Lang`, `LANGS`, `toLang`, `LOCALES`, `LANG_COOKIE`) move to a small module that `index.ts` re-exports. A client file importing only `LOCALES` must not pull the dictionaries. Whether today's bundler already drops them in that case is **unverified**: PR-1 checks it.

**Who sends what.**

| Level | Server Component | Namespaces it adds |
|---|---|---|
| root `layout.tsx` | `LangProvider lang messages={pick(lang, SHELL)}` | the global shell: consent banner, toasts, language switch, error boundary, `common`, `system` |
| `(marketing)/layout.tsx` | `<Messages ns={[…]}>` | navy header and footer (`nav`, `landing.footer`) |
| `marche/layout.tsx`, `admin/layout.tsx` | `<Messages ns={[…]}>` | the app shell and the admin shell (`shell`, `nav`, `marche`, `admin`) |
| each `page.tsx` (most routes have no segment layout) | `<Messages ns={[…]}>` around its client part | the page's own namespaces |

- `<Messages>` is a Server Component. It renders a client provider that **merges** its messages into the parent context.
- The server builds each message set in the visitor's language. For EN it merges in the French fallback for missing keys and the plural variants (`tn`, AR's several forms). The browser therefore never needs a second language.
- **Soft navigation re-sends that page's messages** (1–25 KB, in the RSC payload). Layout messages are not re-sent.
- The 1–25 KB figures are the gzip of plain JSON. The RSC payload embeds them as escaped strings, so treat them as approximate until PR-1's message-size check measures the real thing.
- **The language switch** (`router.refresh()` after the cookie is set) re-renders the server tree, so every provider sends the new language. Client state survives, as today, because state holds keys and not text.
- **`global-error.tsx`** gets a tiny embedded French dictionary (its 6 strings).

**Safety net** (the static count cannot see keys passed as props):
1. **Source test:** for every route, every key reachable from its client graph belongs to a namespace that route declares. This is §3.4's walk, run from the source in vitest, with no build.
2. **At runtime, `useT` never fails silently:**
   - in development it logs the key, the route and the missing namespace;
   - in production it reports to Sentry (the key and the route **pattern**, e.g. `/mes-commandes/[id]`, never the concrete URL, so no ids reach Sentry) and renders the key, as `t()` does today for a missing key.
3. **A crawl of every public page in FR, AR and EN** (Playwright) fails on any miss. The signed-in areas are not crawled (no test sessions); they are checked by hand in each area's PR (founder decision 3, §8).
4. **`roles.ts`** labels move to their own namespace so `admin` stays on admin pages.

### 5.4 What it does not change

- **RTL:** `dir` and `lang` are set on `<html>` by the server, as today.
- **Vocabulary lock and translations:** no string changes.
- **Parity tests:** unchanged. A new test checks that every namespace a route declares exists.
- **Storybook:** a decorator provides the messages. No story imports a `t()` component today, so the VRT baselines should not move; PR-1 verifies it.

## 6. PR split and expected gains

Each PR measures with `node scripts/perf/first-load-js.mjs` and **lowers the budgets it earns** in `scripts/perf/first-load-budget.json`.

| PR | Content | First-load JS saved |
|---|---|---|
| **PR-1 — foundation** | `useT()`, `<Messages>`, `pick()` (active language, EN merged with the French fallback, plurals), the constants module, the global-error dictionary, the Storybook decorator, a test helper for the 32 render tests, and the source-side namespace test (warn-only at first). Also a **per-route message-size check**: gzip of what the server sends per route and language, with its own budget. `first-load-js.mjs` sees only JS, so without it a route declaring too many namespaces would look like a pure win. Proves whether importing a constant pulls the dictionaries. | **0 KB** — every route still imports the dictionaries |
| **PR-2 — shell + marketing** | Migrate the shared shell (consent, toasts, language switch, navy header/footer, error boundary) and the 9 `(marketing)` pages, plus `/` (landing) if its client tree fits. The namespace test becomes blocking for the migrated routes. | **JS 393 → ~187 KB on the 9 marketing pages** (+11–13 KB of strings in the page), and on `/` if included. The first real number. |
| **PR-3 — marketplace (public)** | `/marche/*`, `/categories/[slug]`, `/recherche`, the detail pages (`/freelance`, `/boutique`, `/produits`, `/services`), `/devenir-vendeur/*`, auth pages | JS −206 KB on each, +4–23 KB of strings (the public pages fully done) |
| **PR-4 — seller & freelancer areas** | `mon-profil-freelance`, `mes-services`, `ma-boutique`, `mes-produits`, `commandes-recues`, `tableau-de-bord*`, missions | JS −206 KB on each, +11–25 KB of strings |
| **PR-5 — buyer & account** | `mes-commandes`, `mes-annonces`, `mes-engagements`, `mes-favoris`, `mon-compte`, `parametres`, `demander` | JS −206 KB on each, +11–21 KB of strings |
| **PR-6 — admin + close** | `/admin/*`, `roles.ts` labels, delete the static client import path (a lint rule forbids `import { t } from '@/lib/i18n'` in `'use client'` files), and the Playwright crawl of the public pages in FR / AR / EN | the rest; the chunk no longer exists |

- **No stopgap D** (founder decision 2, §8): C starts directly with PR-1.
- Order: public pages first (PR-2, PR-3), because they are what first-time visitors and search engines load.

## 7. Risks

| Risk | Where | Mitigation |
|---|---|---|
| A key shown raw because its namespace was not declared | props carrying keys from Server Components (67 files with dynamic calls) | §5.3 safety net: source test, Sentry report, three-language crawl of the public pages, hand check of the signed-in areas |
| Helpers calling `t()` outside components | unknown count | pass `t` in; caught by `tsc` once `t` loses its `lang` argument on the client |
| More bytes on repeat full loads | HTML / RSC payload, +1–25 KB a page | far below the 205.8 KB saved; soft navigations only add the page's namespaces |
| Language switch shows stale strings | providers that cache messages client-side | providers keep no state of their own; covered by a test that switches FR → AR → EN |
| The shell drags a big namespace everywhere | `roles.ts` → `admin` | own namespace (PR-6, or PR-2 if the namespace test flags it earlier) |
| 32 render tests break | tests rendering client `t()` components | the PR-1 test helper; migrate them with each area |
| A route left half-migrated still ships the chunk | any client file still importing `@/lib/i18n` | the budget script shows it; the PR-6 lint rule makes it impossible |

## 8. Founder decisions (2026-11-15)

1. **Plan C** (namespaces: JS −206 KB, +1–25 KB of strings per page), not A (whole active language, +65–75 KB of strings per full page load).
2. **No stopgap D.** The ~35 KB move of server-only namespaces is skipped; C makes it redundant.
3. **The three-language crawl covers the public pages only.** No test accounts are created for it; the signed-in areas
   (consumer, freelancer, shop owner, admin) are checked by hand in each area's PR.

The questions as they were asked, for the record:

1. C (namespaces) or A (whole active language, no risk of a missing key)? Recommended: C.
2. The stopgap D (~35 KB now) before PR-2? Worth it only if PR-2 is more than a few weeks away.
3. The Playwright crawl behind sign-in needs four test sessions (consumer, freelancer, shop owner, admin). OK to create
   dedicated test accounts, or should the crawl cover public pages only and the signed-in areas be checked by hand?

## Appendix A — every route (KB gzip; ★ = public page in `src/lib/seo/routes.ts`)

- « Keys reached » and the two string columns are the client-graph lower bounds of §3.4.
- « Keys only » = exactly those keys in one language.
- « Whole namespaces » = every key of the namespaces they belong to: the size option C would send.

| Route | First-load JS | of which dictionaries | Share | Without them | Client files | Keys reached (≥) | Namespaces | Keys only, FR / AR | Whole namespaces, FR / AR |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `/` ★ | 429.1 | 205.8 | 48 % | 223.3 | 47 | 116 | 9 | 1.9 / 2.1 | 14.3 / 14.8 |
| `/(marketing)/a-propos` ★ | 393.1 | 205.8 | 52 % | 187.3 | 34 | 61 | 6 | 1.2 / 1.3 | 10.9 / 11.4 |
| `/(marketing)/accessibilite` ★ | 393.1 | 205.8 | 52 % | 187.3 | 34 | 61 | 6 | 1.2 / 1.3 | 10.9 / 11.4 |
| `/(marketing)/conditions` ★ | 393.1 | 205.8 | 52 % | 187.3 | 34 | 61 | 6 | 1.2 / 1.3 | 10.9 / 11.4 |
| `/(marketing)/confidentialite` ★ | 393.1 | 205.8 | 52 % | 187.3 | 34 | 61 | 6 | 1.2 / 1.3 | 10.9 / 11.4 |
| `/(marketing)/contact` ★ | 396.1 | 205.8 | 52 % | 190.3 | 44 | 82 | 7 | 1.6 / 1.7 | 11.3 / 11.8 |
| `/(marketing)/cookies` ★ | 393.1 | 205.8 | 52 % | 187.3 | 34 | 61 | 6 | 1.2 / 1.3 | 10.9 / 11.4 |
| `/(marketing)/faq` ★ | 394.5 | 205.8 | 52 % | 188.7 | 36 | 97 | 7 | 2.8 / 3.0 | 12.5 / 13.0 |
| `/(marketing)/mentions-legales` ★ | 393.1 | 205.8 | 52 % | 187.3 | 34 | 61 | 6 | 1.2 / 1.3 | 10.9 / 11.4 |
| `/boutique/[id]` ★ | 489.4 | 205.8 | 42 % | 283.6 | 58 | 101 | 11 | 2.0 / 2.1 | 12.7 / 13.4 |
| `/categories/[slug]` ★ | 542.3 | 205.8 | 38 % | 336.5 | 64 | 138 | 14 | 2.3 / 2.6 | 15.2 / 15.9 |
| `/devenir-vendeur` ★ | 422.9 | 205.8 | 49 % | 217.1 | 39 | 78 | 8 | 1.5 / 1.6 | 11.1 / 11.7 |
| `/devenir-vendeur/boutique` ★ | 424.2 | 205.8 | 49 % | 218.4 | 42 | 81 | 9 | 1.5 / 1.7 | 12.2 / 12.7 |
| `/devenir-vendeur/freelance` ★ | 424.2 | 205.8 | 49 % | 218.4 | 42 | 81 | 9 | 1.5 / 1.7 | 12.2 / 12.7 |
| `/freelance/[id]` ★ | 490.5 | 205.8 | 42 % | 284.7 | 59 | 129 | 14 | 2.5 / 2.7 | 22.1 / 23.0 |
| `/marche/produits` ★ | 541.3 | 205.8 | 38 % | 335.5 | 67 | 117 | 13 | 2.0 / 2.2 | 12.2 / 12.8 |
| `/marche/services` ★ | 542.2 | 205.8 | 38 % | 336.4 | 67 | 140 | 14 | 2.4 / 2.6 | 15.2 / 15.9 |
| `/produits/[id]` ★ | 490.5 | 205.8 | 42 % | 284.7 | 57 | 104 | 12 | 2.0 / 2.1 | 14.5 / 15.1 |
| `/services/[id]` ★ | 537.1 | 205.8 | 38 % | 331.3 | 63 | 125 | 14 | 2.3 / 2.5 | 17.2 / 18.0 |
| `/_global-error` | 354.8 | 205.8 | 58 % | 149.0 | 5 | 6 | 1 | 0.2 / 0.3 | 0.7 / 0.7 |
| `/_not-found` | 382.5 | 205.8 | 54 % | 176.7 | 16 | 23 | 3 | 0.7 / 0.8 | 2.6 / 2.7 |
| `/a-bientot` | 382.5 | 205.8 | 54 % | 176.7 | 16 | 23 | 3 | 0.7 / 0.8 | 2.6 / 2.7 |
| `/admin` | 423.4 | 205.8 | 49 % | 217.6 | 39 | 89 | 8 | 1.6 / 1.7 | 11.1 / 11.7 |
| `/admin/commandes` | 425.4 | 205.8 | 48 % | 219.6 | 44 | 94 | 9 | 1.7 / 1.8 | 11.6 / 12.2 |
| `/admin/contenu` | 426.4 | 205.8 | 48 % | 220.6 | 49 | 109 | 9 | 2.0 / 2.2 | 11.6 / 12.2 |
| `/admin/demandes` | 425 | 205.8 | 48 % | 219.2 | 46 | 117 | 8 | 2.3 / 2.4 | 11.1 / 11.7 |
| `/admin/journal` | 425.4 | 205.8 | 48 % | 219.6 | 44 | 94 | 9 | 1.7 / 1.8 | 11.6 / 12.2 |
| `/admin/litiges` | 454.3 | 205.8 | 45 % | 248.5 | 45 | 106 | 8 | 2.0 / 2.2 | 11.1 / 11.7 |
| `/admin/litiges/[id]` | 454.3 | 205.8 | 45 % | 248.5 | 45 | 106 | 8 | 2.0 / 2.2 | 11.1 / 11.7 |
| `/admin/signalements` | 424.4 | 205.8 | 48 % | 218.6 | 42 | 90 | 8 | 1.6 / 1.8 | 11.1 / 11.7 |
| `/admin/signalements/[id]` | 454.8 | 205.8 | 45 % | 249.0 | 47 | 122 | 8 | 2.3 / 2.5 | 11.1 / 11.7 |
| `/admin/statistiques` | 423.4 | 205.8 | 49 % | 217.6 | 38 | 89 | 8 | 1.6 / 1.7 | 11.1 / 11.7 |
| `/admin/utilisateurs` | 425.4 | 205.8 | 48 % | 219.6 | 44 | 94 | 9 | 1.7 / 1.8 | 11.6 / 12.2 |
| `/admin/utilisateurs/[id]` | 426.4 | 205.8 | 48 % | 220.6 | 51 | 111 | 9 | 2.0 / 2.2 | 11.6 / 12.2 |
| `/aide` | 426.3 | 205.8 | 48 % | 220.5 | 45 | 84 | 9 | 1.6 / 1.8 | 17.1 / 17.8 |
| `/commandes-recues` | 490.3 | 205.8 | 42 % | 284.5 | 58 | 123 | 11 | 2.5 / 2.7 | 14.7 / 15.3 |
| `/commandes-recues/[id]` | 489 | 205.8 | 42 % | 283.2 | 54 | 123 | 10 | 2.5 / 2.7 | 14.2 / 14.8 |
| `/compte-suspendu` | 382.5 | 205.8 | 54 % | 176.7 | 16 | 23 | 3 | 0.7 / 0.8 | 2.6 / 2.7 |
| `/connexion` | 455.3 | 205.8 | 45 % | 249.5 | 33 | 65 | 7 | 1.5 / 1.6 | 12.2 / 12.7 |
| `/demander/[id]` | 429.5 | 205.8 | 48 % | 223.7 | 60 | 139 | 11 | 2.8 / 3.1 | 15.9 / 16.5 |
| `/demander/succes` | 422.9 | 205.8 | 49 % | 217.1 | 39 | 78 | 8 | 1.5 / 1.6 | 11.1 / 11.7 |
| `/design-tokens-verification` | 382.5 | 205.8 | 54 % | 176.7 | 16 | 23 | 3 | 0.7 / 0.8 | 2.6 / 2.7 |
| `/devenir-freelance` | 382.5 | 205.8 | 54 % | 176.7 | 16 | 23 | 3 | 0.7 / 0.8 | 2.6 / 2.7 |
| `/inscription` | 382.5 | 205.8 | 54 % | 176.7 | 16 | 23 | 3 | 0.7 / 0.8 | 2.6 / 2.7 |
| `/inscription/consumer` | 455.8 | 205.8 | 45 % | 250.0 | 30 | 67 | 4 | 1.6 / 1.8 | 3.9 / 4.1 |
| `/inscription/freelancer` | 455.8 | 205.8 | 45 % | 250.0 | 30 | 67 | 4 | 1.6 / 1.8 | 3.9 / 4.1 |
| `/inscription/shop-owner` | 455.8 | 205.8 | 45 % | 250.0 | 30 | 67 | 4 | 1.6 / 1.8 | 3.9 / 4.1 |
| `/ma-boutique` | 382.5 | 205.8 | 54 % | 176.7 | 16 | 23 | 3 | 0.7 / 0.8 | 2.6 / 2.7 |
| `/ma-boutique/creer` | 428.2 | 205.8 | 48 % | 222.4 | 61 | 127 | 14 | 2.7 / 2.8 | 18.0 / 18.7 |
| `/ma-boutique/creer/configuration` | 426.9 | 205.8 | 48 % | 221.1 | 52 | 108 | 10 | 2.1 / 2.3 | 13.2 / 13.8 |
| `/ma-boutique/creer/succes` | 422.9 | 205.8 | 49 % | 217.1 | 39 | 78 | 8 | 1.5 / 1.6 | 11.1 / 11.7 |
| `/ma-boutique/modifier` | 465.3 | 205.8 | 44 % | 259.5 | 63 | 129 | 13 | 2.7 / 2.9 | 16.0 / 16.6 |
| `/maintenance` | 382.5 | 205.8 | 54 % | 176.7 | 16 | 23 | 3 | 0.7 / 0.8 | 2.6 / 2.7 |
| `/marche` | 382.5 | 205.8 | 54 % | 176.7 | 16 | 23 | 3 | 0.7 / 0.8 | 2.6 / 2.7 |
| `/mes-annonces` | 426.5 | 205.8 | 48 % | 220.7 | 59 | 117 | 14 | 2.3 / 2.6 | 15.4 / 16.1 |
| `/mes-annonces/[id]` | 539 | 205.8 | 38 % | 333.2 | 74 | 179 | 18 | 3.4 / 3.7 | 19.9 / 20.7 |
| `/mes-annonces/[id]/modifier` | 438.8 | 205.8 | 47 % | 233.0 | 68 | 167 | 14 | 3.2 / 3.5 | 17.0 / 17.7 |
| `/mes-annonces/nouvelle` | 438.8 | 205.8 | 47 % | 233.0 | 68 | 167 | 14 | 3.2 / 3.5 | 17.0 / 17.7 |
| `/mes-commandes` | 495 | 205.8 | 42 % | 289.2 | 70 | 155 | 14 | 3.0 / 3.2 | 15.3 / 16.0 |
| `/mes-commandes/[id]` | 490.9 | 205.8 | 42 % | 285.1 | 68 | 182 | 13 | 3.5 / 3.7 | 15.2 / 15.9 |
| `/mes-engagements` | 491.1 | 205.8 | 42 % | 285.3 | 60 | 129 | 12 | 2.6 / 2.7 | 15.4 / 16.1 |
| `/mes-engagements/[id]` | 488.6 | 205.8 | 42 % | 282.8 | 53 | 118 | 10 | 2.4 / 2.6 | 14.2 / 14.8 |
| `/mes-favoris` | 539.2 | 205.8 | 38 % | 333.4 | 70 | 132 | 15 | 2.3 / 2.5 | 15.0 / 15.7 |
| `/mes-produits` | 427.8 | 205.8 | 48 % | 222.0 | 61 | 131 | 13 | 2.7 / 2.9 | 14.5 / 15.2 |
| `/mes-produits/[id]/modifier` | 472.9 | 205.8 | 44 % | 267.1 | 62 | 154 | 12 | 3.3 / 3.4 | 14.1 / 14.7 |
| `/mes-produits/ajouter` | 427.9 | 205.8 | 48 % | 222.1 | 58 | 140 | 12 | 3.0 / 3.2 | 14.1 / 14.7 |
| `/mes-propositions` | 426.1 | 205.8 | 48 % | 220.3 | 55 | 106 | 13 | 2.1 / 2.2 | 14.8 / 15.5 |
| `/mes-services` | 471.9 | 205.8 | 44 % | 266.1 | 57 | 113 | 12 | 2.2 / 2.4 | 16.6 / 17.2 |
| `/mes-services/[id]/modifier` | 471.4 | 205.8 | 44 % | 265.6 | 66 | 192 | 13 | 3.8 / 4.0 | 23.7 / 24.8 |
| `/mes-services/creer` | 470.9 | 205.8 | 44 % | 265.1 | 65 | 192 | 13 | 3.8 / 4.0 | 23.7 / 24.8 |
| `/mes-services/creer/succes` | 422.9 | 205.8 | 49 % | 217.1 | 39 | 78 | 8 | 1.5 / 1.6 | 11.1 / 11.7 |
| `/missions` | 382.5 | 205.8 | 54 % | 176.7 | 16 | 23 | 3 | 0.7 / 0.8 | 2.6 / 2.7 |
| `/missions/[id]` | 422.9 | 205.8 | 49 % | 217.1 | 39 | 78 | 8 | 1.5 / 1.6 | 11.1 / 11.7 |
| `/missions/[id]/proposer` | 438.3 | 205.8 | 47 % | 232.5 | 62 | 134 | 12 | 2.6 / 2.8 | 14.2 / 14.8 |
| `/missions/[id]/proposition-envoyee` | 422.9 | 205.8 | 49 % | 217.1 | 39 | 78 | 8 | 1.5 / 1.6 | 11.1 / 11.7 |
| `/mon-compte` | 430.5 | 205.8 | 48 % | 224.7 | 67 | 149 | 13 | 3.1 / 3.3 | 15.8 / 16.5 |
| `/mon-profil-freelance` | 382.5 | 205.8 | 54 % | 176.7 | 16 | 23 | 3 | 0.7 / 0.8 | 2.6 / 2.7 |
| `/mon-profil-freelance/creer` | 427.9 | 205.8 | 48 % | 222.1 | 62 | 138 | 13 | 3.0 / 3.2 | 20.2 / 21.2 |
| `/mon-profil-freelance/creer/competences` | 434.8 | 205.8 | 47 % | 229.0 | 57 | 112 | 9 | 2.2 / 2.3 | 16.5 / 17.4 |
| `/mon-profil-freelance/creer/details` | 429 | 205.8 | 48 % | 223.2 | 56 | 130 | 9 | 2.4 / 2.6 | 16.5 / 17.4 |
| `/mon-profil-freelance/creer/succes` | 422.9 | 205.8 | 49 % | 217.1 | 39 | 78 | 8 | 1.5 / 1.6 | 11.1 / 11.7 |
| `/mon-profil-freelance/modifier` | 440.9 | 205.8 | 47 % | 235.1 | 85 | 196 | 15 | 4.0 / 4.2 | 22.7 / 23.6 |
| `/mot-de-passe-oublie` | 452.9 | 205.8 | 45 % | 247.1 | 25 | 33 | 5 | 1.0 / 1.1 | 4.2 / 4.3 |
| `/nouveau-mot-de-passe` | 449.1 | 205.8 | 46 % | 243.3 | 27 | 47 | 5 | 1.2 / 1.3 | 4.3 / 4.4 |
| `/parametres` | 457.5 | 205.8 | 45 % | 251.7 | 64 | 155 | 13 | 3.5 / 3.7 | 16.6 / 17.3 |
| `/profil` | 382.5 | 205.8 | 54 % | 176.7 | 16 | 23 | 3 | 0.7 / 0.8 | 2.6 / 2.7 |
| `/recherche` | 542.2 | 205.8 | 38 % | 336.4 | 64 | 140 | 14 | 2.3 / 2.6 | 15.2 / 15.9 |
| `/session-expiree` | 382.5 | 205.8 | 54 % | 176.7 | 16 | 23 | 3 | 0.7 / 0.8 | 2.6 / 2.7 |
| `/statistiques` | 422.9 | 205.8 | 49 % | 217.1 | 39 | 78 | 8 | 1.5 / 1.6 | 11.1 / 11.7 |
| `/tableau-de-bord` | 422.9 | 205.8 | 49 % | 217.1 | 39 | 78 | 8 | 1.5 / 1.6 | 11.1 / 11.7 |
| `/tableau-de-bord-vendeur` | 423.5 | 205.8 | 49 % | 217.7 | 47 | 89 | 10 | 1.8 / 2.0 | 14.2 / 14.8 |
| `/trouver-des-missions` | 424.7 | 205.8 | 48 % | 218.9 | 45 | 83 | 9 | 1.5 / 1.7 | 11.6 / 12.2 |
| `/verifier-email` | 449.5 | 205.8 | 46 % | 243.7 | 36 | 77 | 7 | 1.7 / 1.9 | 12.3 / 12.9 |

## Appendix B — client files calling `t()`, by area

| Area | Client files calling `t()` | Keys (sum) | With a dynamic `t(variable)` | Without React hooks |
|---|---:|---:|---:|---:|
| `mon-profil-freelance` | 16 | 202 | 3 | 9 |
| `admin` | 12 | 78 | 10 | 0 |
| `mes-services` | 11 | 85 | 6 | 7 |
| `components/marche` | 9 | 148 | 6 | 2 |
| `ma-boutique` | 7 | 95 | 4 | 1 |
| `components/parametres` | 6 | 56 | 1 | 2 |
| `components/produits` | 6 | 60 | 2 | 0 |
| `components/shell` | 6 | 19 | 3 | 2 |
| `mes-commandes` | 5 | 49 | 5 | 1 |
| `components/orders` | 5 | 34 | 3 | 2 |
| `mes-produits` | 4 | 79 | 2 | 0 |
| `mon-compte` | 4 | 48 | 2 | 0 |
| `components/auth` | 4 | 55 | 0 | 1 |
| `components/landing` | 4 | 42 | 3 | 1 |
| `components/layout` | 4 | 12 | 3 | 0 |
| `(marketing)` | 3 | 19 | 1 | 0 |
| `components/consent` | 3 | 18 | 0 | 1 |
| `components/recherche` | 3 | 18 | 2 | 0 |
| `boutique` | 2 | 13 | 0 | 0 |
| `connexion` | 2 | 17 | 0 | 0 |
| `demander` | 2 | 55 | 1 | 0 |
| `freelance` | 2 | 13 | 0 | 0 |
| `mes-annonces` | 2 | 18 | 1 | 0 |
| `mes-engagements` | 2 | 6 | 0 | 0 |
| `mes-propositions` | 2 | 13 | 1 | 0 |
| `components/devenir` | 2 | 0 | 0 | 2 |
| `components/social` | 2 | 6 | 0 | 1 |
| `commandes-recues` | 1 | 5 | 0 | 0 |
| `error.tsx` | 1 | 6 | 0 | 0 |
| `global-error.tsx` | 1 | 6 | 0 | 0 |
| `inscription` | 1 | 32 | 1 | 0 |
| `marche` | 1 | 8 | 0 | 0 |
| `mes-favoris` | 1 | 13 | 0 | 0 |
| `missions` | 1 | 45 | 1 | 0 |
| `components/AdminSidebar.tsx` | 1 | 18 | 1 | 0 |
| `components/DisputeCreateModal.tsx` | 1 | 9 | 1 | 0 |
| `components/FavoriteButton.tsx` | 1 | 5 | 0 | 0 |
| `components/ModerationBanner.tsx` | 1 | 0 | 0 | 1 |
| `components/OrderLifecycleStepper.tsx` | 1 | 5 | 1 | 1 |
| `components/ReceiptConfirmButton.tsx` | 1 | 5 | 0 | 0 |
| `components/account` | 1 | 2 | 0 | 1 |
| `components/aide` | 1 | 7 | 0 | 0 |
| `components/favorites` | 1 | 4 | 1 | 0 |
| `components/listings` | 1 | 2 | 0 | 1 |
| `components/report` | 1 | 8 | 1 | 0 |
| `components/shared` | 1 | 5 | 0 | 0 |
| `components/ui` | 1 | 2 | 1 | 0 |

## Appendix C — the 13 client files with no React hook and no event handler

- `src/app/ma-boutique/creer/configuration/_components/AccordionSection.tsx` (2 keys)
- `src/app/mon-profil-freelance/modifier/_components/AccordionSection.tsx` (2 keys)
- `src/app/mon-profil-freelance/modifier/_components/ValidationBanner.tsx` (1 keys)
- `src/components/ModerationBanner.tsx` (0 keys)
- `src/components/OrderLifecycleStepper.tsx` (5 keys)
- `src/components/devenir/DevenirFreelanceContent.tsx` (0 keys)
- `src/components/devenir/DevenirVendeurContent.tsx` (0 keys)
- `src/components/listings/ServiceListingCard.tsx` (2 keys)
- `src/components/marche/HelpDropdown.tsx` (3 keys)
- `src/components/marche/NavTextLinks.tsx` (2 keys)
- `src/components/orders/PhoneRequiredError.tsx` (2 keys)
- `src/components/parametres/ComptesConnectesTab.tsx` (3 keys)
- `src/components/shell/TopbarNotifications.tsx` (3 keys)

## Appendix D — how the numbers were produced (reproducible)

1. `NEXT_PUBLIC_SENTRY_DSN=<CI placeholder> npm run build` on `main` (32eaf09), then `node scripts/perf/first-load-js.mjs`. That gives the same totals as CI.
2. **Dictionary chunk:** the `.next/static/chunks` file containing the key `"legal.mentions.title"`. One file, found three times (FR, AR, EN), split at each `"common.back_home":`.
3. **Per route:** the root main files plus each `page_client-reference-manifest.js`'s `entryJSFiles` (same as the budget script), with the dictionary chunk's share counted.
4. **Keys per route:** from each manifest's `clientModules` under `src/`, follow static imports (`@/…` and relative), excluding `src/lib/i18n/`. Collect every string literal that is a `fr.ts` key, plus the namespace of every `` t(`ns.${…}`) `` template. Sizes are the gzip of those keys' values as JSON, one language.
5. **Namespace weights:** the gzip of each namespace's source lines per language. Compressing namespaces separately slightly overestimates them.

The scripts were throwaway analysis, not committed. PR-1's source-side namespace test (§5.3) re-implements step 4 as a real test.

## Appendix E — every client file that calls `t()` / `tn()` (150)

- Sorted by keys, most first.
- « Keys » = dictionary keys written in the file (lower bound: keys arriving as props are not counted).
- « Dynamic » = at least one `t(variable)` or template call.
- « Hooks » = uses React state, effects or the router.
- Files with **≤ 3 keys** are the natural candidates to receive their strings as props from a Server Component; the hook-free ones could become Server Components outright (Appendix C).

| File | Keys | Dynamic | Hooks | Namespaces |
|---|---:|:---:|:---:|---|
| `app/missions/[id]/proposer/_components/ProposalForm.tsx` | 45 | yes | yes | annonce, missiondetail, proposal |
| `components/marche/AnnonceForm.tsx` | 45 | yes | yes | annonce |
| `app/mes-produits/[id]/modifier/_components/EditProductForm.tsx` | 44 | yes | yes | common, owner, product |
| `components/marche/AnnonceDetail.tsx` | 42 | yes | yes | annonce, annonces, common, mesannonces |
| `app/mon-profil-freelance/modifier/_components/ProfileEditForm.tsx` | 41 |  | yes | freelance |
| `components/produits/ProductForm.tsx` | 34 | yes | yes | product |
| `app/inscription/components/SignupForm.tsx` | 32 | yes | yes | common, signup |
| `app/demander/[id]/_components/ProductRequestForm.tsx` | 31 |  | yes | demander |
| `app/mon-profil-freelance/creer/_components/CreateFreelancerProfileForm.tsx` | 31 |  | yes | common, freelance, monCompte, seller |
| `app/ma-boutique/creer/_components/CreateShopForm.tsx` | 27 |  | yes | common, monCompte, seller, shop |
| `app/ma-boutique/creer/configuration/_components/ConfigurationForm.tsx` | 26 | yes | yes | boutique, common, shop |
| `app/mon-profil-freelance/creer/competences/_components/CompetencesForm.tsx` | 26 |  | yes | common, freelance |
| `app/demander/[id]/_components/ServiceRequestForm.tsx` | 24 | yes | yes | demander, product |
| `app/mes-commandes/[id]/_components/BuyerOrderActions.tsx` | 24 | yes | yes | buyerOrder, mesCommandes, seller |
| `app/mon-profil-freelance/creer/details/_components/DetailsForm.tsx` | 24 |  | yes | common, freelance |
| `app/ma-boutique/modifier/_components/EditShopForm.tsx` | 23 |  | yes | common, shop |
| `components/auth/VerifyEmailFlow.tsx` | 23 |  | yes | common, signup, verifyEmail |
| `app/mon-compte/_components/MonCompteForm.tsx` | 21 | yes | yes | monCompte |
| `components/auth/NewPasswordForm.tsx` | 21 |  | yes | common, newPassword |
| `components/landing/LandingFooter.tsx` | 21 | yes |  | lp, nav |
| `app/admin/demandes/_components/RequestActions.tsx` | 18 | yes | yes | admin, common |
| `components/AdminSidebar.tsx` | 18 | yes | yes | admin, shell |
| `app/mes-annonces/_components/AnnonceRowActions.tsx` | 17 | yes | yes | annonces, common, mesannonces |
| `components/marche/AnnonceResponseCard.tsx` | 17 | yes | yes | annonce, annonces |
| `app/(marketing)/contact/ContactForm.tsx` | 15 | yes | yes | common, contact |
| `app/admin/signalements/[id]/DecisionPanel.tsx` | 15 | yes | yes | admin, common |
| `app/mes-produits/_components/ProductRow.tsx` | 15 | yes | yes | common, owner, product |
| `app/mes-services/creer/_components/StepMetier.tsx` | 15 | yes |  | service |
| `app/connexion/components/SigninForm.tsx` | 14 |  | yes | common, signin, signup |
| `components/marche/ProduitsFilterBar.tsx` | 14 | yes | yes | produits, search |
| `components/marche/ServicesFilterBar.tsx` | 14 | yes | yes | search, services |
| `components/orders/CancelOrderButton.tsx` | 14 | yes | yes | buyerOrder, common, seller |
| `components/recherche/SearchFilters.tsx` | 14 | yes | yes | produits, search, services |
| `app/mes-favoris/_components/FavorisTabs.tsx` | 13 |  | yes | mesfavoris |
| `app/mes-propositions/_components/ProposalActions.tsx` | 12 | yes | yes | common, propositions |
| `app/mes-services/creer/_components/StepPublication.tsx` | 12 | yes |  | service |
| `app/mon-profil-freelance/creer/details/_components/EducationRepeater.tsx` | 12 |  |  | freelance |
| `components/landing/TopBar.tsx` | 12 | yes | yes | lp, nav |
| `components/parametres/ConfidentialiteTab.tsx` | 12 |  | yes | cookies, marche, parametres |
| `components/parametres/LangueRegionTab.tsx` | 12 |  |  | parametres |
| `app/mes-commandes/_components/ProductOrdersList.tsx` | 11 | yes | yes | buyerOrder, mesCommandes |
| `components/consent/CookieSettingsModal.tsx` | 11 |  | yes | cookies |
| `components/orders/ReportProblemDialog.tsx` | 11 | yes | yes | buyerOrder, dispute |
| `components/parametres/ParametresShell.tsx` | 11 | yes | yes | parametres |
| `app/admin/litiges/[id]/DisputeDecisionPanel.tsx` | 10 | yes | yes | admin, common |
| `app/boutique/[id]/_components/ShopReportModal.tsx` | 10 |  | yes | boutique, report |
| `app/freelance/[id]/_components/FreelancerReportModal.tsx` | 10 |  | yes | freelance, report |
| `app/ma-boutique/modifier/_components/SocialLinksSection.tsx` | 10 | yes | yes | boutique, shop |
| `app/mes-commandes/_components/OrdersList.tsx` | 10 | yes | yes | buyerOrder, common, mesCommandes |
| `app/mes-produits/[id]/modifier/_components/EditImageGallery.tsx` | 10 |  | yes | product |
| `app/mes-produits/_components/ProductsList.tsx` | 10 |  | yes | common, product |
| `app/mes-services/_components/ServiceRow.tsx` | 10 |  | yes | common, owner, service |
| `app/mon-compte/_components/ChangePasswordModal.tsx` | 10 | yes | yes | monCompte |
| `app/mon-profil-freelance/creer/details/_components/CertificationRepeater.tsx` | 10 |  |  | freelance |
| `app/mon-profil-freelance/modifier/_components/CertificationRepeater.tsx` | 10 |  |  | freelance |
| `components/auth/ForgotPasswordForm.tsx` | 10 |  | yes | common, forgotPassword, signup |
| `components/produits/ImageUploadGrid.tsx` | 10 |  | yes | product |
| `app/admin/contenu/_components/ModerationButtons.tsx` | 9 | yes | yes | admin, common |
| `app/mon-compte/_components/AvatarUploadCard.tsx` | 9 |  | yes | monCompte |
| `app/mon-profil-freelance/modifier/_components/EducationRepeater.tsx` | 9 |  |  | freelance |
| `components/DisputeCreateModal.tsx` | 9 | yes | yes | common, dispute |
| `components/marche/ProfileAvatarMenu.tsx` | 9 |  | yes | marche, nav, profileMenu |
| `components/parametres/ExportDataModal.tsx` | 9 |  | yes | parametres |
| `components/parametres/NotificationsTab.tsx` | 9 |  | yes | marche, parametres, system |
| `app/marche/produits/_components/BoutiquesFilterBar.tsx` | 8 |  | yes | boutiques, produits |
| `app/mes-services/creer/_components/StepPrestation.tsx` | 8 | yes |  | service |
| `app/mes-services/creer/_components/StepTarif.tsx` | 8 | yes |  | product, service |
| `app/mes-services/creer/_components/WizardFooter.tsx` | 8 | yes |  | common, service |
| `app/mon-compte/_components/DeleteAccountModal.tsx` | 8 |  | yes | monCompte |
| `app/mon-profil-freelance/modifier/_components/PortfolioRepeater.tsx` | 8 |  | yes | freelance, product |
| `components/report/ReportListingModal.tsx` | 8 | yes | yes | product, report, serviceDetail |
| `components/shell/TopbarUserMenu.tsx` | 8 | yes | yes | nav, shell |
| `app/admin/utilisateurs/[id]/SuspendForm.tsx` | 7 | yes | yes | admin, common |
| `app/mes-services/creer/_components/ServiceWizard.tsx` | 7 |  | yes | service |
| `components/aide/AideCenter.tsx` | 7 |  | yes | aide |
| `app/error.tsx` | 6 |  | yes | system |
| `app/global-error.tsx` | 6 |  | yes | system |
| `app/mes-services/_components/DeleteServiceModal.tsx` | 6 |  | yes | common, service |
| `app/mes-services/creer/_components/StepDescription.tsx` | 6 | yes |  | service |
| `app/mon-profil-freelance/creer/_components/AvatarField.tsx` | 6 |  | yes | freelance, monCompte |
| `app/mon-profil-freelance/creer/competences/_components/LanguageRepeater.tsx` | 6 |  |  | freelance |
| `app/mon-profil-freelance/modifier/_components/AvatarField.tsx` | 6 |  | yes | freelance, monCompte |
| `app/mon-profil-freelance/modifier/_components/StickyFooter.tsx` | 6 | yes |  | freelance |
| `components/consent/CookieBanner.tsx` | 6 |  | yes | cookies |
| `components/landing/HowItWorks.tsx` | 6 | yes | yes | lp |
| `components/layout/MobileMenu.tsx` | 6 | yes | yes | nav |
| `components/produits/DeleteProductModal.tsx` | 6 |  | yes | common, product |
| `components/shell/Sidebar.tsx` | 6 | yes | yes | nav, shell |
| `app/admin/AdminShell.tsx` | 5 |  | yes | admin, shell |
| `app/commandes-recues/_components/TrackingNumberForm.tsx` | 5 |  | yes | seller |
| `app/mes-engagements/_components/EngagementActions.tsx` | 5 |  | yes | engagements |
| `components/FavoriteButton.tsx` | 5 |  | yes | common, favorites |
| `components/OrderLifecycleStepper.tsx` | 5 | yes |  | common |
| `components/ReceiptConfirmButton.tsx` | 5 |  | yes | common |
| `components/orders/ConfirmReceiptDialog.tsx` | 5 |  |  | buyerOrder, receipt |
| `components/produits/ProductGallery.tsx` | 5 |  | yes | product |
| `components/shared/Pagination.tsx` | 5 |  | yes | search |
| `app/ma-boutique/creer/_components/BannerField.tsx` | 4 |  | yes | shop |
| `app/mon-profil-freelance/modifier/_components/LanguageRepeater.tsx` | 4 |  |  | freelance |
| `components/favorites/FavoriteHeart.tsx` | 4 | yes | yes | common, favorites |
| `components/layout/Header.tsx` | 4 | yes | yes | nav |
| `components/social/LinksEditor.tsx` | 4 |  | yes | freelance, links |
| `app/(marketing)/faq/FaqView.tsx` | 3 |  | yes | faq |
| `app/admin/signalements/[id]/UnhideButton.tsx` | 3 | yes | yes | admin, common |
| `app/admin/signalements/[id]/UnsuspendReportedUserButton.tsx` | 3 | yes | yes | admin, common |
| `app/admin/utilisateurs/[id]/UnsuspendButton.tsx` | 3 | yes | yes | admin, common |
| `app/boutique/[id]/_components/ShopShareButton.tsx` | 3 |  | yes | boutique, common |
| `app/connexion/components/SuspendedBanner.tsx` | 3 |  | yes | signin |
| `app/freelance/[id]/_components/FreelancerShareButton.tsx` | 3 |  | yes | common, freelance |
| `app/ma-boutique/creer/_components/LogoField.tsx` | 3 | yes | yes | shop |
| `app/mes-services/_components/ServiceFiltersBar.tsx` | 3 |  | yes | service |
| `components/landing/Faq.tsx` | 3 |  | yes | lp |
| `components/marche/HelpDropdown.tsx` | 3 |  |  | help |
| `components/parametres/ComptesConnectesTab.tsx` | 3 |  |  | parametres |
| `components/produits/ShareLinkButton.tsx` | 3 |  | yes | common, product |
| `components/shell/TopbarNotifications.tsx` | 3 |  |  | shell |
| `app/admin/litiges/[id]/ClaimDisputeButton.tsx` | 2 | yes | yes | admin |
| `app/admin/signalements/[id]/ClaimButton.tsx` | 2 | yes | yes | admin |
| `app/ma-boutique/creer/configuration/_components/AccordionSection.tsx` | 2 | yes |  | boutique |
| `app/mes-commandes/_components/OrderAccordionRow.tsx` | 2 | yes |  | mesCommandes |
| `app/mes-commandes/_components/OrdersFilterBar.tsx` | 2 | yes | yes | mesCommandes |
| `app/mes-services/_components/CascadeWarningModal.tsx` | 2 |  |  | common, service |
| `app/mon-profil-freelance/modifier/_components/AccordionSection.tsx` | 2 | yes |  | freelance |
| `components/account/TunisianPhoneInput.tsx` | 2 |  |  | monCompte |
| `components/listings/ServiceListingCard.tsx` | 2 |  |  | listing |
| `components/marche/NavTextLinks.tsx` | 2 |  |  | marche |
| `components/marche/ServiceDescription.tsx` | 2 | yes | yes | serviceDetail |
| `components/orders/PhoneRequiredError.tsx` | 2 |  |  | seller |
| `components/orders/WhatsAppContactButton.tsx` | 2 | yes | yes | seller |
| `components/produits/ProductDescription.tsx` | 2 | yes | yes | product |
| `components/recherche/SearchFiltersSheet.tsx` | 2 |  | yes | search |
| `components/recherche/SearchQueryInput.tsx` | 2 | yes | yes | produits, services |
| `components/social/RecommendedPlatforms.tsx` | 2 |  |  | links |
| `components/ui/password-reveal.tsx` | 2 | yes | yes | signup |
| `app/(marketing)/contact/CopyableEmail.tsx` | 1 |  | yes | contact |
| `app/admin/signalements/_components/ReportSearch.tsx` | 1 |  | yes | admin |
| `app/mes-annonces/_components/AnnonceSearch.tsx` | 1 |  | yes | mesannonces |
| `app/mes-engagements/_components/EngagementSearch.tsx` | 1 |  | yes | engagements |
| `app/mes-propositions/_components/ProposalSearch.tsx` | 1 |  | yes | propositions |
| `app/mon-profil-freelance/modifier/_components/ValidationBanner.tsx` | 1 | yes |  | freelance |
| `components/auth/PasswordField.tsx` | 1 |  |  | signup |
| `components/consent/ManageCookiesButton.tsx` | 1 |  |  | cookies |
| `components/layout/AccountMenu.tsx` | 1 | yes | yes | nav |
| `components/layout/LanguageToggle.tsx` | 1 |  | yes | nav |
| `components/shell/AppShellClient.tsx` | 1 |  | yes | nav |
| `components/shell/Topbar.tsx` | 1 |  |  | shell |
| `components/ModerationBanner.tsx` | 0 |  |  |  |
| `components/devenir/DevenirFreelanceContent.tsx` | 0 |  |  |  |
| `components/devenir/DevenirVendeurContent.tsx` | 0 |  |  |  |
| `components/shell/TopbarSearch.tsx` | 0 | yes | yes |  |
