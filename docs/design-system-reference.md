# The Design System & UI/UX Reference

*A working bible for building world-class digital products from scratch.*

*Compiled June 2026 from current industry standards, distilled into actionable rules. Independent of any specific product — meant to be applied to any platform you build, now or in five years.*

---

## How to read this document

This is a long reference. Don't read it linearly. The structure is:

- **Parts 1–3** are philosophy and architecture. Read these once and let them set your mental model.
- **Parts 4–7** are practical rules for visual craft (tokens, components, layouts). These are your day-to-day reference.
- **Parts 8–10** are marketplace and dashboard patterns. Read these when you're building those specific surfaces.
- **Parts 11–13** are motion, accessibility, internationalization. Read these as you encounter the relevant problems.
- **Parts 14–15** are tooling and process. Read these before you start the actual build phase.

The document deliberately repeats some ideas across sections. This is because the same principle applies in multiple contexts, and you'll forget where you first read it. Trust the redundancy.

---

# Part 1: What a design system actually is

A design system is not a UI kit. It is not a Figma library. It is not a folder of React components. It is a shared language a team uses to make consistent decisions about how their product looks, sounds, and behaves.

The components are the visible artifacts of the system, but the system itself is the set of rules that makes the components consistent. If you build 100 components without rules, you have a component graveyard. If you build 20 components with rules, you have a design system.

The three load-bearing properties of a real design system:

1. **Tokens encode decisions.** Every visual property (color, spacing, type size, animation duration) is a named token, not a magic number. Changing the token changes every consumer.
2. **Components compose from tokens.** A button references `--color-primary` and `--space-md`, not `#1A4D6B` and `12px`. The component has no knowledge of brand specifics.
3. **Documentation explains intent.** For every token, component, and pattern, there is written guidance on when to use it, when not to, and why. Without intent documentation, the system decays in months.

A team without a design system makes 100 small inconsistent decisions per week, each one trivially defensible in isolation, none of them aligned. A team with a design system makes the same decisions once and never revisits them, freeing the cognitive budget for the real product work.

---

# Part 2: The atomic design model

Brad Frost's atomic design methodology, published in 2013 and still the dominant mental model in 2026, organizes a design system into a hierarchy. You will use this hierarchy whether you call it atomic design or not, so it's worth knowing the vocabulary.

**Atoms** are the smallest functional units. A button. An input. A label. A single icon. An atom cannot be broken down further without losing meaning.

**Molecules** are combinations of atoms that work together as a unit. A form field is a label + input + helper text + error message — four atoms behaving as one molecule. A search bar is an input + button + maybe a recent-searches dropdown.

**Organisms** are complex compositions of molecules and atoms. A product card. A navigation header. A pricing table. A footer. Organisms have substantial visual presence and often carry real product logic.

**Templates** are layouts of organisms — the wireframe-level skeleton of a page, before content. The "product listing template" is the same shape whether you're showing 5 products or 50.

**Pages** are templates with real content. The "iPhone 14 product page" is the product detail template rendered with iPhone 14 data.

You build the system bottom-up (atoms first, pages last) but you design top-down (sketch the pages first to understand what atoms and molecules you need). This sounds contradictory but it's not: you sketch pages to discover requirements, then build atoms to satisfy them, then assemble back up to pages.

Most failed design systems fail at the molecule level. Teams build beautiful atoms, then assemble them into pages directly, skipping the molecule layer. The result is that the same form field has subtly different label styling on every page, because nobody made the "label + input + helper" combination into a single reusable unit.

---

# Part 3: The "no AI slop" rules

This deserves its own part because it is the single most common failure mode of modern interfaces built with AI assistance. The pattern: a founder asks Claude or v0 or Cursor for "a modern SaaS website," gets back the same hero-feature-pricing-CTA layout with Inter typography and a purple-to-blue gradient, ships it, and wonders why it converts at the same rate as their competitors who shipped the same thing.

AI tools default to the statistical center of their training data. The center of "modern SaaS website" in 2024–2026 training data is exactly that homogeneous template. To escape it, you must override the defaults explicitly. The defaults are gravity; you fight gravity by being specific.

### Rule 1: Ban generic typography

Inter, Roboto, Arial, Helvetica, and SF Pro are the "AI default" fonts. They are professional, neutral, and instantly recognizable as "this team did not make a font decision." Choose distinctive typefaces:

- **Display fonts** with character: Söhne, Geist, Migra, Editorial New, Nohemi, Authentic Sans, Mona Sans
- **Body fonts** that pair well: IBM Plex Sans, Cabinet Grotesk, Aeonik, Geist Mono (for code/data), Söhne (also works for body at the right weight)
- **Serif** for editorial weight: Tiempos, Source Serif, Spectral, GT Sectra, Editor's Serif

Pair one display font with one body font. Never use three different families. State the choice explicitly before writing any CSS.

### Rule 2: Commit to a color direction

The AI default is purple/blue/indigo with a touch of pink. Override by:

- Picking a non-default primary (deep green, terracotta, navy, mustard, oxblood, teal, cream-and-black with one accent)
- Using one dominant color across 60–70% of the interface and one sharp accent on the remaining 5–10%
- Reserving neutrals (grays) for the 25–30% that gives the eye a rest
- Avoiding evenly-distributed multi-color palettes — they read as indecisive

### Rule 3: Use real spacing, not default

The AI default is generous padding everywhere, especially `py-16` and `gap-8`. This produces airy-but-empty interfaces. Mix densities deliberately. Hero sections can be airy; data dashboards should be dense. The interface should have visual rhythm, not uniform whitespace.

### Rule 4: One bold layout choice per page

Every page in a generic AI interface uses the same grid: hero, three feature cards, secondary content, CTA. Break the pattern at least once per page. An asymmetric two-column layout. A magazine-style sidebar with prominent typography. A list that overflows horizontally instead of stacking. The choice doesn't matter; the commitment does.

### Rule 5: Real imagery, not stock illustrations

The default AI suggestion is to fill empty areas with "illustration of a person at a computer." This is the visual equivalent of corporate stock photography. Either commission real illustrations with a consistent style, or use real photography that's specific to your product context, or commit to no imagery and let the typography and color do the work. Empty space is better than stock space.

### Rule 6: Microinteractions earn their existence

The default AI suggestion is to add a fade-in animation to everything that appears. Most of it is noise. Animation should communicate state change (something is loading, something failed, something succeeded). Decorative animation is rarely worth the performance cost. When you do add motion, make it deliberate and consistent — same easing curve, same duration tier across the interface.

### Rule 7: Write your own copy

AI-default microcopy is the most identifiable AI slop signal. "Welcome to [product]. Get started by clicking the button below." "We're excited to help you achieve more." "Our platform connects users with services." Every product talks like every other product. Rewrite in your own voice. If your voice is direct, write directly. If your voice is warm, write warmly. Never let the interface speak in the corporate-AI register.

These seven rules are the override layer over AI defaults. Apply them at the system level — once, in the design tokens and copy guidelines — and they propagate to every page automatically. Apply them per-page and you'll forget half of them within a week.

---

# Part 4: Typography — the load-bearing decision

Typography is the single most visible signal of design quality. A platform with rough alignment but excellent typography reads as polished; a platform with perfect alignment but generic typography reads as forgettable. Spend disproportionate time here.

### Choosing the typefaces

Three slots: display (large headings, hero text), body (paragraphs, UI labels, descriptions), mono (code, data, sometimes specific UI elements like timestamps or order IDs).

The pairing rules:

- Display and body should have visible difference but not visual conflict. A geometric sans-serif display with a humanist sans body works. Two geometric sans-serifs fight.
- If one is opinionated (Editorial New, Migra), the other should be neutral (Inter is acceptable here as a *body* counterpoint to a strong display).
- Mono is almost always Geist Mono, JetBrains Mono, or IBM Plex Mono. Don't overthink this slot.

Test the pairing by setting a real page — heading, subhead, three paragraphs, a button, a caption. If it reads coherent, ship it. If anything jars, you're done with that pairing.

### The type scale

A type scale is the discrete set of sizes used in your interface. Default to eight sizes covering body micro to large display:

```
xs:   12px  (tiny labels, footnotes, metadata)
sm:   14px  (UI labels, dense table text, secondary content)
base: 16px  (body paragraphs — the anchor)
lg:   18px  (large body, prominent inline UI)
xl:   20px  (small headings, card titles)
2xl:  24px  (page subtitles, modal titles)
3xl:  30px  (section headings)
4xl:  36px  (page headings)
5xl:  48px  (hero headings, marketing pages)
6xl:  60px  (display, rarely-used)
```

The ratio between adjacent sizes is roughly 1.2–1.25 ("minor third" in musical terms). This produces a scale that reads harmonious. Avoid 1.5× jumps everywhere; they're too aggressive for UI scale.

### Line height (leading)

The rules are roughly:

- Body text: 1.5 line-height (24px on 16px text). This is the most readable default.
- Subheadings (lg, xl): 1.4
- Section headings (2xl, 3xl): 1.25–1.3
- Display headings (4xl+): 1.1–1.2 (tight, dramatic)
- Labels and micro-UI (xs, sm): 1.4–1.45

Tight leading on large text reads commanding; loose leading on body text reads readable. Don't apply the same line-height across the scale.

### Letter spacing (tracking)

- Default to 0 for body text.
- Small uppercase labels: +1% to +2% tracking (otherwise they jam).
- Large display headings: -1% to -3% tracking (otherwise they read airy).
- Never apply tracking to body paragraphs.

### Font weight hierarchy

A font weight palette of 3–4 weights is enough for any UI:

- Regular (400): body text
- Medium (500): UI labels, subtle emphasis
- Semibold (600): button labels, card titles, navigation items
- Bold (700) or Black (800/900): page headings, hero text, alerts

Use weight to create hierarchy. Same size + different weight is often clearer than different size + same weight.

### Practical typography rules

- Maximum line length for body text: 65–75 characters. Wider than this and the eye loses track returning to the next line.
- Minimum body text size: 14px in dense UI contexts, 16px in marketing and reading contexts. Below 14px assumes good eyesight and good lighting.
- Avoid centering long paragraphs. Center short headings only.
- Avoid italics for entire paragraphs. Italics for inline emphasis only.
- Avoid all-caps for sentence-length text. All-caps for short labels (under 5 words) only.
- Pair Arabic text with a font designed for Arabic (Cairo, Tajawal, IBM Plex Sans Arabic, Noto Sans Arabic). Latin fonts rendering Arabic look like the engineer didn't care.

---

# Part 5: Color systems

Color is where most design systems leak inconsistency, because color decisions multiply (50 shades) and propagate through every component. Get the architecture right and the rest of the system inherits it.

### The three-tier token architecture

Modern color systems use three layers:

**Tier 1 — Primitives (raw values).** The actual color codes. Not consumed directly by components.
```
red-50, red-100, red-200, ..., red-900, red-950
blue-50, blue-100, ..., blue-950
gray-50, gray-100, ..., gray-950
```
You'll typically have 10–11 shades per hue, with 50 being lightest and 950 darkest. Most colors have 5–7 hues; gray is the exception (sometimes 12 shades).

**Tier 2 — Semantic tokens (intent).** What the color *means* in your system. Components reference these.
```
--color-bg-primary       (page background)
--color-bg-secondary     (card background, modal background)
--color-bg-tertiary      (subtle backgrounds, hovered states)
--color-text-primary     (body copy)
--color-text-secondary   (de-emphasized text)
--color-text-tertiary    (timestamps, metadata)
--color-text-inverse     (text on dark backgrounds)
--color-border-default
--color-border-strong
--color-accent           (primary brand color)
--color-accent-hover
--color-success
--color-warning
--color-danger
--color-info
```

Semantic tokens map to primitives:
```css
:root {
  --color-bg-primary: var(--neutral-0);     /* white in light mode */
  --color-text-primary: var(--neutral-900); /* near-black */
  --color-accent: var(--brand-600);
}
[data-theme="dark"] {
  --color-bg-primary: var(--neutral-950);   /* near-black */
  --color-text-primary: var(--neutral-50);  /* near-white */
  --color-accent: var(--brand-400);         /* lighter in dark mode */
}
```

**Tier 3 — Component tokens (optional, enterprise only).** Tokens scoped to specific components. `--button-primary-bg: var(--color-accent)`. Skip this tier unless you're building at IBM Carbon or Material Design scale. For most products, semantic tokens are enough.

### Color rules

- Limit the palette. A typical mid-size product needs roughly 5 hues total: one primary, one secondary, one accent, one neutral (gray), and one functional alarm color (red for danger). Five hues × 10 shades = 50 primitives. Anything more is decoration.
- Use one dominant color (typically 60% of visible surface), one secondary (30%), one accent (10%). The 60-30-10 rule is older than the design industry and still works.
- Reserve red/orange for genuinely alarming states. If everything is alarming, nothing is.
- Test the palette in light mode AND dark mode before locking it. Some colors that work in light mode read fluorescent or muddy in dark mode and need shade adjustment.
- Accessibility check (WCAG AA): body text against background must achieve at least 4.5:1 contrast ratio. Large text (18px+) can be 3:1. Test every text-on-color combination.

### Cultural color considerations

Color associations are culture-specific. For a MENA-focused product:

- Green carries strong positive associations (Islam, prosperity, gardens) — use it as accent rather than warning where possible.
- Red is celebratory in some Maghreb and Levant contexts, but still functions as the universal "stop/danger" signal in UI.
- Black + gold reads luxurious almost universally.
- Avoid pink as a primary brand color in conservative markets unless deliberately positioning for a female demographic.
- Blue is the most universally safe brand color — banks and corporations chose it for a reason. The trade-off is that blue is also the AI-default and won't stand out.

---

# Part 6: Spacing, layout, and rhythm

Spacing is what makes interfaces breathe. Bad spacing is the second most identifiable signal of amateur design after generic typography.

### The 4px or 8px grid

Every spacing value in your system should be a multiple of 4px (or 8px for less granular needs). This includes padding, margin, gap between elements, and even border-radius values. Do not use 5px, 13px, 27px — they introduce visual chaos.

The standard spacing scale:
```
0:    0px
1:    4px
2:    8px
3:    12px
4:    16px   <- most common base spacing
5:    20px
6:    24px   <- common section spacing
8:    32px
10:   40px
12:   48px
16:   64px
20:   80px
24:   96px
```

You almost never need values larger than 96px or smaller than 4px.

### Vertical rhythm

Body text on a 1.5 line-height creates 24px line spacing (on 16px text). Align your spacing scale so that consecutive paragraphs, headings, and sections snap to multiples of 24px. The result: when you scroll a page, every element lands on a consistent vertical grid. Subliminally, the page reads "ordered."

### Layout principles

**The 12-column grid is the default web layout.** You can use anything (8-column, 16-column, asymmetric), but 12 is the most flexible because it divides evenly into 2, 3, 4, and 6.

**The container width is a brand decision, not a technical one.** Typical max-widths:
- 1280px: data-heavy SaaS dashboards
- 1200px: standard marketing sites
- 1080px: editorial-feeling sites
- 960px: minimalist focus sites
- 720px: long-form reading

**Mobile breakpoints (Tailwind defaults are reasonable):**
- 0–639px: mobile
- 640–767px: large mobile / small tablet
- 768–1023px: tablet
- 1024–1279px: small desktop
- 1280px+: standard desktop
- 1536px+: large desktop

**Mobile-first is mandatory in 2026.** Over 70% of consumer marketplace browsing happens on mobile. Every component must work at 360px wide before it works at 1440px. Never design desktop first.

### Whitespace rules

- Group related elements with tight spacing (4–8px between sibling items in a card).
- Separate distinct concepts with generous spacing (32–64px between sections).
- Inside a card: 16–24px padding.
- Between cards in a list: 12–16px gap.
- Between page sections: 48–96px.

The principle: things that belong together visually should be closer than things that don't. This is the gestalt principle of proximity, and it's the most violated rule in amateur interfaces.

---

# Part 7: Borders, radii, shadows

### Border radius scale

```
none:   0px
sm:     4px   (subtle rounding — checkboxes, small badges)
md:     6–8px (standard buttons, inputs, small cards)
lg:     12–16px (large cards, modals)
xl:     20–24px (hero cards, prominent surfaces)
full:   9999px (pills, avatars, circular badges)
```

Pick a primary radius (typically `md`, 8px) and use it as your default. Use `sm` for small UI elements that need to look tighter. Use `lg` and above for surfaces that should feel softer. Never mix many different radii on the same screen — pick 2–3 max.

### Border thickness

Borders are 1px in nearly every modern UI. Going to 2px or 3px reads heavy and corporate. The exceptions are deliberate "blocky" or "brutalist" aesthetics where thicker borders are the entire point.

Border color should be one or two grays (a default and a "stronger" variant). Don't have ten border colors.

### Shadow system

Modern shadows are subtle, large-radius, low-opacity. The 1990s "drop shadow" with hard edges and 50% opacity is a hallmark of dated design.

A typical shadow scale:
```
sm:  0 1px 2px 0 rgba(0,0,0,0.05)        (very subtle lift)
md:  0 4px 6px -1px rgba(0,0,0,0.07), 0 2px 4px -1px rgba(0,0,0,0.05)
lg:  0 10px 15px -3px rgba(0,0,0,0.08), 0 4px 6px -2px rgba(0,0,0,0.04)
xl:  0 20px 25px -5px rgba(0,0,0,0.10), 0 10px 10px -5px rgba(0,0,0,0.04)
2xl: 0 25px 50px -12px rgba(0,0,0,0.15)
```

Use shadows sparingly. Modern UI tends toward border-defined surfaces rather than shadow-defined ones. Shadows are most useful for:
- Modals and dialogs (lift above the page)
- Hover states on interactive cards (subtle elevation feedback)
- Dropdowns and popovers (separation from the surface they overlay)

Avoid shadows on flat layout elements (sections, sidebars). They add visual noise without serving a purpose.

---

# Part 8: The component library — atom-by-atom rules

Every component has a set of states. The state matrix is non-negotiable: each interactive component must define what it looks like in every state, or you'll have inconsistency at edge cases.

### The 8 states every interactive component must define

1. **Default** — the resting visual
2. **Hover** — desktop pointer over the element (often just a subtle color shift)
3. **Active / pressed** — the moment of click/tap (briefly inset or darker)
4. **Focused** — keyboard navigation lands on the element (visible focus ring)
5. **Disabled** — non-interactive (reduced opacity + cursor: not-allowed)
6. **Loading** — async operation in progress (spinner or pulse animation)
7. **Error** — operation failed or input invalid (red border, error message)
8. **Success** — operation succeeded (green confirmation, brief)

Most amateur interfaces define 1–4. Professional interfaces define all 8 for every interactive component. This is what separates "works" from "feels polished."

### Buttons

The most-used and most-abused component. Rules:

**Variants:**
- Primary (filled, accent color) — the main action on a screen. One per screen, ideally.
- Secondary (filled, neutral) — supporting actions
- Outline / Ghost (unfilled border) — tertiary actions, less visual weight
- Text / Link button — quaternary, looks like a link

**Sizes (typical scale):**
- Small (xs): 24–28px height, 12–14px text, 8–12px horizontal padding
- Medium (default): 36–40px height, 14px text, 16px horizontal padding
- Large: 44–48px height, 16px text, 20–24px horizontal padding

44px is the minimum touch target on mobile per accessibility guidelines. Never ship a button under 44px tall in mobile layouts.

**Button copy:**
- Use action verbs ("Save," "Send," "Continue," "Try again"), not nouns ("Save changes button")
- Front-load the action ("Send invite" not "Click here to send invite")
- Match register ("Continue" if formal, "Let's go" if casual — never mix)
- Specific over generic ("Add to cart" beats "Submit")

**Common button mistakes:**
- Two primary buttons on the same screen (decide which is more important)
- A delete button styled identically to a save button (use destructive red variant for destructive actions)
- Buttons that look identical to non-button elements (every clickable thing should signal clickability)
- Disabled buttons with no explanation of why they're disabled

### Inputs (text fields, textareas)

**Anatomy of a great input:**
- Visible label above the input (never inside as placeholder — placeholder text vanishes the moment the user starts typing, making it impossible to remember what they're filling in)
- Helper text below the input for instructions ("We'll never share your email")
- Inline validation that fires after the user leaves the field, not while typing
- Error message that explains *what to do*, not just *what's wrong* ("Use at least 8 characters" beats "Invalid password")
- Visible focus ring (don't suppress with `outline: none` unless you're providing a replacement)

**Input states (use the 8-state matrix):**
- Default border: subtle gray
- Hover: slightly darker border
- Focus: accent-colored border + small focus ring
- Filled: same as default, sometimes slightly stronger border
- Error: red border + red helper text + error icon
- Success: green border (use sparingly — only after validating async)
- Disabled: low-opacity, gray background

**Specific input types:**
- **Email**: validate format (regex) but don't be aggressive — accept anything that looks email-like
- **Phone**: country code selector if international product; localized format hints
- **Password**: visibility toggle, strength meter for signup, no strength meter for login
- **Date**: native date picker on mobile, custom-styled on desktop with calendar dropdown
- **Search**: prominent magnifier icon, clear-input button when text is present

### Toggles, checkboxes, radios

**Toggle (switch):** for immediate-effect boolean preferences ("Notifications: on/off"). The state change applies immediately; there's no "save" button after.

**Checkbox:** for selection in a form ("I agree to terms"). The state change applies when the form is submitted.

**Radio:** for choosing one option from a small set (2–5 options). For more than 5, use a select dropdown.

**Visual rules:**
- Checkboxes and radios should be at least 18×18px (24×24px is more comfortable on mobile).
- Always have a label that's clickable (clicking the label should toggle the input).
- The label is the readable name; the input is the affordance. Both must be visible.
- Indeterminate state for checkboxes (the dash-line variant) when the checkbox represents a group with mixed sub-states.

### Cards

A card is a container that groups related content into a discrete visual unit. The most-used organism in marketplace UI.

**Anatomy:**
- Border or shadow defining the edge (one, not both)
- Internal padding (typically 16–24px)
- Optional header (title + maybe action menu)
- Body content
- Optional footer (actions, metadata)

**Common card patterns:**
- Product card: image (top), title, price, secondary info, action button
- User card: avatar, name, role/title, optional action
- Stats card: large number, label, optional trend indicator
- Empty state card: illustration, title, description, primary action

**Card rules:**
- One primary action per card, ideally
- Image-led cards should respect a consistent aspect ratio (4:3 for products, 16:9 for editorial, 1:1 for avatars)
- Hover state should be subtle (slight border change or 1–2px shadow lift), not dramatic
- Don't nest cards inside cards more than one level

### Modals and dialogs

**When to use a modal:**
- Confirming destructive actions ("Delete this listing?")
- Brief forms that interrupt the main task ("Quick edit")
- Critical alerts that need immediate response

**When NOT to use a modal:**
- For content that belongs on a dedicated page
- For multi-step forms with multiple inputs (use a side panel or full page)
- For non-critical information (use a toast or banner)

**Modal rules:**
- Visible backdrop dimming the page (40–60% opacity black or near-black)
- Maximum width 480–640px for most cases; larger for content-heavy modals
- Close button (X) in top-right corner
- ESC key closes the modal
- Clicking the backdrop closes the modal (unless it's a destructive confirmation)
- Focus the first interactive element automatically
- Trap focus inside the modal until it closes
- After close, return focus to the element that opened it

### Toasts, banners, alerts

Three different patterns for three different urgency levels:

**Toast** (transient, low-priority): "Saved" or "Item added to cart." Appears briefly (3–5 seconds), auto-dismisses, doesn't block any action. Bottom-right corner is standard placement.

**Banner** (persistent, page-level): "Your subscription expires in 7 days. Renew now." Appears at the top of the page or a specific section. Dismissable but persistent until the user acts.

**Alert** (critical, blocking): "Your payment failed. Please update your payment method." Inline within a relevant page section. Visually prominent (red background or border). Cannot be dismissed without addressing.

Use the lightest pattern that works. Toasts for routine success; banners for important context; alerts only for blocking issues.

### Tables

Tables are how dense data gets communicated. They are the unsung workhorse of dashboards.

**Rules for good tables:**
- Right-align numbers, left-align text. Always.
- Column headers should be visually distinct from data rows (slightly different background or weight)
- Alternating row striping helps scanning long tables (12 rows or more)
- Sortable columns should have a visible sort indicator (arrow)
- Action columns (edit, delete) right-aligned, or in a dropdown menu (...)
- Sticky header on long tables — when you scroll, you still see column labels
- Empty cells should show "—" not blank (signals "no data" intentionally)
- Pagination at the bottom; infinite scroll only if explicitly justified
- Mobile: tables become stacked cards, or horizontal-scroll if data density is essential

### Navigation

**Top navigation:** for marketing sites, simple consumer products, and sites with shallow hierarchy. Maximum 5–7 top-level items.

**Sidebar navigation:** for dashboards, admin panels, and complex products with deep hierarchy. Can be collapsible. Modern dashboards collapse the sidebar to icon-only on small screens.

**Hamburger menu:** for mobile or for top-nav sites with too many items to fit. Avoid hamburger menus on desktop — they hide navigation that should be visible.

**Breadcrumbs:** for sites with deep hierarchy. Help users orient themselves and navigate up the tree.

**Tabs:** for switching between related views of the same content. Not for navigation between unrelated pages.

---

# Part 9: Marketplace-specific patterns

Marketplaces have unique UI requirements because they serve at least two user types (buyer, seller) and sometimes more, with different goals on the same platform.

### Trust signals

Marketplaces succeed or fail on trust. The buyer must trust the seller; the seller must trust the platform; both must trust the payment and dispute systems. Every trust signal you can show, show.

**The high-impact trust signals:**
- Verified seller badge (visible on every listing and seller profile)
- Aggregated review scores at the listing level, not just the profile (a 4.7/5 next to the price)
- Visible dispute resolution policy (link in footer, mentioned at checkout)
- Real-time inventory or activity ("47 sold this week," "3 currently viewing")
- Identity verification status
- Years on platform / member since
- Last seen / response time ("typically responds within 2 hours")

Place trust signals where the buyer makes the decision (the listing card and the checkout step), not buried on a separate "about the seller" page.

### Search and filtering

The search bar is the single most-used component on a marketplace. Treat it like a first-class citizen.

**Rules for marketplace search:**
- Always visible in the navigation, not hidden behind a search icon
- Auto-complete suggestions as the user types (categories, popular searches, products matching prefix)
- Recent searches stored and surfaced (saves typing)
- Filters appear in a sidebar or top-bar, not modal (modals close on accidental click)
- Filter chips show currently active filters as removable tags
- "Clear all filters" link always available
- Sort dropdown with clear default ("Most relevant" or "Newest")
- Result count visible ("245 results for 'leather bag'")

**Empty search results:**
Never show "No results found." The user just told you they want something and you have nothing to offer. Instead:
- Suggest closely matching searches ("Did you mean...?")
- Show categories adjacent to the query
- Recommend popular items in adjacent categories
- Offer to "Notify me when this becomes available"
- Show recently viewed items as a fallback

### Listing cards

The most common organism in marketplace UI. Every interaction starts with a card.

**Card anatomy:**
- Image (the biggest visual element, often 60–70% of card height)
- Title (truncate to 2 lines max with ellipsis)
- Price (prominent, distinctive typography)
- Secondary info (location, rating, seller name) — small and de-emphasized
- Favorite/save heart icon (top-right corner of image, visible only on hover or always for mobile)
- Quick-action buttons hidden until hover (cleaner default state)

**Card sizing:**
- Mobile: full-width with internal padding
- Tablet: 2-column grid
- Desktop: 3–4 column grid
- Listing density should adapt to what you're selling. Real estate cards = 2 columns even on desktop (more visual real estate per listing). Small product cards = 4 columns.

### The product/listing detail page

The page where the buyer decides. Treat the structure as load-bearing.

**Canonical sections, in order:**
1. Image gallery (primary image large, thumbnails small)
2. Title, price, primary action (Add to cart / Contact seller)
3. Seller block (avatar, name, rating, "Contact" button)
4. Description (detailed text, scrollable)
5. Specifications table (structured data)
6. Reviews section
7. Related listings ("Similar items," "From the same seller")
8. Footer policies link block

On mobile, the primary action button often becomes "sticky" — pinned to the bottom of the screen as the user scrolls — to keep the conversion path visible.

### Onboarding flows

The first 60 seconds determine whether the user comes back. Optimize for completion, not feature exposure.

**Onboarding rules:**
- Maximum 3–4 steps. After 4 steps, completion rates drop sharply.
- Progress indicator visible ("Step 2 of 3")
- Each step asks one thing. Splitting compound questions into separate steps improves completion.
- Skip option for non-essential steps (with friction if skipping is suboptimal)
- Last step shows the user what they've accomplished and where to go next
- Email verification can wait — let the user explore the product first, then prompt verification before any high-trust action

### Empty states

Empty states are the most-skipped design opportunity. They occur on dashboards before the user has any data, on inboxes with no messages, on search results with no matches.

**Components of a good empty state:**
- Illustration or icon (relevant to the context, not generic)
- Headline ("Your cart is empty," "No reviews yet")
- Supporting text ("Browse our collection to get started")
- Primary action button ("Start shopping")

The empty state is the first opportunity to teach the user how the product works. Don't waste it on "No items found."

---

# Part 10: Dashboard architecture

Dashboards are the most complex single page in most products. They surface data, enable actions, and provide system-level visibility. Get the architecture right or users drown in cognitive overload.

### Information hierarchy

A dashboard answers the question: "What do I need to know right now?" Everything on the page should serve that question. Things that don't serve it belong on a secondary page or in a settings drawer.

**The three-zone dashboard layout:**

**Top zone — Critical metrics.** 3–4 KPI cards showing the most important numbers. Refreshed in real-time if business-critical.

**Middle zone — Trends and breakdowns.** Charts showing how the metrics moved over time, with filters and time-range selectors. This is where the user investigates.

**Bottom zone — Recent activity and tables.** Detailed data the user might want to drill into.

Above the fold should answer "is everything OK?" Below the fold should answer "what happened?"

### Cognitive load management

Research from 2026 indicates platforms with more than 5 simultaneous real-time updates cause 41% more user-reported stress and 27% lower task completion. Real-time is expensive cognitively.

**Rules:**
- Not every metric needs to be live-updating. Pick 1–2 critical ones; the rest refresh every few minutes or on-demand.
- Use color sparingly. A dashboard with 12 colors is a dashboard nobody can read. Use one accent for "this needs attention" and let the rest be neutral.
- Chunk information into clear sections with visual separation (whitespace or subtle borders).
- Progressive disclosure: show summaries by default, let the user expand for details.

### KPI cards

The pattern: large number, label, comparison context.

**Anatomy:**
- Number (large, distinctive typography, often the largest text on the dashboard)
- Label (small, gray, above or below the number)
- Optional change indicator (↑ +12% vs last week)
- Optional trend sparkline (tiny chart showing direction)
- Optional click target to drill into the underlying data

Don't crowd KPI cards with icons, secondary data, or fancy styling. The number is the point.

### Charts

The chart-selection rules:

- **Line chart**: changes over time, single or few series
- **Bar chart**: categorical comparisons, ranked lists
- **Stacked bar / area**: composition over time
- **Pie chart**: rarely useful, only for showing proportions of a small set (3–5 slices max)
- **Donut chart**: same as pie but with a center label
- **Heatmap**: dense matrix data (calendar of activity, geographic intensity)
- **Scatter plot**: relationship between two variables

**Chart rules:**
- Always label axes
- Tooltip on hover showing exact values
- Legend visible (especially for multi-series charts)
- Avoid 3D charts. Always.
- Use color to encode meaning, not just to decorate

### Tables in dashboards

Most dashboard data ends up in a table eventually. Tables in dashboards have stricter rules:

- Default sort: most relevant column descending (usually time, recency, or value)
- Row hover: subtle highlight
- Row actions: in a dropdown menu (...) on the right
- Multi-select: checkboxes if bulk actions are needed
- Pagination at 25–50 rows per page is standard
- Sticky header always

### Sidebar vs top navigation

For dashboards with more than 5 sections, sidebar is the standard. Top nav doesn't scale beyond ~5 items without becoming cramped.

**Sidebar structure:**
- Logo at top (clickable, goes to dashboard home)
- Primary navigation: 6–10 items max, organized in logical groups with section labels
- Secondary actions at bottom: settings, help, profile
- Collapsible to icons-only for narrow screens
- Active state visible (highlighted background or left border indicator)

### Command palette (Cmd+K)

Modern dashboards (Linear, Notion, Vercel) have popularized the command palette. Cmd+K (or Ctrl+K on Windows) opens a search-style input that lets users navigate, execute actions, or search content.

For products targeting power users, this is increasingly expected. It's also a relatively easy feature to add and significantly improves daily user experience.

---

# Part 11: Motion and microinteractions

Motion has two purposes in UI: communicating state change and providing feedback for user actions. Everything else is decoration, and decoration costs performance.

### The four components of a microinteraction

From Dan Saffer's foundational book:

1. **Trigger** — what starts it (user click, page load, data change)
2. **Rules** — what happens (the actual animation or state change)
3. **Feedback** — how the user knows it happened (visible or audible response)
4. **Loops and modes** — what happens if it repeats or operates differently in different contexts

A well-designed microinteraction does all four. A bad one (the most common failure) does only the rules, with no clear trigger or feedback signal.

### When to use motion

**Good uses:**
- Confirming a click ("Saved" toast appears)
- Drawing attention to a state change (badge pulses when new notification arrives)
- Indicating loading (skeleton screen during data fetch)
- Easing transitions (modal fades in, drawer slides from edge)
- Suggesting affordance (button gently scales up on hover)
- Communicating hierarchy (page entrance with staggered reveals)

**Bad uses:**
- Adding "delight" without function (a bouncing icon that doesn't convey anything)
- Decorating page sections with scroll-triggered animations on marketing sites
- Pulse animations on everything (creates anxious feeling)
- Long transitions (anything over 400ms feels slow)

### Duration tiers

Animations should fall into a small set of durations, not arbitrary times:

```
instant:    100ms  (focus rings, hover states — should feel immediate)
fast:       150-200ms  (toggle states, small transitions)
moderate:   250-350ms  (modal opens, drawer slides)
slow:       500ms+ (page entrance, illustrative animations)
```

Anything over 500ms should be justified explicitly. Users perceive over-500ms transitions as lag.

### Easing curves

Default to `ease-out` for entrances (fast at start, slows at end — feels like the element is arriving) and `ease-in` for exits (slow at start, fast at end — feels like the element is leaving). `ease-in-out` for state changes that don't have a directional sense. Avoid `linear` — it reads mechanical.

Custom cubic-bezier curves can give your interface a signature feel. Pick one for the system and use it consistently.

### The motion budget

A 60fps animation has 16.67ms per frame to compute and paint. Anything that drops a frame is visible as jank. CSS transforms (translate, scale, rotate) and opacity changes are GPU-accelerated and cheap. Animating other properties (width, height, top, left) is expensive and often janks.

The performance-safe properties to animate:
- transform (translate, scale, rotate, skew)
- opacity
- filter (blur, brightness — but expensive)

The dangerous properties:
- width, height (triggers layout reflow)
- top, left, right, bottom (triggers layout reflow)
- box-shadow (paint-only, less expensive but still costly on slow devices)

When in doubt, use transform + opacity. They cover 90% of UI motion needs.

---

# Part 12: Accessibility

Accessibility is not a bonus feature; it is a baseline requirement. WCAG 2.1 Level AA compliance is the modern minimum, and it's not optional from a legal or ethical standpoint.

### The big four

**Color contrast.** Body text against background must achieve 4.5:1 contrast ratio. Large text (18px+ or 14px+ bold) can be 3:1. UI components (buttons, form borders) must be 3:1 against adjacent colors. Test every text-on-color combination with a contrast checker.

**Keyboard navigation.** Every interactive element must be reachable and operable via keyboard alone. Tab to move forward, Shift+Tab to move back, Enter to activate, Escape to close. Focus rings must be visible (never `outline: none` without a replacement).

**Screen reader semantics.** Use semantic HTML — `<button>` not `<div onclick>`, `<nav>` not `<div class="nav">`, `<h1>` through `<h6>` in correct hierarchical order. Add `aria-label` to icon-only buttons. Add `aria-live` regions for content that updates dynamically (toasts, error messages).

**Alt text.** Every meaningful image needs alternative text describing it. Decorative images get `alt=""` (empty alt explicitly tells screen readers to skip). Functional images (icons used as buttons) need descriptive alt text.

### Beyond the big four

- **Touch targets** on mobile: minimum 44×44px per Apple's HIG, 48dp per Material. Cramped touch targets are an accessibility failure.
- **Motion reduction**: respect the user's `prefers-reduced-motion` setting. If they've opted out of animations, fade rather than slide.
- **Form labels** must be programmatically associated with inputs (`<label for="email">` or `aria-labelledby`).
- **Error messages** must be announced to screen readers (`aria-live="polite"` or `aria-live="assertive"` for critical errors).
- **Color cannot be the only signal.** A red error message must also have text saying "Error" or an icon. A red graph line must also have a different stroke pattern or label.

### Testing accessibility

Manual testing first. Tab through your entire page with only the keyboard. Try to navigate it with a screen reader (VoiceOver on Mac, NVDA on Windows are free). The first 10 minutes of doing this on your own product is more educational than any audit.

Automated testing helps but doesn't replace manual. Tools like axe-core, Lighthouse, and WAVE catch the easy violations (missing alt text, low contrast) but miss the subtle ones (focus order that makes no sense, ARIA labels that are wrong).

---

# Part 13: Internationalization and RTL

If your product serves more than one language, internationalization is structural, not a feature. Building it in from the start is exponentially cheaper than retrofitting.

### Translation basics

- Every string visible to the user goes through a translation function (`t('button.save')`), never hardcoded.
- Translation keys should be descriptive: `t('button.save')` not `t('save')`. The same English word can translate differently in different contexts.
- Don't concatenate translated strings. "Hello " + name + ", welcome!" breaks because Spanish word order is different. Use templates: `t('greeting', { name })`.
- Plural forms need special handling. English has 2 plural forms (singular and plural); Arabic has 6.
- Date and number formatting should be locale-aware. "1,234.56" in US English becomes "1.234,56" in German.

### RTL (right-to-left) for Arabic

Arabic, Hebrew, and Persian are read right-to-left. If your product supports any of these languages, you need RTL layout.

**The 20–30% expansion rule.** Arabic text typically takes 20–30% more horizontal space than equivalent English. Layouts that look perfect in English can break in Arabic. Always design with this in mind:
- Buttons need extra padding so the Arabic label fits
- Headlines need to accommodate longer wrapping
- Navigation items might need to be wider

**Logical CSS properties.** Modern CSS uses logical properties that flip automatically in RTL:
- `margin-inline-start` instead of `margin-left` (becomes margin-right in RTL)
- `margin-inline-end` instead of `margin-right`
- `padding-inline-start` / `padding-inline-end`
- `border-inline-start` / `border-inline-end`

Tailwind v4 has `ms-`, `me-`, `ps-`, `pe-` prefixes that compile to logical properties. Use these from the start; never use `ml-`, `mr-`, `pl-`, `pr-` if you might ever need RTL.

**Bidi (bidirectional) text.** Sometimes Arabic and English appear in the same line ("Welcome سهلا"). The browser handles this with the Unicode bidi algorithm, but you sometimes need to help it with `dir="auto"` on inputs that accept mixed input.

**Icons that should flip vs not.** Some icons should mirror in RTL (a "back" arrow that points left in LTR should point right in RTL). Others shouldn't (a checkmark, a heart). Test every icon manually.

**Arabic typography:**
- Use a font designed for Arabic, not a Latin font with Arabic glyphs added as an afterthought.
- Arabic letterforms connect more than Latin; let-spacing tracking that works for Latin makes Arabic illegible.
- Some Arabic fonts have different visual weights than their Latin counterparts; tune the weight pairing per script.

---

# Part 14: The recommended modern tech stack

As of mid-2026, the consensus stack for a new web product:

**Frontend framework:** Next.js (App Router) or Remix. Both are React-based and production-ready. Next.js has more momentum; Remix has cleaner architecture. Either works.

**Styling:** Tailwind CSS v4. The token-driven approach (`@theme` block) replaces the v3 config file. Native CSS variables under the hood. Compatible with everything.

**Component library:** shadcn/ui with Radix UI primitives underneath. shadcn copies components into your repo as editable TypeScript files (you own the code, no vendor lock-in). Radix provides the accessibility and keyboard-handling primitives.

**Icons:** Lucide React (default with shadcn) or Phosphor Icons. Consistent stroke widths, large catalog, good MENA-friendly options.

**Component documentation:** Storybook. Each component gets a `.stories.tsx` file showing every variant and state. This becomes your living style guide.

**Design tool:** Figma. Industry standard. Free tier sufficient until you have a team.

**Color and contrast checking:** Stark (Figma plugin), Coolors, WebAIM Contrast Checker.

**Motion library (for React):** Motion (formerly Framer Motion). For most CSS animations, no library needed.

**Form library:** React Hook Form + Zod for validation. The de facto pattern for forms in React.

**Data fetching:** TanStack Query (React Query) for client-side; native server components for server-side.

This stack is opinionated but well-tested. Deviating from it requires justification — not because it's the only good stack, but because the recommended stack has the most documentation, community support, and AI-tool compatibility.

---

# Part 15: The build process

Design systems aren't built in a sprint. They're built in phases over months. The typical timeline for a single founder or small team:

### Phase 1: Visual research (1–2 weeks)

Before any token decisions:
- Read Refactoring UI cover to cover. Single-day read. Most influential book on the topic.
- Collect 50–100 screenshots of products you admire visually. Build a Pinterest board or Figma mood board.
- Categorize what you collected: typography you like, color treatments, spacing density, illustration style, layout patterns.
- Identify 5–10 reference products that are "in the spirit" of what you want yours to be.

Do not start touching CSS or tokens until you've done this. The token system you choose later is downstream of the visual direction you commit to here.

### Phase 2: Brand direction (1 week)

Make the load-bearing decisions:
- Primary color (the one color the user will associate with the product)
- Accent color (the supporting hero color)
- Typeface pairing (display + body)
- Tone of voice (luxury, friendly, utilitarian, editorial — pick one)
- Photography/illustration direction (real photos, illustrated characters, abstract graphics, no imagery)

This is the most subjective phase. Get external input if possible. Twitter/X has active design communities. Paid critiques on Dribbble or directly from designers are affordable.

Lock the decisions. Document them in a brand brief. Don't second-guess them once locked.

### Phase 3: Token system (3–5 days)

Translate brand decisions into design tokens:
- Color palette (3 tiers: primitives → semantic → component-specific if needed)
- Type scale (8 sizes from xs to 6xl)
- Spacing scale (4px or 8px base, ~10 steps)
- Border radius scale (3–5 values)
- Shadow scale (3–5 elevations)
- Animation duration tiers (instant, fast, moderate, slow)
- Breakpoints (mobile, tablet, desktop, wide)

Document each token with its intent comment. The intent is what makes the token survive future changes.

### Phase 4: Atom components (1–2 weeks)

Build the smallest reusable components first:
- Button (all variants, all 8 states)
- Input, Textarea, Select
- Checkbox, Radio, Switch
- Badge, Avatar, Icon
- Label, Helper Text, Error Message
- Spinner, Skeleton

Each component gets a Storybook story showing every variant. Each component is keyboard-accessible by default (Radix handles this if you use shadcn).

### Phase 5: Molecule components (1–2 weeks)

Combine atoms into reusable patterns:
- Form Field (label + input + helper + error)
- Card (header + body + footer variations)
- List Item (avatar + text + metadata + action)
- Empty State (illustration + headline + description + action)
- Toast, Banner, Alert
- Dropdown Menu, Tooltip, Popover
- Modal, Dialog, Drawer

### Phase 6: Organism components (1–2 weeks)

Product-specific compositions:
- Product Card / Listing Card
- User Profile Card
- Order/Transaction Card
- Search Bar with autocomplete
- Navigation Header
- Sidebar Navigation
- Footer

### Phase 7: Page templates (2–3 weeks)

Rebuild every page using the new components:
- Homepage
- Browse / Search Results
- Product/Listing Detail
- Cart / Checkout
- User Dashboard
- Settings
- Authentication (Login, Signup, Forgot Password)

This is where the system gets its real test — every page that doesn't fit reveals a missing component or token.

### Phase 8: Brand assets (1–2 weeks, can overlap with Phase 7)

- Logo (commission this if budget allows; the logo is the one place where investing in a professional pays off most)
- Favicon (16×16, 32×32, 48×48, 192×192, 512×512 versions)
- Social cards / Open Graph images (1200×630 standard)
- Email templates (HTML, since email clients don't support modern CSS)
- App icons if mobile (iOS and Android each have specific size matrices)

### Phase 9: Launch readiness

- Documentation: a public-or-private site explaining your design system
- QA pass: walk through every page on mobile and desktop, in light and dark mode if both supported, in every supported language
- Accessibility audit: automated tools + manual keyboard navigation
- Performance audit: Lighthouse scores >90 in all categories

Total realistic timeline: 8–12 weeks for a thorough first pass. Compressible to 6 weeks if you're disciplined. Don't compress below 6 weeks; design needs reflection time.

---

# Part 16: Governance and evolution

A design system is never finished. It changes as the product changes. Without governance, it decays.

### Versioning

Treat the design system as software. Use semantic versioning (1.0.0, 1.1.0, 2.0.0):
- Patch (1.0.x): bug fixes, no API changes
- Minor (1.x.0): additive changes, backward compatible
- Major (x.0.0): breaking changes, requires migration

Document changes in a changelog. Future-you will thank present-you.

### When to add a new component

Add a new component when:
- The pattern appears in 3+ different places
- Existing components can't be composed to produce it
- The variation is significant enough to warrant a separate name

Don't add a new component when:
- A variant or prop on an existing component would suffice
- It's a one-off used in a single place
- It violates the existing system's principles (consider whether the principle is wrong, not whether to break it)

### When to modify a token

Token modifications are high-stakes because they propagate. Modify a token when:
- The brand evolves (new primary color, refined typography)
- Accessibility audit reveals contrast issues
- User research reveals legibility problems

Don't modify a token to fix one component's specific need. That's a sign the component needs its own component-level token, not a system-wide change.

### When to deprecate

Components and tokens become legacy as the system matures. Deprecate (don't immediately delete) when:
- A better alternative exists
- The component represents a pattern you no longer endorse
- Usage has dropped to near-zero

Mark as deprecated in documentation. Provide migration guidance. Remove from the system entirely only after all consumers have migrated.

---

# Part 17: Documentation patterns

A design system without documentation is a component library. Documentation is what turns it into a system.

### What to document per component

For each component:
- **Purpose**: one-sentence description of what it does
- **When to use**: specific situations where this component is the right choice
- **When NOT to use**: situations where a different component is better, with the better choice named
- **Variants**: every variant (size, style, state) with visual examples
- **Props/API**: the configuration surface
- **Accessibility notes**: keyboard behavior, screen reader semantics, ARIA attributes
- **Code examples**: copy-pasteable React code for common usages
- **Related components**: other components in the system that often appear with this one

### What to document at the system level

- **Foundations**: typography, color, spacing, radii, shadows, motion — each with rationale
- **Patterns**: cross-component patterns (form layouts, list patterns, empty states, error handling)
- **Principles**: the design philosophy that informs decisions ("we prefer clarity over cleverness," "we use color sparingly," "mobile is first")
- **Voice and tone**: how the product talks to users, with do/don't examples
- **Changelog**: every change, with date, reason, and impact

### Documentation tools

For small teams or solo founders, your documentation can live in:
- A Notion workspace (cheap, easy, links everywhere)
- A Storybook (good for engineers; less accessible for non-engineers)
- A dedicated docs site (Mintlify, Docusaurus, Nextra — overkill for solo)

Pick one and commit. The worst design system documentation is the one split across three places.

---

# Part 18: Common mistakes and how to avoid them

A field guide to the failure modes that come up repeatedly:

**Building components without using them.** Three months of work on a component library, then nobody adopts it because it doesn't match what real pages need. Fix: build components against real page requirements, not in isolation.

**Token explosion.** A team adds tokens for every minor variant, ending with 500 tokens nobody can remember. Heuristic: if a developer can't predict the right token name, you have too many. Audit and consolidate every quarter.

**Inconsistent application across pages.** The button has 3 variants in the system but page A uses a 4th custom variant because "it needed to be slightly different." Fix: either add the variant to the system or refuse the custom one. Don't allow drift.

**The translation gap.** Figma components don't match React components. Names differ, properties differ, states differ. Two systems pretending to be one. Fix: keep them in sync, or pick one as the source of truth and treat the other as illustrative.

**Forgetting dark mode until launch.** Dark mode added retroactively requires touching every color decision. Fix: build the token system with `[data-theme="dark"]` overrides from day one, even if you don't ship dark mode initially.

**Forgetting RTL until first Arabic user.** RTL added retroactively requires touching every layout decision. Fix: use logical properties (`margin-inline-start`) from day one, even if you only ship LTR initially.

**Building for the rare case.** Adding props and variants for hypothetical future needs. Fix: build for current needs. Add complexity only when actually required.

**Ignoring accessibility until audit.** Accessibility retrofitted is 10× the work of accessibility built-in. Fix: make every component pass a keyboard-only navigation test before merging.

**Documentation lag.** Components ship, documentation lags behind, eventually documentation is so out of date nobody trusts it. Fix: documentation is part of the component PR. If documentation isn't updated, the PR isn't merged.

**Shipping multiple "primary" buttons on the same screen.** A primary button is supposed to be the single most important action. Two primary buttons creates a fork — the user pauses to decide which one is actually primary. Fix: enforce the "one primary per screen" rule.

**Cute over clear.** Microcopy that aims for personality and lands as confusing. "Oopsy daisy!" is not a good error message. Fix: clear copy first, personality as garnish.

---

# Part 19: A pre-launch quality checklist

Before shipping any new page, walk through this list:

**Visual:**
- [ ] All text uses tokens (no hardcoded colors or sizes)
- [ ] All spacing uses the spacing scale
- [ ] Type hierarchy is clear (you can identify the page's main heading instantly)
- [ ] Primary action button is obviously the most important thing on the page
- [ ] Empty state designed (not just an empty container)

**Interactive:**
- [ ] Every interactive element has all 8 states defined
- [ ] Loading states for any async operation
- [ ] Error states for any failable operation
- [ ] Hover state visible on desktop
- [ ] Focus state visible (keyboard navigation works)

**Accessibility:**
- [ ] All images have alt text
- [ ] All form inputs have visible labels
- [ ] Color contrast passes WCAG AA (4.5:1 for body, 3:1 for large text)
- [ ] Keyboard navigation works for every interactive element
- [ ] Focus rings visible (not suppressed)
- [ ] Touch targets at least 44×44px on mobile

**Responsive:**
- [ ] Tested at 360px width (smallest mobile)
- [ ] Tested at 768px width (tablet)
- [ ] Tested at 1280px width (standard desktop)
- [ ] No horizontal scroll on mobile
- [ ] Primary action accessible without scrolling on mobile

**Internationalization (if applicable):**
- [ ] All visible strings use translation function
- [ ] Tested in primary language
- [ ] Tested in secondary language
- [ ] Tested in RTL mode (if any RTL language supported)
- [ ] Date/number formatting locale-aware

**Performance:**
- [ ] Images optimized and sized for display dimensions
- [ ] Heavy animations use transform/opacity (not layout-triggering properties)
- [ ] Lighthouse score >90 on all metrics

**Microcopy:**
- [ ] Headings communicate purpose clearly
- [ ] Button labels are action verbs, not nouns
- [ ] Error messages tell the user what to do, not just what went wrong
- [ ] Empty states have helpful guidance
- [ ] No "AI slop" tone (no "We're excited to help you achieve more")

---

# Closing: The principles that survive everything

If you forget every specific rule in this document, retain these five principles. They are what makes a design system actually good:

**1. Tokens encode decisions, components reference tokens.** Never let a component hardcode a value. Every value comes from a named token. Every token has documented intent.

**2. Consistency over cleverness.** Same button shape on every page. Same form field on every form. Same spacing logic everywhere. Boring consistency beats interesting inconsistency every time.

**3. The user is not stupid; they're impatient.** Don't dumb things down; make them faster. Don't over-explain; make the path obvious. Every second of friction is a user lost.

**4. Accessible by default, not by audit.** Build for keyboard navigation, screen readers, low contrast, and motion sensitivity from the start. Retrofitting accessibility is 10× the work and never as good.

**5. Documentation is the product.** A component that isn't documented doesn't exist for anyone who didn't build it. Future-you is "anyone who didn't build it." Document for them.

These principles are timeless. The specific tooling, frameworks, and aesthetics will change every few years. The principles will not.

Build accordingly.

---

*End of reference. Total length approximately 13,000 words. Treat this as a living document — annotate it, extend it, correct it as your taste matures and your product evolves.*
