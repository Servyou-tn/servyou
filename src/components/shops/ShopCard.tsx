import Image from 'next/image'
import Link from 'next/link'
import { ChevronRight, MapPin } from 'lucide-react'
import { Avatar } from '@/components/ui/avatar'
import { getInitials } from '@/components/ui/initials'
import { FOCUS_RING } from '@/components/layout/styles'
import { FavoriteHeart } from '@/components/favorites/FavoriteHeart'
import type { ShopCardData } from '@/lib/marche/shop-cards'
import { t, tn, type Lang } from '@/lib/i18n'

// Shop Card — Figma « Shop Card » 578:42367 (instance specimens on 720:62084): surface/base · border/subtle · r12, a 140 banner, an
// 88 logo ring straddling the banner edge (start-aligned, 24 in), a content block (pad 48 / 24 / 24 / 24, gap 12) with the name
// (20 Semi Bold), « ville · N produits » (14 muted), up to three category chips (surface/sunken, r8, 14 Medium) and a peek row — four
// 72 thumbnails (r8) + « Voir la boutique › » (14, blue/600). A 44 Favorite Heart sits top-end on the banner.
//
// Used by /mes-favoris › Boutiques (B6) and, next, the Boutiques lens of /marche/produits (B4) — hence a plain, hook-free component
// that takes `lang` (a server page and a client list can both render it). No « verified » badge: nothing in the data says a shop is
// verified, so the frame's tick is not drawn (servyou-phase-aware-features).
//
// The whole card is clickable through the NAME link (a stretched ::after); the heart and the explicit « Voir la boutique » link sit
// above that layer so each keeps its own target.
export function ShopCard({
  shop,
  lang,
  heart,
}: {
  shop: ShopCardData
  lang: Lang
  /** Renders the favorite heart; omit on surfaces that do not favorite shops. */
  heart?: { initialFavorited: boolean; isLoggedIn: boolean; onChange?: (favorited: boolean) => void }
}) {
  const href = `/boutique/${shop.id}`
  const chips = shop.categories.slice(0, 3)

  return (
    <article className="relative flex flex-col rounded-xl border border-border-subtle bg-surface-base transition-shadow hover:shadow-md">
      {/* banner — the shop's own image when it has one; without one, the frame's banner=false state: a flat surface/sunken block
          (Shop Card state=… banner=false, 578:42216 / 42246). */}
      <div className="relative h-[140px] w-full overflow-hidden rounded-t-xl">
        {shop.bannerUrl ? (
          <Image src={shop.bannerUrl} alt="" fill sizes="(min-width: 1024px) 560px, 100vw" className="object-cover" />
        ) : (
          <div className="size-full bg-surface-sunken" />
        )}
      </div>

      <div className="flex flex-col gap-3 px-6 pb-6 pt-12">
        <div className="flex flex-col gap-2">
          <h3 className="text-h3 font-semibold text-text-primary">
            <Link href={href} className={`rounded after:absolute after:inset-0 after:rounded-xl ${FOCUS_RING}`}>
              {shop.name}
            </Link>
          </h3>
          <p className="flex flex-wrap items-center gap-2 text-body-sm text-text-muted">
            {shop.city ? (
              <span className="inline-flex items-center gap-1">
                <MapPin className="size-4 shrink-0" aria-hidden="true" />
                {shop.city}
              </span>
            ) : null}
            {shop.city && shop.productCount !== null ? <span aria-hidden="true">·</span> : null}
            {shop.productCount !== null ? <span>{tn('boutique.public.products_count', lang, shop.productCount)}</span> : null}
          </p>
          {chips.length > 0 ? (
            <ul className="flex flex-wrap gap-2">
              {chips.map((c) => (
                <li key={c.name_fr} className="rounded-lg bg-surface-sunken px-3 py-1 text-body-sm font-medium text-text-secondary">
                  {lang === 'ar' && c.name_ar ? c.name_ar : c.name_fr}
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {shop.thumbs.map((src, i) => (
            // pointer-events-none: the thumbnails are positioned and would otherwise sit above the name link's stretched ::after.
            <span key={`${i}-${src}`} className="pointer-events-none relative size-[72px] shrink-0 overflow-hidden rounded-lg bg-surface-sunken">
              <Image src={src} alt="" fill sizes="72px" className="object-cover" />
            </span>
          ))}
          <Link
            href={href}
            className={`relative z-10 ms-auto inline-flex items-center gap-1 rounded text-body-sm text-brand-blue-600 hover:underline ${FOCUS_RING}`}
          >
            {t('shopCard.view', lang)}
            <ChevronRight className="size-4 rtl:rotate-180" aria-hidden="true" />
          </Link>
        </div>
      </div>

      {/* logo ring: 88 = 80 avatar + 4 ring, centred on the banner's bottom edge (140 − 44 = 96 from the top) */}
      <span className="pointer-events-none absolute start-6 top-24 flex size-[88px] items-center justify-center rounded-full bg-surface-base">
        <Avatar size="xl" src={shop.logoUrl} name={shop.name} initials={getInitials(shop.name)} />
      </span>

      {heart ? (
        <FavoriteHeart
          kind="shop"
          targetId={shop.id}
          name={shop.name}
          initialFavorited={heart.initialFavorited}
          isLoggedIn={heart.isLoggedIn}
          onChange={heart.onChange}
          className="absolute end-3 top-3 z-10"
        />
      ) : null}
    </article>
  )
}
