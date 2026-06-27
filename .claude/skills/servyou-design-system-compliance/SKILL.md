---
name: servyou-design-system-compliance
description: |
  Use this skill ANY time the work involves Servyou's visual UI, styling, components, or layout. MUST trigger when the user mentions: "design system", "tokens", "card", "tile", "stat", "sidebar", "topbar", "navbar", "component", "styling", "CSS", "Tailwind", "Tailwind class", "colors", "spacing", "padding", "margin", "border", "border-radius", "shadow", "typography", "font", "icon", "button", "input", "form field", "status pill", "badge", "avatar", "verified", "page layout", "page header", "filter bar", "tabs", "pagination", "stepper", "list row", "grid card", "empty state", "upgrade CTA", "right column", "left sidebar", "dashboard widget", "earnings chart", "donut chart", "line chart", "progress bar", "Ecosystem Overview", "Profile Strength", "visual", "look", "design", "mockup", "wireframe", "match the design", or when modifying any .tsx file containing JSX that returns UI. ALSO trigger when migrating any existing page to the new design, building any new page in the freelancer/consumer/shop-owner workspace, or replacing any deprecated component (FreelancerSidebar, MarcheSidebar, MarcheTopBar, ProfileAvatarMenu). This skill MUST be invoked on any PR with the visual gate step in `servyou-visual-gate`. If you find yourself writing a hex color, a pixel value, or a Tailwind utility class — this skill applies.
---

# Servyou Design System Compliance

Servyou has a locked design system in `servyou-design-system-reference-v1.md` (project knowledge). Every visual decision must trace to that doc. No invented tokens, no off-system components, no hex literals in code.

## The 4-step compliance loop

For every UI change:

**Step 1 — Read before writing.** Before touching any .tsx file with JSX, look up the relevant section of the design system doc:
- Tokens (colors, spacing, typography, radius, shadows) → Section 2
- Components (Button, Input, StatTile, StatusPill, Card, etc.) → Section 4
- Layout patterns (sidebar anatomy, topbar, page layouts) → Section 3 + Section 5
- Vocabulary (FR/AR labels) → Section 6
- Per-page reference → Section 7

**Step 2 — Map every visual decision to a locked token.** For each color, spacing, radius, font size, or shadow:
- Find the named token in Section 2 (e.g., `--brand-blue-600`, `--space-6`, `--radius-xl`)
- Use the Tailwind utility that consumes that token (`bg-brand-blue-600`, `p-6`, `rounded-xl`)
- If no matching token exists, STOP. Do NOT invent a new value. Report the gap to Moatez.

**Step 3 — Use existing components, don't reinvent.** Before building a new component, check Section 4:
- 22 components are locked: Button, Input, Textarea, Select, Radio, Checkbox, StatTile, StatusPill, VerifiedBadge, Avatar, FilterBar, TabNavigation, Pagination, Stepper, ListRow, GridCard, Progress (linear+circular), DonutChart, LineChart, QuickActionsGrid, KebabMenu, EmptyState, UpgradeCTA
- If your need matches a locked component, USE IT. Same anatomy, same states, same variants.
- If your need is close-but-not-exact, propose an EXTENSION (new variant) — never a one-off override.
- If your need is genuinely new, STOP and flag to Moatez for design system v1.1.

**Step 4 — Cite the section in the commit body.** Every UI PR commit MUST cite which design system sections it implements:
```
Per design system Section 4.6 (StatTile): renders Total Services
tile with --tile-icon-blue-bg + --tile-icon-blue-fg per locked
color variant.
Per design system Section 5.2 (List page layout): hero stats row
+ tabs + filter bar + list rows + right column with Performance
Overview.
```

## Red flags — refuse these

❌ **Hex color literals in code** — `bg-[#2563EB]` or `color: '#1E3A8A'`. Use `bg-brand-blue-600` (token) instead.
❌ **Arbitrary pixel values** — `p-[18px]`, `mt-[27px]`. Use the 8-point grid scale (`p-4`, `mt-6`).
❌ **Inventing a new component shape** — building a "StatCard" that's like StatTile but slightly different. Either it IS StatTile (use it exactly) or it's a new component (flag it).
❌ **Inline styles for visual decisions** — `style={{ color: '#0F172A' }}`. Always Tailwind tokens.
❌ **Tailwind directional utilities** — `pl-4`, `text-left`, `ml-auto`, `border-l`. ALWAYS logical: `ps-4`, `text-start`, `ms-auto`, `border-s`.
❌ **Custom shadows** — heavy shadows on cards. Servyou uses `--shadow-xs` (very subtle) + borders. Heavy shadows ONLY on overlays (modals, dropdowns).
❌ **English labels in FR code** — "Dashboard" instead of "Tableau de bord". See `servyou-i18n-vocabulary-lock` skill.

## Worked example — building a stat tile

❌ **Wrong (invents tokens, off-system):**
```tsx
<div className="bg-[#EFF6FF] p-[20px] rounded-[14px] border border-gray-200">
  <div className="bg-blue-100 rounded-full p-3"><Briefcase /></div>
  <p className="text-sm text-gray-500">Services</p>
  <p className="text-3xl font-bold">12</p>
</div>
```

✅ **Right (locked tokens, cites system):**
```tsx
// Per design system Section 4.6 — StatTile component, blue variant
<StatTile
  icon={<Briefcase />}
  iconColor="blue"
  label={t('freelance.services.total_label')}  // see i18n-vocabulary-lock skill
  value={totalServices}
  subtitle={t('freelance.services.total_subtitle')}
/>
```

## Worked example — page layout

When building a list page (My Services, My Orders, etc.):

1. Read design system Section 5.2 (List page layout pattern)
2. Use the locked structure: page header + hero stats row + tab navigation + filter bar + list rows + optional right column
3. Each piece uses its locked component from Section 4
4. Cite both Section 5.2 and the specific component sections in commit body

## When the design has something not in the doc

The agency may deliver a new design with a pattern not yet in v1.0. When this happens:

1. STOP — don't build the new pattern yet
2. Report to Moatez: "This page uses a [calendar widget / inline editor / etc.] not in the design system v1.0"
3. Wait for direction:
   - If Moatez approves: design system extends to v1.1, the doc updates first, then build
   - If Moatez defers: ship the page without that element, log it for later

## Coordination with other skills

- Always pair with `servyou-i18n-vocabulary-lock` — every visual change has strings
- Always pair with `servyou-visual-gate` — every UI PR runs the 6-gate walkthrough
- Pair with `servyou-phase-aware-features` if the design shows widgets for Phase 3/4 features

## Reference

Full design system: `servyou-design-system-reference-v1.md` in project knowledge. 10 sections + 2 appendices. Read the section, cite the section, ship the change.
