'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { cn } from '@/lib/utils'
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
            // Every pill is its own visible button (white bg + border) — no shared container
            // background, so the four read as four buttons, not "1 button + 3 text labels".
            className={cn(
              'shrink-0 cursor-pointer whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium transition-all duration-200',
              'outline-none focus-visible:ring-2 focus-visible:ring-brand-accent/30 focus-visible:ring-offset-1',
              isActive
                ? 'border-brand-accent bg-brand-accent text-white shadow-sm'
                : 'border-border-subtle bg-white text-text-primary hover:border-slate-300 hover:bg-surface-subtle',
            )}
          >
            {o.label}
          </Link>
        )
      })}
    </div>
  )
}
