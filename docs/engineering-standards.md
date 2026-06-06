# ENGINEERING STANDARDS — HOW SERVYOU IS BUILT

This is the single source of truth for the engineering practices, coding standards, and operational discipline applied to Servyou. It replaces the bulk of the original Pillar 1 document (sections 1.2 through 1.7), keeping the rules and trimming the narrative.

`CLAUDE.md` at the repository root is the operational shortcut Claude Code reads at the start of every session. This document is the human-readable, longer-form explanation behind those rules.

## Application security

Servyou's security posture is defense-in-depth, anchored to OWASP standards.

**Input validation everywhere.** Every input from a user — form submissions, URL parameters, query strings, request bodies — is validated at the server boundary before reaching business logic. Validation happens with a typed schema (Zod or Next.js's built-in form validators), not with ad-hoc string checks. Rejected inputs return a structured error to the client, never an unhandled exception or a raw database error.

**Output escaping by default.** Tailwind + React's default JSX rendering escapes HTML output automatically. The only places where raw HTML is rendered are deliberate uses of `dangerouslySetInnerHTML`, and these are limited to controlled, sanitized content (such as rich-text descriptions that pass through a sanitizer first). The application is XSS-safe by default; deviations are explicit and reviewed.

**SQL injection prevented at the boundary.** All database access happens through the Supabase JS client, which uses parameterized queries. Raw SQL is only written in migrations (which are reviewed before apply) and in SECURITY DEFINER functions (which use `quote_ident`/`quote_literal` and parameter placeholders). No string concatenation of user input into SQL anywhere.

**Authentication and session security.** Supabase Auth handles password hashing (bcrypt) and session tokens (JWT). Sessions are HTTP-only cookies, set with `Secure` and `SameSite=Lax`. Password reset uses single-use tokens with short expiry. Email verification is required before sensitive actions. The auth flow is not customized beyond what Supabase provides; customizing it is a known source of subtle bugs and is deferred until there is a clear reason.

**Authorization via RLS, not application checks.** Every table has Row Level Security enabled. Application code does not perform "is this user allowed to do this" checks before database calls, because such checks are duplicative and become inconsistent. The database is the authority; the application asks and gets either the data or a permission denied.

**Rate limiting at the edge.** Vercel's per-IP rate limiting is enabled on auth endpoints. Heavier rate limiting (Cloudflare or Vercel Pro features) is deferred to Phase 10 polish before public launch.

**Bot protection.** Cloudflare Turnstile is added on `/signup` and `/login` in Phase 10, before opening to real users.

**Error monitoring.** Sentry is added in Phase 10, so production errors are visible without requiring users to report them.

**Dependency hygiene.** Dependencies are kept current. `npm audit` runs on every CI build; high or critical vulnerabilities block the merge. New dependencies are added only when they meaningfully reduce code we would otherwise write — utility libraries that save 10 lines of code are not added; libraries that abstract a complex concern (Tailwind, Next.js itself, Supabase JS) are.

## Data privacy and personal data protection

GDPR is the standard Servyou follows, even though Tunisian users are not currently EU subjects. The reason is that GDPR is the strongest privacy regime in widespread use, and adopting it costs little when starting from scratch.

**Personal data minimization.** Servyou collects only what it needs to deliver the service. Date of birth is collected because the age rule requires it. Email is collected for auth and notifications. Phone is collected progressively (only when the user lists it themselves, or when COD requires it for a specific order). No marketing-purpose data collection — the platform doesn't track interests, purchases for retargeting, or browsing patterns beyond what's needed for the platform to function.

**Sensitive field protection.** Sensitive fields on the profiles table (date_of_birth, email, phone) are protected by owner-only RLS read policies. Public information (full_name, city, language, seller_type) is exposed via a separate `public_profiles` view that contains only the safe columns. The architecture is described in detail in the data-model document.

**Right to access and right to deletion.** A user can request their data and request account deletion. At MVP, both are handled manually through admin tooling (the admin dashboard exposes a "view user data" action and a "delete account" action). Automated self-service for both is sequenced for post-launch.

**Data residency.** Supabase hosts the database in eu-central-1 Frankfurt. This is within the EU's data protection zone, which simplifies any future GDPR compliance review. It is also the closest region to Tunisia with EU-level data protection.

**No third-party tracking.** Servyou does not embed Google Analytics, Facebook Pixel, or any other third-party tracker. The privacy-respecting Vercel analytics are the only telemetry at MVP, and they collect aggregate anonymous data only.

## Code quality and engineering discipline

Servyou's codebase follows the conventions of the modern Next.js + TypeScript + Tailwind ecosystem, with a few specific commitments.

**TypeScript strict mode.** `tsconfig.json` has `"strict": true`. No `any` types in application code; if a type cannot be expressed precisely, use `unknown` and narrow with explicit checks. External library types that come through `any` are wrapped at the boundary so the rest of the codebase stays typed.

**Server components by default.** New components are server components unless they need state, effects, or browser APIs. Client components are marked with `'use client'` at the top of the file. The boundary between server and client is deliberate; data fetching happens in server components and is passed down as props.

**Tailwind for styling.** No separate CSS files outside of `globals.css` (which contains the Tailwind directives and a small number of CSS variables for theming). No CSS-in-JS libraries. No styled-components. Tailwind's utility classes plus the design tokens defined in the Tailwind config are the styling system.

**Internationalization built in.** All user-facing strings live in `src/i18n/locales/fr.ts` and (eventually) `ar.ts`. No hardcoded French or Arabic in components. The translation key is the same across both files; the value differs. Components import a `t()` function and call `t('key.path')`.

**Component file structure.** One component per file. Components are named in PascalCase, files match the component name (`OrderLifecycleStepper.tsx`). Files live under `src/components/` for shared components and under `src/app/<route>/components/` for route-scoped components.

## Naming and style

**Variables and functions are camelCase.** Database columns are snake_case (Postgres convention). The JS client returns snake_case columns; the application reads them directly when convenient and converts to camelCase only at the rendering boundary if a readability gain justifies it.

**File names match the export.** A file exporting a React component is named after the component. A file exporting a utility function is named after the utility (`order-status.ts` exports the functions related to order status).

**Folders are kebab-case.** Routes follow Next.js App Router conventions (`src/app/ma-boutique/commandes/page.tsx`). Shared utilities live in `src/lib/`, organized by domain.

**No abbreviations in identifiers.** `consumerId`, not `cId`. `orderStatus`, not `os`. The exception is well-known acronyms: `URL`, `RLS`, `API`, `COD`.

## Components, state, and server-client boundaries

The data flow is: server component fetches from Supabase → passes data as props → client component renders interactive UI → user action triggers a server action or route handler → server action mutates via Supabase → revalidates the route → re-renders.

**State management is local-first.** React state with `useState` and `useReducer` for component-local state. URL search params for state that should be shareable or bookmarkable (filter selections, sort order). No global state library (no Redux, no Zustand, no Jotai) at MVP — the application's state needs are not yet complex enough to require one.

**Mutations go through server actions or route handlers.** Client components do not call Supabase directly except for read operations that don't fit cleanly in server components (real-time subscriptions, for instance). Mutations are server actions because they need to revalidate the cached server-rendered route after success.

**Loading states are explicit.** Every async boundary has a Suspense fallback or an explicit loading skeleton. The user never sees a frozen UI without indication that work is happening.

## Error handling

**Errors are caught at the boundary, not deep in business logic.** Server actions wrap their main work in `try/catch` and return a structured `{ success: false, error: string }` on failure. The catch block logs the error server-side (and eventually to Sentry) and returns a user-friendly French message to the client. The client displays the message.

**Database errors are mapped to user-friendly messages.** A `RAISE EXCEPTION` from a trigger arrives with a French message intended for the user — that message is forwarded directly. A foreign key violation is mapped to a generic "this operation could not be completed" message rather than exposing the constraint name.

**Unexpected errors are logged with context.** Every error log includes the user ID (if authenticated), the route, and the inputs that led to the error. This is the audit trail when debugging production issues post-launch.

**No silent failures.** A function that can fail either returns a result that includes the failure case or throws. It does not return undefined and let the caller guess.

## Tests

Servyou uses Vitest for unit tests of pure functions and component-level logic. Tests live in `src/__tests__/` mirroring the source structure.

**What is tested.** Pure utility functions (helpers, calculators, validators). Reducers and state machines. Critical business logic (the order status helpers, the cancellation pivot rules, the role gating helpers in `src/lib/types/order-status.ts`).

**What is not tested at MVP.** UI component rendering tests (visual regression tooling is post-launch). End-to-end tests with Playwright (sequenced for Phase 10 polish). Database-level tests (the RLS policies and triggers are validated by manual probes and by the application using them — formal database test scaffolding is post-launch).

**The test discipline.** Every business-logic file has a corresponding test file. New rules added to a tested file have a new test added in the same PR. Tests pass on `main`; CI blocks merges that break them.

The current test count is 79 across 5 test files. The targets are: keep tests passing, add tests for new logic, never disable a failing test to ship.

## Pull requests and code review

Servyou uses a feature-branch workflow with one PR per phase or per focused change. The discipline is consistent:

**Branch from main, name the branch by feature.** `feature/job-posts`, `feature/db-migrations-history`, `feature/buyer-detail-page`. Hyphens, lowercase. One branch per piece of work; no long-lived branches.

**Each PR has a clear scope and a clear PR description.** The description follows a locked template: What this ships (one sentence) / Changes (the bullet list of files and what they do) / Decisions (the architectural choices made and why) / Out of scope (what was deliberately not included) / Verification (how it was tested) / Followups (what should happen next, if anything).

**Each PR is verified locally before push.** `npm run build` succeeds. `npm test` shows green. Manual smoke-test of the changed surface in the dev server. Only after this does the branch get pushed.

**Vercel preview gates the merge.** Vercel runs the build on every push to a feature branch. The PR is not merged until Vercel's check is green. (Note: org-repo previews on Vercel Hobby are limited; a Vercel Pro upgrade is sequenced for pre-launch.)

**Merge and clean up.** Merge via GitHub UI ("Merge pull request" → "Confirm merge"). After merge: locally `git checkout main`, `git pull`, `git branch -d <feature-branch>`, `git fetch --prune`. The local tree returns to clean main, in sync with origin.

**One branch per phase, no exceptions.** Scope creep into a branch from "while I'm here" additions is a primary source of merge friction and broken main. Out-of-scope additions get their own branch, even if they're trivially small.

## Commit discipline

**Commits are atomic and well-described.** A commit represents one logical change. The commit message summarizes the change in one line, followed by a blank line and a longer description if needed.

**Commit messages are in English.** Even though the user-facing language is French, commit messages are English for accessibility to future engineers and AI assistance. The convention is descriptive, not prefixed (`Add db/migrations folder capturing all 14 production migrations` rather than `feat: add migrations`).

**Commits are attributed to the founder, no co-author tags.** Servyou's commit history reflects the founder's work. AI assistance is not surfaced in commit attribution; the founder reviewed and approved every commit and bears the responsibility for what landed.

**Force-pushes are deliberate and use `--force-with-lease`.** Amending a commit and force-pushing happens occasionally (typo in a commit message, missed file in a commit). Force-pushes use `--force-with-lease` to protect against overwriting unseen work. Force-pushes to `main` are forbidden by branch protection; force-pushes to feature branches before they're reviewed are acceptable.

## Dependencies and tools

**Adding a new dependency requires justification.** The bar is high. A new dependency must reduce code we would otherwise write, abstract complexity that's not worth re-implementing, or provide a capability that's outside Servyou's core competency. Utility libraries that save five lines of code do not meet the bar.

**Dependencies are kept current.** Monthly or per-release-cycle, Dependabot PRs (or manual review of outdated packages) update dependencies. Major-version updates are reviewed individually; minor and patch updates are merged after CI passes.

**The current dependency set.**

Production: `next`, `react`, `react-dom`, `@supabase/supabase-js`, `@supabase/auth-helpers-nextjs`, `tailwindcss`, `typescript`.

Development: `vitest`, `@types/*`, ESLint with the Next.js config, Prettier (using the default config except for `semi: false`).

That is the stack. New additions are evaluated against the bar above.

## Secrets and credentials management

**Secrets live in environment variables, never in code.** The `.env.local` file is in `.gitignore` and never committed. Vercel's environment variable UI manages production and preview secrets.

**Two environments share three secrets.** `SUPABASE_URL`, `SUPABASE_ANON_KEY` (public, embedded in client), and `SUPABASE_SERVICE_ROLE_KEY` (server-only, never sent to the client). The service role key is used by server actions for operations that need to bypass RLS legitimately (admin operations); it is never imported into a client component.

**Rotation discipline.** If a key is suspected of being leaked, Supabase's "Rotate API keys" action regenerates it. The new key is added to Vercel and the next deploy picks it up.

## Environment variables discipline

**Variables are typed at the application boundary.** A single `src/lib/env.ts` file imports environment variables and exports them as a typed object. The application imports from this file, not from `process.env` directly. If a required variable is missing, the typed import fails at build time, not at runtime when the missing value is first read.

**Public variables are prefixed `NEXT_PUBLIC_`.** Anything that isn't `NEXT_PUBLIC_*` is server-only and is not bundled into the client. The Supabase anon key is `NEXT_PUBLIC_SUPABASE_ANON_KEY`; the service role key is just `SUPABASE_SERVICE_ROLE_KEY` and never crosses to the client.

## Dependency audit posture

`npm audit` runs in CI. High and critical vulnerabilities block the merge. Moderate vulnerabilities are noted in the PR description but do not block (they are reviewed and addressed in a focused security update).

When an upstream dependency has a CVE, the fix path is: bump the dependency in a focused PR, verify the build still passes, ship, sync. If the CVE is in a transitive dependency and the direct dependency hasn't released a fix, the workaround is to pin the transitive dependency via `overrides` in `package.json` until the upstream releases.

## Error monitoring and alerting

At MVP today: errors are logged to the Next.js server console (visible in Vercel's logs). Critical errors are caught by the application boundary and shown to the user with French messages. There is no proactive alerting.

In Phase 10 polish: Sentry is added. Sentry's free tier suffices for MVP launch volume. The integration captures unhandled exceptions, structured errors logged from server actions, and performance traces. Alerts go to the founder's email.

Post-launch: alerts thresholds are tuned based on real volume. A noisy alert is worse than no alert.

## Incident response

At MVP today: incidents are handled by the founder directly. The response steps for any production issue:

1. Acknowledge the issue (write it down somewhere — at minimum, a short note in the chat where the team works).
2. Assess severity. Is the platform down for all users (P0)? Is a specific flow broken (P1)? Is it a cosmetic bug (P2)?
3. Triage. P0/P1 gets immediate attention; P2 gets scheduled in the next focused session.
4. Fix on a hotfix branch named `hotfix/<short-description>`. Same PR discipline as feature branches, but expedited.
5. Verify the fix in production after merge.
6. Post-mortem: write down what happened, what the fix was, what would prevent recurrence. Store it under `docs/incidents/<YYYY-MM-DD>-<summary>.md` (this directory doesn't exist yet but will be created when the first incident happens).

Post-launch: on-call rotation, paging service, runbooks. Not yet relevant.

## What every Claude Code session must remember about engineering standards

The schema is the source of truth. The application follows it.

Business rules belong at the database layer. Application guards are convenience for the user; they are not security.

TypeScript strict, no `any`. Server components by default. Tailwind for styling. French/Arabic via `src/i18n/locales/`.

One branch per phase. PR description follows the locked template. Verify locally before push. Vercel green before merge. Clean up branches after merge.

Commits in English, attributed solely to the founder, no co-author tags.

New dependencies face a high bar. Default to less.

`CLAUDE.md` at the repo root is the operational shortcut. This document is the longer-form why.
