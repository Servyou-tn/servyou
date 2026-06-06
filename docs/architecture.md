# ARCHITECTURE — THE STACK AND THE PRINCIPLES BEHIND IT

This is the single source of truth for how Servyou is built and why those choices are appropriate for a solo developer at MVP scale, with room to grow. It replaces the original Layer 6 (Technical Architecture) and Pillar 1 §1.8 (Architecture Rules) documents.

## The stack

Servyou is built on a deliberately small, modern, proven stack. Each piece is chosen for a clear reason; nothing is added for fashion.

**Frontend and application layer.** Next.js (App Router) with TypeScript, Tailwind CSS for styling. Server components by default, client components only where interactivity requires it. Internationalization in French and Arabic with RTL layout support for Arabic.

**Database and authentication.** Supabase (managed PostgreSQL) for both the schema and the auth flow. Row Level Security is enabled on every table. Auth uses Supabase's hosted email/password flow with verification.

**Hosting and CI.** Vercel for the application, with preview deployments on every pull request and automatic production deploys from `main`. Supabase is the database backbone, hosted in eu-central-1 Frankfurt (closest region to Tunisia).

**Source control.** GitHub, in the Servyou-tn organization. The repository is private until launch. Branch protection on `main`. Pull requests with green CI required for merge.

**AI-assisted development.** Claude (in claude.ai chat) for foundation document work, schema reasoning, and architectural decisions; Claude Code in the local VS Code terminal for code execution and git operations; Supabase MCP for direct database migrations from the chat. Each tool has a clear role and they do not duplicate each other.

That is the stack. Everything else is opinionated additions that the platform deliberately does not have yet — see the principles below.

## How the pieces connect

A user opens the Servyou web app in their browser. Next.js serves the page from Vercel's edge network. If the user is authenticated, Next.js reads their session token (stored in an HTTP-only cookie) and uses it to make Supabase requests on the user's behalf.

Supabase receives the request, identifies the user via the JWT, and applies Row Level Security policies before returning data. Every query goes through RLS — there is no "admin escape hatch" in the application layer. If the user is not allowed to see a row, the row is not in the response. If the user tries to mutate a row they cannot mutate, the mutation is rejected with a clear error.

Database triggers run on `BEFORE INSERT` and `BEFORE UPDATE` for tables that need business-rule enforcement beyond simple ownership checks. The trigger functions use SECURITY DEFINER to run with elevated privileges; their internal logic re-applies the rules. Trigger rejections surface as `RAISE EXCEPTION` errors in French, which the application displays directly to the user.

For media (shop logos, banners, freelancer portfolio images, service samples), the URL approach is used at MVP — sellers paste a URL from an existing hosting service they already use. Supabase Storage is reserved for a later phase when the platform's media volume justifies its own bucket and CDN configuration. This is the Headroom Principle applied to storage: deliberately add the complexity only when needed.

Webhooks, queues, and background jobs are deliberately not part of the architecture at MVP. Background concerns (job-post expiry, for instance) are handled by lazy evaluation on read rather than by scheduled jobs. A job post that's past 30 days is not marked expired by a cron — its `created_at + 30 days` is checked when the post is read or responded to, and the response is rejected at that point.

## The layered model

When reasoning about a problem, Servyou separates concerns into four conceptual layers, from deepest to most visible.

**Layer 1 — Database (Supabase, PostgreSQL).** Tables, columns, constraints, indexes, foreign keys, RLS policies, triggers, SECURITY DEFINER functions. This is the foundation. Everything else depends on it. The schema is the source of truth; the application follows it.

**Layer 2 — Auth and identity (Supabase Auth).** Users, sessions, password hashing, email verification. The `auth.users` table is Supabase's; the `public.profiles` table is Servyou's universal identity, foreign-keyed to it.

**Layer 3 — Application (Next.js, TypeScript).** Server components for data fetching, client components for interactivity, route handlers and server actions for mutations. The Supabase JS client carries the user's JWT through every request; RLS does the gating.

**Layer 4 — Frontend (UI, Tailwind, i18n).** What the user sees and clicks. The frontend is a faithful surface over the application layer; it does not contain business logic that isn't also enforced in the database.

A request originating from a user click flows downward through these layers. A response flows back upward. The discipline is: **every business rule must be enforceable at Layer 1 (the database).** Layer 3 and Layer 4 may also implement convenience for the user — disabling a button that would obviously fail, showing only relevant options based on state — but the database must reject any operation that violates a rule, regardless of what the application sent.

## The architecture principles

Four named principles govern Servyou's architectural choices. They were committed during the foundation work and they shape every decision about what to add and what not to add.

### The Minimalism Principle

Servyou's architecture starts with the smallest possible footprint that delivers the MVP, and adds complexity only when concrete evidence requires it. Each piece of the stack must justify its inclusion by what it does today, not by what it might do someday.

The platform deliberately does not have at MVP:
- Background job queues (no Bull, no Sidekiq, no Cloud Tasks). Lazy evaluation on read covers what little background work exists.
- A Redis cache or any cache layer. Postgres is fast enough for current scale.
- Microservices. The application is a single Next.js codebase served from a single Vercel deployment.
- Custom infrastructure on AWS or GCP. Vercel and Supabase are the managed services that cover all hosting needs.
- A CDN beyond what Vercel provides natively.
- Analytics infrastructure (Mixpanel, Amplitude, Segment). Privacy-respecting Vercel analytics is the only telemetry at MVP.
- Error monitoring (Sentry). Added in Phase 10 polish, deliberately, not now.
- Bot protection (Cloudflare Turnstile). Added in Phase 10 polish before public launch.

Each of these is an active choice. When concrete evidence at scale requires one of them, it is added deliberately with a focused PR, not pre-emptively because "real platforms have it."

### The Backing Services Model

Each external service Servyou depends on (Supabase for database and auth, Vercel for hosting and CI, GitHub for source control) is treated as a *backing service* — a replaceable component reached through a clean interface. No code is written that hard-codes assumptions specific to one provider beyond what the provider's standard API requires.

This is not because Servyou plans to migrate — Supabase, Vercel, and GitHub are excellent choices and there is no immediate switching pressure. The discipline matters because backing-service thinking *forces clean interfaces*. When the database is treated as "the database we happen to use today," code is written that respects database boundaries. When the database is treated as "Supabase forever, we'll lean on whatever it gives us," subtle coupling sneaks in. The first approach scales; the second creates technical debt that becomes painful when the platform grows.

In practice: database access happens through the Supabase JS client, but the SQL it sends is portable. Schema migrations are written as standard PostgreSQL SQL, not Supabase-flavored migration files. Auth is Supabase Auth, but the application reads `auth.uid()` and doesn't depend on Supabase-specific session internals. Vercel-specific features (edge functions, image optimization) are used where they help but are not load-bearing — the app would still work on any Node.js host.

### The Headroom Principle

Servyou is built today for today's scale (zero users, zero load, a solo developer), but every architectural decision leaves *headroom* for tomorrow's scale. The carriage is sized for one horse today, but the harness fits two.

In practice: the schema uses UUID primary keys rather than auto-incrementing integers, because UUIDs scale across distributed databases later without coordination. The frontend is structured with server components and route segments that support code splitting and edge caching even though those are not yet exercised. The image strategy is URL-based today, but `image_url` columns are nullable text and a Storage migration is a clean addition rather than a schema rewrite. The auth flow uses Supabase's standard JWT pattern, so when SSO or social auth is added, it slots into the existing flow.

Headroom is **not** premature optimization. Premature optimization is adding a Redis cache because someone said you should. Headroom is choosing a UUID over an integer at zero cost. The distinction: headroom is *free or cheap* and *removes future constraints*; premature optimization is *expensive* and *adds present complexity for hypothetical future benefit*.

### The Plan-A-B-C Principle

For every major architectural decision, Servyou identifies a Plan A (the chosen approach), a Plan B (the fallback if Plan A breaks), and ideally a Plan C (the rare-but-survivable disaster recovery). All three are named at decision time, not improvised under pressure.

Examples in current operation:

- **Database hosting.** Plan A: Supabase managed Postgres in eu-central-1. Plan B: self-hosted Postgres on a VPS with daily backups, if Supabase ever becomes unreachable or unaffordable. Plan C: restore from the most recent dump committed nowhere but downloadable from Supabase's backup retention.
- **Application hosting.** Plan A: Vercel. Plan B: any Node.js host (Render, Fly.io, a Hetzner VPS) running the same Next.js build. Plan C: static export to a CDN with reduced server-side functionality if everything dynamic fails.
- **AI-assisted development.** Plan A: Claude (Anthropic) in claude.ai chat + Claude Code in terminal + Supabase MCP for migrations. Plan B: a different Claude tier or a different vendor's coding assistant. Plan C: continue work with grep, careful reading, and SQL written by hand.

Each Plan B is *concrete and accessible* — not "we'll figure something out," but a real provider or approach with the same architectural shape. The discipline of naming Plan B forces Plan A to stay within the constraints of replaceability: nothing Plan A does should be impossible to do under Plan B.

## Database architecture evolution

The database is the most permanent part of the architecture and therefore the part most worth thinking ahead about. Servyou's database posture evolves through five stages, each triggered by concrete evidence rather than time elapsed.

**Stage 1 — Today (pre-launch MVP build).** Single Supabase project, single Postgres instance, no read replicas, no connection pooling beyond Supabase's built-in pgbouncer. Schema changes via `apply_migration`. Manual backups via Supabase dashboard, plus the migration history captured in `/db/migrations/` in the repo. RLS is the only multi-tenancy mechanism — there is no shared-tenant data, every row has clear ownership.

**Stage 2 — Pre-launch polish (Phase 10).** Add Sentry for application error monitoring. Add Cloudflare Turnstile on signup and signin for bot protection. Add a documented backup-and-restore runbook. Verify RLS policies via a smoke-test script that probes from anon and authenticated contexts. No schema-level changes; the data structure stays as designed at Stage 1.

**Stage 3 — Post-launch growth (first thousand active users, first real load).** Add per-transition timestamp columns to the orders table (`accepted_at`, `prepared_at`, etc.) once analytics on the lifecycle become useful. Add the buyer-cancellation-history view for the rating system. Consider Supabase's connection pooler if connection counts climb. Add appropriate indexes based on query patterns observed in real usage.

**Stage 4 — Collaboration scale (Ministry partnership, bank partnership, Konnect integration).** Move sensitive transaction data to a separately-RLS'd schema if institutional partners require evidence of data isolation. Add an audit-log table that records every state-changing operation for compliance. Add read replicas if reporting queries start to compete with transactional ones. Consider Supabase's Postgres extensions for full-text search if Tunisian-language search needs go beyond simple ILIKE patterns.

**Stage 5 — Cup-and-international scale (2027 cup, California world stage).** Multi-region considerations. Cross-tenant isolation if Servyou ever onboards institutional customers with their own data scope. At this stage, the team is larger than one developer, the engineering discipline established at Stages 1-4 carries forward, and the architectural choices made today should still be defensible.

Each stage names *what changes* and *what triggers the change*. The point is not to predict the future precisely but to know what the next layer of complexity looks like before it is needed, so it can be added deliberately rather than scrambled into.

## Build vs Buy

For every external capability Servyou might need (auth, hosting, database, file storage, email sending, monitoring, payment processing, search, analytics, etc.), the question is: build it ourselves or buy a managed service?

The default answer is **buy when the buy option is mature, affordable, and aligned with values; build when the buy option is exploitative, mis-aligned, or genuinely missing.**

Concretely:

- **Buy.** Supabase for database + auth + storage. Vercel for hosting + CI + analytics. GitHub for source control. Anthropic for AI assistance.
- **Build.** Servyou itself, the marketplace, the order lifecycle, the role model, the configurable workspace, the lifecycle trigger, the fairness limits. These are the platform's core; they cannot be bought because no one else builds Tunisia-native marketplaces with the COD discipline and the Configurable Workspace Principle.
- **Defer.** Payment processing (Konnect integration), email transactional sending (currently Supabase Auth covers verification emails; richer notifications come later), error monitoring (Sentry, in Phase 10), bot protection (Turnstile, in Phase 10), full-text search (post-launch if simple search becomes inadequate).

The build-vs-buy decision is not permanent. A bought service that becomes exploitative gets replaced — the Backing Services Model ensures this is possible. A built capability that turns out to be a commodity gets retired in favor of a managed service that does it better.

## Build budget reality

Servyou is being built by a solo developer learning to code through this project, with AI assistance, on a personal computer in Tunis, on Vercel Hobby and Supabase Free tiers, with a target of opening to real users at Phase 10. The architecture choices respect this reality:

- Nothing in the stack costs money at MVP scale beyond the founder's time and the future OVH domain purchase.
- Nothing in the stack requires DevOps expertise to operate — Vercel and Supabase handle the operational concerns.
- Nothing in the stack creates lock-in that would be expensive to escape at the first thousand users.
- Nothing in the stack is "advanced enough to be interesting but inappropriate for the scale" — every choice is the simplest one that meets the requirement.

When in doubt, default to less. Add the next piece when the absence of it is causing measurable pain.

## What every session must remember about the architecture

The schema is the source of truth. The application follows it.

Every business rule must be enforceable at the database layer.

Backing services are replaceable through clean interfaces; do not hard-code provider-specific assumptions.

Headroom is free or cheap. Premature optimization is expensive. The first is encouraged; the second is rejected.

For every architectural decision, name Plan A, Plan B, and Plan C. If you cannot name Plan B, the decision is not yet ready.

Default to less. Add complexity only when concrete evidence requires it.
