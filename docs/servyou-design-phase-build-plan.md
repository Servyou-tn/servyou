# SERVYOU DESIGN PHASE BUILD PLAN — THE STEP SEQUENCE

This document is the execution sequence for Servyou's design phase. It exists alongside `docs/design-system-reference.md` (the 9,500-word rulebook of standards) the way a build plan exists alongside an architectural standard: the reference doc tells us *how good* the design system has to be; this doc tells us *in what order* the work gets done so we reach that bar without rework.

It is deliberately sequenced, not scheduled. No days, no weeks, no deadlines. Solo-founder pace varies with life, energy, and the work itself; what does not vary is the order in which decisions have to be locked so that downstream work is not built on a moving foundation. Each phase gates the next. Each step within a phase has a clear deliverable and a clear acceptance criterion. When a step is done, the next one starts; until then, jumping ahead means paying rework cost later.

This is a working document. Steps may be revised when reality contradicts the plan, but the *sequence* — discovery before brand, brand before tokens, tokens before components, components before pages, pages before documentation — does not change. That sequence is what the contemporary design-system literature is consistent about, and it is what makes the work compound rather than thrash.

---

## Phase 1 — Discovery and audit

No design happens in Phase 1. The principle is older than design systems: you cannot redesign what you do not understand. Servyou already has roughly 62 pages in production across four workspaces, with components built incrementally over many sprints. Before any token is defined or any component is redrawn, we have to know what is actually there.

### Step 1.1 — Full UI inventory

Walk through every page on the production site (`https://servyou.vercel.app`) and capture a screenshot of each one at desktop width and mobile width. Group the screenshots by zone (public marketing, auth flow, consumer marketplace, shop owner workspace, freelancer workspace, admin workspace, settings, legal). The inventory is not analysis yet — it is just the visual baseline that everything downstream measures against.

**Deliverable:** `docs/design-phase/01-ui-inventory.md` with one section per zone, embedded screenshots, and a page count per zone.
**Done when:** Every production page has at least one desktop and one mobile screenshot in the document.
**Depends on:** Nothing. This is the entry point.

### Step 1.2 — Component debt map

For each component type currently in the codebase, enumerate every variant in use and flag the inconsistencies. How many button styles exist across the platform? How many input styles? How many card patterns? How many modal styles? The codebase is searched directly (grep for component file names, scan the production screenshots for visual variants) and the findings are documented honestly. The point is not to shame past decisions — the point is to know what consolidation work the redesign has to do.

**Deliverable:** `docs/design-phase/02-component-debt.md` listing each component type, the variants currently shipped, and a one-line note on which variants survive into the new system.
**Done when:** Every component type used in the codebase has been counted and triaged.
**Depends on:** Step 1.1 (the inventory gives us the visual surface to compare against the code).

### Step 1.3 — UX friction catalog and goal-setting

Walk through the four primary user journeys end-to-end as a real user would: a consumer browsing for a product and submitting a COD request, a shop owner setting up a shop and handling an order through the eight-stage lifecycle, a freelancer building a profile and responding to a job post, and the admin moderating a report. At each friction point — confusing label, broken state, visual inconsistency, slow surface, missing affordance — write it down. Then, with the friction documented, articulate three to five concrete goals the redesign exists to achieve. Without explicit goals, the redesign becomes vanity work driven by what is bored-of rather than what is broken.

**Deliverable:** `docs/design-phase/03-friction-and-goals.md` with the friction catalog organized by journey and the locked redesign goals at the top of the document.
**Done when:** Each of the four journeys has been walked through, and the redesign goals are stated in measurable language (e.g., "every primary action is reachable within the first phone-screen height on mobile" rather than "make mobile better").
**Depends on:** Steps 1.1 and 1.2 (you cannot catalog friction against a baseline you have not captured).

---

## Phase 2 — Brand foundation

The design system tokens reference brand decisions. The brand decisions must therefore be locked before the tokens are built, or every token becomes a guess that propagates through every component and every page. Brand decisions belong exclusively to Moatez; the framework guardrails here are what the brand decisions must satisfy, not what they must be.

### Step 2.1 — Logo vectorization

The current Servyou logo is an AI-generated PNG. It is conceptually strong (the dual-shape S, the dark-blue/bright-blue split between "Serv" and "You") but technically not production-ready. The logo has to become a clean vector — an SVG with named geometric paths — so it scales without fidelity loss from a 16-pixel favicon to a billboard. This is either Moatez's own redraw in Figma or Inkscape, or a one-day engagement with a Tunisian designer or Fiverr freelancer for typically $30-80. The output is a master SVG plus seven variant SVGs: horizontal lockup, symbol-only, stacked, wordmark-only, monochrome black, monochrome white, and single-color (primary blue). The thin neck where the two S-halves meet has to be checked at small sizes; if it visually closes, the redraw widens it.

**Deliverable:** Seven SVG files in `public/brand/logo/` plus a one-page logo specification documenting clearspace rules, minimum size rules, don't-use rules, and background-use guidelines.
**Done when:** All seven variants render correctly at 16px, 24px, 48px, 96px, and 256px in test scaffolds; the master SVG has no embedded raster artifacts.
**Depends on:** Nothing within this plan — this is parallel-track work that can begin during Phase 1.

### Step 2.2 — Color palette lock

The logo's blues become the seed of the platform's color system. Eyedropper the vectorized master to confirm the exact hex values of each blue, decide whether the brand palette is two blues (dark + bright) or three (dark + medium + light), and then expand each into a full 50-900 shade scale so components have room to breathe across hover, pressed, focus, subtle-background, border, and text contexts. The neutral gray scale is picked next (one warm-tinted family is conventional; pure-neutral is also valid). The semantic colors come last: success (green family), warning (amber family), danger (red family), info (often the brand blue or a sibling). Every color combination that will appear on the platform gets a WCAG AA contrast check at this stage, because contrast failures discovered in Phase 5 are expensive to fix.

**Deliverable:** `docs/design-phase/04-color-palette.md` with every hex value, every shade scale, every contrast pair tested, and a swatch sheet of the full palette.
**Done when:** The palette is locked, the contrast checks are documented, and every color has a name we will use in the token system.
**Depends on:** Step 2.1 (we eyedropper the vector, not the raster, for accuracy).

### Step 2.3 — Typography lock

A bilingual French-Arabic platform needs two fonts that share visual weight, proportion, and feeling — not because the user switches language constantly, but because mismatched font pairings break the platform's coherence at every RTL/LTR switch. The French font is picked first (geometric sans is the conventional safe choice for marketplace platforms; humanist sans is the conventional warm choice), then its Arabic counterpart is picked deliberately to match visual weight. The 20% Arabic text expansion rule from the strategic reference document means headline sizes have to be picked with room for the Arabic version to fit without breaking layout. The type ramp gets defined at this step: display, h1 through h6, body large, body, body small, caption, and a monospace for code or numeric data when needed. Line heights, letter spacing, and font weights for each ramp level are all locked.

**Deliverable:** `docs/design-phase/05-typography.md` with the font picks, the loading strategy (self-hosted via `next/font` for performance), the full type ramp, and visual proofs in both languages.
**Done when:** Both fonts are loaded in a test scaffold, the type ramp renders correctly at every size, and the bilingual visual proof confirms the pairing holds together.
**Depends on:** Nothing within Phase 2 — can run in parallel with Step 2.2.

### Step 2.4 — Iconography direction and brand voice

The icon system is picked: Lucide is the default standard for Tailwind projects (free, comprehensive, sized for the 8-point grid), Heroicons is an alternative, custom icons are a deferred option for later. The choice is documented along with the icon usage rules — when to use filled versus outlined, what sizes correspond to what contexts, how icons pair with text. Separately, the brand voice gets one page: the personality the platform speaks with, the tone of error messages, the warmth of empty states, the directness of CTAs. This is the voice that has already been working in the foundation documents — direct, warm, honest, slightly slower than corporate writing — formalized so future copy is consistent with past copy.

**Deliverable:** `docs/design-phase/06-iconography-and-voice.md` with the icon system locked and the brand voice articulated in one page with examples.
**Done when:** The icon library is installed in the project, sample icons are rendered in a test scaffold, and the brand voice document covers tone, formality, error-message style, and empty-state style with concrete examples.
**Depends on:** Nothing — runs in parallel with the other Phase 2 steps.

---

## Phase 3 — Design tokens

The design tokens are the foundation that every component and every page references. The rule from the contemporary design-system literature is unambiguous: tokens come before components. Building components first means the tokens get retrofitted from inconsistent component choices, which defeats the purpose of having a token system. Three tiers — primitive, semantic, component — keep the system flexible across rebrands and theme changes.

### Step 3.1 — Primitive tokens

The raw values: every color in the palette across the 50-900 scale, every spacing unit on the 8-point grid (4, 8, 12, 16, 24, 32, 48, 64, 96, 128, 192), every type size in the ramp, every line-height, every letter-spacing, every radius value (0, 4, 8, 12, 16, 24, full), every elevation shadow (none, sm, md, lg, xl, 2xl), every motion duration (fast 150ms, normal 250ms, slow 400ms), every motion easing curve. Primitives carry no intent — they are the inventory.

**Deliverable:** `src/lib/design-tokens/primitives.ts` exporting typed token objects, and matching CSS variables declared in `src/app/globals.css` under a `:root` block.
**Done when:** Every primitive is named, typed, and accessible from both the TypeScript layer and the CSS layer.
**Depends on:** Phase 2 fully complete (primitives reference the locked brand decisions).

### Step 3.2 — Semantic tokens

The intent layer: tokens with names like `color.surface.primary`, `color.surface.elevated`, `color.text.primary`, `color.text.muted`, `color.text.inverse`, `color.border.subtle`, `color.border.strong`, `color.focus.ring`, `spacing.section`, `spacing.card-padding`, `spacing.gap.tight`, `radius.button`, `radius.card`, `elevation.popover`, `motion.fade-in`. Each semantic token references one primitive. This layer is what survives a rebrand without touching component code, because a brand change updates the primitive that the semantic points to, and every component using the semantic updates automatically.

**Deliverable:** `src/lib/design-tokens/semantic.ts` with the full semantic layer, and the same names exposed as CSS variables.
**Done when:** Every semantic token references exactly one primitive, no semantic is unused, and no component-level decision has leaked into this layer.
**Depends on:** Step 3.1.

### Step 3.3 — Component tokens

The third tier: tokens scoped to individual components. A button has `button.primary.background`, `button.primary.background-hover`, `button.primary.background-pressed`, `button.primary.text`, `button.primary.border`, and so on, each pointing to a semantic. This is what lets a single component change without affecting the rest of the system, and what lets one component have several variants (primary, secondary, tertiary, ghost, destructive) without duplicating logic.

**Deliverable:** `src/lib/design-tokens/components/` with one file per component (`button.ts`, `input.ts`, `card.ts`, etc.).
**Done when:** Every component planned for Phase 4 has a token file ready, even if the component itself does not yet exist.
**Depends on:** Step 3.2.

### Step 3.4 — Wire tokens into Tailwind v4 config

Tailwind v4 reads design tokens from the `@theme` block in `globals.css`. The full token system is exposed there so every Tailwind utility class — `bg-surface-primary`, `text-text-muted`, `p-card`, `rounded-button`, `shadow-card`, `duration-normal` — pulls from the canonical token definitions. After this step, no component file contains a raw hex value, a raw pixel value, or a raw color name; everything routes through the token system.

**Deliverable:** Updated `globals.css` with the complete `@theme` block, and a lint rule (ESLint or a custom check) that flags any raw color or spacing value introduced in component files.
**Done when:** Tailwind utility classes for every token exist and work, and the lint rule catches violations in CI.
**Depends on:** Steps 3.1, 3.2, 3.3.

### Step 3.5 — Verification PR

A single existing page — the login page is the smallest candidate, the settings page is another good one — is migrated to consume tokens exclusively. No new component design, no visual redesign yet. The point is to prove end-to-end that the token wiring works: TypeScript types resolve, CSS variables render, Tailwind classes compile, dark-mode considerations (if any) are exposed correctly, and nothing in the rest of the app breaks. This is the smoke test that closes Phase 3.

**Deliverable:** PR titled `chore(design): wire design tokens, verify on login`, with one page migrated and a screenshot proof.
**Done when:** The PR is merged, the verification page renders correctly in production, and the token system is officially live.
**Depends on:** Steps 3.1 through 3.4.

---

## Phase 4 — Atomic components

Each atomic component is built complete in all eight states required by the design system reference doc: default, hover, active/pressed, focus, disabled, loading, success, destructive. Components are built one or two at a time, each as its own focused PR with the component implemented, all states tested in a demo route at `/dev/components/<name>`, and a side-by-side rendering showing every state. The demo routes are gated behind a development-only check; they are not exposed to public users. The order of components is chosen so that downstream components can build on upstream ones (Button comes before Modal because Modal contains buttons; Input comes before Form patterns because forms contain inputs).

The components in order:

### Step 4.1 — Button

Primary, secondary, tertiary, ghost, destructive variants. Sizes: sm, md, lg. All eight states for each variant. Loading state with a spinner that respects motion-reduced preferences. Disabled state that is unmistakably uninteractive. Focus ring that meets WCAG AA contrast.

### Step 4.2 — Input and Textarea

Default, focused, filled, error, disabled, success, loading, read-only states. Label, placeholder, helper text, error message, character counter. The textarea inherits the input's visual language with the only difference being multi-line height and resize behavior.

### Step 4.3 — Select and Dropdown

Native-feeling on mobile, custom-styled on desktop. Search-within-options for long lists. Keyboard navigation. The eight states applied to both the trigger and the option list.

### Step 4.4 — Checkbox, Radio, and Toggle

The three small-decision controls. Keyboard accessibility, focus states, indeterminate state for checkboxes where applicable, group patterns for radios.

### Step 4.5 — Badge and Chip

Status badges (success/warning/danger/info/neutral), category chips, filter chips with the dismissible variant, count badges (for notifications).

### Step 4.6 — Card

The workhorse container. Default, hovered, pressed (clickable card), selected, disabled. With and without media area. With and without action buttons.

### Step 4.7 — Alert and Toast

Persistent alerts (inline) and ephemeral toasts (overlay). Success, info, warning, danger variants. Dismissible behavior. Auto-dismiss timing for toasts that respects accessibility (user-controlled, not arbitrary).

### Step 4.8 — Modal and Dialog

Centered modal, side drawer (right on LTR, left on RTL), bottom sheet (mobile). Backdrop click behavior, escape-key close, focus trap, return-focus on close. Confirmation dialog as a specific variant of modal.

### Step 4.9 — Tabs and Segmented control

Horizontal tabs (scrollable on mobile when count exceeds viewport), segmented control for mutually-exclusive small choices. Active state, hover, focus, disabled.

### Step 4.10 — Avatar and Skeleton loaders

User avatars with initials fallback when no photo. Loading skeletons matching the shapes of cards, lists, and profile blocks for progressive-disclosure loading states.

**Phase 4 deliverable:** Ten merged PRs (one or two components each), every component documented in the demo route, no remaining "old" component variants used anywhere in the codebase after each is migrated.
**Phase 4 done when:** Every component listed above is shipped with all eight states, demo-route visible, and accessibility-verified. The old component implementations are deleted from the codebase.
**Depends on:** Phase 3 complete.

---

## Phase 5 — Composite patterns

Composite patterns are built from atomic components. They are the marketplace-specific UI shapes that don't make sense as generic library components but appear repeatedly across the platform.

### Step 5.1 — Header and footer

The sticky header with logo, primary nav, language toggle, search affordance, account menu, mobile hamburger. The footer with the four-column layout (about, support, legal, social) plus the language switcher and the copyright line. Transparent-over-hero behavior for the landing page. RTL/LTR mirroring verified.

### Step 5.2 — Product card and service card

The two most-rendered components on the platform. Product card shows image, title, price in dinars, shop name, stock indicator when low, favorite heart toggle. Service card shows the freelancer's headshot or avatar, service title, price range, freelancer name, response time indicator if available. Both cards have a hovered/pressed state that signals clickability.

### Step 5.3 — Profile card and order lifecycle stepper

The profile card variants for consumer, freelancer, and shop owner (the three public profile faces). The order lifecycle stepper redesign — the existing component already encodes the eight-stage logic correctly; this step replaces its visual presentation with the new token system.

### Step 5.4 — Search and filter patterns

The search input variant with the search icon, the typeahead behavior, the empty-results state, the loading state. The filter pattern: governorate dropdown, category dropdown, price range, sort order. Mobile collapses filters into a bottom sheet; desktop shows them as a sidebar or top bar.

### Step 5.5 — Empty states, error states, and loading skeletons

The three polish layers that distinguish a careful platform from a sloppy one. Every empty state has an illustration or icon, a clear message, and a primary action. Every error state has a friendly explanation, a recovery action, and contact-support fallback. Every loading state is a skeleton matching the layout that will replace it, never a generic spinner where a skeleton would fit.

**Phase 5 deliverable:** Five merged PRs, one per pattern category.
**Phase 5 done when:** Every pattern is implemented, used in at least one real page, and documented in the demo route.
**Depends on:** Phase 4 complete.

---

## Phase 6 — Page redesigns

By this point, design decisions are mostly behind us. Pages become compositions of locked components arranged on locked grids using locked tokens. Page work is layout, content, sequencing, and verification. The order of pages is chosen so the highest-traffic public surfaces come first (because they are the most consequential), with internal workspaces following.

### Step 6.1 — Landing page

The single most consequential page on the platform in marketing terms. Built per the hero deep-dive in the strategic reference document and the structural elements in `servyou-pages-elements-and-interactions.md`. Hero with outcome-focused headline, subheadline, primary CTA, trust band; three-benefits section; three-journey sections (consumer, shop owner, freelancer); how-it-works section; FAQ; closing CTA. Bilingual at launch (French primary, Arabic ready). Mobile-first responsive behavior.

### Step 6.2 — Auth flow

Signup, login, password reset, password update. Bundle Cloudflare Turnstile here per the deferred Phase 10 launch plan — this is the right moment to wire it because we're redesigning these surfaces anyway and wiring Turnstile twice is wasteful.

### Step 6.3 — Public shop and freelancer pages

The two profile pages that sellers will share on their social media as their "Servyou link." Shop page with the products grid, shop information, contact action. Freelancer page with services list, profile information, contact action, job-response visibility.

### Step 6.4 — Consumer marketplace browse and detail pages

The consumer homepage, category pages, search results page, product detail page, service detail page. These are where the bulk of consumer time will be spent; they get the most attention.

### Step 6.5 — COD request flow, Mes demandes, Mes favoris

The buyer-side workflow surfaces. The COD request modal flow, the "My Requests" page with the lifecycle stepper visible, the favorites page with the saved products and services.

### Step 6.6 — Shop owner dashboards

Incoming requests dashboard, products management, shop settings, orders through the lifecycle.

### Step 6.7 — Freelancer dashboards

Services management, profile editing, job board with response actions.

### Step 6.8 — Admin dashboards refresh

The recently-built admin surfaces get the design system applied without changing their information architecture. Reports, disputes, moderation queues, user management, statistics.

### Step 6.9 — Standalone pages

About, Contact, FAQ, Terms of Service, Privacy Policy, Cookie Policy, Accessibility Statement, 404, 500. The unglamorous pages that make the platform feel real to a careful visitor and legally defensible to a regulator.

**Phase 6 deliverable:** Nine page-redesign PRs, each containing one cluster of related pages.
**Phase 6 done when:** Every page on the platform has been redesigned with the new tokens and components, and the production site visually reflects the locked design system on every surface.
**Depends on:** Phase 5 complete.

---

## Phase 7 — Polish and documentation

The work that makes the system survive past Moatez. Without this phase, the design system exists in code but not in any form a future contributor could pick up and continue.

### Step 7.1 — Accessibility pass

WCAG 2.2 AA compliance verification across every redesigned surface. Keyboard navigation tested on every interactive element. Screen reader labels verified. Color contrast confirmed against the locked palette. Focus indicators visible on every focusable element. Touch target sizes verified at minimum 44×44 px. Reduced-motion preferences respected by all animations.

**Deliverable:** `docs/design-phase/07-accessibility-audit.md` with the audit results and remediation PRs for any violations found.

### Step 7.2 — Motion polish

Page transitions, micro-interactions, loading animations, success animations. The motion tokens from Phase 3 get applied consistently. The principle: motion serves comprehension (showing where something came from or went to), not decoration. Every motion respects the user's reduced-motion preference.

**Deliverable:** Motion specification document and any remediation PRs.

### Step 7.3 — RTL/Arabic layout verification

Every redesigned surface is rendered in Arabic with RTL direction enabled and visually inspected. Logical properties (`ps-4` instead of `pl-4`) are confirmed throughout. The 20% expansion rule is verified to not break layouts. Mixed-direction content (Arabic page with embedded LTR content like prices or phone numbers) renders correctly.

**Deliverable:** RTL verification report and any remediation PRs.

### Step 7.4 — Brandbook

The decisions made in Phase 2 get formalized into a brandbook — a document Moatez can hand to a future designer, contractor, or marketing partner without having to explain anything verbally. The brandbook covers the logo (every variant, clearspace rules, minimum sizes, don't-use rules), the color palette (every hex, every shade scale, every usage rule), the typography (every font, every weight, every ramp level, bilingual pairing rules), the iconography, the brand voice, the imagery direction. This is what closes the brand pillar of the design phase.

**Deliverable:** `docs/brandbook.md` (or a dedicated PDF if Moatez prefers the share-with-partners format) containing the complete brand specification.

### Step 7.5 — Design system documentation

The technical documentation of the design system itself. Every component documented with its variants, props, states, and use-case rules. Every token documented with its name, its value, and its intended use. The migration guide for future contributors describing how to add a new component, how to add a new token, and how to change an existing one without breaking the system. This is the documentation that makes the design system real to people who were not in the room when it was built.

**Deliverable:** `docs/design-system/` directory with one markdown file per component plus the token reference, the usage guidelines, and the migration guide.

---

## Gating rules

Each phase gates the next. The rules are:

A phase is not complete until every step within it has a merged PR and a documented deliverable. "Mostly done" does not count; either the phase is closed or it is not.

A later phase does not start while an earlier phase has open items. Working in parallel within a phase is fine (Phase 2 steps can run concurrently because they are independent); working across phases is not, because later phases consume the outputs of earlier ones.

Working assumptions are allowed but must be documented. If Phase 2 has to start before Phase 1 is fully closed (because the logo vectorization is parallel-track work that can begin during the audit), the assumption is named in writing and revisited at the next phase boundary.

When a phase closes, the Project Knowledge documents are updated to reflect the locked state. The design system reference doc, the foundation docs, and this build plan are all kept in sync with what has actually been shipped.

---

## What closes the design phase

The design phase is complete when every page on Servyou's production site renders the new design system, the brandbook documents the brand decisions, the design system documentation is published, and the accessibility audit confirms WCAG 2.2 AA compliance across the platform. At that point, the work moves to the next pillars in the locked launch sequence: visual identity refinement, social account setup, marketing strategy, content production, ads, and the public launch.

The design phase is what turns Servyou from a functional MVP into a platform that looks made on purpose. It is the most consequential body of non-engineering work on the road to launch, and the discipline of doing it in order is what makes the difference between a platform that compounds visually with every shipped change and a platform that has to be redesigned again in two years.

— End of document.
