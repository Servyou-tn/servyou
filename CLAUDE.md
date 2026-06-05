# Servyou — Project Rules for Claude Code

## Source of truth
The seven layer documents (Vision, Users & Roles, Features & Journeys, Data Model, Security, Technical Architecture, Build Plan) in the project knowledge are the definitive specification for Servyou. Always follow them. Discard any older instructions that contradict them.

## What is IN the MVP (per Build Plan phases 1-10)
- Phase 1: Identity (signup, login, logout, password reset, profile editing) — DONE
- Phase 2: Categories + full DB skeleton with RLS — DONE
- Phase 3: Shop owners (upgrade, shop, products, public shop page) AND freelancers (upgrade, profile, skills, services, public freelancer page) — DONE
- Phase 5: Consumer discovery and requests with COD + WhatsApp — DONE
- Phase 6: Favorites (heart icon, /mes-favoris) — IN THE MVP
- Phase 7: Job-posting system (consumer posts, freelancer responses, ~10 responses/post cap, ~5 active responses/freelancer cap, proposal messages)
- Phase 8: French + Arabic with RTL (French built first, Arabic translated from finished French)
- Phase 9: Admin dashboard + reports as real case-handling with loop-closing + aggregate anonymous stats
- Phase 10: Polish and launch

## What is DEFERRED to version two (not the MVP)
In-platform card payments, subscriptions, escrow, reviews/ratings, full notification system, AI agents/subagents, freelancer-to-freelancer collaboration, full liberal-professional templates, small-company templates, deep COD-failure solutions, saved delivery addresses on profiles, complex profile customization, LinkedIn-style connections/endorsements, social feeds.

## Working rules
- Build basic-first in every phase: minimal working version before enriching it
- Function-first: features must work correctly; full UI/UX polish is a separate dedicated phase later
- One feature per branch, PR workflow: feature/<name> branch → push → Vercel green → merge → delete branch → sync main
- One real test for anything with real logic (auth, data writes, role/state changes); pure display pages can rely on the green build check
- Verify-don't-assume: confirm features actually work, with a database check or a real user action, before merging
- French is the default UI language; Arabic comes in Phase 8

## Commit style
- NEVER include "Co-Authored-By" or any Claude/Anthropic attribution in commits
- Clear, descriptive commit messages
- Do NOT commit .env.local or .claude/

## Code & data rules
- NEVER use the Supabase service role key in client code; only the publishable (anon) key in browser code
- All tables have RLS; never bypass it in app code
- A database trigger handles new-user profile creation; signup pages do NOT insert into profiles directly
- Money is stored as numeric(10,2) in TND
- Stock model: tracks_stock + stock_count (dropshipping-friendly: tracks_stock=false means "Toujours disponible")
- seller_type: null = consumer (universal buying baseline); 'shop_owner' or 'freelancer' for sellers; never both; switching deletes own role content but preserves completed transaction records
- Image storage uses Supabase Storage public buckets for display images only

## PILLAR 1 — ENGINEERING STANDARDS (operational summary)

Pillar 1 is the engineering foundation under everything Servyou builds. The full document lives at `docs/pillar-1-engineering-standards.md` (~880 lines, seven sections). This summary is the operational essence for day-to-day work; the full document is the authoritative reference when a decision needs depth.

### The four external standards Servyou aligns to

1. **OWASP Top 10:2025** — application security. Most relevant operationally: A01 (Broken Access Control → enforced by Layer 5 RLS), A02 (Security Misconfiguration → env-var discipline), A03 (Software Supply Chain → dependency audit posture), A09 (Logging/Alerting Failures → Sentry parked for Phase 10), A10 (Mishandling Exceptional Conditions → the "never destructure Supabase response without capturing error" rule).
2. **Tunisia's Loi organique 2004-63 + GDPR Article 5** (the seven principles). Most relevant: data minimization, purpose limitation, storage limitation, privacy by default. Frankfurt hosting is a cross-border transfer requiring INPDP authorization before scale.
3. **Google Engineering Practices + Twelve-Factor App** — code quality and cloud-native architecture. The senior code-review principle: *"favor approving once it definitely improves overall code health, even if not perfect."*
4. **WCAG 2.2 Level AA** — accessibility. Hard constraints: 4.5:1 color contrast (normal text), 3:1 (large text), 24×24 CSS pixel touch targets, every input has an associated label (never placeholder alone), every meaningful image has alt text.

### The growth principle: carriage and horses

Every commitment in Pillar 1 is named at the **scale-stage** where it comes online. Five stages: **Today** (solo MVP build) → **Pre-launch** (Phase 10 polish before opening) → **Post-launch growth** (first 1000 active users) → **Collaboration scale** (Ministry, banks, Konnect) → **Cup-and-international scale** (2027 cup, California world stage). The horses get added as the carriage grows. Do not impose collaboration-scale operational weight on today's solo founder; do not constrain tomorrow's Servyou by today's lighter posture.

### Two founder-contributed architectural principles

**The 3-5x headroom principle.** Every architectural choice today is sized so the platform can comfortably handle three to five times today's expected load without architectural changes. Before any decision is locked, ask: *at 3-5x today's load, does this still work?* If no, reconsider.

**The Plan-A-B-C principle.** For load-bearing systems — the data layer (Supabase Postgres) and the application engine (Next.js on Vercel) — three plans exist in advance, calibrated per scale-stage. Plan A is today's runtime. Plan B is the immediate fallback/upgrade, pre-evaluated, ready in hours not weeks. Plan C is the longer-term scaling path. **Plans can run in parallel** under real stress — Plan A does not have to fail before Plan B activates. Auxiliary capabilities (payments, delivery, search, caching) are evaluated when they come online, not pre-planned to A/B/C depth.

### Operational essentials from each section

**Section 1 (anchors)** — the four standards above, applied to every decision.

**Section 2 (coding standards)** — TypeScript strict mode everywhere (no `.js` files added). Naming: `camelCase` vars/functions, `PascalCase` components/types, `kebab-case` route folders, `SCREAMING_SNAKE_CASE` constants. Server component is the default; `'use client'` only when interactivity actually requires it. **Vitest is the locked test framework.** Branch naming: `feature/<phase>-<short-name>`, `fix/<short-name>`, `docs/<short-name>`. Commits in imperative mood, no Co-Authored-By tags. Three-channel error handling: inline UI for user errors, `console.error('[Context]', error)` for programmer bugs, error boundaries for system faults.

**Section 3 (security operations)** — All secrets in a dedicated, encrypted password manager (single source of truth, not named in any public document). Env vars in three categories: public `NEXT_PUBLIC_*`, server-only (default), build-time. Service role key NEVER in browser code. Pre-launch five-tool stack: **Sentry** (error monitoring, PII scrubbed via `beforeSend`), **Cloudflare Turnstile** (bot protection on `/signup` and `/login`), **`npm audit`** (release-blocking on critical/high CVEs), **Vercel built-in monitoring**, **Supabase built-in audit logs**. Incident response order (locked): contain → assess → notify users → notify INPDP within 72h → fix → postmortem.

**Section 4 (architecture rules)** — Minimalism principle: don't build until a real observed problem demands it. Backing services: Supabase only today; pre-evaluated triggers for adding dedicated search (>200ms search latency at p95), dedicated job queue (Supabase Edge Functions insufficient), dedicated cache (observed DB load). Apply the 3-5x headroom principle to every decision. Apply Plan A/B/C to data layer and application engine. **Build is the default, Buy only when it's a real case.**

**Section 5 (quality discipline)** — The five-step checkpoint pattern is the **standard rhythm of every substantive PR, non-negotiable**: Step 0 discovery (report what exists, get approval before writing code) → Step 1 implementation (against agreed scope, no expansion) → Step 2 local verification (`npm run build` + tests pass + diff reviewed) → Step 3 agent report (stop and report before push) → Step 4 founder manual click-through (in browser, on real device). One explicit exception: mechanical refactors with zero behavior change can shortcut Step 4 to a brief sanity check. Steps 0-3 always apply.

**Must-test categories**: auth paths, RLS policies, business-rule logic, data-integrity logic, security-sensitive transformations. **May-skip categories**: UI rendering, layout, i18n strings, mechanical refactors. **Coverage thresholds are permanently rejected** — they corrupt what gets tested. Verify-before-rebuild discipline: read before writing, ask before destroying, surface what is found. Manual click-through is a quality gate, not a nicety.

**The 11-item Definition of Done** (a PR is not finished until all 11 are true):
1. Step 0 discovery report made and approved before code
2. Implementation matches agreed scope (no expansion, no opportunistic refactors)
3. `npm run build` succeeds locally
4. Full test suite passes
5. New tests added for any code in must-test categories
6. Diff read by implementer against original scope
7. PR description follows structure: What this ships / Changes / Decisions / Out-of-scope / Verification / Followups
8. Step 3 agent report made and reviewed
9. Vercel deployment green
10. Manual click-through complete (or brief sanity check for mechanical refactors)
11. Founder has explicitly approved the merge

**Section 6 (external integrations)** — Every partner integration lives in a bounded module at `src/lib/integrations/<partner>/` with four pieces: client, types, adapter, tests. Business logic calls the *adapter*, never the partner client directly. Webhook discipline (signature verification + idempotency + 5-minute replay window + fast response + safe logging) is locked before any partner webhook goes live. Outbound API discipline: explicit timeouts (10s default), respect rate limits, exponential-backoff retry (1s→2s→4s, max 30s, max 3 retries), circuit breakers for degraded partners. **PCI rule, locked: Servyou never sees, stores, transmits, or logs raw card data (PAN, CVV, expiration).** All card data flows directly user→processor (Konnect's hosted-page model). Servyou may store: transaction IDs, amounts, statuses, masked last-four for display only.

**Section 7 (compliance and legal)** — All four published legal documents (Privacy Policy, Terms of Service, Accessibility Statement, Cookie Policy) in French and Arabic, **reviewed by a Tunisian lawyer before publication** — release-blocking gate, non-negotiable. INPDP declaration filed within 90 days of first real users. Frankfurt cross-border authorization obtained before the startup-label application. Startup-label application filed roughly 6-9 months after launch, calibrated to real growth metrics and regulatory foundations being in place. **Certifications pursued by purpose**: align with ISO 27001 from day one, formally certify only when a specific partnership requires it.

### When to read the full Pillar 1 instead of this summary

Read the full document at `docs/pillar-1-engineering-standards.md` when:
- A decision touches partner integrations (Konnect, delivery, banks, government APIs) → Section 6
- A decision touches compliance, legal documents, or institutional partnerships → Section 7
- A decision changes the architectural shape (new backing service, new infrastructure) → Section 4
- A decision touches security operations, secrets, or incident response → Section 3
- A judgment call on testing depth or quality discipline is needed → Section 5
- Coding-convention specifics are needed beyond the operational essentials above → Section 2
- An evaluator, partner, or judge is requesting documentation about Servyou's standards → reference the full document by section number

The full document is the authoritative reference. This summary is the operational essence for day-to-day decisions.

### Relationship between this summary, Pillar 1, and CLAUDE.md's other sections

This summary connects Pillar 1 (the strategic foundation in `docs/`) to the rest of `CLAUDE.md` (the operational rules earned through real PRs). The Engineering Discipline section elsewhere in this file holds the day-to-day operational rules — verify before rebuilding, surface every Supabase error, manual click-through as part of done, no Co-Authored-By, the migration approval gate. Pillar 1 is the strategic layer behind those rules. They are designed to be read together and to stay synchronized.

When a new operational rule earns its place in CLAUDE.md through experience, Pillar 1 is reviewed to confirm the rule fits within its standards. When Pillar 1 is updated, CLAUDE.md is reviewed to confirm the operational rules still serve those standards. Neither is the master; together they form the complete picture.

Pillar 1 is locked. Pillars 2-6 (Design System, Brand, Target Users, Marketing, Roadmap) build on this foundation in subsequent sessions of the same discipline.

## Engineering Discipline (earned during the build — do not violate)

### Before building anything
- Read the relevant layer docs (Layers 1–7) for the feature first. Verify existing
  tables, columns, and RLS against Layer 4 and Layer 5. Report any drift.
- This is a features-on-existing-schema project, NOT a fresh build. Do NOT recreate
  or rebuild tables that already exist. Verify, don't rebuild.
- Stay in scope. Build only what the current task names. Flag anything that looks
  like scope creep and wait for confirmation.

### Supabase queries
- NEVER destructure only `data` from a Supabase call. Always capture `error` and
  surface it (console.error at minimum; show a real error state, never a silent
  empty list). A swallowed error once hid a real bug for a day on /mes-missions.
- RLS gates ROWS, not columns. You cannot make some columns public and others
  owner-only with one table policy. Sensitive columns (phone, email, date_of_birth)
  stay owner-only.
- To read ANOTHER user's data: use the `public_profiles` view for name/city, and
  `get_contact_phone(target)` for phone. Never invent a nested PostgREST join
  through freelancer_profiles, and never read phone/email/dob directly across users.
- The protection of `public_profiles` lives entirely in its SELECT column list.
  NEVER add phone, email, or date_of_birth to that view.

### The database is the source of truth for rules
- Every business rule (fairness caps, age 18+ to sell, one seller capability) and
  every sensitive-data permission MUST be enforced in the database (constraint,
  trigger, or RLS) — not only in app code. App checks are for friendly messages;
  the DB is the real guard.

### Migrations
- Present EVERY migration for human approval before applying. Never auto-apply to
  the live database. Never "don't ask again."

### Shipping
- Run `npm run build` locally before pushing — not just `next dev`. `next dev` skips
  the strict TypeScript check that `next build` and Vercel run; a type error it
  ignored once failed the Vercel deploy.
- One branch per feature. PR against main. Wait for the Vercel GREEN check before
  merging — never merge on a red or pending check.
- One real test for anything with real logic. No Co-Authored-By in commits.
- Function-first: UI/UX polish is a dedicated later phase, not now.
