---
name: figma-page-rebuild
description: Rebuild a Servyou page from its Figma frame with measured fidelity. Use whenever given Figma node IDs and asked to rebuild, connect, or match a page to the design.
---

## Rule zero — MEASURE, DON'T DESCRIBE
Never build from a written summary, a screenshot, or memory. Read the Figma via figma-cli and build to measured values. Summary = 65-70% fidelity. Measurement = 100%.

## Rule one — PROOF IS SERVED HTML
Verification means curl-ing :3000 and grepping the returned HTML. Not a headless screenshot, not a DOM measurement in a browser you launched. On the first page rebuild, the headless render and the founder's browser disagreed twice; the founder was right both times.
Before claiming ANY fix: kill every node process, rm -rf .next, start ONE dev server, report its PID and the SHA it serves, then grep. A stale dev server caused every false "verified" that night.

## Protocol
1. MEASURE — read the page frame node by node. Report an inventory: every sidebar item, every topbar control in order, filter controls, grid (columns/gap/content width), anything below. Then a value table: dims, layout sizing per axis (FIXED vs HUG), paddings, gaps with token names, each text node (size/weight/line-height/color-var/maxLines/truncation), borders, radii.
2. DIFF — inventory the served HTML the same way. One row per discrepancy, classified: MISSING · EXTRA · DIFFERENT · DEFERRED (founder-approved) · DATA (differs only because the DB holds different content). Hold for the founder's scope call. Never fix before the diff is approved.
3. BUILD to the table. Tokens only. A bracket value like h-[279px] means you are guessing — report it instead.
4. VERIFY by DOM diff against the Figma table. Cap 3 cycles; if it won't converge, stop and report.
5. BOTH LANGUAGES — FR desktop, AR desktop (mirrors, zero French leaks, prices "N TND" / "N د.ت" LTR digits), 375 mobile.
6. DELETE the old UI this page replaces, same PR. Grep first: anything still imported by a live page STAYS, logged with the page whose rebuild will kill it. Never orphan a live page.
7. Full gate in the MAIN working directory — build, tsc, lint, vitest. No worktree.

## Ground truth — do not re-derive
- v2 shell = src/components/shell/* (AppShell, Sidebar, Topbar), PR #69. Dark navy blue-950 sidebar; sections DÉCOUVRIR & ACHATS / MES ACTIVITÉS (conditional on seller_type) / OUTILS & COMPTE. AppShell accepts a null user — public routes work.
- LEGACY, dies as pages are rebuilt: MarcheLayout, MarcheSidebar, MarcheTopBar, pre-v3.7 listing cards.
- Data layer survives every rebuild: lib/**, actions.ts, validators, auth guards, migrations. UI is what gets replaced.
- Category filter is DB-driven, not the Figma's hardcoded 13. Taxonomy reconciliation is a separate migration PR.
- The Figma frames show logged-in, fully-populated mock state. Real data differing (fewer cards, hidden pagination, empty tags) is not a gap.

## Standing rules
- Server component by default; 'use client' only on the smallest interactive leaf.
- Every string through t(). Keys in BOTH fr.ts and ar.ts — one without the other is a defect, and it renders as a raw key on screen.
- Logical properties only: ps- pe- ms- me- text-start text-end. Never pl- pr- ml- mr- text-left text-right.
- Buttons size to content with a min-width (Arabic ~20% wider). Numbers stay LTR in RTL.
- next/image, never <img>. No data fetching in useEffect.
- New components: route-local in the page's _components/ by default. Promote to src/components/ui at the third consumer.

## Report format
Inventory → diff table → (founder scope call) → build → DOM diff → language check → deleted vs kept-with-reason → gate results → grep evidence from the served HTML. Push to the PR. Never merge.
