'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { interactiveSurface } from '@/components/ui/interactive-surface'
import type { ToggleType } from '@/lib/search/search-params'

// The top-bar 2-option segmented toggle: Produits / Services. Each option is an in-place ?type=
// navigation (on the homepage and on /marche), so the pills are accessible <Link>s styled as a
// segmented control — Tab moves through them and Enter activates (the right semantics + a11y for
// navigation). The active option is highlighted in brand-accent; an optimistic local state flips
// the highlight instantly on click, then re-syncs to the route-derived `value`.
//
// On narrow screens the track scrolls horizontally (scrollbar hidden) so both pills stay
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

  // Navbar-only labels ("Trouver des Produits/Services"). These are deliberately distinct from
  // the generic common.products_section / common.services_section used by the sidebar filter,
  // search results, and favorites — renaming the pills must not touch those surfaces.
  const options: { value: ToggleType; label: string }[] = [
    { value: 'product', label: t('marche.toggle.find_products', lang) },
    { value: 'service', label: t('marche.toggle.find_services', lang) },
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
            // Shared interactive surface (same h-11 / idle / hover / active tint / focus ring as
            // the sidebar buttons + bell). Only the layout (horizontal scroll row, shape, px) is
            // local. Active is the light brand-accent tint, not a solid fill.
            className={cn(
              'flex shrink-0 cursor-pointer items-center gap-2 whitespace-nowrap rounded-full px-4 text-sm font-medium',
              interactiveSurface(isActive),
            )}
          >
            {o.label}
          </Link>
        )
      })}
    </div>
  )
}
