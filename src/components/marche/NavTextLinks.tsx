'use client'

import Link from 'next/link'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import type { ToggleType } from '@/lib/search/search-params'

// The two marketplace text links ("Trouver des Produits/Services") that replaced the segmented
// pills. Plain navigation links with an animated brand-blue-600 underline: the active link carries a
// static 80%-width underline + brand-blue-600 text; inactive links slide the underline in left-to-
// right on hover (disabled under prefers-reduced-motion). Routing is unchanged — `hrefFor` resolves
// the same in-place ?type= (homepage) vs /marche engine destinations as before, and active state
// reads the page-fed `value` (correct on the homepage shell too, where the type lives in ?type= and
// a raw pathname check would mark neither link active). An optimistic local flip mirrors the old
// pills: the underline moves the instant a link is clicked, then re-syncs to the route-derived value.
//
// Hidden below xl: the single top-bar row physically can't hold these alongside the search, the CTA,
// and the right icon cluster until ~1280px; on smaller screens the sidebar is the marketplace switcher.
export function NavTextLinks({
  value,
  hrefFor,
}: {
  value: ToggleType
  hrefFor: (type: ToggleType) => string
}) {
  const lang = useLang()
  // Active link is derived directly from the route-fed `value` prop — no mirrored state.
  const options: { value: ToggleType; label: string }[] = [
    { value: 'product', label: t('marche.toggle.find_products', lang) },
    { value: 'service', label: t('marche.toggle.find_services', lang) },
  ]

  return (
    <div className="hidden h-11 shrink-0 items-center gap-x-7 xl:flex">
      {options.map((o) => {
        const isActive = o.value === value
        return (
          <Link
            key={o.value}
            href={hrefFor(o.value)}
            aria-current={isActive ? 'page' : undefined}
            // Underline = an ::after bar inset to the middle 80%, scaled from its left edge. Active →
            // shown (scale-x-100) in brand-blue-600; inactive → hidden (scale-x-0), sliding in on hover
            // with a colour brighten. motion-reduce keeps the colour change but drops the slide.
            className={cn(
              'relative inline-flex items-center whitespace-nowrap pb-1 text-sm font-medium transition-colors',
              'after:absolute after:inset-x-[10%] after:bottom-0 after:h-0.5 after:rounded-full after:bg-brand-blue-600 after:origin-left after:transition-transform after:duration-200 after:ease-out motion-reduce:after:transition-none',
              isActive
                ? 'text-brand-blue-600 after:scale-x-100'
                : 'text-text-primary after:scale-x-0 hover:text-brand-blue-600 hover:after:scale-x-100',
            )}
          >
            {o.label}
          </Link>
        )
      })}
    </div>
  )
}
