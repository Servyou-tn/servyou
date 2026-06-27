# Servyou Skills Catalog

> Project-local Claude Code skills for the Servyou marketplace platform.
> Each skill loads conditionally when its trigger phrases match the active task.
> Always-on rules live in `../CLAUDE.md` (loaded every prompt).

## Quick reference — which skill fires when

| When CC is about to... | Skill that fires |
|---|---|
| Write Tailwind classes, build a component, modify a page layout | [`servyou-design-system-compliance`](./servyou-design-system-compliance/SKILL.md) |
| Add a user-visible string, write a label, modify fr.ts or ar.ts | [`servyou-i18n-vocabulary-lock`](./servyou-i18n-vocabulary-lock/SKILL.md) |
| Claim a PR done with UI changes — before push | [`servyou-visual-gate`](./servyou-visual-gate/SKILL.md) |
| Build a stat tile, chart, or widget that touches deferred features | [`servyou-phase-aware-features`](./servyou-phase-aware-features/SKILL.md) |
| Run any schema change, migration, or DDL | [`servyou-discovery-first-migration`](./servyou-discovery-first-migration/SKILL.md) |

## The 5 skills

### 1. `servyou-design-system-compliance`

**Purpose:** Enforce the locked design system (`servyou-design-system-reference-v1.md`) on every visual change. No invented tokens, no off-system components, no hex literals, no arbitrary pixels.

**Fires on:** UI work — components, styling, CSS, Tailwind classes, page layouts, sidebar, topbar, cards, tiles, status pills, charts, forms.

**Enforces:**
- Use locked color tokens (Section 2) — no `bg-[#2563EB]`
- Use locked components (Section 4) — no reinventing StatTile as "StatCard"
- Use locked page patterns (Section 5)
- Cite design system Section numbers in commit body

**Coordination:** Pairs with i18n-vocabulary-lock + visual-gate.

→ [Read the full skill](./servyou-design-system-compliance/SKILL.md)

---

### 2. `servyou-i18n-vocabulary-lock`

**Purpose:** Enforce FR+AR parity, locked vocabulary, RTL discipline, and locale-aware formatting. Born from PR-F2.3.1 AR root-cause fix.

**Fires on:** Any user-visible string. Adding to fr.ts or ar.ts. Writing JSX text. Form labels. Toast messages. Error messages. Tailwind directional classes.

**Enforces:**
- Every string goes through `t()` — no hardcoded JSX text
- Every new key has both FR and AR values in the same commit
- Locked vocabulary from design system Section 6 ("Mes engagements" not "Projets")
- Tailwind logical properties only (`ps-`, `pe-`, `text-start`)
- Locale-aware dates, numbers, and Tunisian Dinar formatting

**Coordination:** Pairs with design-system-compliance + visual-gate.

→ [Read the full skill](./servyou-i18n-vocabulary-lock/SKILL.md)

---

### 3. `servyou-visual-gate`

**Purpose:** Run the 6-gate walkthrough before any UI PR is pushed. Catch regressions before merge. Log pre-existing bugs without blocking the current PR.

**Fires on:** "Ready to push", "PR done", "ship it", "before I merge", or whenever CC has just finished UI work and is about to declare a PR complete.

**The 6 gates:**
1. Create flow — does the form work end-to-end?
2. Read flow — does the public/list/detail view render?
3. Edit flow — does the existing-data form work?
4. AR/RTL toggle — does layout flip correctly?
5. Mobile 375px — no horizontal scroll, 44×44 targets?
6. Around-it surface — do linking pages still work?

**Decision:** All PASS → push. Any FAIL caused by this PR → STOP and fix. Pre-existing FAIL → log follow-up, don't block.

**Coordination:** Runs LAST, after design-system-compliance and i18n-vocabulary-lock.

→ [Read the full skill](./servyou-visual-gate/SKILL.md)

---

### 4. `servyou-phase-aware-features`

**Purpose:** Prevent two failure modes — fake data leaks (showing invented metrics) and broken-looking zeros (rendering 0 for every deferred feature). Honest "Bientôt disponible" placeholders instead.

**Fires on:** Building widgets, stat tiles, charts, dashboards that involve features marked [Phase 3] / [Phase 4] / [Phase 5] in design system Section 7. Also triggers on earnings, wallet, ratings, reviews, recommendations, analytics, deltas.

**Enforces:**
- Map each visual element to its feature's phase status
- Use `ComingSoonCard` component for deferred features
- Same visual frame as the eventual widget
- Locked "Bientôt disponible" copy in FR + AR
- Never hardcode fake numbers in production code

**Coordination:** Pairs with design-system-compliance + i18n-vocabulary-lock.

→ [Read the full skill](./servyou-phase-aware-features/SKILL.md)

---

### 5. `servyou-discovery-first-migration`

**Purpose:** Prevent silent breakage from undocumented schema state. Born from PR-F2.3 search_vector trap. Discovery first, propose plan, STOP for approval, then apply.

**Fires on:** Any DDL operation, migration, schema change, RLS policy change, trigger change, column add/drop, table create/alter.

**The 4-phase flow:**
1. **DISCOVER** — Read information_schema, pg_indexes, pg_policy via `execute_sql`
2. **REPORT** — Structured findings + conflicts + risks + proposed plan
3. **STOP** — Wait for founder approval. NEVER proceed unilaterally.
4. **APPLY** — Only after explicit approval, run via `apply_migration`, mirror to /db/migrations/, verify post-apply

**Enforces Standards A + B** from `servyou-standards-reference.md` Section 9.

**Coordination:** Independent of UI skills. Runs FIRST in PRs that combine schema + UI changes.

→ [Read the full skill](./servyou-discovery-first-migration/SKILL.md)

---

## How to use this skill set

### When starting a new PR

CC reads `.claude/CLAUDE.md` first (always-on rules), then waits to see which skills the task triggers. Most PRs trigger 2-3 skills:

- **Pure UI migration:** design-system-compliance + i18n-vocabulary-lock + visual-gate
- **New feature page with widgets:** all 3 above + phase-aware-features
- **Backend/schema change:** discovery-first-migration alone (or + UI skills if also a frontend change)

### When the skills feel constraining

The skills are MINIMUMS, not ceilings. If they slow you down on the first 2-3 PRs, that's the discipline locking in. After 5-10 PRs, the loop is automatic and the velocity is HIGHER than without them — because regressions don't happen, design drift doesn't accumulate, and migrations don't corrupt data.

### When to add a new skill

When you find yourself pasting the same multi-step instruction into CC prompts 3+ times, that's the signal — turn it into a 6th skill. Likely candidates as Servyou grows:
- `servyou-multi-role-testing` — when the layout shell ships and we need to test Freelancer / Consumer / Shop Owner role labels everywhere
- `servyou-component-reuse-audit` — when the component library matures and reuse-vs-build decisions become frequent
- `servyou-supabase-rls-checklist` — when admin features ship and RLS complexity grows

### When to retire a skill

Run a monthly audit. If a skill hasn't fired in 30 days, consider archiving it. Skills you keep should pay rent every week.

## Architecture notes

- All skills live at `<repo-root>/.claude/skills/<skill-name>/SKILL.md`
- Always-on rules live at `<repo-root>/.claude/CLAUDE.md`
- Reference docs live in project knowledge (loaded via CC + Claude context, not skills)
- Skills are committed to git so the whole team uses the same discipline

## Reference

- Master design system: `servyou-design-system-reference-v1.md` (project knowledge)
- Quality standards: `servyou-standards-reference.md` (project knowledge)
- Strategic specs: `servyou-freelancer-world-class-spec.md`, `servyou-freelancer-tools-accounts-spec.md` (project knowledge)
- Foundation docs: `product.md`, `roadmap.md`, `data-model.md`, `engineering-standards.md` (project knowledge)

---

**Built:** 2026-06-26
**Maintainer:** Moatez (founder)
**Last updated:** v1.0 — initial 5-skill framework launch
