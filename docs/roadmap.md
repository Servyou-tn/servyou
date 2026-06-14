# ROADMAP — WHERE SERVYOU IS AND WHERE IT IS GOING

This is the single source of truth for Servyou's current state, what is next, and the phased timeline ahead. It replaces the original Pillar 6 (Roadmap) and Layer 7 (Build Plan) documents, and it is the document that changes most often as work ships.

When a session needs to know what to work on next, this document is the starting point.

## Today: Servyou's current state

As of the most recent merged work to `main`:

**Database (Supabase, project `xggomcitqrkaylqezjjz`, eu-central-1 Frankfurt).** Every table has Row Level Security. The full migration history (35 migrations through PR-Z) is captured in `/db/migrations/` in the repository, mirroring `supabase_migrations.schema_migrations` byte-for-byte — that folder is the source of truth for the current schema. The orders table has the locked 8-stage lifecycle (`pending` → `accepted` → `prepared` → `dispatched` → `in_delivery` → `arrived` → `received`, with `cancelled` as parallel terminal), plus `cancelled_by`, `cancellation_reason`, and `received_at` columns. The `check_order_status_transition` trigger enforces role-gated lifecycle advancement at the database level. The `check_job_response_limits` trigger enforces the 10-responses-per-post and 5-active-per-freelancer fairness limits. The `get_contact_phone(target uuid)` SECURITY DEFINER function provides relationship-scoped phone reveal. The `profiles_privacy_fix` migration has corrected the original permissive read policy that exposed private fields to anonymous users; today the SELECT policy is owner-only with a `public_profiles` view for safe-field access.

**Application (Next.js + TypeScript + Tailwind).** Phases 1, 2, 3, 5, 6, 7, 8 (subtasks 1 and 2), and most of Phase 9 (admin dashboard — reports queue, disputes, content moderation, user suspension, aggregate stats, audit log) are merged to main and live on Vercel. This covers: full auth flow (signup, signin, email verification, password reset), shop owner side (shop creation, product CRUD, dashboard with the 8-stage lifecycle UI, orders received with the locked status advancement buttons), freelancer side (profile creation, service listings, service order management with the abbreviated lifecycle), consumer marketplace (homepage, product detail pages, service detail pages, shop public pages, freelancer public pages, search, category browse, city filter), COD request flow (delivery details capture, WhatsApp pre-filled message, order creation), favorites, the job-posting system (post creation, job board browse, response with proposal message, fairness limits enforced at DB level), and the `OrderLifecycleStepper` component rendering the visual progression for both product and service order types.

**Status as of the most recent session.** The foundation documents and the focused doc set (product, data-model, architecture, engineering-standards, roadmap) are in place; all migrations are captured under `/db/migrations/` with a README. The most recent work is the Phase-9 admin layer (PRs through PR-T), configurable-workspace tests + doc reconciliation (PR-V), the buyer-cancellation-history refinement (PR-W), the backup runbook (PR-X), inline suspend-from-report (PR-Y), a pre-design-phase backend audit (PR #58), and the post-audit security fixes (PR-Z) — guard triggers + allow-list column grants locking the privileged columns on `profiles` and `orders`. Most recently, the auth funnel's routes were migrated to French branded names (`/inscription`, `/connexion`, `/verifier-email`, `/mot-de-passe-oublie`, `/nouveau-mot-de-passe`); the four legacy paths (`/login`, `/signup`, `/forgot-password`, `/update-password`) are kept as permanent 308 redirects in `next.config`, and the Supabase Auth redirect-URL whitelist was updated to `/nouveau-mot-de-passe` to match (see `docs/operations/supabase-auth-config.md`).

Two test accounts exist for end-to-end verification: a shop owner account and a freelancer account. They are used to validate every PR before merge.

## Pre-launch sequence

The pre-launch work is organized into focused phases. Each phase ships as one or more pull requests; each phase is verified before the next begins.

### Phase 7 followups: buyer detail page + receipt confirmation

The locked 8-stage lifecycle and the role-gating trigger are in place. What remains is the buyer-side detail page that surfaces the lifecycle to the buyer and provides the "Confirmer la réception" action that exercises the trigger's buyer-only `received` rule.

**PR-C.** Promote `demande/confirmation/[id]/page.tsx` to a live order detail page reading order.status. Render the `OrderLifecycleStepper` for the buyer's view. Host the "Confirmer la réception" button (buyer-only, enabled when status is `arrived`, transitions to `received` and triggers the timestamp). This PR also fixes the pre-existing hardcoded `status_pending` badge that displays incorrectly on the confirmation page today.

**PR-D.** Cancellation flow with reason capture. A modal with a dropdown of common reasons plus a free-text field. The modal writes `cancelled_by` and `cancellation_reason`. Pre-pivot cancellations (product: `pending`/`accepted`/`prepared`, service: `pending`) use a simple cancel button with no reason required. Post-pivot cancellations require the reason and the modal enforces that the field is non-empty before submit. The database trigger is the ultimate enforcer; the UI is convenience.

### Phase 8 subtask 3: Arabic translations

All user-facing French strings need Arabic counterparts. The translation work covers: the auth flow, the marketplace browse and detail pages, the seller dashboards, the buyer "My Requests" page, the OrderLifecycleStepper labels, the cancellation modal, the job-posting system, and the favorites and reports flows.

RTL layout is supported by Tailwind's logical properties (`ps-4` instead of `pl-4`, etc.) and by the `<html dir="rtl">` attribute being set when the language is Arabic. The translation work is a focused PR.

### Phase 9: Admin dashboard

The administrator role is defined in the data model (`profiles.is_admin` boolean, the `is_admin()` SECURITY DEFINER function). Phase 9 builds the admin dashboard surface — described as "Zone 9" in `platform-pages-and-system.md`.

The admin dashboard includes: user list with role, city, join date, activity, and status, with suspend and remove actions; content lists for shops, products, freelancer profiles, services, job posts, with hide and remove actions; the reports queue with handle-and-resolve actions including the admin_note that's shown to the reporter on resolution; the disputes resolution surface that uses the order lifecycle history, the `received_at` timestamp, and any cancellation reason as structured evidence; the aggregate-anonymous statistics view showing totals of users, shops, freelancers, products, services, job posts, and completed orders. The dashboard explicitly cannot touch raw data or codebase — that access belongs to the developer role through Supabase's dashboard and GitHub, separately.

### Schema migrations from the data-model document

These schema migrations from the data-model document are **applied** (see `/db/migrations/`):

- **Shop owner configurable workspace fields.** `shop_type`, `delivery_setup`, `working_hours`, `location_detail` columns on the shops table, plus the `shop_payment_methods` and `shop_categories` child tables. Applied (PR-E); regression tests + doc reconciliation in PR-V.
- **Freelancer configurable workspace fields.** `working_hours`, `current_workplace`, `preferred_payment_method` columns on freelancer_profiles, plus the `freelancer_tools`, `freelancer_education`, and `freelancer_certifications` child tables. Applied (PR-F); tests + docs in PR-V.
- **Buyer-cancellation-history view.** A read-only per-buyer cancellation aggregation, the foundation for the post-launch buyer-rating system. Applied at MVP, then refined in PR-W to count only buyer-initiated cancellations (`cancelled_by='buyer'`); the rating system that consumes it remains post-launch.

The migration workflow these followed: discovery via `execute_sql`, draft SQL, founder authorization, `apply_migration`, verification, mirror to `/db/migrations/`, then any application-layer UI as a separate focused PR.

### Phase 10: Polish before public launch

Phase 10 covers everything that should be solid before opening to real users. The work is sequenced into focused PRs:

- **Sentry integration** for error monitoring. **Shipped** — the SDK is wired (instrumentation files, PII scrubber, sample rates) but **inert until env vars are set**; activation is founder-side per `docs/operations.md`. Sentry's free tier covers MVP volume.
- **Cloudflare Turnstile** on `/inscription` and `/connexion` for bot protection. The widget is rendered client-side; the server action validates the Turnstile token before processing.
- **Backup and restore runbook.** Authored (PR-X) in `docs/operations.md` (the "Backup and disaster recovery" section): five incident-response scenarios, the manual `pg_dump` procedure, recovery objectives, and a quarterly restore-drill procedure. The first *verified* restore drill is scheduled for the week before launch, when real data and `pg_dump`/Pro tooling are in place. **Launch-blocking dependency:** upgrade Supabase from Free to Pro before launch so daily backups and PITR are active.
- **RLS smoke-test script.** **Shipped** (`npm run rls-smoke`, `scripts/rls-smoke.mjs`): probes the API from anon and authenticated contexts and asserts the privacy/visibility boundaries against production. Now **32 assertions**, including the PR-Z privilege-escalation checks (section F). Run as a manual verification before launch.
- **Accessibility pass.** WCAG 2.2 AA compliance check across all user-facing pages. Keyboard navigation, screen reader labels, color contrast, focus indicators.
- **Load testing.** A bounded load test against the staging environment to validate that the platform holds under modest concurrent load (10-50 simultaneous users for a marketplace at launch is realistic).
- **Legal pages.** Terms of service, privacy policy, cookie policy, content policy. Bilingual (French + Arabic). Reviewed for Tunisian regulatory compatibility.
- **First user interviews.** Five to ten thirty-minute conversations with prospective Tunisian consumers, shop owners, and freelancers. The conversations inform any final adjustments before opening to real users.

### The redesign pass

Once Phase 10 is complete and the platform is functionally ready, a focused redesign pass elevates the visual identity from "MVP that works" to "platform that looks ready for real users." This pass is the work of Pillars 2 (Design System) and 3 (Brand and Visual Identity), which are deliberately deferred until the functional foundation is solid. Writing the design system before the application exists results in a design system disconnected from real usage; building the application without a design system and then applying one results in a focused redesign that benefits from real understanding of the surfaces being styled.

The user-facing Pillars (5 — Content and Marketing Strategy, 3 — Brand and Visual Identity, 2 — Design System) are sequenced for this phase. They are not yet written. Each will be its own focused work, building on the foundation the current docs establish.

### OVH domain purchase and launch readiness

A custom domain is purchased through OVH (a French provider with good Tunisian-customer support). The domain is configured to point at Vercel. The TLS certificate is automatic via Vercel.

The Vercel Hobby tier is replaced with Vercel Pro before launch — Hobby blocks PR previews on org-owned repos, which is acceptable during development but should be lifted before real-user traffic starts. Supabase Free tier may also need to be upgraded if anticipated launch traffic exceeds the free quota.

Launch readiness criteria:
- All Phase 1-10 work is on `main` and verified
- The redesign pass is merged
- Legal pages are in place in both languages
- Sentry is capturing errors with the alert thresholds tuned
- The backup-restore runbook has been exercised end-to-end
- At least one full end-to-end test scenario has been run by a real user against the platform

Launch is opening signup to real Tunisians and beginning the build-measure-learn loop.

## Post-launch growth

Once the platform is live with real users, the work shifts from "building the MVP" to "improving the MVP based on real usage." The architecture documents and engineering standards continue to apply; the document set above does not change because of post-launch growth, only roadmap.md does.

The post-launch additions sequenced from the COD friction work:

- **Buyer phone confirmation before dispatch.** The seller calls or messages the buyer to confirm commitment before paying delivery costs.
- **Buyer rating and reputation system.** Repeat trustworthy buyers earn visible reputation; serial-refusers earn visible warnings; sellers can choose which buyers they accept. This consumes the buyer-cancellation-history view added at pre-launch.
- **Seller-committed delivery windows.** Sellers commit to a delivery window when accepting an order; missing the window counts against their seller rating.

Other post-launch work sequenced from the data model and product documents:

- **Per-transition timestamp columns** on the orders table (`accepted_at`, `prepared_at`, `dispatched_at`, `arrived_at`) for full lifecycle audit trail and analytics.
- **Reviews and ratings system.** Buyers rate sellers after `received`; sellers can respond. Aggregate ratings on shop and freelancer public pages.
- **Notifications system.** A `notifications` table plus in-app delivery, starting with "your report was resolved," extending to order status changes, new job responses, and review activity.
- **Self-service data access and account deletion.** Users can download their data and delete their account through the settings page, replacing the admin-mediated MVP flow.
- **Real platform analytics.** Privacy-respecting behavioral analytics (no personal data, only patterns) informing feature priorities.

### The first dropshipping connector

Per the locked post-MVP dropshipping integration trajectory, the first external-platform connector is Converty — the most common Tunisian dropshipping platform. The integration lets a Servyou shop owner link their Converty storefront so orders and stock signals flow into the unified Servyou workspace. This is the Unified Workspace Principle applied to dropshipper reality: integration, not replacement.

The Converty connector is sequenced at the post-launch scale-stage when there is enough dropshipper user base on Servyou to justify the integration cost.

International platform connectors (AliExpress, Alibaba, Shopify) are sequenced for collaboration scale, when the regulatory, payment, and trust infrastructure for international sourcing is in place.

## Collaboration scale

When the platform approaches conversations with institutional partners — the Ministry of Finance, a banking partner for in-platform payments, or Konnect for card-based transaction integration — the work shifts in character. The platform's value to institutional partners is its trust posture, its data discipline, and its alignment with Tunisian regulatory requirements.

At this stage:
- **In-platform payment (System Two from the founding vision).** Konnect or another Tunisian payment processor integration. Cards held in escrow until buyer confirms receipt. This is the deepest cure for both buyer and seller fears, locked in the product document as the version-two priority.
- **Subscriptions (System One from the founding vision).** Recurring monthly subscriptions for premium features or for seller-side capabilities. The pricing model is informed by Converty's risk-free-for-small-sellers approach (free until 10,000 TND turnover, then a small commission).
- **The branched roles.** Liberal professionals (doctors, lawyers, accountants, engineers) arrive as a family of branched freelancer sub-types, each with specialized profile fields and potentially specialized interaction models (appointment booking for doctors, for instance). Small companies arrive as a branched shop owner sub-type with multi-staff accounts, invoicing, and sector-specific fields.
- **Formal user research.** Structured user interviews, surveys, usability testing, competitive research. Documented in a form suitable for sharing with institutional partners who want to see evidence that Servyou understands its market.
- **Audit-log table.** Every state-changing operation recorded for compliance.
- **Read replicas and connection pooling tuning.** Database architecture evolves to handle the load.

## Cup and international scale

By the cup and international stage (the 2027 cup, the California world stage), Servyou serves multiple user types each through their own unified workspace, all built on the same foundation the original shop-owner and freelancer workspaces established. The architectural discipline locked at MVP — the role model, the configurable workspace, the database-layer security enforcement, the migration discipline, the backing services model — carries forward unchanged because it was designed to.

At this scale:
- **Multi-region considerations.** Closer hosting to additional markets if Servyou opens beyond Tunisia.
- **Cross-tenant isolation.** Institutional customers (a Ministry running a procurement program on Servyou infrastructure, for instance) get isolated data scopes.
- **Independent review and validation.** External consultants validate the platform's security, accessibility, and architectural soundness.
- **The institutional readiness package.** Documented user-research methodology, periodic published reports on Tunisian e-commerce trends positioning Servyou as a thought leader on its own market, specific case studies of user types Servyou serves well.

## How this roadmap stays honest

This document changes as work ships. When a phase completes, the "today" section is updated to reflect the new reality. When a deferred item becomes urgent and gets pulled forward, the sequence is updated. When a planned item turns out to be unnecessary, it is removed with a note explaining why.

The roadmap is not a contract with anyone — it is the founder's working plan, refined through real engineering experience. Treating it as a contract would make it brittle. Treating it as throwaway would make it useless. Treating it as a living document that reflects honest current understanding is what makes it useful as a session-starting reference.
