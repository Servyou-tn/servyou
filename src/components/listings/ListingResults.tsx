'use client'

import { useReducedMotion } from 'motion/react'
import { BlurFade } from '@/components/magicui/blur-fade'
import { ProductListingCard, type ProductListing } from './ProductListingCard'
import { ServiceListingCard, type ServiceListing } from './ServiceListingCard'

// Client wrapper that renders the right card type with a staggered, reduced-motion-
// aware BlurFade entrance (the entrance lives here, not in the cards, so the cards
// stay pure presenters).
type Props =
  | { type: 'product'; items: ProductListing[] }
  | { type: 'service'; items: ServiceListing[] }

export function ListingResults(props: Props) {
  const reduce = useReducedMotion()
  const fade = { offset: reduce ? 0 : 6, blur: reduce ? '0px' : '6px' }

  // Services stack one-per-line; products flow into a responsive 1/2/3-per-row grid.
  return props.type === 'service' ? (
    <div className="space-y-4">
      {props.items.map((s, i) => (
        <BlurFade key={s.id} delay={i * 0.05} duration={0.2} {...fade} inView>
          <ServiceListingCard service={s} />
        </BlurFade>
      ))}
    </div>
  ) : (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {props.items.map((p, i) => (
        <BlurFade key={p.id} delay={i * 0.05} duration={0.2} {...fade} inView>
          <ProductListingCard product={p} />
        </BlurFade>
      ))}
    </div>
  )
}
