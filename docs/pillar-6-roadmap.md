# SERVYOU — PILLAR 6: ROADMAP

This is the sixth and final Pillar in the Servyou foundation documents, built section by section with the founder and locked before moving on. Pillar 6 takes everything established in Pillars 1 and 4, and in Layers 2, 3, and 4, and turns it into a time-sequenced roadmap from today's pre-launch state through the 2027 Tunisian national startup cup, the California world stage, and beyond.

Pillars 1 (Engineering Standards) and 4 (Target Users and Market) are complete and locked. Pillars 2 (Design System and UX Principles), 3 (Brand and Visual Identity), and 5 (Content and Marketing Strategy) are sequenced as user-facing strategic work, to be written in dedicated sessions after engineering work is further along (per the locked strategic sequence in CLAUDE.md). This document covers Pillar 6.

## Structural Framing

Pillar 6 uses the **carriage-and-horses scale-stages** locked in Pillar 1 §1.0 as its primary structure. Each section corresponds to a scale-stage, and within each section the engineering, product, brand, marketing, compliance, and partnership work expected at that stage is sequenced honestly.

The five scale-stages, recapped from Pillar 1:

- **Today** — the current state. Solo founder with AI tooling, MVP build in progress, no real users yet, no external scrutiny yet.
- **Pre-launch** — Phase 10 polish work, opening to the first real Tunisian users.
- **Post-launch growth** — the first thousand active users, the first repeat transactions, the first moments where Servyou's performance and reliability are tested by real load.
- **Collaboration scale** — the Ministry of Finance startup-label application, the first formal partnership conversations with Tunisian banks, the Konnect payment integration.
- **Cup-and-international scale** — preparing for the 2027 national startup cup pitch, then the world stage. Institutional readiness in full.

The horses are added as the carriage grows. Today's Servyou commits to what today's Servyou can hold; tomorrow's Servyou commits to what tomorrow's Servyou requires. This discipline — neither over-committing today nor under-committing tomorrow — is what makes Pillar 6 both honest about the present and ambitious for the future.

## 6.1 — Today: Servyou's Current State

Pillar 6 begins by stating honestly where Servyou is at the moment of writing, because every milestone that follows only makes sense relative to this starting point.

**The platform code.** Servyou today is a Next.js 16 application built solo by the founder, with Claude Code as implementing collaborator, running on Vercel's free tier deployment with a Supabase Postgres backend in eu-central-1 (Frankfurt) on the free tier. Through the date of this document, nineteen pull requests have been merged into `main`, taking the build through Phase 8 Subtask 2b. The codebase carries the custom internationalization foundation (French complete with 372 locale keys, Arabic deferred to Phase 8 Subtask 3), Tailwind v4.3 logical-class RTL support with the DirArrow component for directional icons, the public-facing consumer-and-seller marketplace structure, Supabase Auth with verified email signup, the Phase 7 job-posting flow with progressive phone collection (five Tunisian phone formats validated through twenty-six tests), and the privacy hardening migration (`public_profiles` view and `get_contact_phone` RPC) from PR #13.

**The database.** Fifteen tables are live on Supabase with Row Level Security on every table. The current orders table holds a three-value status enum (`pending`/`completed`/`cancelled`) — the eight-value lifecycle expansion locked in Layer 4 §4.6 has been documented but is not yet applied to the database. The shop owner profile additions, freelancer profile child tables, and cancellation discipline columns from Layer 4 Appendix A are also documented but not yet applied. These pending migrations are sequenced into Phase 9 or Phase 10 with full Step 0 discovery, founder approval gate, and manual click-through verification each, per CLAUDE.md's migration discipline.

**The foundation documents.** Six locked foundation documents are committed to the repository under `docs/`: Pillar 1 (Engineering Standards), Pillar 4 (Target Users and Market), Pillar 6 (this document), Layer 2 (Users and Roles), Layer 3 (Features and Journeys), and Layer 4 (Data Model). CLAUDE.md at the repository root carries both the Pillar 1 operational summary and the Pillar 4 operational summary including the founder-locked inspiration sources for Pillars 5, 3, and 2. The four founder-contributed principles — the headroom principle, the Plan-A-B-C principle, the Unified Workspace Principle, and the Configurable Workspace Principle — are named formally across Pillar 1 §1.9, Pillar 1 §1.16, Pillar 4 §4.8, and Pillar 4 §4.10.

**The user base.** The platform is NOT yet open to real users. The database holds three test accounts (one shop owner, two freelancers). No domain has been purchased. No marketing has begun. No social media presence exists for Servyou as a brand. No legal documents are published — they are deferred to Phase 10 with mandatory Tunisian lawyer review before publication. No INPDP authorization filing has been submitted. No partnership conversations have begun.

**The repository state.** The repository at `github.com/Servyou-tn/servyou` is PRIVATE with Vercel auto-deployment operational. Branch protection is informal (founder-only `main`); formal branch protection rules are sequenced for Phase 10. No CI tests run on push beyond Vercel's own build verification; formal CI pipeline is sequenced for Phase 10. One moderate Dependabot vulnerability has been closed (postcss XSS).

**This is the starting point.** Every milestone in §6.2 through §6.5 below builds from here. The roadmap is not a fantasy of "if everything goes perfectly" — it is the deliberate sequencing of work from this current state to the 2027 Tunisian national startup cup and the California world stage beyond.

## 6.2 — Pre-launch

Pre-launch is the largest and most detailed section of Pillar 6 because it sequences everything between Today and the moment Servyou opens to real Tunisian users. The pre-launch stretch runs across seven sub-sections, each representing a distinct body of work that must be completed before the launch readiness gate in §6.2.7 is satisfied.

### 6.2.1 — Phase 8 Subtask 3: Arabic Translations

Phase 8 closes with the Arabic locale completion. The 372 French locale keys in `fr.ts` get their Arabic equivalents in `ar.ts`, drawn from the conventions of commercial Arabic as actually written and read across the Gulf (KSA and UAE e-commerce platforms — Noon, Amazon.ae, Jumia) and Tunisia (the dialect of commercial usage Tunisians encounter daily). This is not Modern Standard Arabic from a textbook; it is the Arabic Tunisian users expect to see on a real shopping platform.

The translation work uses AI-assisted drafting with rigorous founder review. Claude Code generates first-pass Arabic translations for batches of keys grouped by page area (auth, browse, shop owner dashboard, freelancer dashboard, job board, etc.). The founder reviews every key against the rendered Arabic page in a real browser — not just the JSON — verifying both linguistic accuracy and commercial appropriateness for the Tunisian reader. The translations ship as multiple smaller PRs grouped by page area rather than one large PR, matching the checkpoint pattern from Pillar 1 §1.10.2: each PR has its own Step 0, manual click-through in RTL Arabic, and founder approval before merge.

Phase 8 Subtask 3 is done when every page that uses the i18n system renders correctly in Arabic with the RTL layout intact, the DirArrow directional icons flipping correctly, no untranslated keys leaking through, and the founder has verified the commercial Arabic reads naturally to a Tunisian reader.

### 6.2.2 — Phase 9: Admin Dashboard

Phase 9 builds the in-app administrator role locked in Layer 2 §2.5 — the moderation layer that operates on people and content through a dedicated dashboard, deliberately separated from the developer's raw-database access. This is the most security-sensitive remaining phase before launch, because it touches every user's data and creates an in-app role with elevated permissions that must never be abusable.

The Phase 9 work sequences as multiple focused PRs, each with full Step 0 discovery per Pillar 1 §1.10.3 and the verify-before-rebuild discipline. The admin role itself is added as a protected flag separate from `seller_type` (per Layer 4 §4.2), with RLS policies that restrict admin-only operations to users carrying the flag. The dashboard surfaces include: a user list with search, filter, and the ability to suspend or remove rule-breakers; a content list showing shops, products, freelancer profiles, services, and job posts with the ability to hide or remove violating content; a report queue showing user-submitted reports with admin actions per report; a dispute resolution surface that pulls the structured evidence from Layer 4 §4.6 (order lifecycle history, `received_at` timestamps, cancellation reasons) so admins can resolve buyer-seller disputes from a single screen with full context.

The admin dashboard never exposes raw personal data beyond what the moderation task requires. Delivery addresses, phone numbers, dates of birth, and other sensitive personal data are visible to admins only when a specific moderation case requires them, with the access logged. This is the data protection principle locked in Layer 2 §2.5 — admins moderate people and content; they do not have unrestricted access to personal data, even though their permissions are elevated.

Phase 9 closes when every admin surface is functional with proper RLS coverage, every admin action is logged for audit, the dashboard works correctly in both French and Arabic with RTL layout, and the founder has manually click-through verified every moderation flow with a test admin account on real data. The visual design of Phase 9 is deliberately functional — clean, readable, unstyled-but-correct — because Pillar 2's design system has not yet been locked. The redesign pass in §6.2.6 will rebuild the admin dashboard's visual layer per Pillar 2 once that document is written.

### 6.2.3 — Phase 10: Polish

Phase 10 brings online the pre-launch monitoring and security stack that Pillar 1 §1.6.4 named as the five-tool readiness package, plus the four legal documents that must be published before opening to real users, plus the accessibility self-audit against WCAG 2.2 Level AA committed to in Pillar 1 §1.2.4 and §1.14.4.

**The monitoring stack activation.** Sentry is integrated with sensitive personal data scrubbed from error payloads before transmission via Sentry's `beforeSend` hook. Cloudflare Turnstile is added to the `/signup` and `/login` routes for privacy-preserving bot protection. `npm audit` becomes a release-blocking gate with critical and high vulnerabilities resolved before merge. Vercel's built-in monitoring is reviewed and acknowledged as part of the security posture. Supabase's built-in audit logs are configured for authentication events, database connection events, and unusual query patterns.

**The legal document layer.** Four documents are drafted and reviewed by a Tunisian lawyer before publication: Terms of Service, Privacy Policy, Cookie Policy, and the Accessibility Statement. Each document is published in both French and Arabic, with the Tunisian lawyer reviewing both language versions. The lawyer review is not optional and not negotiable. The INPDP authorization filing is drafted in this phase as well, even though submission may happen post-launch per Pillar 1 §1.14.1.

**The accessibility self-audit.** Automated tools (axe DevTools, Lighthouse) run against every live page in both French and Arabic, both LTR and RTL layouts, with findings documented under `docs/accessibility-audit.md`. Color contrast ratios, touch targets, keyboard navigation, and screen reader behavior are all verified. The audit produces written findings that become part of the institutional readiness package.

**The load test.** Per the headroom principle from Pillar 1 §1.8.3, a focused load test simulates three to five times the expected launch-day traffic. The load test produces a written report under `docs/`. If the platform does not hold the headroom target, the launch readiness gate from §6.2.7 is not satisfied and Phase 10 does not close.

Phase 10 closes when the monitoring stack is live and verified, the four legal documents are lawyer-reviewed and published, the accessibility self-audit produces documented findings with no AA-level violations remaining, the load test confirms 3-5x headroom, and the dependency audit shows zero critical or high vulnerabilities.

### 6.2.4 — Schema Migrations from Layer 4 Appendix A

The Layer 4 Appendix A schema commitments — documented during Pillar 4 conversation but not yet applied to the database — are migrated during this pre-launch stretch, sequenced alongside Phase 9 and Phase 10. Each migration ships as its own focused PR with full Step 0 discovery, explicit founder approval for that specific migration, and manual click-through verification, per the migration approval gate locked in CLAUDE.md. Migrations are never bundled with feature work and never run silently.

The orders table expansion (Layer 4 §4.6) is the largest migration. The status enum expands from three values to eight: `pending` → `accepted` → `prepared` → `dispatched` → `in_delivery` → `arrived` → `received`, with `cancelled` as a parallel terminal state. New columns are added: `cancelled_by` (nullable enum), `cancellation_reason` (nullable text), and `received_at` (nullable timestamp). A read-only buyer-cancellation-history view is created with RLS restricting it to the buyer themselves and administrators. This migration requires careful Step 0 discovery of the current orders data state and a tested rollback path.

The shop owner profile expansion (Layer 4 §4.3) adds four optional columns to the shops table — `shop_type`, `delivery_setup`, `working_hours`, `location_detail` — plus two child tables: `shop_payment_methods` and `shop_categories`. The freelancer profile expansion (Layer 4 §4.4) adds three optional columns to freelancer_profiles — `working_hours`, `current_workplace`, `preferred_payment_method` — plus three child tables: `freelancer_tools`, `freelancer_education`, and `freelancer_certifications`. All new columns are nullable per the Configurable Workspace Principle; all new child tables follow the existing `freelancer_skills` RLS pattern.

The migrations are sequenced so the orders lifecycle migration lands before the Phase 9 dispute-resolution surface is built, and the profile migrations land before the Phase 9 admin content moderation surfaces are finalized. This sub-section closes when every Layer 4 Appendix A migration is applied to the database, verified by querying the live schema state, covered by RLS policies tested for correct row-gating, and confirmed by manual verification that the existing application code still works against the expanded schema.

### 6.2.5 — The User-Facing Pillars: Marketing (5), Brand (3), Design System (2)

Once the engineering work above is complete — Phase 8 finished, Phase 9 admin dashboard built, Phase 10 polish done, and the Layer 4 Appendix A migrations applied — Servyou turns to the three user-facing strategic Pillars that have been deliberately deferred. This deferral is a locked founder decision: the brand, marketing, and design Pillars are the biggest case for Servyou's success against established competitors, and they require dedicated fresh-session work rather than energy left over at the end of an engineering day. They are never written mixed into a same-day backend coding session.

Pillar 5 (Content and Marketing Strategy) is written first, covering social-media strategy (Facebook, Instagram, TikTok), content positioning against competitors (Converty, Jumia Tunisia, MyTek), the seller-driven growth model from Layer 2, the advertising approach, and the launch marketing plan.

Pillar 3 (Brand and Visual Identity) is written second, covering the color palette, typography decisions, logo direction, and brand voice and tone — the personality Servyou speaks with, constrained by the data-minimization principle from Pillar 1 §1.2.2 and speaking to the specific Tunisians described in Pillar 4.

Pillar 2 (Design System and UX Principles) is written third and most detailed, producing the standard design rules the redesign pass applies to every coded page. It draws inspiration from: Shopify for shop owner dashboard elements, Upwork for freelancer dashboard elements, Webflow for visual design language and typography systems, Framer for motion design and interaction patterns, and Pinterest for visual discovery and grid layouts. Pillar 2 must lock concrete standard design rules — design tokens, component patterns, mobile-first behavior, RTL behavior, and WCAG 2.2 AA compliance — before the redesign pass begins.

This sub-section closes when Pillars 5, 3, and 2 are each written, discussed, and locked in their own dedicated sessions.

### 6.2.6 — The Redesign Pass

Once Pillars 5, 3, and 2 are locked, Servyou enters the redesign pass — the phase where every coded page has its visual layer rebuilt per the locked Pillar 2 design system. The underlying functionality stays exactly as coded through Phases 8, 9, and 10. What changes is the visual expression — colors from the locked design tokens, typography from the locked type scale, components rebuilt to the locked component patterns, spacing normalized to the locked spacing scale, mobile-first and RTL behaviors verified against Pillar 2 rules.

The redesign pass proceeds page by page and dashboard by dashboard in sequenced PRs following the checkpoint pattern: Step 0 discovery, implementation against the locked Pillar 2 system, local build verification, founder manual click-through on real devices in both French and Arabic and both layout directions.

The shop owner dashboard redesign draws from the Shopify-inspired elements locked in Pillar 2. The freelancer dashboard redesign draws from the Upwork-inspired elements. The consumer-facing pages draw from Pinterest-inspired discovery, Webflow-inspired visual design language, and Framer-inspired interaction patterns. The admin dashboard receives the same design system treatment as every other surface.

The redesign pass closes when every page and dashboard has been rebuilt per the locked Pillar 2 system, verified in both languages and both layout directions on desktop and mobile. At this point Servyou is feature-complete, schema-complete, and design-complete — ready for OVH domain purchase and launch.

### 6.2.7 — OVH Domain Purchase and Launch Readiness

The OVH domain purchase is the last mechanical step before Servyou opens to real Tunisian users. It is deliberately sequenced last because the domain purchase commits Servyou to a public identity that cannot easily be undone. Buying the domain before the platform is ready would create pressure to launch before launch criteria are satisfied.

The launch readiness gate. Before the domain is purchased, every item on the following list must be satisfied: Phase 8 complete (French and Arabic locales both production-ready, RTL verified in both languages); Phase 9 complete (admin dashboard functional, RLS coverage verified, every moderation flow click-through approved); Phase 10 complete (Sentry live, Cloudflare Turnstile active, zero critical or high npm audit vulnerabilities, four legal documents lawyer-reviewed and published in French and Arabic, accessibility self-audit clean at WCAG 2.2 AA, load test confirming 3-5x headroom); all Layer 4 Appendix A schema migrations applied and verified; Pillars 5, 3, and 2 locked; redesign pass complete with every critical journey verified in both languages and both layout directions on desktop and mobile.

Only when every item on that list is satisfied does the founder purchase the domain from OVH Cloud, configure the DNS records pointing to Vercel's deployment, verify the production URL renders correctly in both languages and both layout directions, and open Servyou to the first real Tunisian users.

The first real users will not find a perfect platform — no launch does. They will find a complete platform: every feature documented in Layer 3 working correctly, every role documented in Layer 2 functional, every schema commitment from Layer 4 applied, the brand and design system from Pillars 2 and 3 visible and consistent, and the monitoring stack from Pillar 1 §1.6.4 live and watching. That completeness, not perfection, is the launch standard Servyou holds itself to.

## 6.3 — Post-launch Growth

Post-launch growth begins the moment Servyou opens to real Tunisian users and ends when the platform transitions to collaboration scale — the point at which institutional partnerships, formal compliance milestones, and integration work become the primary driver of Servyou's growth. The post-launch growth stage is roughly the period from the first real user to the first thousand active users, the first repeat transactions, and the first moments where the platform's reliability and performance are tested by real load rather than simulated headroom tests.

The monitoring posture deepens immediately. The pre-launch monitoring stack transitions from "configured and verified" to "actively tuned" — Sentry noise filtered, genuine error signals routed to the fastest notification channel, uptime monitoring added independently of Sentry so outages are detected even if the application itself is down. If observed database query latency or authentication throughput approaches a third of the provisioned headroom, the Plan B from Pillar 1 §1.8.4 is activated — Supabase paid tier upgrade, read replica enablement, connection pooling via PgBouncer — without waiting for the limit to be hit.

The first INPDP authorization filing is submitted in this stage, once real personal data is being processed from real Tunisian users. The four published legal documents are reviewed against real user behavior and updated where needed, with a Tunisian lawyer reviewing any substantive changes.

The first real product iterations happen here, driven by evidence rather than assumption. Real-platform analytics (privacy-respecting, behavioral patterns only) reveal which categories are browsed most, which products convert to orders, which steps users abandon, which features are used most. Periodic feedback sessions with active users — real buyers, shop owners, and freelancers — produce qualitative insight alongside the quantitative analytics. Per Pillar 4 §4.16, this is the first time Servyou's understanding of its users moves beyond the founder's observation and the market data that anchored Pillar 4.

Two post-MVP features come online in this stage. The Converty connector integration (per Layer 2 §2.4's post-MVP dropshipping trajectory) is evaluated once Servyou has enough active dropshipper users to justify the integration cost — Converty's API stability and terms of service are reviewed as the Step 0 discovery before any integration work begins. The buyer-rating and reputation system (per Pillar 4 §4.14.4) is evaluated once the buyer-cancellation-history view from Layer 4 §4.6 has accumulated enough real data to make reputation signals meaningful.

The Konnect payment integration is evaluated in this stage as well, though it may slip to collaboration scale depending on the pace of Servyou's growth. Konnect integration brings in-platform payment as the first real alternative to COD, with the full PCI-aware integration discipline from Pillar 1 §1.12.4.

Post-launch growth closes and collaboration scale begins when the platform is stable under real load, the INPDP filing is submitted, real user feedback has informed at least one meaningful product iteration, and Servyou is ready to begin formal conversations with institutional partners.

## 6.4 — Collaboration Scale

Collaboration scale is the stage where Servyou moves from a platform that serves individual Tunisian users to a platform that engages institutional partners — the Tunisian Ministry of Finance, Tunisian banks, payment processors, delivery companies, and eventually government APIs. The defining characteristic of this stage is that Servyou's credibility is no longer self-asserted; it is evaluated by external institutions with their own due diligence processes and their own compliance requirements.

The Tunisian Ministry of Finance startup-label application is the first collaboration-scale milestone. The institutional readiness package supplies this proof: the Layer and Pillar documents demonstrate deliberate product thinking, the GitHub PR history demonstrates consistent engineering discipline, the legal documents demonstrate regulatory awareness, and the INPDP filing demonstrates data-protection seriousness. The startup-label application is submitted when the package is complete and Servyou's post-launch growth numbers are strong enough to support the application credibly.

The first formal bank partnership conversations begin in this stage. Tunisian banks evaluating Servyou will examine the institutional readiness package, with particular attention to Pillar 1's security posture, the data protection framework, and the PCI-aware payment integration design. The Konnect integration, if not already live from post-launch growth, is completed in this stage.

Delivery company integration addresses the COD-failure pain point that Layer 2 §2.4 named as one of the shop owner's deepest fears. At collaboration scale, Servyou integrates with at least one Tunisian delivery company API, bringing order-confirmation workflows and delivery-tracking visibility into the platform. Each delivery company integration goes through its own Step 0 discovery, technical due diligence, and explicit founder approval.

The first liberal-professional role family additions come online at this stage. Per Layer 2 §2.1's post-MVP role roadmap, liberal professionals — doctors, lawyers, accountants, engineers, architects, and other licensed professional categories — are the first expansion beyond the MVP's freelancer and shop-owner roles. The Unified Workspace Principle from Pillar 4 §4.8 applies here directly: Servyou earns the right to serve liberal professionals by having served freelancers excellently in the earlier stages.

The international dropshipping connector integrations — AliExpress, Alibaba, Shopify — are evaluated at collaboration scale with the regulatory, payment, and trust infrastructure that makes them responsible additions. Per Layer 2 §2.4's post-MVP trajectory, these connectors sequence after the Converty integration that comes online during post-launch growth.

Formal external certifications are pursued where they unlock specific partnerships: the PCI SAQ filing for bank partnerships, an external security audit within twelve months of launch validating the OWASP alignment, and ISO 27001 alignment if partner contracts explicitly require it.

Collaboration scale closes when the startup-label is obtained, at least one bank partnership is operational, the Konnect payment integration is live, at least one delivery company integration is live, the liberal-professional role family is launched with at least two profession sub-templates active, and the institutional readiness package has been validated by at least one external assessor.

## 6.5 — Cup-and-international Scale

Cup-and-international scale is the stage where Servyou moves from a Tunisian platform with institutional partners to a platform making its case on the national and international stage — the 2027 Tunisian national startup cup, and the California world stage beyond.

The 2027 Tunisian national startup cup is the first major public milestone at this stage. The cup application is submitted with the full institutional readiness package as its evidence base: the Layer and Pillar foundation documents, the GitHub history, the growth metrics, the startup-label recognition, the partnership credentials, and the INPDP filing. The cup pitch is built from this evidence, not assembled from scratch under pressure.

International positioning materials in English are prepared in this stage, translating Servyou's Tunisian story into language that international evaluators and partners can read without prior knowledge of the Tunisian market. The core of this positioning is Pillar 4's real market data — the 84.3% internet penetration, the 56-80% COD dominance, the seven-city seller concentration, the 1,040+ startups and 82 tech institutions — reframed as evidence of a large, underserved, high-growth market that Servyou is positioned to lead.

The small-company role family launches at this stage, per Layer 2's later-additions roadmap. Small companies — registered Tunisian businesses needing invoicing capabilities, possibly multi-employee accounts, and the commercial credibility of a verified business presence on Servyou — arrive as a new user type built on the same foundation that served freelancers and shop owners in earlier stages.

Multi-region Supabase deployment is evaluated at this stage if international users or partners require it. The Plan-A-B-C principle from Pillar 1 §1.8.4 guides this decision: Plan A continues if Tunisian user concentration means a single Frankfurt region remains adequate; Plan B activates additional regions if observed latency or partner contracts justify it.

The path toward serving the non-internet population — the 16% of Tunisians named as out of MVP scope in Pillar 4 §4.12.1 — is evaluated at this stage. If Servyou's growth trajectory and platform maturity justify extending toward community channels, voice interfaces, or partnered intermediary services, that extension is planned deliberately with the same carriage-and-horses discipline.

The California world stage pitch, beyond the 2027 cup, is the horizon that the 2030 vision in Layer 1 names. At that stage Servyou's story is no longer a Tunisian startup story — it is a model for how commerce platforms should be built for markets that are mobile-first, COD-dominant, multilingual, and underserved by generic global platforms.

## 6.6 — Closing: How the Roadmap Stays Honest

Pillar 6 is a commitment to sequence and direction, not to calendar dates. The stages named in §6.1 through §6.5 describe what comes before what, and what must be true before each stage transitions to the next. They do not name specific months or years beyond the 2027 cup horizon, because specific dates would require the founder to predict conditions — funding, team size, market response, partnership timelines, regulatory decisions — that cannot honestly be predicted from today's vantage point.

The discipline that keeps Pillar 6 honest as conditions change is the same discipline that produced it: the founder makes deliberate decisions, names them explicitly, and updates the roadmap when reality diverges from the plan. When a stage takes longer than expected, Pillar 6 is updated to reflect the new reality rather than left as an aspirational artifact that no longer describes the actual plan.

Three principles govern how Pillar 6 updates happen. First, the sequence is more durable than the content. The order in which stages happen is locked by logic, not preference — content within each stage can be reordered, expanded, or contracted, but the stage sequence itself does not change without a formal founder decision and an explicit update to this document. Second, deferral is not failure. When a milestone moves to a later stage, the deferral is recorded honestly with reasoning — deferral with reasoning is good planning; silent deferral is how roadmaps become fiction. Third, the carriage-and-horses framing holds permanently. At every stage, Servyou commits to what that stage's carriage can hold. Reaching for collaboration-scale horses before the post-launch carriage is ready does not accelerate growth — it destabilizes the carriage.

Pillar 6 is the final Pillar of Servyou's foundation documents. Reading all six Pillars together: Pillar 1 named how Servyou is built; Pillar 4 named who Servyou is built for; Pillar 5 will name how Servyou reaches those people; Pillar 3 will name how Servyou speaks to them; Pillar 2 will name how Servyou looks and feels to them; and Pillar 6 names when and in what order everything happens. Together they describe not just a platform but an approach to building — deliberate, honest, disciplined, anchored in real Tunisian reality, and ambitious enough to aim for the world stage. The foundation is complete. The build continues.

## Status

Pillar 6 is **fully locked** — all six sections written and approved by the founder across a single session.
