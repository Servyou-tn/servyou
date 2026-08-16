'use client'

import { useReducedMotion } from 'motion/react'
import { BlurFade } from '@/components/magicui/blur-fade'
import { ProductBrowseCard } from '@/app/marche/produits/_components/ProductBrowseCard'
import type { ProductListing } from '@/components/listings/ProductListingCard'

// F1's product grid — reuses C1's card (`ProductBrowseCard`, measured against Figma `569:39818`)
// rather than the shared `ProductListingCard`, which was never measured against any Figma frame
// (built "Wink-style" for /recherche, /categories/[slug] and the consumer homepage — see
// ProductListingCard's header comment). The founder's own delta table for that fork
// (docs/follow-ups.md, "The C1 product card is a FORK, not a restyle") already names "a third
// product-card variant appearing" as its consolidation trigger and says "do not re-measure" —
// this is that moment, so `ProductBrowseCard` is reused as-is, not forked a second time.
//
// Same one-purpose-wrapper shape as `ProductBrowseGrid` (same grid classes + stagger), for the
// same reason stated there: `ListingResults` hard-renders `ProductListingCard` and must not grow
// a variant prop to avoid it (that reopens the exact three-surface blast radius the C1 fork was
// chosen to avoid). Services keep using `ListingResults`/`ServiceListingCard` unchanged.
export function FavorisProductGrid({ items }: { items: ProductListing[] }) {
  const reduce = useReducedMotion()
  const fade = { offset: reduce ? 0 : 6, blur: reduce ? '0px' : '6px' }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((p, i) => (
        <BlurFade key={p.id} delay={i * 0.05} duration={0.2} {...fade} inView>
          <ProductBrowseCard product={p} />
        </BlurFade>
      ))}
    </div>
  )
}
