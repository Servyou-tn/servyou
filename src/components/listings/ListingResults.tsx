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
  // `gap="tight"`: 16 at every width — the C2 category frame (1486:24359) draws its 3-up grid at 16, where the /marche/services frame draws 24.
  // `layout="rail"`: below `sm` the cards sit in ONE horizontally scrolling row of 300-wide cards at gap 12, bleeding to the screen's right edge (D2's « Autres services » —
  // m375-d2-service `cardsRow`); from `sm` it is the same grid as the default.
  | { type: 'service'; items: ServiceListing[]; gap?: 'default' | 'tight'; layout?: 'grid' | 'rail' }

export function ListingResults(props: Props) {
  const reduce = useReducedMotion()
  const fade = { offset: reduce ? 0 : 6, blur: reduce ? '0px' : '6px' }

  // Products browse as a responsive 1/2/4-per-row image grid; services as a 1/2/3-per-row
  // grid of vertical v3.7 cards (Figma 611:45637 — three columns on desktop).
  if (props.type === 'service' && props.layout === 'rail') {
    return (
      // -mx-4 px-4: the row runs to the screen edge while the first card still starts at the page margin. py-1.5 / -my-1.5: room for the cards' 4 px focus ring (overflow clips it).
      <div className="-mx-4 -my-1.5 flex snap-x gap-3 overflow-x-auto px-4 py-1.5 sm:mx-0 sm:my-0 sm:grid sm:snap-none sm:grid-cols-2 sm:gap-6 sm:overflow-visible sm:p-0 lg:grid-cols-3">
        {props.items.map((s, i) => (
          // No `inView`: the fade runs on mount. The in-view trigger needs 50 px of the card on screen, and the card that PEEKS at the right edge (the
          // scroll hint of the frame) shows only ~47 — it would stay invisible until scrolled to.
          <BlurFade key={s.id} delay={i * 0.05} duration={0.2} {...fade} className="w-[300px] shrink-0 snap-start scroll-ms-4 sm:w-auto">
            <ServiceListingCard service={s} />
          </BlurFade>
        ))}
      </div>
    )
  }

  if (props.type === 'service') {
    return (
      // gap-4 below sm: the 375 frame (621:49740) stacks its cards at 16, while the desktop grid
      // (611:45637) is 24 — one responsive gap serves both (delta P11). Shared with /recherche,
      // /categories/[slug] and the consumer homepage, which all gain the tighter mobile stack.
      <div className={`grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 ${props.gap === 'tight' ? '' : 'sm:gap-6'}`}>
        {props.items.map((s, i) => (
          <BlurFade key={s.id} delay={i * 0.05} duration={0.2} {...fade} inView>
            <ServiceListingCard service={s} />
          </BlurFade>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {props.items.map((p, i) => (
        <BlurFade key={p.id} delay={i * 0.05} duration={0.2} {...fade} inView>
          <ProductListingCard product={p} />
        </BlurFade>
      ))}
    </div>
  )
}
