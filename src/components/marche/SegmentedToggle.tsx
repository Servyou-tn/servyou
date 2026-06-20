'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { FOCUS_RING } from '@/components/layout/styles'
import type { ToggleType } from '@/lib/search/search-params'

// The top-bar 4-option segmented toggle: Produits / Services / Boutiques / Freelances. Every
// option is a navigation (in-place ?type= on the homepage and on /marche for the catalog
// types; a route jump for boutiques/freelances), so the pills are accessible <Link>s styled as
// a segmented control — Tab moves through them and Enter activates (the right semantics + a11y
// for navigation). The active option is highlighted in brand-accent; an optimistic local state
// flips the highlight instantly on click, then re-syncs to the route-derived `value`.
//
// On narrow screens the track scrolls horizontally (scrollbar hidden) so all four pills stay
// reachable without a menu.
export function SegmentedToggle({
  value,
  hrefFor,
}: {
  value: ToggleType
  hrefFor: (type: ToggleType) => string
}) {
  const lang = useLang()
  const [active, setActive] = useState<ToggleType>(value)
  useEffect(() => setActive(value), [value])

  // Produits/Services keep their i18n keys; Boutiques/Freelances are hardcoded French (no key
  // yet — the list pages arrive in a later PR; an i18n pass can fold them in then).
  const options: { value: ToggleType; label: string }[] = [
    { value: 'product', label: t('common.products_section', lang) },
    { value: 'service', label: t('common.services_section', lang) },
    { value: 'shop', label: 'Boutiques' },
    { value: 'freelance', label: 'Freelances' },
  ]

  return (
    <div
      role="group"
      aria-label="Type de contenu"
      className="inline-flex min-w-0 max-w-full items-center gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {options.map((o) => {
        const isActive = o.value === active
        return (
          <Link
            key={o.value}
            href={hrefFor(o.value)}
            onClick={() => setActive(o.value)}
            aria-current={isActive ? 'true' : undefined}
            // Same pill family as the sidebar account buttons (MarcheSidebar's NAV_BASE +
            // IDLE_PILL): identical rounded-full shape, border-border-subtle, px-4, shadow, hover
            // (bg-slate-50 + lift), and FOCUS_RING — just a tighter py for the shorter top bar.
            // Inactive matches the sidebar idle pill exactly; active keeps the solid brand fill.
            className={cn(
              'shrink-0 cursor-pointer whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-200 ease-out',
              FOCUS_RING,
              isActive
                ? 'border border-brand-accent bg-brand-accent text-white shadow-sm'
                : 'border border-border-subtle bg-white text-text-primary shadow-sm hover:bg-slate-50 hover:shadow-md',
            )}
          >
            {o.label}
          </Link>
        )
      })}
    </div>
  )
}
