'use client'

import { useReducedMotion } from 'motion/react'
import { BlurFade } from '@/components/magicui/blur-fade'
import { ProductBrowseCard } from './ProductBrowseCard'
import type { ProductListing } from '@/components/listings/ProductListingCard'

// C1's product grid — Figma 569:39817: 4 columns × 3 rows of 272×373 cards, gap 16 on BOTH axes
// (x 0/288/576/864, y 0/389/778).
//
// ⚑ THE CLASSES BELOW ARE `ListingResults`' PRODUCT BRANCH, VERBATIM, AND THAT IS THE POINT.
// Checking the shipped grid against the frame is what proved C1 needs no change to `ListingResults`
// — a component with SEVEN importers. The responsive ramp already matched (4-up at lg, gap-4 = 16).
// What could not be reused is the component itself: it hard-renders `ProductListingCard`, and C1's
// card is a fork (see ProductBrowseCard's header for why). So this is a one-purpose wrapper that
// keeps the validated ramp and swaps the card.
//
// Do NOT "DRY this up" by adding a variant to `ListingResults`. That re-opens the exact
// three-surface blast radius the card fork was chosen to avoid.
//
// Client-only for the staggered reduced-motion-aware entrance, matching the services surface. The
// cards stay pure presenters.
export function ProductBrowseGrid({ items }: { items: ProductListing[] }) {
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
