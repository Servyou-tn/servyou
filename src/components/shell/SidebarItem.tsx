import Link from 'next/link'
import { ChevronDown, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { FOCUS_RING } from '@/components/layout/styles'

// One sidebar nav row (design system Section 3.2 / Figma 611:45637 Nav Item). 44px tall (WCAG 2.2
// target size), radius 10, 20×20 icon, label 14/21 (text-body-sm). Active = solid brand-blue fill +
// white Semi Bold label + white icon; idle = white Medium label + blue-300 icon (the measured frame
// values — #8faef9 clears WCAG AA at ~7:1 on the navy ground, unlike the slate #64748B the DS avoids
// here); hover = white/5 wash.
//
// rounded-[10px]: kept as an explicit literal because it is the measured Figma value. (The older
// note here claimed `rounded-lg` still fell back to Tailwind's built-in 8px — that is STALE.
// Measured 2026-07-28 on this page: `rounded-lg` computes to 10px, so `--radius-lg` does reach
// @theme now. Left as a literal rather than churned to `rounded-lg` in a delta-fix PR; swap it
// when the shell is next touched for its own reasons.)
export function SidebarItem({
  href,
  label,
  icon: Icon,
  active,
  onNavigate,
  disabled,
  soonLabel,
  expanded,
}: {
  href: string
  label: string
  // Optional so the Marketplace sub-items (Produits/Services — indented, no icon; no measured
  // frame exists for them, INFERRED) can reuse this component instead of a second one.
  icon?: LucideIcon
  active: boolean
  onNavigate?: () => void
  // `disabled` renders the row as a non-navigable <span>, for a nav entry whose page is not built
  // yet. Founder call (G4): a nav pointing at 404s is worse than a nav that admits what is not
  // ready — the shop_owner section ships with its dashboard live and Mes produits / Commandes
  // reçues disabled until G5 and G8 land.
  //
  // ⚑ The "Bientôt" text badge this used to render INLINE is gone (G4 delta S1). Measured: the row
  // is 208 wide, `px-3` + the 20px icon + `gap-3` leave exactly 152px for the label, and the badge
  // took 65 of it — collapsing both labels to 87px, i.e. "Mes pr…" and "Comm…". The affordance now
  // rides on the muted treatment plus `title` / `aria-disabled`, which costs zero horizontal space
  // and keeps the locked vocabulary readable. `soonLabel` remains the tooltip text.
  disabled?: boolean
  soonLabel?: string
  // Present only on the Marketplace parent row (undefined everywhere else — no chevron at all).
  // A boolean, not a click-toggle: expansion is route-derived (Sidebar.tsx computes it from
  // isActiveRoute against the item's expandOn prefix), so this is purely decorative state, not a
  // disclosure control. No aria-expanded here on purpose — that ARIA promises a collapse the click
  // can't deliver (this row always navigates; it never toggles closed on its own click). INFERRED:
  // no measured Figma frame exists for a chevron on this navy sidebar (611:45637 is flat-only) and
  // the quota is exhausted — ChevronDown rotating 180° matches this codebase's two live disclosure-
  // chevron precedents (MarcheSidebar.tsx's filter toggle, AccountMenu.tsx's dropdown), not a
  // directional ChevronRight idiom. rtl:-scale-x-100 rides along for consistency with the
  // AccountMenu precedent, though a down-chevron is bilaterally symmetric so it's a visual no-op.
  // No transition-transform: expansion flips on a full navigation (server-rendered in its final
  // state), so there is nothing to animate — shipping a transition here would claim a motion effect
  // that can never actually fire.
  expanded?: boolean
}) {
  const content = (
    <>
      {Icon && (
        <Icon
          className={cn(
            'h-5 w-5 shrink-0',
            !active && !disabled && 'text-brand-blue-300',
            disabled && 'text-brand-blue-300/50',
          )}
          aria-hidden="true"
        />
      )}
      <span
        className={cn(
          'truncate text-body-sm',
          active ? 'font-semibold' : 'font-medium',
          disabled && 'text-white/50',
        )}
      >
        {label}
      </span>
      {expanded !== undefined && (
        <ChevronDown
          className={cn(
            'h-4 w-4 shrink-0 rtl:-scale-x-100',
            expanded && 'rotate-180',
            active ? 'text-white' : 'text-brand-blue-300',
          )}
          aria-hidden="true"
        />
      )}
    </>
  )

  // Label size AND weight live on the span above: text-body-sm bundles font-weight 400, so the
  // two must sit together on the leaf — and text-body-sm in this cn() would be dropped by
  // tailwind-merge against text-white (the documented TopbarSearch gotcha).
  // gap-2.5 (10px), not gap-3 (12px). Measured: the row is 208 wide, so `px-3` (24) + the 20px
  // icon + the gap is all that stands between the label and its box. At gap-3 the label got 152px
  // and the longest locked label, "Commandes reçues", needs 153 — a 1px shortfall that still
  // renders an ellipsis. 10px gives it 154 and every label in every role now fits whole.
  // justify-between only when a chevron is present (the Marketplace parent row) — every other
  // row is untouched, so this can't shift the truncation math the measured comment above depends
  // on for the rest of the sidebar.
  const base = cn(
    'flex h-11 items-center gap-2.5 rounded-[10px] px-3 transition-colors',
    expanded !== undefined && 'justify-between',
  )

  if (disabled) {
    return (
      <span aria-disabled="true" title={soonLabel} className={cn(base, 'cursor-not-allowed text-white')}>
        {content}
      </span>
    )
  }

  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={active ? 'page' : undefined}
      className={cn(
        base,
        active ? 'bg-brand-blue-600 text-white' : 'text-white hover:bg-white/5',
        FOCUS_RING,
      )}
    >
      {content}
    </Link>
  )
}
