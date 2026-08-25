# Servyou — Always-on rules for Claude Code

> This file loads into every CC session. Keep it lean — every token is a recurring cost.
> Domain workflows (design system, i18n, visual gates, discovery, phasing) live in `.claude/skills/` and load conditionally.

## Stack assumptions

- **Framework:** Next.js 16 (App Router, Server Components default) + TypeScript strict + Tailwind v4.3
- **Database:** Supabase, project `xggomcitqrkaylqezjjz`, region `eu-central-1` Frankfurt
- **Deploy:** Vercel Hobby (production at https://servyou.vercel.app)
- **Repo:** github.com/Servyou-tn/servyou
- **i18n:** Bilingual French + Arabic — `src/lib/i18n/fr.ts` + `src/lib/i18n/ar.ts`
- **Icons:** lucide-react
- **Charts:** Recharts (when needed)

## Hard standards — non-negotiable on every PR

- **TypeScript strict.** No `any`, no `@ts-ignore` without justification.
- **Server Components default.** Only add `'use client'` to components needing state, refs, event handlers, or browser APIs.
- **No raw SQL in app code.** Use the typed Supabase client with parameter binding. Raw SQL only in migrations + RPC functions.
- **Server actions validate input with Zod** before any mutation. Always check auth ownership.
- **No `useEffect` for data fetching** in new components. Use async Server Components or server actions.
- **Tailwind logical properties only.** Use `ps-`, `pe-`, `ms-`, `me-`, `text-start`, `text-end`. NEVER `pl-`, `pr-`, `ml-`, `mr-`, `text-left`, `text-right`. Servyou is bilingual FR/AR.
- **next/image** for every image. Never raw `<img>` tags. `priority` on above-the-fold images. `sizes` on responsive images.
- **next/font** for all custom fonts. No `<link>` tags for fonts.
- **RLS enabled in the same migration that creates the table.** No exceptions.
- **No client-side `service_role` Supabase client.** Service role only in server actions and admin endpoints.
- **No `dangerouslySetInnerHTML` with user input.** Use `react-markdown` + `rehype-sanitize` if markdown rendering needed.
- **Never log raw error objects.** Supabase `PostgrestError` extends Error with non-enumerable properties — logging the raw object serializes to `{}`. Always log `error.message`, `error.code`, `error.details` explicitly.

## PR discipline

- **Branch FIRST.** Every new piece of work starts with `git fetch origin && git checkout -b <name> origin/main` — **before any file is touched**, before the first migration, before the first edit. Whatever branch is checked out from the last task is the default state, not a signal about this one. Cutting the branch after the work is done is too late: the previous PR's branch is usually still open and under review.
- **One PR, one focus.** Bugs found out-of-scope during a PR get LOGGED for a future PR, not fixed inline.
- **One focused commit per PR** (or 2 max if cleanly separated, e.g. migration + app code).
- **NO `Co-Authored-By` trailers.** Ever.
- **Conventional commit prefix:** `feat(scope):`, `fix(scope):`, `chore:`, `refactor:`, `docs:`.
- **Commit body cites the spec section** it implements ("Per design system Section 4.6, ..." or "Per standards-reference Section 3 A09, ...").
- **Once built, stays built.** Do not undo, revert, replace, or re-implement an element from a previous PR within a subsequent PR — UNLESS the founder (Moatez) explicitly directs the change, OR the element was demonstrably broken (regression bug, not architectural preference). ADD to existing work. Extend, don't replace.
- **No `Co-Authored-By` trailers** — already stated, repeating because it keeps slipping.

## Vocabulary lock — Servyou-specific terms

The platform is FR-first with AR parity. Use these locked translations (do NOT translate independently):

- "Dashboard" → **Tableau de bord** (FR) / **لوحة التحكم** (AR)
- "Services" → **Mes services** / **خدماتي**
- "Projects" → **Mes engagements** (NOT "Projets" — see design system Section 6.1)
- "Proposals" → **Mes propositions** / **عروضي**
- "Earnings" → **Mes revenus** / **أرباحي**
- Full vocabulary table in `servyou-design-system-reference-v1.md` Section 6.

## Reference docs in project knowledge (read on demand)

Cite these by section number in commit bodies:

| Doc | Use for |
|---|---|
| `servyou-design-system-reference-v1.md` | Tokens, components, page patterns, vocabulary, migration plan |
| `servyou-standards-reference.md` | WCAG 2.2 AA, Core Web Vitals, OWASP Top 10:2025, form UX, internal standards |
| `servyou-freelancer-world-class-spec.md` | Freelancer fields per specialty, phase mapping |
| `servyou-freelancer-tools-accounts-spec.md` | Tools + accounts catalog per specialty |
| `data-model.md` | Tables, RLS, lifecycle triggers |
| `engineering-standards.md` | Code conventions, file structure |
| `roadmap.md` | Phase plan, what ships when |

## Skills available in `.claude/skills/`

Load conditionally per task. Index: `.claude/skills/README.md`.

- `servyou-design-system-compliance` — UI work, CSS, components
- `servyou-i18n-vocabulary-lock` — strings, labels, translations
- `servyou-visual-gate` — pre-merge UI walkthrough
- `servyou-phase-aware-features` — widgets, stats, dashboards
- `servyou-discovery-first-migration` — schema changes

## When in doubt

Ask Moatez (the founder). Do not invent product decisions. Do not assume design preferences. Do not skip discovery to save time.

## Additional rules carried forward from v1 CLAUDE.md

### Testing discipline
- **Vitest** is the locked test framework. One real test for anything with real logic.
- **Must-test:** auth paths, RLS policies, business-rule logic, data-integrity logic, security-sensitive transformations.
- **May-skip:** UI rendering, layout, i18n strings, mechanical refactors.
- Coverage thresholds are rejected — they corrupt what gets tested.
- **Definition of Done (11):** (1) discovery approved before code; (2) scope matches, no opportunistic refactors; (3) `npx tsc --noEmit`, `npm run lint`, and `pnpm build`/`npm run build` all green locally — Next 16 dropped auto-lint-at-build, so `npm run lint` must be run explicitly; it is not caught by build and is otherwise only enforced in CI, which has no branch-protection gate on this repo, so a red lint run silently doesn't block anything unless checked here; (4) test suite passes; (5) tests added for must-test code; (6) diff read against scope; (7) PR body = What ships / Changes / Decisions / Out-of-scope / Verification / Followups; (8) agent report made; (9) Vercel green; (10) manual click-through (sanity check for mechanical refactors); (11) founder approves merge.

### Security & data specifics (the DB is the source of truth for rules)
- Never destructure only `data` from a Supabase call — capture and surface `error`; never a silent empty list.
- RLS gates **rows, not columns.** Sensitive columns (phone, email, date_of_birth) stay owner-only.
- Cross-user reads: `public_profiles` view (name/city) + `get_contact_phone(target)`. Never join through freelancer_profiles for contact data. **Never add phone/email/date_of_birth to `public_profiles`** — its protection IS its SELECT column list.
- Every business rule (fairness caps, age 18+ to sell, one seller capability) enforced in the DB (constraint/trigger/RLS), not only app code.
- Money: `numeric(10,2)` in TND. Stock: `tracks_stock` + `stock_count` (`tracks_stock=false` = "Toujours disponible").
- `seller_type`: null = consumer; `'shop_owner'` or `'freelancer'`, never both; switching deletes own role content but preserves completed transactions.
- Migrations: every one presented for approval before applying. Never auto-apply; never "don't ask again."

### MVP scope & market anchors
- **In MVP:** identity; categories + RLS skeleton; shop owners; freelancers; consumer discovery + requests (COD + WhatsApp); favorites; job-posting (caps ~10/post, ~5 active/freelancer); FR + AR with RTL; admin dashboard + reports + stats; polish/launch.
- **Deferred to Phase 3+:** in-platform card payments, subscriptions, escrow, reviews/ratings, full notifications, AI agents, freelancer↔freelancer collaboration, full liberal-pro / small-company templates, saved addresses, social/connections.
- **Tunisia anchors:** 12.3M pop, 84.3% internet; COD = 56–80% of e-commerce; mobile-first 70%+; sellers concentrated in 7 cities (Ariana, Tunis, Ben Arous, Manouba, Sfax, Sousse, Bizerte); avg cart 173 TND. Use documented Pillar 4 patterns, not invented personas.
