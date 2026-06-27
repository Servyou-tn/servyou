# Servyou Design System — Master Reference v1.0

> **Single source of truth for every visual, every component, every page on Servyou.**
>
> Extracted from 11 production-grade page designs delivered by the partner design agency on 2026-06-26.
> Locked: 2026-06-26
> Maintainers: Moatez (founder) + design agency
> Used by: Claude Code on every PR; Claude on every page-by-page review
>
> **Status:** v1.0 covers the 11 designed pages (Dashboard, My Profile, My Services list+grid, My Projects, My Proposals, My Earnings, My Orders consumer, Browse Products, Settings, Create Service Wizard). v1.1 will extend to: Auth flows, Public freelancer profile, Service detail, Mission board, Shop owner workspace, Admin dashboard, Mobile responsive layouts.

---

## Table of contents

- [Section 0 — How to use this doc](#section-0)
- [Section 1 — Foundations](#section-1)
- [Section 2 — Design tokens](#section-2)
- [Section 3 — Layout system](#section-3)
- [Section 4 — Component library](#section-4)
- [Section 5 — Page patterns](#section-5)
- [Section 6 — Vocabulary lock (FR/AR)](#section-6)
- [Section 7 — Per-page reference](#section-7)
- [Section 8 — Migration plan](#section-8)
- [Section 9 — Accessibility + RTL](#section-9)
- [Section 10 — What's missing and how we'll fill it](#section-10)

---

## Section 0 — How to use this doc <a name="section-0"></a>

### For Moatez (founder)
- Read once at start of design phase
- Reference when reviewing any new page
- Update when agency delivers new pages (extend Section 7)
- Upload to project knowledge as `servyou-design-system-reference.md`

### For Claude (strategic review)
- Cite this doc when writing CC prompts ("Per design system Section 4.5, StatTile component renders as...")
- Compare every new design against the locked components — if a design uses a new pattern, flag it for system extension
- Defend the locked vocabulary (Section 6) against drift

### For CC (execution)
- Read before any PR with visual changes
- Use Section 4 components exactly as specified (don't reinvent)
- Use Section 6 vocabulary (no English labels in FR mode, no machine-translated AR)
- Use Section 5 patterns for page layouts

### When to update this doc
- Agency delivers new pages → extend Section 7
- New component pattern emerges (after 3+ reuses) → add to Section 4
- Vocabulary drift detected → re-lock Section 6
- Accessibility issue discovered → update Section 9

---

## Section 1 — Foundations <a name="section-1"></a>

### 1.1 — Brand identity

**Servyou** is Tunisia's first multi-role marketplace platform. The brand identity must signal:
- **Trust** — buyers and sellers transact safely
- **Professional** — same seriousness as Stripe, Notion, Linear (Tunisian users compare to these)
- **Local** — Tunisian context (bilingual FR/AR, Tunisian Dinar, Tunisian cities, WhatsApp)
- **Multi-role** — same user is freelancer, consumer, shop owner — design reflects this

### 1.2 — Six design principles (Polaris-inspired, Servyou-locked)

**1. Clear before clever.** Every page answers "what can I do here?" in 5 seconds. No clever interactions that hide functionality.

**2. Trust is built pixel by pixel.** Verified badges, shop ratings, profile completion, real numbers (not placeholders) — every visual element either reinforces trust or stays out of the way.

**3. Multi-role is visual, not hidden.** The same user wears different role labels (Freelancer / Consumer / Shop Owner) across the platform. The sidebar architecture (Section 3.2) makes this explicit at all times.

**4. Bilingual by construction.** Every string lives in both FR and AR. Every layout flips correctly in RTL. Arabic font (Tajawal or IBM Plex Sans Arabic) shares weight with Latin font (Inter or IBM Plex Sans).

**5. Configurable workspace.** Every freelancer, shop owner, and consumer assembles their own workspace. Static role-specific designs are wrong; the design adapts to the user's chosen tools, accounts, services.

**6. Mobile is primary.** Tunisian users are 70%+ mobile. The desktop view is the secondary. Mobile breakpoints get equal design care.

### 1.3 — Voice and tone

| Context | Voice | Example FR |
|---|---|---|
| **Welcome** | Warm, personal | "Bienvenue, Moatez 👋" |
| **CTA** | Direct, action-oriented | "Publier un service", "Découvrir les missions" |
| **Empty state** | Encouraging, never blaming | "Aucune commande pour l'instant — Commencez par parcourir le marketplace" |
| **Error** | Helpful, explicit | "Email déjà utilisé — Connectez-vous ou utilisez un autre email" |
| **Success** | Brief, celebratory | "Service publié ✓ Il est maintenant visible aux acheteurs" |
| **Trust signals** | Factual, never marketing-y | "156 boutiques vérifiées" not "156+ amazing shops!" |

**Never:** all-caps shouting, exclamation overload, emojis in business contexts (OK in welcome/celebrate moments).

---

## Section 2 — Design tokens <a name="section-2"></a>

### 2.1 — Color primitives (the raw values)

```css
/* Brand blues — extracted from the locked landing page palette */
--brand-navy-900: #0F172A;     /* Darkest, sidebar bg */
--brand-navy-800: #1E293B;     /* Sidebar bg secondary */
--brand-navy-700: #1E3A8A;     /* Primary brand — headings, key text */
--brand-blue-600: #2563EB;     /* Accent — CTAs, active states, links */
--brand-blue-500: #3B82F6;     /* Hover state of accent */
--brand-blue-100: #DBEAFE;     /* Soft blue background, badges */
--brand-blue-50:  #EFF6FF;     /* Subtlest blue tint */

/* Surface (neutrals) */
--surface-base:    #FFFFFF;    /* Card backgrounds, main content */
--surface-subtle:  #F8FAFC;    /* Page background (light gray) */
--surface-elevated: #FFFFFF;   /* Modal, dropdown */

/* Text */
--text-primary:   #0F172A;     /* Body text, headings */
--text-secondary: #475569;     /* Labels, secondary text */
--text-muted:     #64748B;     /* Subtitles, helpers, metadata */
--text-inverse:   #FFFFFF;     /* Text on dark backgrounds */

/* Borders */
--border-subtle:  #E2E8F0;     /* Card borders, dividers */
--border-strong:  #CBD5E1;     /* Input borders, separators */
--border-focus:   #2563EB;     /* Focus rings */

/* Semantic colors — locked from agency design */
--success-500: #10B981;        /* Green: delivered, active, positive */
--success-100: #D1FAE5;        /* Green soft bg */
--warning-500: #F59E0B;        /* Orange/amber: pending, processing */
--warning-100: #FEF3C7;        /* Warning soft bg */
--danger-500:  #EF4444;        /* Red: errors, cancelled, declined */
--danger-100:  #FEE2E2;        /* Danger soft bg */
--info-purple-500: #8B5CF6;    /* Purple: paused, completed milestones */
--info-purple-100: #EDE9FE;    /* Purple soft bg */
--rating-yellow: #FBBF24;      /* Star ratings (gold-ish) */
```

### 2.2 — Color semantic tokens (the meaning layer)

```css
/* Sidebar */
--sidebar-bg:          var(--brand-navy-900);
--sidebar-text:        var(--text-inverse);
--sidebar-text-muted:  #64748B;          /* Section labels (MAIN, ECOSYSTEM) */
--sidebar-item-hover:  rgba(255,255,255,0.05);
--sidebar-item-active-bg:   var(--brand-blue-600);
--sidebar-item-active-text: var(--text-inverse);
--sidebar-divider:     rgba(255,255,255,0.08);

/* Topbar */
--topbar-bg:           var(--surface-base);
--topbar-border:       var(--border-subtle);
--topbar-icon:         var(--text-muted);
--topbar-search-bg:    var(--surface-subtle);

/* Content */
--page-bg:             var(--surface-subtle);
--page-title:          var(--text-primary);
--breadcrumb:          var(--text-muted);

/* Cards */
--card-bg:             var(--surface-base);
--card-border:         var(--border-subtle);
--card-radius:         12px;
--card-padding:        24px;
--card-shadow:         0 1px 2px 0 rgba(0,0,0,0.04); /* very subtle */

/* Stat tiles — icon circle colors per status */
--tile-icon-blue-bg:   var(--brand-blue-100);
--tile-icon-blue-fg:   var(--brand-blue-600);
--tile-icon-green-bg:  var(--success-100);
--tile-icon-green-fg:  var(--success-500);
--tile-icon-orange-bg: var(--warning-100);
--tile-icon-orange-fg: var(--warning-500);
--tile-icon-purple-bg: var(--info-purple-100);
--tile-icon-purple-fg: var(--info-purple-500);
--tile-icon-red-bg:    var(--danger-100);
--tile-icon-red-fg:    var(--danger-500);
--tile-icon-yellow-bg: #FEF3C7;
--tile-icon-yellow-fg: var(--rating-yellow);

/* Status pills — semantic mapping */
--pill-active-bg:      var(--success-100);
--pill-active-fg:      var(--success-500);
--pill-pending-bg:     var(--warning-100);
--pill-pending-fg:     var(--warning-500);
--pill-paused-bg:      var(--info-purple-100);
--pill-paused-fg:      var(--info-purple-500);
--pill-draft-bg:       #F1F5F9;
--pill-draft-fg:       var(--text-secondary);
--pill-cancelled-bg:   var(--danger-100);
--pill-cancelled-fg:   var(--danger-500);
--pill-delivered-bg:   var(--success-100);
--pill-delivered-fg:   var(--success-500);
--pill-in-transit-bg:  var(--brand-blue-100);
--pill-in-transit-fg:  var(--brand-blue-600);
--pill-processing-bg:  var(--warning-100);
--pill-processing-fg:  var(--warning-500);
--pill-completed-bg:   var(--info-purple-100);
--pill-completed-fg:   var(--info-purple-500);

/* Verified badge */
--verified-blue-bg:    var(--brand-blue-600);
--verified-blue-fg:    var(--text-inverse);
--verified-green-bg:   var(--success-100);
--verified-green-fg:   var(--success-500);

/* Online/availability indicator */
--online-dot:          var(--success-500);

/* Charts */
--chart-line-primary:  var(--brand-blue-600);
--chart-line-secondary: var(--brand-navy-700);
--chart-grid:          var(--border-subtle);
--chart-axis-label:    var(--text-muted);
```

### 2.3 — Typography

**Font:** Inter (already locked via `next/font/google`) for Latin. **Tajawal** for Arabic (recommended — bilingual-matched).

**Type ramp:**

| Token | Size | Line height | Weight | Use |
|---|---|---|---|---|
| `--text-display` | 36-40px | 1.2 | 700 | Hero pages only |
| `--text-h1` | 28-32px | 1.25 | 700 | Page titles ("My Profile", "My Services") |
| `--text-h2` | 22-24px | 1.3 | 700 | Section headings within page |
| `--text-h3` | 18-20px | 1.4 | 600 | Card titles, sub-sections |
| `--text-h4` | 16px | 1.4 | 600 | Widget titles |
| `--text-body-lg` | 16-17px | 1.6 | 400 | Long-form content |
| `--text-body` | 14-15px | 1.5 | 400 | Default body text |
| `--text-body-sm` | 13px | 1.5 | 400 | Helper, captions |
| `--text-caption` | 12px | 1.4 | 400 | Metadata, timestamps |
| `--text-label` | 13-14px | 1.4 | 500 | Form labels, stat labels |
| `--text-stat-number` | 28-32px | 1.2 | 700 | Big stat numbers ("12,450 TND") |
| `--text-button` | 14px | 1.2 | 500 | Button labels |
| `--text-section-cap` | 11-12px | 1.4 | 600, uppercase, tracking-wide | Sidebar section headings (MAIN, ECOSYSTEM) |

**Color rules:**
- Headings → `--text-primary`
- Stat numbers → `--brand-navy-700` (navy)
- Body → `--text-primary`
- Labels → `--text-secondary`
- Helpers/captions → `--text-muted`

### 2.4 — Spacing (8-point grid)

```css
--space-0:   0;
--space-1:   4px;     /* tight: badge padding internal */
--space-2:   8px;     /* xs gap */
--space-3:   12px;    /* small gap */
--space-4:   16px;    /* default gap */
--space-5:   20px;    /* between elements within card */
--space-6:   24px;    /* card padding (canonical) */
--space-8:   32px;    /* section gap on desktop */
--space-10:  40px;
--space-12:  48px;    /* large section gap */
--space-16:  64px;    /* mobile section gap */
--space-20:  80px;
--space-24:  96px;    /* desktop section gap (landing) */
```

**Application:**
- Card padding: `--space-6` (24px)
- Section vertical gap: `--space-8` (32px desktop) / `--space-6` (24px mobile)
- Element gap within card: `--space-4` (16px)
- Tile internal gap: `--space-2` (8px) between number and label
- Page side padding: `--space-8` (32px desktop) / `--space-4` (16px mobile)
- Sidebar item vertical padding: `--space-3` (12px)

### 2.5 — Border radius

```css
--radius-none:   0;
--radius-sm:     4px;
--radius-md:     8px;       /* small chips */
--radius-lg:     10-12px;   /* buttons */
--radius-xl:     12-16px;   /* cards */
--radius-2xl:    16-20px;   /* hero cards, big cards */
--radius-full:   9999px;    /* pills, avatars, progress bars */
```

**Application:**
- Cards: `--radius-xl` (12px)
- Buttons: `--radius-lg` (10px)
- Inputs: `--radius-lg` (10px)
- Status pills: `--radius-full` (pill)
- Avatars: `--radius-full` (circle)
- Progress bars: `--radius-full` (pill)
- Search input: `--radius-lg` (10px)
- Cover images on grid cards: `--radius-xl` (12px) top-corners only

### 2.6 — Shadows

```css
--shadow-none:  none;
--shadow-xs:    0 1px 2px 0 rgba(0,0,0,0.04);    /* card default — VERY subtle */
--shadow-sm:    0 1px 3px 0 rgba(0,0,0,0.06);    /* card hover */
--shadow-md:    0 4px 6px -1px rgba(0,0,0,0.08); /* dropdown, popover */
--shadow-lg:    0 10px 15px -3px rgba(0,0,0,0.10); /* modal */
--shadow-xl:    0 20px 25px -5px rgba(0,0,0,0.12); /* heavy lift */
```

**Principle:** Servyou is a **borders-not-shadows** system. Cards rely on `--border-subtle` + `--shadow-xs` together. Heavy shadows only on overlays (modals, dropdowns).

### 2.7 — Motion

```css
--motion-fast:   150ms;   /* button hover, color change */
--motion-base:   250ms;   /* default transition */
--motion-slow:   400ms;   /* slide-in, modal enter */
--ease-out:      cubic-bezier(0.16, 1, 0.3, 1);  /* default — feels natural */
--ease-in-out:   cubic-bezier(0.4, 0, 0.2, 1);
```

**Principle:** Motion serves comprehension, not decoration. Every motion respects `prefers-reduced-motion`.

---

## Section 3 — Layout system <a name="section-3"></a>

### 3.1 — Application shell (the canonical layout)

```
┌────────────┬─────────────────────────────────────────────────┐
│            │ Topbar (60px height)                            │
│            ├─────────────────────────────────────────────────┤
│  Sidebar   │ Content area (page-bg #F8FAFC)                  │
│  (240px)   │                                                 │
│  (navy)    │  ┌─────────────────────┬──────────────────┐    │
│            │  │ Main content        │ Right column     │    │
│            │  │ (white cards on     │ (optional,       │    │
│            │  │  light gray bg)     │  ~320px wide)    │    │
│            │  │                     │                  │    │
│            │  └─────────────────────┴──────────────────┘    │
│            │                                                 │
└────────────┴─────────────────────────────────────────────────┘
```

**Dimensions:**
- Sidebar: 240px wide (fixed)
- Topbar: 60-64px tall (fixed)
- Right column: 320px wide (when present), 100% on mobile
- Main content: fills remaining width
- Mobile breakpoint: sidebar collapses to slide-out drawer triggered by hamburger

### 3.2 — Sidebar anatomy

**Background:** `--sidebar-bg` (#0F172A dark navy)
**Width:** 240px desktop, slide-out drawer on mobile
**Padding:** `--space-4` (16px) horizontal, `--space-6` (24px) vertical

**Structure (top to bottom):**

```
1. Logo block (ServYou wordmark)        — 80px tall
2. Section label: "MAIN"                 — 32px tall
3. Nav items (Dashboard, My Profile,     — 44px each
   Services with caret, Projects with
   caret, Proposals, Earnings, Reviews,
   Messages [badge])
4. Section label: "ECOSYSTEM"            — 32px tall
5. Nav items (For Consumers, For Shop
   Owners, Marketplace) — these have
   2-line labels with subtitle
6. Section label: "TOOLS"                — 32px tall
7. Nav items (Orders [badge], Saved
   Items, Analytics)
8. Section label: "ACCOUNT"              — 32px tall
9. Nav items (Settings, Help & Support)
10. Bottom: "Upgrade to Premium" CTA     — 80px tall, blue background
```

**Nav item anatomy:**
- Height: 44px (matches WCAG 2.2 target size + standards-reference Section 5)
- Padding: `--space-3` left + `--space-3` vertical
- Icon: Lucide React, 20×20px
- Label: `--text-body` size, `--sidebar-text` color
- Sub-label (when 2-line, e.g. "For Consumers / Offer your services"): `--text-caption`, `--sidebar-text-muted`
- Badge (e.g. [3], [8]): right-aligned, `--brand-blue-600` circle, white number
- Caret (▼ for expandable items): right-aligned, rotates 180° on expand
- **States:**
  - Default: transparent bg, white text, gray icon
  - Hover: `--sidebar-item-hover` bg, white text
  - Active: `--sidebar-item-active-bg` (bright blue) bg, white text + icon
  - Disabled: 50% opacity (rare)

**Section label anatomy:**
- Text: `--text-section-cap` (12px, weight 600, uppercase, tracking-wide)
- Color: `--sidebar-text-muted` (#64748B)
- Padding: `--space-4` left, `--space-3` top, `--space-2` bottom
- No interaction — display only

**"Upgrade to Premium" CTA at bottom:**
- Background: `--brand-blue-600` solid
- Padding: `--space-4`
- Icon (rocket): 24×24
- Title: "Upgrade to Premium" — white, weight 600
- Subtitle: "Grow your business" — light blue, smaller
- Border-radius: `--radius-xl` (12px)
- Clickable: navigates to `/pricing` (when ships)

### 3.3 — Topbar anatomy

**Background:** white (`--topbar-bg`)
**Border:** 1px bottom (`--topbar-border`)
**Height:** 60-64px
**Padding:** `--space-4` horizontal

**Structure (left to right):**

```
[≡ Hamburger]  [Search input (flex-grow)]  [💬 5]  [🔔 12]  [♡]  [🛒 3]  [Avatar + Name + Role ▼]
```

**Hamburger:**
- Icon size: 24×24
- Color: `--text-muted`
- Clickable, toggles sidebar on mobile

**Search input:**
- Background: `--surface-subtle` (#F8FAFC)
- Border: 1px `--border-subtle`
- Padding: `--space-3` `--space-4`
- Border-radius: `--radius-lg`
- Icon (Search, magnifying glass): 16×16 inside on left
- Placeholder text: "Search for services, products, freelancers, shops..."
- Width: flex-grow to fill space
- Focus state: `--border-focus` ring

**Action icons (Messages, Bell, Heart, Cart):**
- Size: 20×20 icon in 40×40 button
- Color: `--topbar-icon` (`--text-muted`)
- Badge: top-right corner, `--brand-blue-600` solid circle, 16×16, white number
- Badge color exception: 🔔 Bell badge can use `--brand-blue-600` OR `--danger-500` if urgent
- Hover: subtle background tint

**User profile cluster (rightmost):**
- Avatar: 40×40 circle, with online indicator dot (4×4, `--online-dot`)
- Name: "Moatez Ahmed", weight 500, `--text-primary`
- Role label: "Freelancer" / "Consumer" / "Shop Owner", `--text-caption`, `--text-muted`
- Dropdown caret: `--text-muted`
- Clickable: opens dropdown menu

### 3.4 — Content area patterns

**Page background:** `--page-bg` (#F8FAFC light gray)
**Page padding:** `--space-8` (32px) all sides on desktop, `--space-4` on mobile

**Page header pattern:**

```
Page Title (--text-h1, --text-primary)
[Breadcrumb: Home > Section > Current page]            [Primary CTA Button]
```

**Breadcrumb anatomy:**
- Text size: `--text-body-sm`
- Color: `--text-muted` for inactive items, `--text-primary` for current
- Separator: `>` character, `--text-muted`
- Each segment except current is a link

**Primary CTA in header:**
- Right-aligned
- Primary button variant
- Icon-left option (e.g. "+ Create New Service" with Plus icon)

### 3.5 — Right column patterns

The right column is **OPTIONAL** per page. Width 320px when present.

**Common widgets in right column:**
- Profile Completion / Profile Strength
- Account Status
- Order Summary
- Project Overview (with donut chart)
- Performance Overview
- Recently Viewed Products
- Top Categories (with counts)
- Tips to Get More Clients
- Filters panel
- Need Help? card
- Upgrade CTA card
- Quick Actions grid

**Right column card spacing:** `--space-4` (16px) vertical gap between widgets.

### 3.6 — Grid system

**Page width:** Max 1440px centered.
**Inner content max width:** None (fills available).
**Stat tiles grid:** `repeat(auto-fit, minmax(180px, 1fr))` with `--space-4` gap → adapts to 5 or 6 tiles per row.
**Card grid (My Services grid view, Browse Products):** `repeat(auto-fill, minmax(280px, 1fr))` with `--space-4` gap → 3-5 cards per row depending on viewport.

---

## Section 4 — Component library <a name="section-4"></a>

22 components extracted from the 11 designs. Each documented with: anatomy, states, variants, when to use, FR/AR notes.

### 4.1 — Button

**Variants:**
- **Primary** (`bg-brand-blue-600`, white text) — main CTAs ("Save Changes", "Create New Service")
- **Secondary** (`bg-white`, navy border, navy text) — secondary actions ("Cancel", "View Public Profile")
- **Tertiary / Ghost** (no bg, blue text, no border) — inline links, low emphasis
- **Destructive** (`bg-danger-500`, white text) — delete, cancel order
- **Icon-only** (square, just icon) — for table actions

**Sizes:**
- `sm` — 32px tall, `--text-body-sm`, padding `--space-2` `--space-3`
- `md` — 40px tall (default), `--text-body`, padding `--space-3` `--space-4`
- `lg` — 48px tall, `--text-body-lg`, padding `--space-3` `--space-5`

**States (all 8 required per `standards-reference` Section 4.1):**
default / hover / active (pressed) / focus / disabled / loading / success / destructive

**Icon-left pattern:** Icon (16×16 for sm, 18×18 for md, 20×20 for lg) + `--space-2` gap + label.

**Border-radius:** `--radius-lg` (10px)

**Example usage:**
```
[+ Create New Service]  ← primary, lg, icon-left
[Save & Continue →]      ← primary, md, icon-right
[Cancel]                 ← secondary, md
[Delete Account 🗑]      ← destructive, md, icon-left, red
```

### 4.2 — Input (text field)

**Anatomy:**
- Label (above): `--text-label` color `--text-secondary`, weight 500
- Required indicator: red asterisk * after label
- Field: `--radius-lg` border, 1px `--border-strong`, padding `--space-3` `--space-4`, `--text-body`
- Helper text (below): `--text-body-sm`, `--text-muted`
- Character counter (right-aligned within helper row): `0/80` format, `--text-caption`, turns amber at 80% of max, red at max
- Right-aligned status icon (Verified ✓, In-progress, etc.) — see Image 1 (Settings) "Verified" green pill INSIDE input

**States:**
- Default: white bg, gray border
- Focus: white bg, `--border-focus` (blue) ring
- Filled: white bg, gray border, dark text
- Error: white bg, red border, error message below
- Disabled: `--surface-subtle` bg, muted text
- Read-only: similar to disabled but no opacity reduction
- Success / Verified: green check icon on right edge

**Variants:**
- Text input (default)
- Email input (`type="email"`)
- Phone input — with country flag prefix (e.g. 🇹🇳 +216)
- Password input — with show/hide toggle
- Number input — with inputmode="numeric"
- Search input — with magnifying glass icon on left (Section 3.3 search bar)

**Validation behavior** (per `standards-reference` Section 6):
- No red on initial render of backfilled forms (amber instead)
- Live validation runs but errors only surface after blur OR submit
- Character counter turns amber at 80%, red at 100% — does not block typing

### 4.3 — Textarea

Same anatomy as Input but multi-line. Resize: vertical only. Min-height: 100px. Max-height: 400px (scroll within).

### 4.4 — Select / Dropdown

**Trigger anatomy:**
- Same visual as Input
- Down-caret on right
- Placeholder text when no selection: `--text-muted`

**Open state:**
- Dropdown panel: white bg, `--border-subtle`, `--radius-lg`, `--shadow-md`
- Items: `--space-3` padding, hover bg `--surface-subtle`
- Selected item: subtle checkmark or blue tint
- Keyboard navigable: Arrow keys, Enter to select, Esc to close

**Variants:**
- Single select (default)
- Multi-select (chips show selections)
- Searchable (typing filters items)

### 4.5 — Radio / Checkbox

**Radio (Image 2 — Service Type "Standard Service" / "Custom Service"):**
- Card-style radio: large clickable area with title + description
- Anatomy: radio dot (left) + Title (weight 600) + Description (`--text-body-sm`, `--text-muted`)
- Selected state: blue border, light blue background, blue radio dot filled
- Default: gray border, white bg

**Checkbox:**
- Standard square checkbox, blue when checked
- Used in filter panels (Shop Rating, Availability)

### 4.6 — StatTile ⭐ (MOST USED COMPONENT)

**The hero stat tile that appears 5-6 across the top of every list page.**

**Anatomy:**
```
┌─────────────────────────────────┐
│ [Icon Circle]   Label           │
│                                 │
│ Big Number                      │
│ Subtitle (or delta)             │
└─────────────────────────────────┘
```

**Specifics:**
- Card: `--card-bg`, `--card-border`, `--radius-xl`, `--card-padding`
- Icon circle: 48×48, `--radius-full`, semantic color bg + icon
- Label: `--text-label`, `--text-secondary`, weight 500
- Number: `--text-stat-number` (28-32px, weight 700, `--brand-navy-700`)
- Subtitle: `--text-body-sm`, `--text-muted`
- Optional delta: "↑ 18% from last month" — `--success-500` for positive, `--danger-500` for negative
- Optional kebab menu (three dots): top-right, opens action menu

**Color variants (icon circle):**
- **Blue** (primary metrics): Total Earnings, Total Services, Total Products
- **Green** (positive/active): Delivered, Active Services, Accepted Proposals
- **Orange** (pending/warning): Pending Review, In Transit, Processing
- **Purple** (paused/completed): Paused Services, Withdrawn, Completed Milestones
- **Red** (errors/cancelled): Cancelled Orders, Declined Proposals
- **Yellow** (ratings): Average Rating, Top Rated

**Variants:**
- **Standard** (default — Image 1, 2, 3, 4, etc.)
- **With delta** (most common — "↑ 18%")
- **With kebab menu** (Image 1 Dashboard tiles have kebab)
- **Clickable** (whole tile is a link, hover state)

**Example:**
```
Total Services    [📦 Blue]
12
Active services
```

### 4.7 — Status Pill

**Small pill labels indicating state.**

**Anatomy:**
- Padding: `--space-1` `--space-3` (4px vertical, 12px horizontal)
- Border-radius: `--radius-full` (pill)
- Font: `--text-caption`, weight 600
- No border, just background + text color

**Variants (semantic mapping locked):**

| Status | Background | Text | Used for |
|---|---|---|---|
| Active | `--pill-active-bg` (`--success-100`) | `--pill-active-fg` (`--success-500`) | Active services, accepted proposals |
| Pending | `--pill-pending-bg` (`--warning-100`) | `--pill-pending-fg` (`--warning-500`) | Pending demandes, awaiting response |
| Pending Review | same as Pending | same | "Awaiting approval" services |
| Paused | `--pill-paused-bg` (`--info-purple-100`) | `--pill-paused-fg` (`--info-purple-500`) | Paused services |
| Draft | `--pill-draft-bg` (#F1F5F9) | `--pill-draft-fg` (`--text-secondary`) | Draft services, draft proposals |
| Delivered | `--pill-delivered-bg` (`--success-100`) | `--pill-delivered-fg` (`--success-500`) | Delivered orders |
| In Transit | `--pill-in-transit-bg` (`--brand-blue-100`) | `--pill-in-transit-fg` (`--brand-blue-600`) | Orders in delivery |
| Processing | `--pill-processing-bg` | `--pill-processing-fg` | Being prepared |
| In Progress | same as In Transit | same | Active projects |
| Completed | `--pill-completed-bg` (`--info-purple-100`) | `--pill-completed-fg` (`--info-purple-500`) | Completed projects |
| Cancelled | `--pill-cancelled-bg` (`--danger-100`) | `--pill-cancelled-fg` (`--danger-500`) | Cancelled orders, declined proposals |
| Withdrawn | gray bg | gray text | Withdrawn proposals |
| New | `--success-500` solid | white | "New" product badge |
| Best Seller | `--rating-yellow` solid | white | Best Seller product badge |
| Sale | `--info-purple-500` solid | white | Sale product badge |
| Verified | `--success-100` bg | `--success-500` text | Inline "Verified" beside fields |

### 4.8 — Verified Badge

**Three variants:**

**Variant A — Blue check beside name:**
- 16×16 circle, `--verified-blue-bg` (`--brand-blue-600`)
- White checkmark icon inside
- Inline beside profile name (Image 1 — beside "Moatez Ahmed")

**Variant B — Green pill "Verified":**
- Pill with text "Verified" (FR: "Vérifié")
- `--verified-green-bg` + `--verified-green-fg`
- Used inline beside email, phone (Image 1 Settings)

**Variant C — Verified shop checkmark:**
- 14×14 circle blue with white check
- Inline after shop name on product cards (Image 2 Browse Products)

### 4.9 — Avatar

**Sizes:**
- `xs` 24×24 (inline mentions)
- `sm` 32×32 (table rows, list items)
- `md` 40×40 (topbar, comments)
- `lg` 56×56 (cards)
- `xl` 80×80 (profile cards)
- `2xl` 120×120 (profile page hero)

**Anatomy:**
- Image or letter fallback (background `--brand-blue-100`, letter `--brand-blue-600`)
- Border-radius: `--radius-full` (circle)
- Optional online indicator: 8×8 dot, `--online-dot` (green), bottom-right corner with white ring
- Optional verified badge overlay: bottom-right Variant A

### 4.10 — Filter Bar

**Horizontal bar above lists:**

```
[🔍 Search...]  [All Categories ▼]  [Status ▼]  [Sort by: Newest ▼]  [▦ ☰ Grid/List toggle]
```

**Anatomy:**
- Container: full-width, `--space-4` gap between elements
- Search input: takes most space, `--surface-subtle` bg
- Dropdowns: `--card-bg`, `--border-subtle` border, `--radius-lg`
- Grid/List toggle: 2-button group, active button gets `--brand-blue-100` bg

### 4.11 — Tab Navigation

**Horizontal tab bar (used on My Profile, My Services, My Orders, etc.)**

**Anatomy:**
- Container: horizontal flex, no background
- Tab items: padding `--space-3` `--space-4`, `--text-body`, weight 500
- Active tab: `--brand-blue-600` text, 2px bottom border `--brand-blue-600`
- Inactive tab: `--text-muted` text, no border
- Hover: `--text-primary` text
- Bottom border line spans full width (1px `--border-subtle`)
- Optional count: "(12)" beside tab name, `--text-muted`

**Examples:**
- Profile tabs: Overview | About | Services | Portfolio | Reviews | Earnings | Activity | Settings
- Services status tabs: All Services (12) | Active (9) | Pending (2) | Drafts (1) | Inactive (0)
- Orders status tabs: All Orders | Processing | In Transit | Delivered | Cancelled | Returned

### 4.12 — Pagination

**Anatomy:**
- Centered or left-aligned at bottom of list
- Prev button (chevron-left) | 1 | 2 | 3 | ... | 125 | Next (chevron-right)
- Active page: `--brand-blue-600` bg, white text, `--radius-lg`
- Inactive page: white bg, `--text-primary`, hover `--surface-subtle`
- Disabled prev/next: 40% opacity

### 4.13 — Stepper

**Multi-step horizontal stepper (Image 2 — Create Service Wizard).**

**Anatomy:**
- 5 step blocks in row, equal width
- Each block:
  - Circle (32×32): number inside (1, 2, 3...) OR check icon when complete
  - Title (weight 600): "Basic Information"
  - Subtitle (`--text-body-sm`, `--text-muted`): "Add service details"
- Active step: circle `--brand-blue-600` bg, white number; title `--text-primary`
- Completed step: circle `--success-500` bg, white check; title `--text-secondary`
- Future step: circle gray bg `--border-subtle`, gray number; title `--text-muted`
- Connector line between circles (1px, `--border-subtle`, blue when both complete)
- Bottom border under active step: 2px `--brand-blue-600`

### 4.14 — List Row (service / project / proposal / order)

**Horizontal row pattern in list views.**

**Anatomy:**
```
[Thumb]  Title + Status Pill          Col 1     Col 2     Col 3   [Action btn] [⋮]
         Description (1-2 lines)
         [Category chip]  [Meta chip]
```

**Specifics:**
- Thumbnail: 64×64 or 80×80, `--radius-md`, object-cover
- Title: `--text-h4`, weight 600
- Status pill: inline beside title
- Description: `--text-body-sm`, `--text-muted`, max 2 lines (truncate)
- Meta chips: `--text-caption`, gray rounded chips
- Numerical columns (Orders / Earnings / Rating): each with label above, value below
- Action button: secondary `View Details` / `View` / `Track Order`
- Kebab: 24×24 button, opens menu (Edit, Pause, Delete)
- Row padding: `--space-4` vertical, `--space-5` horizontal
- Border-bottom: 1px `--border-subtle` between rows

### 4.15 — Grid Card (service / product / proposal — grid view)

**Anatomy:**
```
┌─────────────────────────────┐
│                             │
│   Cover image (full bleed)  │ ← 16:9 ratio
│   [Status pill] [♡ heart]   │
│                             │
├─────────────────────────────┤
│ [Category chip]             │
│ Title (2 lines max)         │
│ [Avatar] Owner name [✓]     │
│ ⭐ 4.9 (128 reviews)         │
│                             │
│ From TND 580    [🛒 button] │
└─────────────────────────────┘
```

**Specifics:**
- Cover image: full-width, aspect-ratio 16:9, `--radius-xl` top-corners
- Status pill: bottom-left of image, with backdrop blur or solid bg
- Heart icon: top-right of image, white circle bg
- Card body: white bg, padding `--space-4`
- Title: `--text-body`, weight 600, 2-line max
- Avatar + name row: inline
- Rating: yellow star + count
- Price: `--text-body`, weight 600 + delivery time muted
- Cart icon button: right-aligned, primary color
- Optional strikethrough old price + sale percent badge

### 4.16 — Progress (linear + circular)

**Linear progress bar:**
- Container: 6-8px tall, `--radius-full`, `--border-subtle` bg
- Fill: `--brand-blue-600` (or `--success-500` for positive contexts)
- Optional label above ("Progress 75%")

**Circular progress (Profile Completion 85%, Image 1):**
- SVG circle, 80-100px diameter
- Stroke width: 8-10px
- Track: `--border-subtle`
- Progress: `--brand-blue-600`
- Center text: percentage, weight 700

### 4.17 — Donut Chart

**Used for status breakdowns (Image 3, 4, 5, 8).**

**Anatomy:**
- Diameter: 200-240px
- Donut hole: 60% of diameter
- Segments: semantic colors per status
- Center text: total number + label (e.g. "24 Orders")
- Legend (right side): each item with colored dot + name + percentage + count
- Example: "16 (66.6%) Delivered" with green dot

**Implementation:** Recharts or Chart.js (already in standards-reference allowed libraries).

### 4.18 — Line Chart

**Used for Earnings Overview (Image 1, 5).**

**Anatomy:**
- Y-axis: TND values (500, 1K, 1.5K, 2K, 2.5K, 3K)
- X-axis: dates (May 1, May 8, May 15, May 22, May 29)
- Line color: `--brand-blue-600`
- Line width: 2-3px
- Data point: 4-6px circles on line, same color
- Hover: tooltip showing exact value and date
- Background grid: faint horizontal lines `--chart-grid`
- Period selector dropdown: top-right ("This Month ▼")

**Implementation:** Recharts.

### 4.19 — Quick Actions Grid

**4-icon button grid (Image 1, 3, 5).**

**Anatomy:**
- 2×2 or 4×1 grid (responsive)
- Each cell:
  - Icon circle: 56×56, `--brand-blue-100` bg, `--brand-blue-600` icon
  - Optional badge on icon (e.g. Messages count [8])
  - Label below: `--text-body-sm`, weight 500
- Hover: subtle background tint
- Clickable: navigates to relevant page

### 4.20 — Kebab Menu (3-dot more)

**Anatomy:**
- Trigger: 24×24 button with vertical 3-dot icon
- Color: `--text-muted`
- Hover: `--surface-subtle` bg
- Click opens dropdown menu (Section 4.4 dropdown styling)
- Menu items: Edit, Pause, Duplicate, Share, Delete (red text for destructive)

### 4.21 — Empty State

**When a list has no items.**

**Anatomy:**
- Centered card
- Illustration or icon (Lucide, 48-64px, `--text-muted` color)
- Title: `--text-h3`, "Aucune commande pour l'instant"
- Description: `--text-body`, `--text-muted`, 1-2 lines
- Primary CTA: "Parcourir le marketplace" or similar

### 4.22 — Upgrade CTA Card

**Premium upsell card (visible in sidebar bottom, services right column, etc.).**

**Anatomy:**
- Background: dark navy `--brand-navy-900` OR `--brand-blue-600`
- Icon: rocket or crown
- Title: white, weight 600
- Subtitle: light blue, `--text-body-sm`
- Button: white bg, navy text "Upgrade Now"
- Border-radius: `--radius-xl`
- Padding: `--space-4`

---

## Section 5 — Page patterns <a name="section-5"></a>

The 11 designed pages cluster into 6 reusable layout patterns.

### 5.1 — Hero stats row

Used on: My Services, My Projects, My Proposals, My Earnings, My Orders, Browse Products, Settings (Profile Completion variant), Dashboard.

**Pattern:** 5-6 StatTile components in horizontal row at top of page, below page header. Adapts to fewer on mobile (2×3 grid).

### 5.2 — List page layout

Used on: My Services (list view), My Projects, My Proposals, My Orders.

**Structure:**
1. Page header + breadcrumb + primary CTA
2. Hero stats row (5-6 tiles)
3. Tab navigation (All / Active / Pending / etc.)
4. Filter bar (Search + Filters + Sort + Grid/List)
5. List rows (Section 4.14)
6. Pagination
7. Optional right column with Analytics widgets

### 5.3 — Grid page layout

Used on: My Services (grid view), Browse Products.

**Structure:**
1. Page header
2. Hero stats row
3. Tab navigation (when applicable)
4. Filter bar
5. Grid cards (Section 4.15)
6. Pagination
7. Right column with Filters panel + Categories + Upgrade CTA

### 5.4 — Form page layout

Used on: Settings, profile edit (when designed).

**Structure:**
1. Page header + breadcrumb
2. 3-column layout:
   - **Left:** Sub-tab navigation (Section 4.11 vertical variant)
   - **Middle:** Form fields with Save button
   - **Right:** Status widgets (Profile Completion, Account Status, Quick Actions)

### 5.5 — Wizard page layout

Used on: Create New Service (Image 2 - Wizard).

**Structure:**
1. Page header
2. Horizontal stepper (Section 4.13)
3. 2-column layout:
   - **Left/Center:** Current step form
   - **Right:** Tips + Preview + Help

Footer: Cancel + Save & Continue buttons.

### 5.6 — Detail page layout (profile / order / service)

Used on: My Profile (Image 1).

**Structure:**
1. Page header + breadcrumb + secondary CTAs ("View Public Profile", "Edit Profile")
2. Hero card: Avatar (left) + Identity info (center) + 6-stat grid (right)
3. Tab navigation (Overview | About | Services | Portfolio | Reviews | Earnings | Activity | Settings)
4. 3-column body:
   - **Left:** About Me card
   - **Center:** My Bio + Education
   - **Right:** Profile Strength + Social Links

### 5.7 — Right column patterns

Whether a page has a right column depends on what's useful:

| Page | Right column? | Contents |
|---|---|---|
| Dashboard | YES | Profile Strength, Wallet, Top Opportunities, Quick Actions |
| My Profile | NO (within hero/tabs) | — |
| My Services | YES | Service Categories, Performance Overview, Upgrade CTA |
| My Projects | YES | Project Overview donut, Upcoming Deadlines, Quick Actions |
| My Proposals | YES | Proposal Analytics, Response Rate, Top Categories, Tips |
| My Earnings | YES | Wallet, Earnings by Source, Quick Actions, Upgrade CTA |
| My Orders | YES | Order Summary, Order Status Overview, Recently Viewed, Need Help |
| Browse Products | YES | Categories, Filter Products |
| Settings | YES | Profile Completion, Account Status, Quick Actions |
| Create Service Wizard | YES | Tips, Service Preview, Need Help |

**Conclusion:** Right column is the DEFAULT for most pages. Only the Profile page hides it (uses tabs instead).

---

## Section 6 — Vocabulary lock (FR/AR) <a name="section-6"></a>

**The agency used English labels. Servyou is FR-first. Locked vocabulary.**

### 6.1 — Sidebar items

| English (agency) | French (locked) | Arabic | Route |
|---|---|---|---|
| Dashboard | Tableau de bord | لوحة التحكم | `/mon-profil-freelance` |
| My Profile | Mon profil | ملفي الشخصي | `/mon-profil-freelance/profil` |
| Services ▼ | Mes services ▼ | خدماتي | `/mon-profil-freelance/services` |
| └ My Services | └ Mes services | └ خدماتي | `/mon-profil-freelance/services` |
| └ Create New Service | └ Créer un service | └ إنشاء خدمة | `/mon-profil-freelance/services/ajouter` |
| Projects ▼ | Mes engagements ▼ | المهام الجارية | `/mon-profil-freelance/engagements` |
| Proposals | Mes propositions | عروضي | `/mon-profil-freelance/propositions` |
| Earnings | Mes revenus | أرباحي | `/mon-profil-freelance/revenus` |
| Reviews | Avis clients | تقييماتي | `/mon-profil-freelance/avis` |
| Messages | Messages | الرسائل | `/messages` |
| **— ECOSYSTEM —** | **— ÉCOSYSTÈME —** | **— النظام البيئي —** | |
| For Consumers / Offer your services | Pour les consommateurs / Proposez vos services | للمستهلكين | `/marche/consommateurs` |
| For Shop Owners / Provide your services | Pour les vendeurs / Proposez vos services | للبائعين | `/marche/vendeurs` |
| Marketplace / Buy products | Marketplace / Acheter des produits | السوق | `/marche/produits` |
| **— TOOLS —** | **— OUTILS —** | **— الأدوات —** | |
| Orders | Mes commandes | مشترياتي | `/mes-commandes` |
| Saved Items | Mes favoris | المحفوظات | `/mes-favoris` |
| Analytics | Statistiques | الإحصائيات | `/statistiques` |
| **— ACCOUNT —** | **— COMPTE —** | **— الحساب —** | |
| Settings | Paramètres | الإعدادات | `/parametres` |
| Help & Support | Aide & support | المساعدة والدعم | `/aide` |
| Upgrade to Premium / Grow your business | Passer à Premium / Développez votre activité | الترقية إلى بريميوم | `/premium` |

**Important — rename of "Projects" to "Engagements":**

The agency used "Projects" but in Servyou's data model, projects overlap with services. Lock the vocabulary:
- **Mes services** = catalog (what I offer) → `service_listings` table
- **Mes engagements** = active client work (in progress) → `orders` with status `accepted`/`in_progress`
- **Mes propositions** = my outgoing pitches → future `responses` table (PR-F4)
- **Mes commandes** = my consumer-side purchases → `orders` where buyer_id = me

### 6.2 — Status labels (locked)

| English | French | Arabic |
|---|---|---|
| Active | Actif | نشط |
| Pending | En attente | قيد الانتظار |
| Pending Review | En attente d'approbation | قيد المراجعة |
| Paused | Mis en pause | متوقف مؤقتاً |
| Draft | Brouillon | مسودة |
| Delivered | Livré | تم التسليم |
| In Transit | En cours de livraison | قيد التوصيل |
| Processing | En préparation | قيد التحضير |
| In Progress | En cours | قيد التنفيذ |
| Completed | Terminé | منجز |
| Cancelled | Annulé | ملغى |
| Declined | Refusé | مرفوض |
| Withdrawn | Retiré | تم السحب |
| New | Nouveau | جديد |
| Best Seller | Meilleure vente | الأكثر مبيعاً |
| Sale | Solde | تخفيض |
| Verified | Vérifié | موثّق |

### 6.3 — Action labels (locked)

| English | French | Arabic |
|---|---|---|
| Create New Service | Créer un service | إنشاء خدمة |
| Save Changes | Enregistrer | حفظ التعديلات |
| Cancel | Annuler | إلغاء |
| Save & Continue | Enregistrer et continuer | حفظ ومتابعة |
| View Details | Voir les détails | عرض التفاصيل |
| View All | Voir tout | عرض الكل |
| View Full Preview | Aperçu complet | المعاينة الكاملة |
| Edit Profile | Modifier le profil | تعديل الملف |
| View Public Profile | Voir le profil public | عرض الملف العام |
| Share Profile | Partager le profil | مشاركة الملف |
| Track Order | Suivre la commande | تتبع الطلب |
| Apply Filters | Appliquer les filtres | تطبيق الفلاتر |
| Clear All | Effacer tout | مسح الكل |
| Withdraw | Retirer | سحب |
| Improve Profile | Améliorer le profil | تحسين الملف |
| Find New Projects | Trouver de nouveaux projets | البحث عن مشاريع |
| Search... | Rechercher... | بحث... |
| Sort by | Trier par | ترتيب حسب |
| Newest | Plus récent | الأحدث |
| Oldest | Plus ancien | الأقدم |
| All | Tous | الكل |

### 6.4 — Empty state language (locked)

| Context | French | Arabic |
|---|---|---|
| No services | Aucun service pour l'instant — Créez votre premier service | لا توجد خدمات بعد |
| No demandes | Aucune demande pour l'instant | لا توجد طلبات بعد |
| No propositions | Aucune proposition envoyée — Parcourez les missions disponibles | لم ترسل أي عرض بعد |
| No saved missions | Aucune mission sauvegardée | لا توجد مهام محفوظة |
| No orders (consumer) | Aucune commande pour l'instant — Découvrez le marketplace | لا توجد طلبات شراء |
| No earnings | Aucun revenu pour l'instant | لا توجد أرباح بعد |

### 6.5 — Tunisian Dinar formatting

- Latin context: `2,450 TND` (comma thousands separator, space before TND)
- Arabic context: `٢٬٤٥٠ د.ت` (Arabic numerals with thousands separator, Tunisian Dinar abbreviation `د.ت`)
- **Exception:** Most Tunisian users use Western Arabic numerals (0-9) even when reading Arabic. Acceptable: `2,450 د.ت` in AR mode.

---

## Section 7 — Per-page reference <a name="section-7"></a>

### 7.1 — Dashboard (`/mon-profil-freelance`)

**Layout:** Section 5.2 hybrid (hero stats + sections + right column)

**Page header:**
- Title: "Bienvenue, Moatez 👋"
- Subtitle: "Voici ce qui se passe sur votre activité aujourd'hui"
- Primary CTA: "+ Créer un service"

**Hero stats row (4 tiles with kebabs):**
- Total Earnings / Mes revenus totaux 2,450 TND ↑ 18% **[Phase 4 — show "Bientôt disponible" placeholder in MVP]**
- Active Projects / Engagements actifs 7 ↑ 2 new
- Total Clients / Clients totaux 24 ↑ 5 new
- Rating 4.9 ⭐ (32 reviews) **[Phase 3 — placeholder in MVP]**

**Ecosystem Overview widget:** Section 7.1.1

**Earnings Overview chart:** Line chart with date selector **[Phase 4 — placeholder]**

**Recent Activity list:** 4-5 events with icons, titles, timestamps

**Projects in Progress table:** Project / Client Type / Client / Progress / Deadline / Budget / Action

**Right column:**
- Profile Strength 85% (Section 7 Profile Completion variant)
- Wallet (Available Balance, Pending, Total Earned, Withdraw button) **[Phase 4]**
- Top Opportunities for You (3 items, Shop Owner / Consumer tags) **[Phase 3]**
- Quick Actions (4 icons: Create Service, Browse Projects, Buy Products, Messages [8])

**MVP-shippable subset:** Welcome bar + 3 stats (replace Earnings/Rating with MVP equivalents) + Ecosystem Overview + Recent Activity + Profile Strength + Quick Actions.

### 7.1.1 — Ecosystem Overview widget (Servyou's differentiator)

**Three connected cards:**
```
[Consumers]  ←arrow→  [Freelancer (YOU)]  ←arrow→  [Shop Owners]
```

- **Left card (Consumers):** Soft green bg, "15 consumers who used your services", CTA "View Requests" (`/commandes`)
- **Center card (Freelancer YOU):** Blue solid bg, blue icon, "Provide services, buy products, grow your business", CTA "Go to My Services" (`/services`)
- **Right card (Shop Owners):** Soft orange bg, "6 shops you've worked with", CTA "View Shops"
- Arrows between cards: dashed gray, decorative
- **MVP version:** Show "0 consumers" / "0 shops" until data exists.

### 7.2 — My Profile (`/mon-profil-freelance/profil`)

**Layout:** Section 5.6 detail page

**Page header:**
- Title: "Mon profil"
- Breadcrumb: Home > Mon profil
- Right buttons: [👁 Voir le profil public] [✏️ Modifier le profil]

**Hero card:**
- Avatar (120×120) with green online dot
- Name + verified blue check
- Headline: "Designer Web Créatif & Spécialiste UI/UX"
- Meta: 📍 Tunis, Tunisia · Membre depuis May 2024 · 💼 Freelancer
- Bio (3 lines)
- Buttons: [✏️ Modifier le profil] [🔗 Partager le profil]
- 6-stat grid (right side):
  - 4.9 Rating ⭐ **[Phase 3]**
  - 32 Reviews **[Phase 3]**
  - 24 Completed Projects
  - 100% Job Success **[Phase 3]**
  - 2,450 TND Total Earnings **[Phase 4]**
  - 7 Active Projects

**Tab navigation:** Overview | À propos | Services | Portfolio | Avis | Revenus | Activité | Paramètres

**Overview tab body (3 columns):**
- **Left:** About Me card (Full Name, Email, Phone, Location, Languages, Availability green pill, Member Since) + Skills & Expertise chips
- **Center:** My Bio (3 paragraphs) + 4 check-marked competencies + Education entries
- **Right:** Profile Strength 85% circle + checklist + Social Links (Website, LinkedIn, Behance, Dribbble — with brand icons)

### 7.3 — My Services list view (`/mon-profil-freelance/services`)

**Layout:** Section 5.2 list page

**Hero stats (5 tiles):** Total / Active / Paused / Total Orders / Total Earnings (Earnings = Phase 4 placeholder)

**Tabs:** All Services | Active | Paused | Drafts | Archived

**Filter bar:** Search + Category + Status + Sort + Grid/List toggle

**Service rows:** Thumbnail + Title + Status pill + Description + Category/Price/Delivery chips + Orders/Earnings/Rating columns + View button + kebab

**Right column:** Service Categories (with counts) + Performance Overview (Views/Clicks/Orders/Earnings) + Upgrade CTA

### 7.4 — My Services grid view (same route, toggle)

**Hero stats (6 tiles):** Total / Active / Pending Review / Drafts / Total Views / Total Orders

**Grid cards:** Cover image + Status pill + Heart + Avatar+Name+Title + Rating + Orders + Price + Delivery + kebab

**Right column:** Filters panel (Status / Category / Subcategory / Price Range / Delivery Time / Sort By + Apply) + Upgrade CTA

### 7.5 — My Engagements (`/mon-profil-freelance/engagements`)

**Layout:** Section 5.2 list page

**Hero stats (5 tiles):** Total Projects 7 / In Progress 4 / Pending 2 / Completed 1 / Total Earnings 12,450 TND **[Phase 4]**

**Tabs:** All Projects | In Progress | Pending | Completed | Cancelled

**Engagement rows:** Thumbnail + Title + Status pill + Client (Shop Owner / Consumer label) + Description + Category chip + Budget + Deadline + Progress bar + View Details + kebab

**Right column:** Project Overview donut (4 statuses with %) + Total Earnings widget + Upcoming Deadlines (3 items with dates and "X days left") + Quick Actions (Create Project, Browse Services, Invite Client, Manage Proposals, Project Templates, Help Center)

### 7.6 — My Propositions (`/mon-profil-freelance/propositions`)

**Layout:** Section 5.2 list page

**Hero stats (5 tiles):** Total Proposals 18 / Accepted 7 (38.9% acceptance rate) / Pending 6 / Declined 4 (22.2% decline rate) / Total Earnings from Won 7,450 TND **[Phase 4]**

**Tabs:** All Proposals | Pending | Accepted | Declined | Withdrawn

**Proposition rows:** Icon + Title + Client + Description + Category + Proposed Price + Proposed On (date) + Status pill + View Details + kebab

**Right column:** Proposal Analytics donut (4 statuses) + Response Rate 82% + Avg Response Time 1.5 Days + Top Categories (with proposal counts) + Tips to Get More Clients (4-tip checklist)

### 7.7 — My Revenus / Earnings (`/mon-profil-freelance/revenus`) **[Phase 4]**

**Status:** Entire page deferred to Phase 4 (PR-F28). Show "Bientôt disponible" placeholder in MVP.

When Phase 4 ships, layout is Section 5.2 with: 5 stats (Total Earnings / Available / Pending / Withdrawn / This Month), Line chart, Donut breakdown, Wallet widget with Withdraw button, "Top 15% of freelancers this month" banner, Recent Transactions table, Quick Actions, Upgrade CTA.

### 7.8 — My Orders (consumer view) (`/mes-commandes`)

**Layout:** Section 5.2 list page

**User context:** Same Moatez, but `Consumer` role label in top-right

**Hero stats (6 tiles — full 8-stage lifecycle):**
- Total Orders 24
- Delivered 16
- In Transit 5 ("On the way")
- Processing 2 ("Being prepared")
- Cancelled 1
- Total Spent 3,240 TND ↑ 18%

**Tabs:** All Orders | Processing | In Transit | Delivered | Cancelled | Returned

**Order rows:** Thumbnail + Order# + Title + Category + Shop name + Qty + Total + Status pill + Date info + (View Details OR Track Order) + kebab

**Right column:** Order Summary (3 metrics) + Order Status Overview donut + Recently Viewed Products (4 thumbnails) + Need Help support card

### 7.9 — Browse Products (`/marche/produits`)

**Layout:** Section 5.3 grid page

**Hero stats (5 tiles):** Total Products 1,248 / Categories 24 / Shops 156 (Verified) / Top Rated 4.8 / My Orders 12

**Filter bar:** Search + Categories + Shops + Price Range + Sort + Grid/List toggle

**Product cards (5 across desktop):** Cover + Status ribbon (New / Best Seller / Sale) + Heart + Category chip + Title + Shop name + verified ✓ + ⭐ rating + price + (strikethrough old price + sale %) + Cart icon

**Right column:** Categories (with counts) + Filter Products (Price Range slider + Shop Rating checkboxes + Availability checkboxes + Apply Filters)

**Pagination:** Bottom-centered, "Showing X to Y of Z"

### 7.10 — Settings (`/parametres`)

**Layout:** Section 5.4 form page

**Left sub-tab nav:** Account Settings (active) | Profile Settings | Notification Settings | Privacy & Security | Payment Methods **[Phase 4]** | Payout Settings **[Phase 4]** | Connected Accounts **[Phase 2]** | Billing & Plans **[Phase 5]**

**Center form (Account Settings):** Full Name / Email (Verified) / Username / Phone (TN flag + Verified) / Location dropdown / Language dropdown / Timezone dropdown / Save Changes button

**Right column:** Profile Completion 85% + Account Status (Account Type / Member Since / Last Active / Status pill) + Quick Actions (View Profile / Payout Settings / Privacy Settings / Delete Account in red)

### 7.11 — Create New Service Wizard (`/mon-profil-freelance/services/ajouter`)

**Layout:** Section 5.5 wizard

**5 steps:**
1. **Basic Information** — Title (0/80) / Category + Subcategory / Service Type radio (Standard / Custom) / Short Description (0/160) / Detailed Description rich text editor (0/5000)
2. **Pricing & Packages** — Starting price + delivery time + revisions count + optional Basic/Standard/Premium tiers
3. **Requirements** — Briefing field + buyer instructions (matches PR-F2.3 briefing field)
4. **Gallery & Extras** — Service images upload + Deliverables checklist + Tags chips (matches PR-F2.3 deliverables + tags)
5. **Publish** — Review summary + Publish toggle

**Right sidebar:** Tips for a Great Service (6 bullet tips) + Service Preview (mock card showing how it'll look) + Need Help / View Guidelines

**Footer:** [Cancel] (left) [Save & Continue →] (right)

---

## Section 8 — Migration plan <a name="section-8"></a>

### 8.1 — Order of execution

**Phase 0 — Cleanup (5 min):**
- Push `feature/freelancer-workspace` branch to abandon OR cherry-pick PR-F2.3 + PR-F2.3.1 into a clean branch and abandon PR-F2.3.2 (sidebar superseded)
- Merge functional improvements to main
- Discard the old sidebar (was locked yesterday, now superseded by founder directive)

**Phase 1 — Design System Foundation (CC: 1-2 days)**
- **PR-DS-1:** Update Tailwind config with all Section 2 tokens
- **PR-DS-2:** Build new layout shell (Sidebar component with 4 sections, Topbar with search-centric layout)
- **PR-DS-3:** Build core components: Button (all variants), Input, Select, Card, StatTile, StatusPill, VerifiedBadge, Avatar
- **PR-DS-4:** Build pattern components: FilterBar, TabNavigation, Pagination, Stepper, ListRow, GridCard, ProgressBar, ProgressCircle, EmptyState, UpgradeCTA, QuickActionsGrid
- **PR-DS-5:** Migrate Settings page (simplest — proves system end-to-end)
- **Visual gate after each PR**

**Phase 2 — Page migrations (CC: ~1 day per page)**
Order chosen for risk minimization (working pages first):
- Day 1: Dashboard (highest-impact, validates Ecosystem widget)
- Day 2: My Profile (mostly works today)
- Day 3: My Services (list + grid views)
- Day 4: Create Service Wizard (replaces existing service form)
- Day 5: My Orders consumer view (validates multi-role)
- Day 6: Browse Products (public marketplace)

**Phase 3 — Build new pages with new system (CC: 1-3 days per page)**
- My Engagements (NEW page, renames "Projects")
- My Propositions (PR-F4 — uses new design from start)
- Missions sauvegardées (PR-F5)
- My Revenus (Phase 4 placeholder for now)

**Phase 4 — Extension as agency delivers more designs**
- Auth flows
- Public freelancer profile
- Service detail page
- Mission board
- Shop owner workspace
- Admin dashboard
- Mobile responsive

### 8.2 — What gets deprecated

- Old `FreelancerSidebar.tsx` (locked yesterday in PR-F2.3.2) — superseded
- Old `MarcheSidebar.tsx` — superseded by unified sidebar
- Old `MarcheTopBar.tsx` — superseded by new Topbar with search-centric layout
- Old `ProfileAvatarMenu.tsx` — simplified to account-only (no more "Mon compte" section, that's now in sidebar)
- Old service form — replaced by 5-step wizard

### 8.3 — What stays

- All database tables (no schema changes)
- All migrations
- All server actions (validators stay, just connect to new UI)
- PR-F2.3 added fields (deliverables, revisions, tags, briefing) — populated by wizard step 3-4
- PR-F2.3.1 functional fixes (defensive logging, AR root-cause fix) — survive any redesign
- i18n infrastructure (just add new keys per Section 6 vocabulary)
- Auth flow logic (just restyle)
- RLS policies

---

## Section 9 — Accessibility + RTL <a name="section-9"></a>

Per `servyou-standards-reference.md` Section 1 + 4.

### 9.1 — Accessibility requirements

All components honor WCAG 2.2 AA:
- Color contrast ≥ 4.5:1 for body text, ≥ 3:1 for UI
- Focus visible on every interactive element
- Tap targets ≥ 44×44 (sidebar items, buttons all comply)
- Keyboard navigation works for every interaction
- ARIA labels on icon-only buttons
- Form labels associated with inputs (`for`/`id`)
- Error messages tied to inputs via `aria-describedby`
- Heading hierarchy: one `<h1>` per page, no skipped levels
- Skip-to-content link at top
- Reduced-motion respected by all animations

### 9.2 — RTL adaptation

When `<html lang="ar" dir="rtl">`:
- Sidebar moves to RIGHT side of screen (or stays left — design decision needed)
- All Tailwind utilities use logical properties (`ps-`, `pe-`, `ms-`, `me-`, `text-start`)
- Status pills mirror correctly (delete X button moves to LEFT in pills)
- Donut chart legend flips
- Line chart x-axis goes RIGHT TO LEFT (date order reversed)
- Sidebar section labels (MAIN, ECOSYSTEM, TOOLS, ACCOUNT) translate per Section 6
- Sidebar items show Arabic labels per Section 6.1
- Search placeholder in AR
- All status pills in AR per Section 6.2
- Verified badges with Arabic "موثّق" instead of "Verified"
- Numbers stay LTR even within Arabic text (Tunisian convention)
- Tunisian Dinar shown as `د.ت` in Arabic or `TND` in French

**Open question:** Should the sidebar stay on LEFT in RTL mode (anchored by Servyou logo position) or flip to RIGHT (true RTL convention)?

**Recommendation:** Sidebar flips to RIGHT in AR. The Servyou logo also moves to right. Topbar items reverse order. This is the proper RTL convention used by Souq.com, Noon, Jumia.

---

## Section 10 — What's missing and how we'll fill it <a name="section-10"></a>

### 10.1 — Pages not yet designed

**Critical (blocks launch):**
- Sign in / Sign up / Forgot password
- Public freelancer profile (`/freelance/[username]`)
- Service detail page (`/services/[id]`)
- Mission board (`/emplois`)
- Mission detail page
- Shop owner workspace (dashboard, products, orders, shop settings)
- Public shop page (`/boutique/[slug]`)
- Public marketplace landing (`/`)
- Order detail with lifecycle stepper
- Admin dashboard

**Important (blocks polish):**
- Notification panel (when bell clicked)
- Messages inbox (when chat icon clicked)
- Search results page
- Modals (confirmations, image uploads)
- 404 / error pages
- Empty states for each list page

**Critical (blocks mobile):**
- Mobile views for ALL 11 designed pages

### 10.2 — How we'll fill

**Approach A — Ask agency for the rest**
Tell agency: "Can you also send: Auth (sign-in/sign-up/forgot), Public profile, Service detail, Mission board + detail, Order detail, Shop owner workspace (dashboard + 3 sub-pages), Admin dashboard, Mobile responsive for all 11 + new pages?"

**Approach B — Extrapolate from existing system**
For pages we don't have designs for, derive them from the locked system:
- Auth flows: use Card + Input + Button components, layout like a centered card on `--page-bg`
- Service detail: reuse the Profile detail layout (Section 5.6) adapted for a service
- Mission board: reuse Browse Products grid layout (Section 5.3) adapted for jobs
- Shop owner workspace: reuse Freelancer workspace patterns (same sidebar sections, different items)
- Admin dashboard: simpler list pages with moderation actions

**My recommendation:** Approach A for critical missing pages (auth, public profile, service detail, mission board), Approach B for everything else as we build. Mobile responsive is engineering work — we do from desktop designs.

### 10.3 — Update protocol

When new designs arrive from agency:
1. Add to Section 7 (per-page reference)
2. If new components appear → add to Section 4
3. If new vocabulary appears → add to Section 6
4. Update Section 10 to reflect what's still missing
5. Increment doc version (v1.0 → v1.1)
6. Re-upload to project knowledge

---

## Appendix A — Quick reference summary

**Sidebar:** Dark navy bg, 4 sections (MAIN / ECOSYSTEM / TOOLS / ACCOUNT), Upgrade CTA bottom
**Topbar:** Search-centric, 4 action icons + role-labeled user profile
**Layout:** Page bg `#F8FAFC`, white cards, subtle borders, minimal shadows
**Color:** Brand navy + bright blue + 5 semantic colors (green/orange/purple/red/yellow)
**Type:** Inter, 13-step ramp, navy headings, stat numbers in navy
**Spacing:** 8-point grid, 24px card padding, 32px section gap
**Radius:** 12px cards, 10px buttons, full pills
**Shadows:** Minimal — borders carry the load
**Components:** 22 locked (Button, Input, Card, StatTile, StatusPill, etc.)
**Patterns:** 6 page layouts (hero+stats, list, grid, form, wizard, detail)
**Vocabulary:** FR-locked, AR provided, "Projects" → "Engagements"
**Phasing:** MVP-shippable subset of each page, Phase 3-4 features deferred with honest placeholders

---

## Appendix B — Sources

**Internal:**
- 11 page designs from partner design agency (delivered 2026-06-26)
- `product.md` — Unified Workspace Principle, Configurable Workspace Principle
- `data-model.md` — order lifecycle, table structures, RLS
- `roadmap.md` — phase plan
- `engineering-standards.md` — TypeScript, Server Components, Tailwind
- `servyou-standards-reference.md` — WCAG, Core Web Vitals, OWASP, form UX, internal standards
- `servyou-freelancer-world-class-spec.md` — fields per specialty
- `servyou-freelancer-tools-accounts-spec.md` — tools + accounts catalog
- `servyou-landing-page-template-v1.md` — locked landing page tokens (extended here)

**External:**
- Shopify Polaris design system structure (Foundations / Tokens / Components / Patterns / Content)
- IBM Carbon Design System (tokens-first, accessibility-first principles)
- Material Design 3 (semantic color system inspiration)
- Linear / Notion / Vercel (collapsible sidebar pattern)
- Mercury / Ramp / Brex (one-trusted-number dashboard pattern)
- Fiverr / Upwork (seller dashboard patterns adapted)

---

**End of Servyou Design System Master Reference v1.0**

> This is a living document. Update as agency delivers new pages, as components evolve, as vocabulary refines. Keep it focused: every section must serve current PRs, not future possibilities.
>
> **Next update expected:** When agency delivers auth pages + public profile + shop owner workspace.
