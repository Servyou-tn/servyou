import Image from 'next/image'
import { MapPin, Calendar, Store, Truck, Package } from 'lucide-react'
import { Avatar } from '@/components/ui/avatar'
import { getInitials } from '@/components/ui/initials'
import { EmptyState } from '@/components/marche/EmptyState'
import { ProductBrowseCard } from '@/app/marche/produits/_components/ProductBrowseCard'
import type { ProductListing } from '@/components/listings/ProductListingCard'
import type { ShopDetailData } from '@/lib/marche/shop-detail'
import { shopTypeLabelKey, deliverySetupLabelKey, paymentMethodLabelKey } from '@/lib/types/shop-config'
import { t, tn, type Lang } from '@/lib/i18n'
import { ShopShareButton } from './ShopShareButton'
import { ShopReportModal } from './ShopReportModal'

// D3 « Boutique publique » — rebuilt from Figma 540:32918/540:32920, measured in
// docs/design/d3-discovery.md. Single stacked column throughout (confirmed by 540:32920's own
// metadata: header-block/description/chipsWrap/actions all stack vertically, zero 2-column
// region) — matches D4's own skeleton without D4's hero trust-row horizontal split, which D3
// never had.
//
// LOGO/BANNER — real image when present, fallback when null. Avatar already does this for the
// logo (its own `src` > `initials` > glyph priority); the banner gets the identical treatment
// here — real `banner_url` photo when the owner has uploaded one, the gradient only when it's
// null. The Figma frame draws both as their empty state (initials-only logo, gradient-only
// banner) because it was drawn when neither `logo_url` nor `banner_url` had a write surface yet
// (no G2 upload flow existed); now that G2 fills both, showing the real photo when present is the
// correct behaviour, not a literal reproduction of the frame's demo state — same "mock state
// differs from real data" rule this project already applies everywhere else. Found via the
// founder's populated-fixture fidelity pass (docs/design/d3-discovery.md §13): the banner half of
// this was fetched and typed (`shop-detail.ts`) but never wired into the render — OM shop's null
// `banner_url` made "always gradient" indistinguishable from "correctly falls back to gradient."
//
// shop_type/delivery_setup — the Figma frame's demo text ("Artisan" / "Livraison à domicile")
// does not match any real enum value (`shop_type` ∈ physical/online_only/dropshipper;
// `delivery_setup` ∈ self_delivery/third_party/buyer_pickup). Rendered via the real
// shopTypeLabelKey/deliverySetupLabelKey helpers already used by ConfigurationForm, not the
// frame's literal copy.

function formatMemberSince(iso: string, lang: Lang): string {
  const date = new Date(iso).toLocaleDateString(lang === 'ar' ? 'ar-TN' : 'fr-TN', {
    month: 'long',
    year: 'numeric',
  })
  return t('boutique.public.member_since', lang, { date })
}

export function ShopDetail({
  shop,
  products,
  lang,
  isLoggedIn,
}: {
  shop: ShopDetailData
  products: ProductListing[]
  lang: Lang
  isLoggedIn: boolean
}) {
  const initials = getInitials(shop.name)
  const hasMeta = Boolean(shop.shopType || shop.deliverySetup)

  return (
    <div className="flex flex-col gap-8">
      {/* hero — banner + avatar-ring overlap + identity, single stacked column throughout */}
      <div className="relative flex flex-col items-start rounded-card border border-border-subtle bg-surface-base">
        <div className="relative h-[200px] w-full shrink-0 overflow-hidden rounded-t-xl">
          {shop.bannerUrl ? (
            <Image src={shop.bannerUrl} alt="" fill sizes="(max-width: 1279px) 100vw, 1120px" className="object-cover" />
          ) : (
            <div className="size-full bg-gradient-to-r from-[#5b57f2] to-brand-blue-600" />
          )}
        </div>

        <div className="absolute start-6 top-[136px] size-32 rounded-full bg-surface-base p-1">
          <Avatar size="2xl" src={shop.logoUrl} name={shop.name} initials={initials} className="size-full" decorative={false} />
        </div>

        <div className="flex w-full flex-col gap-6 px-6 pb-6 pt-[76px]">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <h1 className="text-3xl font-bold leading-[38px] tracking-[-0.64px] text-text-primary">{shop.name}</h1>
              <div className="flex flex-col gap-1.5">
                <div className="flex flex-wrap gap-5">
                  {shop.city && (
                    <span className="flex items-center gap-1.5 text-body-sm text-text-secondary">
                      <MapPin className="size-4" aria-hidden="true" />
                      {shop.city}
                    </span>
                  )}
                  <span className="flex items-center gap-1.5 text-body-sm text-text-secondary">
                    <Calendar className="size-4" aria-hidden="true" />
                    {formatMemberSince(shop.createdAt, lang)}
                  </span>
                </div>
                {hasMeta && (
                  <div className="flex flex-wrap gap-5">
                    {shop.shopType && (
                      <span className="flex items-center gap-1.5 text-body-sm text-text-secondary">
                        <Store className="size-4" aria-hidden="true" />
                        {t(shopTypeLabelKey(shop.shopType), lang)}
                      </span>
                    )}
                    {shop.deliverySetup && (
                      <span className="flex items-center gap-1.5 text-body-sm text-text-secondary">
                        <Truck className="size-4" aria-hidden="true" />
                        {t(deliverySetupLabelKey(shop.deliverySetup), lang)}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {shop.description && (
              <p className="max-w-[760px] text-base leading-[26px] text-text-secondary">{shop.description}</p>
            )}

            {(shop.paymentMethods.length > 0 || shop.categories.length > 0) && (
              <div className="flex flex-col gap-2.5">
                {shop.paymentMethods.length > 0 && (
                  <div className="flex flex-col gap-1.5">
                    <p className="text-caption font-medium uppercase tracking-[0.48px] text-text-muted">
                      {t('boutique.public.payment_caption', lang)}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {shop.paymentMethods.map((method) => (
                        <span key={method} className="rounded-md bg-surface-sunken px-3 py-1 text-body-sm font-medium text-text-secondary">
                          {t(paymentMethodLabelKey(method), lang)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {shop.categories.length > 0 && (
                  <div className="flex flex-col gap-1.5">
                    <p className="text-caption font-medium uppercase tracking-[0.48px] text-text-muted">
                      {t('boutique.public.categories_caption', lang)}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {shop.categories.map((c, i) => (
                        <span key={i} className="rounded-md bg-surface-sunken px-3 py-1 text-body-sm font-medium text-text-secondary">
                          {lang === 'ar' && c.name_ar ? c.name_ar : c.name_fr}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 py-1">
            <ShopShareButton />
            <ShopReportModal shopId={shop.id} shopName={shop.name} isLoggedIn={isLoggedIn} />
          </div>
        </div>
      </div>

      {/* products */}
      <div className="flex flex-col gap-6">
        <div className="flex items-baseline gap-2">
          <h2 className="text-xl font-semibold leading-[26px] text-text-primary">
            {t('boutique.public.products_title', lang)}
          </h2>
          <span className="text-body-sm text-text-muted">
            {tn('boutique.public.products_count', lang, products.length)}
          </span>
        </div>

        {products.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {products.map((product) => (
              <ProductBrowseCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <EmptyState icon={<Package className="size-12" aria-hidden="true" />} message={t('boutique.public.empty_products', lang)} />
        )}
      </div>
    </div>
  )
}
