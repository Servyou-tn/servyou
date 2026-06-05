# SERVYOU — PILLAR 6: ROADMAP

This is the sixth and final Pillar in the Servyou foundation documents, built section by section with the founder and locked before moving on. Pillar 6 takes everything established in Pillars 1 and 4, and in Layers 2, 3, and 4, and turns it into a time-sequenced roadmap from today's pre-launch state through the 2027 Tunisian national startup cup, the California world stage, and beyond.

Pillars 1 (Engineering Standards) and 4 (Target Users and Market) are complete and locked. Pillars 2 (Design System and UX Principles), 3 (Brand and Visual Identity), and 5 (Content and Marketing Strategy) are sequenced as user-facing strategic work, to be written in dedicated sessions after engineering work is further along (per the locked strategic sequence in CLAUDE.md). This document covers Pillar 6, written section by section across multiple sessions in the same discipline established by Pillar 1.

## Structural Framing

Pillar 6 uses the **carriage-and-horses scale-stages** locked in Pillar 1 §1.0 as its primary structure. Each section corresponds to a scale-stage, and within each section the engineering, product, brand, marketing, compliance, and partnership work expected at that stage is sequenced honestly.

The five scale-stages, recapped from Pillar 1:

- **Today** — the current state. Solo founder with AI tooling, MVP build in progress, no real users yet, no external scrutiny yet.
- **Pre-launch** — Phase 10 polish work, opening to the first real Tunisian users. Sentry-grade error monitoring and Cloudflare Turnstile-grade bot protection come online here, per the items already parked in CLAUDE.md and Layer 7.
- **Post-launch growth** — the first thousand active users, the first repeat transactions, the first moments where Servyou's performance and reliability are tested by real load.
- **Collaboration scale** — the Ministry of Finance startup-label application, the first formal partnership conversations with Tunisian banks, the Konnect payment integration.
- **Cup-and-international scale** — preparing for the 2027 national startup cup pitch, then the world stage. Institutional readiness in full.

The horses are added as the carriage grows. Today's Servyou commits to what today's Servyou can hold; tomorrow's Servyou commits to what tomorrow's Servyou requires. This discipline — neither over-committing today nor under-committing tomorrow — is what makes Pillar 6 both honest about the present and ambitious for the future.

## 6.1 — Today: Servyou's Current State

Pillar 6 begins by stating honestly where Servyou is at the moment of writing, because every milestone that follows only makes sense relative to this starting point.

**The platform code.** Servyou today is a Next.js 16 application built solo by the founder, with Claude Code as implementing collaborator, running on Vercel's free tier deployment with a Supabase Postgres backend in eu-central-1 (Frankfurt) on the free tier. Through the date of this document, nineteen pull requests have been merged into `main`, taking the build through Phase 8 Subtask 2b. The codebase carries the custom internationalization foundation (French complete with 372 locale keys, Arabic deferred to Phase 8 Subtask 3), Tailwind v4.3 logical-class RTL support with the DirArrow component for directional icons, the public-facing consumer-and-seller marketplace structure, Supabase Auth with verified email signup, the Phase 7 job-posting flow with progressive phone collection (five Tunisian phone formats validated through twenty-six tests), and the privacy hardening migration (`public_profiles` view and `get_contact_phone` RPC) from PR #13.

**The database.** Fifteen tables are live on Supabase with Row Level Security on every table, all schema migrations applied as of the postcss security fix commit `eccc95a`. The current orders table holds a three-value status enum (`pending`/`completed`/`cancelled`) — the eight-value lifecycle expansion locked in Layer 4 §4.6 has been documented but is not yet applied to the database. The shop owner profile additions, freelancer profile child tables, and cancellation discipline columns from Layer 4 Appendix A are also documented but not yet applied. These pending migrations are sequenced into Phase 9 or Phase 10 with full Step 0 discovery, founder approval gate, and manual click-through verification each, per CLAUDE.md's migration discipline.

**The foundation documents.** Five locked foundation documents are committed to the repository under `docs/`: Pillar 1 (Engineering Standards, approximately 879 lines including the Appendix A item A.7 cross-reference from commit `29e7e40`), Pillar 4 (Target Users and Market, 369 lines from commit `5588d39`), Layer 2 (Users and Roles, 85 lines from commit `463b13d`), Layer 3 (Features and Journeys, 101 lines from commit `6d05a07`), and Layer 4 (Data Model, 121 lines from commit `db0a6ad`). CLAUDE.md at the repository root carries both the Pillar 1 operational summary (added yesterday) and the Pillar 4 operational summary (added today in commit `5a83d4d`). The four founder-contributed principles — the headroom principle, the Plan-A-B-C principle, the Unified Workspace Principle, and the Configurable Workspace Principle — are named formally across Pillar 1 §1.9, Pillar 1 §1.16, Pillar 4 §4.8, and Pillar 4 §4.10.

**The user base.** The platform is NOT yet open to real users. The database holds three test accounts (one shop owner, two freelancers, all under the same `moatezsahbeni500+...@gmail.com` email family for testing). No domain has been purchased — the platform is accessible only via Vercel's auto-assigned deployment URL. No marketing has begun. No social media presence exists for Servyou as a brand. No legal documents (Terms of Service, Privacy Policy, Cookie Policy, Accessibility Statement) are published — they are deferred to Phase 10 with mandatory Tunisian lawyer review before publication. No INPDP authorization filing has been submitted. No partnership conversations have begun.

**The repository state.** The repository at `github.com/Servyou-tn/servyou` is PRIVATE (set during the Pillar 1 commit work) with seven commits across the day Pillar 6 §6.1 was first drafted and one moderate Dependabot vulnerability closed (postcss XSS, fixed in commit `eccc95a`). Vercel auto-deployment is operational. The branch protection is informal (founder-only `main`); formal branch protection rules are sequenced for Phase 10. No CI tests run on push beyond Vercel's own build verification; formal CI pipeline is sequenced for Phase 10.

**This is the starting point.** Every milestone in §6.2 through §6.5 below builds from here. The roadmap is not a fantasy of "if everything goes perfectly" — it is the deliberate sequencing of work from this current state to the 2027 Tunisian national startup cup and the California world stage beyond. Today's Servyou commits to what today's Servyou can hold; tomorrow's Servyou commits to what tomorrow's Servyou requires, per the carriage-and-horses framing locked in Pillar 1 §1.0.

## 6.2 — Pre-launch — TO BE WRITTEN

Pre-launch is the largest section of Pillar 6 because the engineering, product, brand, marketing, compliance, and legal work between Today and Launch is the densest stretch of Servyou's roadmap. This section will be written in a dedicated future session, with the same discuss-write-lock discipline as §6.1, covering at minimum: the sequencing of Phase 8 Subtask 3 (Arabic translations) → Phase 9 (admin dashboard) → Phase 10 (polish); the application of the Pillar 4 Appendix A schema migrations into Phase 9 or Phase 10; the writing of Pillars 5, 3, and 2 in dedicated fresh sessions per the locked strategic sequence; the lawyer review of the four legal documents in French and Arabic; the pre-launch monitoring stack activation (Sentry, Cloudflare Turnstile, npm audit gate, Vercel monitoring, Supabase audit logs); the accessibility self-audit; the load test verifying the headroom principle from Pillar 1 §1.8.3; the design redesign pass applying Pillar 2 to the coded pages; the OVH domain purchase; and the production launch criteria — what must be true before the platform opens to real Tunisian users.

## 6.3 — Post-launch growth — TO BE WRITTEN

Post-launch growth is the period from the first real user to approximately the first thousand active users, where Servyou's monitoring, alerting, and observability commitments deepen from "good enough for pre-launch" to "production-grade for real load." This section will be written in a dedicated future session, covering at minimum: the activation of the read replica and connection pooling in the data layer if observation demands it; the first INPDP filing once real personal data is being processed; the first post-launch dependency review and any backlogged tech-debt repayment; the Konnect payment integration sequencing; the Converty connector integration as the first post-MVP dropshipping integration (per Layer 2 §2.4's post-MVP trajectory); the buyer-rating system as the first post-MVP COD friction addition (per Pillar 4 §4.14.4); the first periodic user-feedback sessions (per Pillar 4 §4.16); the first real-platform analytics review; and the criteria for the post-launch growth stage to transition into the collaboration scale stage.

## 6.4 — Collaboration scale — TO BE WRITTEN

Collaboration scale is the stage where Servyou begins formal conversations with institutional partners: the Tunisian Ministry of Finance for the startup-label application, the Tunisian banking sector for payment partnership conversations beyond Konnect, the delivery companies for integration that addresses the COD-failure pain point (per Layer 2 §2.4), and the first government-API integrations if the platform's compliance trajectory requires them. This section will be written in a dedicated future session, covering at minimum: the institutional readiness package as continuously maintained; the formal certifications pursued at this stage (PCI SAQ filing, possibly ISO 27001 alignment depending on partner requirements); the external security audit commissioned within twelve months of launch; the international dropshipping connector integrations (AliExpress, Alibaba, Shopify) as collaboration-scale additions; the first liberal-professional role family additions (doctors, lawyers, accountants, engineers) per Layer 2's post-MVP role family; and the team-growth sequencing if Servyou begins hiring beyond the solo founder.

## 6.5 — Cup-and-international scale — TO BE WRITTEN

Cup-and-international scale is the stage where Servyou prepares for the 2027 Tunisian national startup cup pitch and the California world stage beyond. This section will be written in a dedicated future session, covering at minimum: the cup pitch documentation derived from the institutional readiness package; the formal cup application timing; the international positioning materials in English; the small-company role family additions per Layer 2 (registered businesses needing invoicing and multi-employee accounts); the multi-region Supabase deployment if international users justify it; the path to serving the non-internet population that Pillar 4 §4.12.1 names as out of MVP scope; and the long-term vision per the 2030 horizon named in Layer 1.

## 6.6 — Closing — TO BE WRITTEN

A closing section will be written once §6.2 through §6.5 are locked, recapping how the roadmap stays honest as conditions change — the discipline that real founder decisions about timing, sequencing, and resource allocation override any specific timeline in Pillar 6 if observed reality requires it. The roadmap is a commitment to *sequence and direction*, not to specific calendar dates that the founder cannot honestly guarantee from today's vantage point.

## Status

Pillar 6 §6.1 is **locked**.

Pillar 6 §6.2, §6.3, §6.4, §6.5, and §6.6 are **drafted as placeholders** and will be written in subsequent sessions, each with the same discuss-write-lock discipline that produced §6.1 and every other locked Pillar and Layer section.

The carriage-and-horses framing applies to writing Pillar 6 itself: today's Servyou locks §6.1 because §6.1 is what today's Servyou can honestly say. The remaining sections are added as the foundation work is ready for them, not before.
