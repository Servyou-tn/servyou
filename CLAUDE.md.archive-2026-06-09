# Servyou — Project Rules for Claude Code

## Required Reading Before Any Task

Before writing any line of code, running any migration, or making any
architectural decision in this session, read the relevant foundation
documents in this priority order:

1. The two cross-cutting reference documents (read first, every time):
   - docs/project-overview.md — the 10-stage platform-building
     lifecycle, the WHEN. Tells you which stage Servyou is in and
     what the requirements of that stage are.
   - docs/platform-pages-and-system.md — the complete page anatomy
     and system architecture, the WHAT. Tells you what surfaces
     belong on a marketplace platform and how the layered
     architecture (database → auth → application → frontend) ties
     them together.

2. The Servyou-specific foundation documents (read next, as relevant
   to the current task):
   - docs/product.md — who Servyou serves: users, roles, and journeys
     (replaces former Layer 1/2/3 + Pillar 4)
   - docs/data-model.md — database schema and the security rules in it
     (replaces former Layer 4/5)
   - docs/architecture.md — the stack and architecture principles
     (replaces former Layer 6 + Pillar 1 §1.8)
   - docs/engineering-standards.md — engineering discipline and coding standards
     (replaces former Pillar 1 §§1.2–1.7)
   - docs/roadmap.md — the phased build sequence and current state
     (replaces former Pillar 6 + Layer 7)

3. The operational rules in this CLAUDE.md file itself — the migration
   approval gate, the locked strategic sequence, the inspiration sources
   for design Pillars, and the engineering discipline summary.

The reading order matters. The two cross-cutting reference documents
are the freshest and most comprehensive shared mental model; they
override stale assumptions from training data or earlier conversation
context. The Servyou-specific documents narrow the framework to the
particular platform being built. CLAUDE.md captures the operational
rules that govern how the work proceeds.

This rule is non-negotiable. If a task is proposed without first
grounding it in the relevant documents, the response is to stop and
read first, then propose the task with proper grounding.

## Source of truth
The seven foundation documents (project-overview, platform-pages-and-system, product, data-model, architecture, engineering-standards, roadmap) under `docs/` are the source of truth for what Servyou is and how it is built. Always follow them. Discard any older instructions that contradict them.

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

Pillar 1 is the engineering foundation under everything Servyou builds. The full content now lives in `docs/engineering-standards.md` (the engineering rules and architecture principles), with the architecture rules formerly in §1.8 in `docs/architecture.md`. This summary is the operational essence for day-to-day work; those documents are the authoritative reference when a decision needs depth.

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

Read the full `docs/engineering-standards.md` (and `docs/architecture.md` for architecture rules) when:
- A decision touches partner integrations (Konnect, delivery, banks, government APIs)
- A decision touches compliance, legal documents, or institutional partnerships
- A decision changes the architectural shape (new backing service, new infrastructure)
- A decision touches security operations, secrets, or incident response
- A judgment call on testing depth or quality discipline is needed
- Coding-convention specifics are needed beyond the operational essentials above
- An evaluator, partner, or judge is requesting documentation about Servyou's standards

The full document is the authoritative reference. This summary is the operational essence for day-to-day decisions.

### Relationship between this summary, Pillar 1, and CLAUDE.md's other sections

This summary connects Pillar 1 (the strategic foundation in `docs/`) to the rest of `CLAUDE.md` (the operational rules earned through real PRs). The Engineering Discipline section elsewhere in this file holds the day-to-day operational rules — verify before rebuilding, surface every Supabase error, manual click-through as part of done, no Co-Authored-By, the migration approval gate. Pillar 1 is the strategic layer behind those rules. They are designed to be read together and to stay synchronized.

When a new operational rule earns its place in CLAUDE.md through experience, Pillar 1 is reviewed to confirm the rule fits within its standards. When Pillar 1 is updated, CLAUDE.md is reviewed to confirm the operational rules still serve those standards. Neither is the master; together they form the complete picture.

Pillar 1 is locked. Pillars 2-6 (Design System, Brand, Target Users, Marketing, Roadmap) build on this foundation in subsequent sessions of the same discipline.

## Pillar 4 — Target Users and Market (Operational Summary)

Pillar 4 locked in commit `5588d39`. Layer updates: Layer 4 (`db0a6ad`), Layer 3 (`6d05a07`), Layer 2 (`463b13d`). Pillar 1 cross-reference: `29e7e40`.

### Four Founder-Contributed Principles

The named principles Servyou is built on:

1. **The headroom principle** (Pillar 1 §1.8.3) — every architectural choice sized for 3-5x today's expected load.
2. **The Plan-A-B-C principle** (Pillar 1 §1.8.4) — load-bearing systems have three plans per scale-stage, capable of running in parallel.
3. **The Unified Workspace Principle** (Pillar 4 §4.8) — each user type's workspace is built with the seriousness tomorrow's larger user types deserve to find. Today's freelancer foundation supports tomorrow's liberal professionals.
4. **The Configurable Workspace Principle** (Pillar 4 §4.10) — Servyou provides building blocks; each user fills in what is true for them. Non-core profile fields are optional by default.

**Operational rule:** when designing schema changes or UI, verify the change respects these four principles. Make new profile fields optional unless they are universal identity (name, email, date of birth, city, language).

### Schema Migrations from Pillar 4 Appendix A — applied

These schema additions, formerly tracked here as "pending," are all applied to production. The shop-owner profile expansion (`shop_type`, `delivery_setup`, `working_hours`, `location_detail`, plus the `shop_payment_methods` and `shop_categories` child tables) shipped in PR-E; the freelancer profile expansion (`working_hours`, `current_workplace`, `preferred_payment_method`, plus `freelancer_tools`, `freelancer_education`, `freelancer_certifications` child tables) shipped in PR-F; the orders-table lifecycle expansion (8-value status, `cancelled_by`, `cancellation_reason`, `received_at`, and the buyer-cancellation-history view) shipped in the orders lifecycle PRs. Schema is complete through migration 32 — see `db/migrations/` and `docs/data-model.md` for the source of truth.

### Pillar 4 COD Friction-Reduction Features (Pillar 4 §4.14)

Three MVP features locked, requiring UI work in Phase 9 or earlier coding phases:

1. **Order status lifecycle transparency** — both buyer and seller see the same status at the same time. Seller dashboard shows lifecycle-aware action buttons (Accept → Prepare → Dispatch → In Delivery → Arrived). Buyer "My Requests" page shows progression. Service orders skip middle delivery states (accepted → arrived → received directly).

2. **Cancellation discipline** — pre-dispatch (pending/accepted/prepared) free for buyer; post-dispatch (dispatched/in_delivery/arrived) requires stated reason logged on buyer's record. UI presents "Cancel" vs "Cancel with reason" appropriately.

3. **Receipt confirmation** — when order reaches `arrived`, buyer confirms in app, status moves to `received`, `received_at` timestamp set. Order does not close without buyer confirmation. Disputes resolved by admin with structured evidence (lifecycle history + received_at + cancellation reasons).

### Dropshipping Scope (Layer 2 §2.4)

**MVP: domestic-only.** Tunisian dropshippers sourcing from Tunisian suppliers, fulfilling Tunisian buyers' orders. The `shop_type` value `'dropshipper'` is reserved for this case.

**Out of MVP scope:** International dropshipping (China, Turkey, AliExpress, foreign suppliers). Adding it later requires cross-border customs/payment/trust infrastructure and a new `shop_type` enum value (e.g., `'international_dropshipper'`).

**Post-MVP integration trajectory:** Tunisian dropshippers run business across Converty + AliExpress + Shopify + WhatsApp/email. Servyou's value is *integration, not replacement*. Connector integrations sequence through carriage-and-horses stages: MVP no connectors → post-launch Converty integration first (most common Tunisian platform, bounded cost) → collaboration scale international connectors with regulatory infrastructure. Each connector requires its own Step 0 discovery, technical due diligence, founder approval. Final sequencing decided in Pillar 6 (Roadmap, not yet written).

### Locked Strategic Sequence

**Step 1 — Engineering track (continues from now):**
- Pillar 6 (Roadmap) — engineering/business sequencing, deep work in fresh session
- Phase 8 Subtask 3 — Arabic translations (`ar.ts`), needs fluent Tunisian Arabic reader
- Phase 9 — Admin dashboard + reports + statistics (most security-sensitive remaining phase)
- Phase 10 — Polish + Sentry + Turnstile + lawyer review of legal docs (FR + AR)
- Pillar 4 Appendix A schema migrations — applied through migration 32 (see `db/migrations/`)

**Step 2 — User-facing Pillars (deep focused work, fresh sessions only):**
- Pillar 5 (Content and Marketing Strategy) — social, ads, content positioning
- Pillar 3 (Brand and Visual Identity) — colors, typography, voice
- Pillar 2 (Design System and UX Principles) — components, layouts, mobile-first

**Locked: Pillars 5/3/2 do NOT mix with same-day backend coding.** Brand/design/marketing decide whether Servyou succeeds against competitors (Converty, Jumia Tunisia, MyTek). They deserve fresh focus, not engineering-tired energy.

**Founder-locked inspiration sources for Pillars 5, 3, 2** (recorded from session conversation, for future sessions):
- **Shopify** — shop owner dashboard elements (product management, order pipeline, stock tracking, analytics, the professional e-commerce backend feel)
- **Upwork** — freelancer dashboard elements (service catalog, project tracking, client communications, proposals, portfolio presentation)
- **Webflow** — visual design language, typography systems, the designed-by-designers polish
- **Framer** — motion design and interaction patterns, smooth transitions, micro-interactions, modern web feel
- **Pinterest** — visual discovery, grid layouts, image-heavy browsing UX

Pillar 2 must lock **standard design rules** before the redesign pass starts: design tokens (colors, typography scale, spacing scale), component patterns, mobile-first behavior, RTL behavior, WCAG 2.2 AA compliance per Pillar 1 §1.2.4. The brand, marketing, and design Pillars are not small — they are the biggest case for Servyou's success against competitors and require dedicated fresh-session work, not end-of-day energy.

**Step 3 — Apply design + launch (the last steps):**
- Redesign pass: rebuild UI of coded pages per locked Pillar 2 design system
- OVH domain purchase
- Production launch

### Pattern Approach (not Personas)

Pillar 4 §4.4 uses pattern-based audience description, NOT personas. **Operational rule:** when adding user-facing copy, UI element, or feature, reference documented patterns in Pillar 4 §4.4 (consumer patterns, shop owner patterns concentrated in 7 cities, freelancer patterns including UGC creators). Do NOT invent personas not anchored in Pillar 4 sourced market data.

### Tunisia 2026 Anchor Data (Pillar 4 §4.2)

When coding decisions involve assumptions about user behavior, check these locked numbers first rather than guessing:

- 12.3M population, 84.3% internet penetration (10.4M users), 71% Facebook penetration
- 56% of internet users shop online, 49.2% monthly, avg cart 173 TND
- COD = 56-80% of all e-commerce transactions (vs 7% world average)
- Mobile-first: 70%+ of e-commerce traffic
- Sellers concentrated in 7 cities: Ariana, Tunis, Ben Arous, Manouba, Sfax, Sousse, Bizerte
- Fashion/lifestyle leading category, tech sector = 7.5% GDP
- 1,040+ startups, 82 tech institutions feeding the freelancer talent pool

These numbers anchor every product decision back to actual Tunisian reality, not assumed reality.

## Platform-Building Framework (Project Overview Reference)

Servyou is being built within a general platform-building framework that maps cleanly onto its ten-stage lifecycle, documented in full at `docs/project-overview.md`. The framework is generic and applies to any digital platform; this section captures only how it intersects with the current state of Servyou and what it implies for Claude Code's decisions during sessions.

The ten stages are: (1) the idea and the problem, (2) validation before building, (3) the foundation documents, (4) the MVP, (5) technical architecture decisions, (6) the design system, (7) pre-launch checklist, (8) launch and first users, (9) the build-measure-learn loop, (10) scaling readiness.

Servyou's current position: late Stage 4 (MVP construction) with most of Phases 1-7 done and the Pillar 4 §4.14 features (8-value order lifecycle, cancellation discipline, receipt confirmation) and Layer 4 Appendix A schema additions remaining. The genuine remaining MVP work all sits behind one schema migration session that unlocks five features at once. Stage 5 architecture decisions are locked (Next.js + Supabase + Vercel + Tailwind, modular monolith, justified complexity per Pillar 1). Stage 6 (design system) is deliberately deferred to its own dedicated multi-week phase after backend work completes, per the locked strategic sequence. Stage 7 (pre-launch checklist) items are partially in motion (Sentry and Cloudflare Turnstile are filed for Phase 10, legal documents require Tunisian lawyer review).

What this framework implies for Claude Code sessions:

The schema migration is the gate that unlocks the last batch of Stage 4 features. It deserves its own focused session with full Step 0 discovery, founder explicit per-migration authorization, and manual click-through verification. Migrations are never bundled with feature work and never run silently. The migration approval gate locked in CLAUDE.md takes precedence over any tool capability that appears available.

The design system is not a parallel-track task that fits between coding sessions. It is multi-week dedicated work measured against the three-layer token architecture (primitive → semantic → component), the 8-point grid foundation, real device testing in French LTR and Arabic RTL, and inspiration sources locked separately (Shopify, Upwork, Webflow, Framer, Pinterest). Claude Code does not improvise design system decisions during feature work and does not suggest UI polish features as substitutes for the genuine remaining backend work.

The build-measure-learn loop begins after launch, not before. Pre-launch, the discipline is to complete the launch readiness gate in Pillar 6 §6.2.7 without skipping items. Post-launch, the roadmap shifts to Now/Next/Later prioritized by real user signal, not founder intuition or competitor comparison.

For full framework context, read docs/project-overview.md.

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
