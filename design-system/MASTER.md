# Servyou — Design System (MASTER, Source of Truth)

The codified design language of the Servyou marketplace, as actually shipped on
`feature/consumer-dashboard` (marché shell + consumer pages). **This file documents the
real system in code — not generated recommendations.** When it disagrees with a generator
(e.g. UI/UX Pro Max), this file and `src/app/globals.css` win.

Hierarchical retrieval: when building a specific page, check `design-system/pages/<page>.md`
first; if present it **overrides** this file for that page, otherwise use this MASTER.

Cross-check (UI/UX Pro Max, for the marketplace product type): Pattern = **Marketplace /
Directory** (search bar is the CTA; categories; featured listings; trust/safety). Style =
**Trust & Authority** (professional navy + blue, credentials/safety, WCAG-AAA target).
Servyou matches both. **Deliberate deviations:** the generator suggested Rubik + Nunito
Sans and CTA `#0369A1`; Servyou is locked on **Inter** and CTA **`#2563EB`** — keep Inter
and `#2563EB`.

---

## 1. Foundations

### Color tokens (`src/app/globals.css` `:root`, exposed as Tailwind utilities via `@theme inline`)
Reference tokens semantically (`bg-brand-accent`, `text-text-muted`, `border-border-subtle`) — never raw hex.

| Token | Hex | Tailwind utility | Use |
|---|---|---|---|
| `--brand-primary` | `#1E3A8A` (navy) | `brand-primary` | "Serv" wordmark; prices; avatar fallbacks |
| `--brand-accent` | `#2563EB` (blue) | `brand-accent` | primary CTAs, active states, focus ring |
| `--brand-accent-light` | `#3B82F6` | `brand-accent-light` | CTA hover |
| `--brand-sky` | `#BFDBFE` | `brand-sky` | atmosphere surfaces |
| `--brand-ice` | `#EFF6FF` | `brand-ice` | luminance backgrounds |
| `--surface-base` | `#FFFFFF` | `surface-base` | page + card background (pages are WHITE) |
| `--surface-subtle` | `#F8FAFC` | `surface-subtle` | read-only field bg, hover |
| `--surface-pill` | `#F1F5F9` | `surface-pill` | segmented-control track, pill capsules |
| `--text-primary` | `#0F172A` (slate-900) | `text-text-primary` | body + headings |
| `--text-muted` | `#64748B` (slate-500) | `text-text-muted` | secondary text, help |
| `--border-subtle` | `#E2E8F0` | `border-border-subtle` | card/field borders |
| `--status-dot-success` | `#10B981` | `status-dot-success` | success dot |

Status colors (Tailwind palette, used directly): blue = accepted/arrived, amber =
prepared/dispatched/in_delivery & cap-reached, green = received/secure, red = cancelled/destructive, slate = pending/neutral.

### Typography
- **Inter** (`--font-inter`) — body **and** headings. **Geist Mono** (`--font-geist-mono`) — mono. Loaded in `src/app/layout.tsx`. Do NOT add Rubik/Nunito.
- Body 14–16px, headings bold; page title `text-3xl font-bold`, section title `text-lg font-semibold`, card title `text-base/[17px] font-semibold`. Line-height 1.5–1.75 for body.

### Spacing / radius / shadow
- Radius: **`rounded-2xl`** big containers (cards/forms/modals), **`rounded-xl`** inputs/inner, **`rounded-full`** chips, pills, buttons, avatars, icon buttons.
- `CARD_SHADOW` = `shadow-[0_2px_8px_rgba(0,0,0,0.04)]`, `HOVER_SHADOW` = the lift (`@/components/layout/styles`).
- Transitions: **150–300ms ease-out**; animate transform/opacity, not width/height.

---

## 2. Signature utilities (`src/app/globals.css`, `@layer components`)

- **`.card-premium`** — the floating-card treatment: white bg, blue-tinted border
  `rgba(37,99,235,0.18)`, 3-layer blue-tinted shadow, `rounded-2xl` (1rem), hover lift
  `translateY(-2px)`, reduced-motion safe. On every product/service/order/mission card +
  detail/form/settings containers.
- **`.outline-brand`** — stronger visible blue border `rgba(37,99,235,0.40)` → `0.55` on
  hover; transition includes transform/box-shadow so it doesn't clobber `.card-premium`'s
  lift when stacked. Used on: service cards, the sidebar panel, the search pill, detail
  info cards, form/settings containers.
- **`FOCUS_RING`** (`@/components/layout/styles`) = `focus-visible:ring-2
  ring-brand-accent ring-offset-2 ring-offset-surface-base` — on every interactive element.

---

## 3. Shell & layout

- **`MarcheLayout`** (`src/components/marche/MarcheLayout.tsx`) wraps every consumer page:
  `<MarcheSidebar/>` + `<main>` (`MarcheTopBar` + `mx-auto max-w-7xl px-6 py-6 lg:px-8 lg:py-8`).
  Takes `user: TopBarUser | null` (from `getShellUser()`); `bg-white`.
- **`MarcheSidebar`** — floating white pill-nav card, locked 224px, `hidden lg:block`
  (mobile drawer = future). Nav items are `rounded-full` pills matching the top-bar
  Settings pill; active = `bg-brand-accent/10 border-brand-accent/30 text-brand-accent`.
- **`MarcheTopBar`** — sticky `top-0 z-40`, flush; gains a `bg-white/80 backdrop-blur` +
  bottom-border surface on scroll. Left: search pill (`SharedSearchBar`). Right: 44×44
  circular icon cluster (Settings pill / Bell / `ProfileAvatarMenu`), `hidden md:flex`.
- **Container widths:** shell content `max-w-7xl`; forms + settings `max-w-3xl mx-auto`;
  search pill `max-w-2xl`. Detail pages: `lg:grid lg:grid-cols-5` (gallery `col-span-3`,
  sticky info `col-span-2`) — NOT arbitrary `grid-cols-[3fr_2fr]` (doesn't generate in
  this Tailwind v4 setup). DOM order = mobile stack order; explicit `col-start/row-start`
  place desktop columns.

---

## 4. Reusable components (build with these, don't reinvent)

- `SegmentedControl` (`ui/segmented-control.tsx`) — Motion `layoutId` sliding pill; ALL
  toggles/filters (search type, favoris tab, commandes filter, language).
- `ProductListingCard` (vertical grid card) / `ServiceListingCard` (full-width Upwork row)
  / `OrderCard` / `MissionCard` / `OrderStatusBadge` / `EmptyState` / `PageHeader` /
  `ProductGallery` (thumb-swap + counter + empty state) / `FavoriteButton`.
- **Toasts: Sonner** — `<Toaster position="top-center" richColors />` in the root layout;
  `toast.success` / `toast.error` for ALL feedback. (The platform standard.)
- **Modals** — backdrop `bg-black/50 z-50` + centered `rounded-2xl` card; parent mounts
  only while open (`{open && <Modal/>}`) so state resets on unmount (no reset effect).
  Escape + backdrop close; `role="dialog" aria-modal`.
- **Icons: lucide-react** (the chosen standard). Older inline-SVG icon files still exist
  for the marketplace shell; new work uses lucide.

---

## 5. Conventions

- **`'use client'`** only when interactivity requires it; server components default.
- **i18n**: every string via `t(key, lang)`; keys in BOTH `fr.ts` + `ar.ts` (parity test
  enforces identical key sets + `{token}` preservation). French is the default UI.
- **RTL**: `dir=rtl` for Arabic; logical properties (`ps/pe/ms/me/start/end`), and
  `rtl:-scale-x-100` on directional arrows.
- **Auth gating**: pages showing own data redirect logged-out users to
  `/connexion?next=<path>`; public pages render with a nullable user.
- **Moderation**: public reads filter `status='active'` + the entity's (and parent's)
  `admin_hidden_at IS NULL`.
- **Reduced motion**: Tailwind `motion-safe:` / `motion-reduce:` variants, or
  `useReducedMotion()` from `motion/react`.
- **Forms**: visible `<label htmlFor>`; required asterisk; blur-time inline errors
  (`text-red-600` + AlertCircle, field `ring-2 ring-red-500/30`); `type="tel"
  inputMode="numeric"` for phone, `autoComplete`; loading button = `Loader2` spinner +
  disabled; focus-first-error on submit. Phone via `lib/phone.ts`; governorates via
  `lib/tunisia-governorates.ts`.

---

## 6. Accessibility (WCAG 2.2 AA — Pillar 1 hard constraints)
4.5:1 contrast (normal text) / 3:1 (large); **44×44px** touch targets (icon buttons are
`h-11 w-11`); every input has an associated label; visible focus ring everywhere; alt text
on meaningful images (`alt=""` on decorative); color never the only signal;
`prefers-reduced-motion` respected.

## 7. Anti-patterns (avoid)
Emoji as icons; hover scale that shifts layout (use the `card-premium` lift / color
transitions); `bg-white/10` glass in light mode; gray-400 body text; arbitrary
`grid-cols-[Nfr_Mfr]`; raw hex instead of tokens; AI purple/pink gradients; div inside
`<button>` (use `span`); generic credential-free trust copy.

## 8. Pre-delivery checklist
- [ ] No emoji icons (lucide SVG only) · [ ] `cursor-pointer` + visible hover feedback on
  interactives · [ ] transitions 150–300ms · [ ] focus rings present · [ ] light-mode text
  ≥4.5:1 · [ ] borders visible · [ ] responsive 375/768/1024/1440 · no horizontal scroll ·
  [ ] inputs labelled · [ ] `prefers-reduced-motion` respected · [ ] i18n fr+ar parity ·
  [ ] `npm run build` + `lint` + `test` green.
