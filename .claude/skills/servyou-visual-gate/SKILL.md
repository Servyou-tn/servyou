---
name: servyou-visual-gate
description: |
  Use this skill BEFORE pushing, merging, or claiming done ANY PR that involves visual UI changes on Servyou. MUST trigger when the user says: "push the PR", "ready to merge", "ship it", "claim done", "PR done", "finished the PR", "ready for review", "visual gate", "QA the PR", "test the PR", "walk through the changes", "verify it works", "final check", "pre-merge check", "before I merge", or when CC has just finished writing UI code and is about to declare the PR complete. ALSO trigger when CC has just completed work on: a page migration, a new page build, a component build, a layout change, a sidebar change, a topbar change, a form change, a list view, a grid view, a wizard step, a settings tab, or any change visible to a user. This skill RUNS the 6-gate walkthrough (create flow, read flow, edit flow, AR/RTL toggle, mobile 375px, around-it surface) and reports PASS/FAIL/NEEDS_USER_CHECK per gate. If ANY gate fails, the PR does NOT get pushed — instead, report to the founder for direction. This skill is non-negotiable for UI work and applies in addition to `servyou-design-system-compliance` and `servyou-i18n-vocabulary-lock`.
---

# Servyou Visual Gate — 6-Gate Walkthrough

Born from PR-F2.3. Every UI PR runs through 6 gates before merge. Catches functional regressions, AR leaks, mobile breakage, and around-it surface drift. Pre-existing bugs found here get LOGGED (not blocking) per Standard G. New regressions get FIXED (blocking).

## When this skill runs

The skill runs **after CC has finished writing code** but **before the push/merge step**. It is a MANDATORY checkpoint for any PR touching .tsx files in:
- `src/app/**/*.tsx` (pages)
- `src/components/**/*.tsx` (components)
- `src/lib/i18n/*.ts` (when paired with visible UI change)

## The 6 gates

For each gate, report one of three statuses:
- ✅ **PASS** — verified working, no regressions
- ❌ **FAIL** — broken by this PR, must fix before merge
- ⚠️ **NEEDS_USER_CHECK** — can't verify automatically, founder must walk through

### Gate 1 — Create flow

**What:** The "create" path of the affected feature works end-to-end.

**How to verify:**
- If PR touches a form: walk through filling and submitting the form
- If PR touches a list with "Create" CTA: click the CTA, reach the form, verify it loads
- If PR touches a service/product/listing: create a new one, verify it saves and appears
- Confirm: no validation errors on initial render of a clean form (per standards-reference Section 6)
- Confirm: success state shows after submit
- Confirm: redirects to the right next page

**Report:** "Gate 1 — Create flow: [PASS/FAIL/NEEDS_USER_CHECK] — [specific finding]"

### Gate 2 — Read flow

**What:** The public/list/detail view of the affected feature reads correctly.

**How to verify:**
- If PR touches a list page: list renders, items show with correct data
- If PR touches a detail page: detail loads, all sections render
- If PR touches a public profile/service: public view works for anonymous user
- Confirm: counts match reality (no fake "0" hiding broken queries)
- Confirm: empty states show when data is empty (per design system Section 4.21)
- Confirm: loading states don't flash broken UI

**Report:** "Gate 2 — Read flow: [PASS/FAIL/NEEDS_USER_CHECK] — [specific finding]"

### Gate 3 — Edit flow

**What:** The edit path works AND preserves existing data correctly.

**How to verify:**
- If PR touches a form with edit mode: open existing record, verify pre-fill
- Confirm: backfilled fields show in amber/warning state (NOT red) per standards-reference Section 6
- Confirm: editing and saving updates the record
- Confirm: cancel doesn't lose data unsaved by mistake (or warns)
- Confirm: validation logic same as create (validators are shared)

**Report:** "Gate 3 — Edit flow: [PASS/FAIL/NEEDS_USER_CHECK] — [specific finding]"

### Gate 4 — AR/RTL toggle

**What:** Page renders correctly in Arabic with RTL layout.

**How to verify:**
- Toggle language to Arabic
- Confirm: ALL visible text shows in Arabic (per `servyou-i18n-vocabulary-lock`)
- Confirm: NO French strings leaking
- Confirm: layout flips correctly — sidebar position, icon positions, chip × buttons, etc.
- Confirm: Tailwind logical properties used everywhere (no `pl-`, `text-left`, etc.)
- Confirm: numbers stay LTR within Arabic text (Tunisian convention)
- Confirm: dates and TND formatting are Arabic-locale-aware
- Specifically check sidebar items, status pills, button labels, form labels, helper text, error messages

**Report:** "Gate 4 — AR/RTL: [PASS/FAIL/NEEDS_USER_CHECK] — [specific finding, e.g. 'String at line 47 leaks French in AR mode']"

### Gate 5 — Mobile 375px

**What:** Page works on iPhone SE viewport (375×667) — narrowest realistic test.

**How to verify (per standards-reference Section 5):**
- DevTools mobile mode → iPhone SE
- Confirm: no horizontal scroll
- Confirm: all buttons tappable at 44×44 minimum
- Confirm: no text below 14px
- Confirm: form inputs at 16px to prevent iOS zoom
- Confirm: sticky elements don't cover content
- Confirm: sidebar collapses to hamburger drawer correctly
- Confirm: right column stacks below main content (not beside)
- Confirm: stat tile grids reflow to 2×3 or single column
- Confirm: data tables become scrollable horizontally OR cards

**Report:** "Gate 5 — Mobile 375px: [PASS/FAIL/NEEDS_USER_CHECK] — [specific finding]"

### Gate 6 — Around-it surface

**What:** Pages that LINK to the changed surface still work.

**How to verify:**
- List every other page that links to the changed page (e.g., sidebar items, dashboard widgets, breadcrumbs)
- Click those links from those other pages
- Confirm: links still resolve to the right URL
- Confirm: breadcrumbs match the new structure
- Confirm: no broken links anywhere
- This is where PR-F2.3 found 3 broken sidebar links (pre-existing) and 1 silent log error

**Report:** "Gate 6 — Around-it: [PASS/FAIL/NEEDS_USER_CHECK] — [specific finding]"

## Decision rules

After all 6 gates:

| Result | Action |
|---|---|
| All PASS (or NEEDS_USER_CHECK only) | **Proceed** — push the PR. Tag Moatez for the NEEDS_USER_CHECK items. |
| Any FAIL caused by this PR | **STOP** — do not push. Fix the regression in this PR. |
| Any FAIL that is pre-existing (not caused by this PR) | **Log it** — create a follow-up PR task. Do NOT block the current PR (per Standard G). Tell Moatez. |

## What this skill does NOT do

- Does not replace `servyou-design-system-compliance` — that's the build-time discipline
- Does not replace `servyou-i18n-vocabulary-lock` — that's the string-time discipline
- Does not run automated tests (yet) — purely a structured manual walkthrough
- Does not check performance (Lighthouse) — that's standards-reference Section 2 work

## Coordination with other skills

This skill runs LAST, after `servyou-design-system-compliance` and `servyou-i18n-vocabulary-lock` have done their work. If `phase-aware-features` is in play, Gate 2 must specifically verify no fake data is shown for deferred Phase 3/4 features.

## Reporting format — exact template

When CC reports the visual gate results, use this format:

```
## Visual Gate Report — PR-XYZ

**Gate 1 — Create flow:** [PASS / FAIL / NEEDS_USER_CHECK]
[1-2 sentence finding]

**Gate 2 — Read flow:** [PASS / FAIL / NEEDS_USER_CHECK]
[1-2 sentence finding]

**Gate 3 — Edit flow:** [PASS / FAIL / NEEDS_USER_CHECK]
[1-2 sentence finding]

**Gate 4 — AR/RTL toggle:** [PASS / FAIL / NEEDS_USER_CHECK]
[1-2 sentence finding]

**Gate 5 — Mobile 375px:** [PASS / FAIL / NEEDS_USER_CHECK]
[1-2 sentence finding]

**Gate 6 — Around-it surface:** [PASS / FAIL / NEEDS_USER_CHECK]
[1-2 sentence finding]

**Verdict:** [PROCEED to push / STOP and fix / LOG follow-up]
```

## Reference

- Born from PR-F2.3 6-gate walkthrough that found 4 surprises (3 pre-existing, 1 silent log)
- Locked as Standard F in `servyou-standards-reference.md` Section 9
- Origin documented in PR-F2.3.1 prompt
