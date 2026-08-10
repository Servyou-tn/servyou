import Link from 'next/link'
import { ChevronRight, Star } from 'lucide-react'
import { t, type Lang } from '@/lib/i18n'
import { FOCUS_RING } from '@/components/layout/styles'
import { DirArrow } from '@/components/DirArrow'
import { FavoriteButton } from '@/components/FavoriteButton'
import { StatusPill } from '@/components/ui/status-pill'
import { getInitials } from '@/components/ui/initials'
import { EmptyState } from '@/components/marche/EmptyState'
import { tndPrice, tndAmount } from '@/components/listings/listing-utils'
import { ProductBrowseCard } from '@/app/marche/produits/_components/ProductBrowseCard'
import type { ProductListing } from '@/components/listings/ProductListingCard'
import type { ProductDetailData } from '@/lib/marche/product-detail'
import { resolveStockState } from '@/lib/marche/product-stock'
import { ProductGallery } from './ProductGallery'
import { ProductDescription } from './ProductDescription'
import { ShareLinkButton } from './ShareLinkButton'

// D1 « Détail du produit » — rebuilt from Figma `562:39013`. Every desktop number below is measured
// and recorded in docs/design/d1-discovery.md §2; nothing here is a recollection.
//
// The spine, all measured: content inner 1136 · topGroup gap 16 · aboveFold = 600 galleryCol + 32 +
// 504 infoCol (600+32+504 = 1136 ✓) · belowFold 40 under topGroup and 32 between its own five
// children · infoCol uniform inner gap 16 · CTA 504×48.
//
// ⚑ THE COLUMNS ARE TOP-ALIGNED, NOT STRETCHED. infoCol measures 495 against galleryCol's 676 —
// 181px of deliberate slack under the shop snippet. `items-start`, never `items-stretch`.
//
// 🟡 EVERY RESPONSIVE VALUE IS INFERRED. There is no 375 frame for D1 (the Screens page carries the
// 1440 frame and four DESKTOP specimens). The mobile ramp follows D2's pattern by founder ruling,
// not by measurement. Logged in docs/follow-ups.md beside C1's identical gap.
//
// Deliberately NOT built, each by ruling and each recorded in the discovery doc: the share dialog
// (`563:39668`) and the report modal (`563:39705`) — see ShareLinkButton for the icon reason and
// the report line at the foot of this file; and both « Voir la boutique » affordances, which render
// as static muted text because D3 `/boutique/[slug]` has neither a route nor a slug column.

// Section header — 26 leading in the frame on all four belowFold sections, gap 16 to its body.
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-xl font-semibold leading-[26px] text-text-primary">{title}</h2>
      {children}
    </section>
  )
}

export function ProductDetail({
  product,
  related,
  lang,
}: {
  product: ProductDetailData
  related: ProductListing[]
  lang: Lang
}) {
  const category = product.category
    ? lang === 'ar' && product.category.name_ar
      ? product.category.name_ar
      : product.category.name_fr
    : null

  // ⚑ DERIVED FROM tracks_stock + stock_count, NEVER FROM `status` — see product-stock.ts for why
  // the obvious `status === 'sold_out'` reading is wrong on every row in the database. The frame
  // draws exactly ONE stock line, so 'none' (healthy stock, or "Toujours disponible") renders
  // nothing rather than inventing a state the design does not have.
  const stockState = resolveStockState(product)

  const total = product.price_tnd + product.delivery_fee_tnd
  const shopName = product.shop?.name?.trim() || ''
  // The frame draws a TEXT NODE — « AS » — in both logo slots, not an image. `shops.logo_url` is
  // null on every row and is settable nowhere until G3 exists, so the monogram is the design, not
  // a fallback for a missing asset.
  const monogram = getInitials(shopName)

  // 504×48, full width. Hand-rolled rather than composed from <Button> because the live state is an
  // anchor and the sold-out state is a disabled control — one shared class string keeps the two
  // pixel-identical instead of hoping two primitives agree.
  const ctaBase =
    'flex h-12 w-full items-center justify-center rounded-lg px-6 text-base font-semibold transition-colors'

  return (
    <div className="flex flex-col gap-10">
      {/* ─────────── topGroup — breadcrumb + gap 16 + aboveFold ─────────── */}
      <div className="flex flex-col gap-4">
        {/* Four crumbs: Accueil › Produits › catégorie › titre. The category is plain text, not a
            link — `categories` is flat and products have no per-category route of their own. */}
        <nav
          aria-label="Fil d'Ariane"
          className="flex flex-wrap items-center gap-2 text-[13px] leading-[17px] text-text-muted"
        >
          <Link href="/" className={`rounded-sm hover:text-text-secondary ${FOCUS_RING}`}>
            {t('product.detail.breadcrumb.home', lang)}
          </Link>
          <ChevronRight className="h-3.5 w-3.5 shrink-0 rtl:rotate-180" aria-hidden="true" />
          <Link href="/marche/produits" className={`rounded-sm hover:text-text-secondary ${FOCUS_RING}`}>
            {t('product.detail.breadcrumb.products', lang)}
          </Link>
          {category && (
            <>
              <ChevronRight className="h-3.5 w-3.5 shrink-0 rtl:rotate-180" aria-hidden="true" />
              <span>{category}</span>
            </>
          )}
          <ChevronRight className="h-3.5 w-3.5 shrink-0 rtl:rotate-180" aria-hidden="true" />
          <span className="text-text-secondary">{product.title}</span>
        </nav>

        {/* aboveFold — 600 / 32 / 504, top-aligned. Single column below xl (INFERRED, no 375 frame).
            ⚑ GALLERY TRACK IS `minmax(0,600px)`, NOT a bare `600px`. 600 is the value measured at
            1440 (d1-discovery.md §2), not a floor the layout can enforce — a bare `600px 504px`
            needs 1136 of content-box width regardless of viewport, and content-box only reaches
            1136 at ~1424+ (240 sidebar + 64 padding + scrollbar gutter). A rigid pair overflowed the
            shell by up to 384px at 1024–1407, dragging the sticky sidebar off-screen with it; a
            flexible gallery track alone still isn't enough — see the next note.
            🔴 TWO-COLUMN SWITCH IS `xl:` (1280), NOT `lg:` (1024). It was `lg:` for one PR: at 1024
            the shell leaves only ~705 of content for a fixed 504 infoCol + 32 gap, so the gallery
            track — even as `minmax(0,600px)` — computed to 169×169, a thumbnail on a page whose
            whole job is the photo. That is not what `minmax` was for; a flexible track still needs
            somewhere to flex TO. Below `xl` the stack applies instead — gallery full-width, info
            below it — the same shape already verified clean at 375. D2 does not hit this because
            its second column is 354, not 504: `minmax(0,750px)_354px` has ~150px more room to give
            the flexible side at the same viewport, which is why copying D2's `lg:` verbatim was not
            actually copying D2's OUTCOME. The FIXED 504 infoCol stays untouched either way:
            shrinking it wraps the price block and CTA first, which is worse than a shorter
            gallery. */}
        <div className="flex flex-col gap-6 xl:grid xl:grid-cols-[minmax(0,600px)_504px] xl:items-start xl:gap-8">
          <ProductGallery images={product.images} title={product.title} productId={product.id} />

          {/* infoCol — uniform gap 16 between all six children, measured. */}
          <div className="flex flex-col gap-4">
            {/* Badge — hug width, NOT the frame's 130: that was the specimen's own label
                (« Textile artisanal »). The live categories are sector-level and longer. */}
            {category && (
              <span className="w-fit rounded-lg bg-surface-sunken px-3 py-1 text-body-sm font-medium text-text-secondary">
                {category}
              </span>
            )}

            <div className="flex flex-col gap-2">
              <h1 className="text-[28px] font-semibold leading-[38px] text-brand-blue-800">
                {product.title}
              </h1>
              {/* priceBlock — 34 / 21 / 21 leading at gap 4. Both derived lines need
                  delivery_fee_tnd, which is why the fetch had to carry it. */}
              <div className="flex flex-col gap-1">
                <p className="text-[28px] font-semibold leading-[34px] text-brand-blue-800">
                  {tndPrice(product.price_tnd)}
                </p>
                {/* ⚑ tndAmount, NOT String(). These two lines carry the unit inside a translated
                    template, so they cannot go through tndPrice — and String() formats them by a
                    different rule than the price above it, which puts « 1249.99 TND » directly
                    over « + 7.5 TND ». Same formatter, three lines, one decimal convention. */}
                <p className="text-body-sm leading-[21px] text-text-secondary">
                  {t('product.detail.delivery_fee', lang, {
                    fee: tndAmount(product.delivery_fee_tnd),
                  })}
                </p>
                <p className="text-body-sm leading-[21px] text-text-secondary">
                  {t('product.detail.total_cod', lang, { total: tndAmount(total) })}
                </p>
              </div>
            </div>

            {stockState === 'sold_out' && (
              <StatusPill status="rupture-stock" className="w-fit">
                {t('product.detail.out_of_stock', lang)}
              </StatusPill>
            )}
            {stockState === 'low' && (
              <p className="text-body-sm font-medium leading-[21px] text-warning-500">
                {t('product.detail.stock_low', lang, { n: String(product.stock_count) })}
              </p>
            )}

            {/* ctaCodGroup — CTA 504×48 then the COD note at gap 8. */}
            <div className="flex flex-col gap-2">
              {stockState === 'sold_out' ? (
                <button
                  type="button"
                  disabled
                  className={`${ctaBase} cursor-not-allowed bg-brand-blue-600 text-white opacity-50`}
                >
                  {t('product.detail.cta_sold_out', lang)}
                </button>
              ) : (
                // ⚑ E1's PRODUCT BRANCH IS STILL A ComingSoon STUB (`demander/[id]/page.tsx`) — only
                // the SERVICE branch was rebuilt. The link is wired correctly anyway, by ruling:
                // E1 is the next PR and this is the href it will land on.
                <Link
                  href={`/demander/${product.id}`}
                  className={`${ctaBase} bg-brand-blue-600 text-white hover:bg-brand-blue-700 ${FOCUS_RING}`}
                >
                  {t('product.detail.cta', lang)}
                </Link>
              )}
              <p className="text-body-sm leading-[21px] text-text-muted">
                {t('product.detail.cod_note', lang)}
              </p>
            </div>

            {/* secondaryRow — heart + « Enregistrer », then « Partager » at gap 24. */}
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <span className="flex h-11 w-11 items-center justify-center">
                  <FavoriteButton item_type="product" item_id={product.id} />
                </span>
                <span className="text-base leading-[21px] text-text-secondary">
                  {t('product.detail.save', lang)}
                </span>
              </div>
              <ShareLinkButton />
            </div>

            {/* shopSnippet — 504×76: pad 16, logo 40, gap 12, name/city at gap 2, link at the end. */}
            {shopName && (
              <div className="flex items-center gap-3 rounded-xl border border-border-subtle bg-white p-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-sunken text-body-sm font-semibold text-brand-blue-800">
                  {monogram}
                </span>
                <div className="flex min-w-0 flex-col gap-0.5">
                  <p className="truncate text-base font-semibold leading-[21px] text-text-primary">
                    {shopName}
                  </p>
                  {product.shop?.city && (
                    <p className="truncate text-body-sm leading-[21px] text-text-muted">
                      {product.shop.city}
                    </p>
                  )}
                </div>
                {/* Static muted text, NOT a link — D3 `/boutique/[slug]` has no route and `shops`
                    has no slug column. Same treatment as ServiceDetail.tsx:232. Reverses to a
                    <Link> in one line the day D3 lands. */}
                <span className="ms-auto shrink-0 text-body-sm leading-[21px] text-text-muted">
                  {t('product.detail.view_shop', lang)} <DirArrow lang={lang} direction="forward" />
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─────────── belowFold — 40 under topGroup, 32 between children ─────────── */}
      <div className="flex flex-col gap-8">
        {product.description && (
          <Section title={t('product.detail.description', lang)}>
            <ProductDescription description={product.description} />
          </Section>
        )}

        {/* shopPanel — 1136×154: pad 24, logo 56, gap 16, column at gap 4. */}
        {shopName && (
          <div className="flex gap-4 rounded-2xl border border-border-subtle bg-white p-6">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-surface-sunken text-xl font-semibold text-brand-blue-800">
              {monogram}
            </span>
            <div className="flex min-w-0 flex-col gap-1">
              <p className="text-xl font-semibold leading-[26px] text-text-primary">{shopName}</p>
              {product.shop?.city && (
                <p className="text-body-sm leading-[21px] text-text-muted">{product.shop.city}</p>
              )}
              {product.shop?.description && (
                <p className="text-[15px] leading-[26px] text-text-secondary">
                  {product.shop.description}
                </p>
              )}
              {/* Static muted text — same D3 reason as the snippet above. */}
              <span className="text-body-sm leading-[21px] text-text-muted">
                {t('product.detail.view_all_products', lang)}{' '}
                <DirArrow lang={lang} direction="forward" />
              </span>
            </div>
          </div>
        )}

        {related.length > 0 && (
          <Section title={t('product.detail.related_similar', lang)}>
            {/* C1's grid exactly — 4 × 272×373 at spacing 16 at 1440. The responsive ramp is C1's
                own (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`), which is itself unmeasured below
                1440; inheriting it keeps the two product surfaces identical rather than inventing a
                second answer. `getRelatedProducts` caps at 8; the frame draws 4. */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {related.slice(0, 4).map((item) => (
                <ProductBrowseCard key={item.id} product={item} />
              ))}
            </div>
          </Section>
        )}

        <Section title={t('product.detail.reviews', lang)}>
          {/* EmptyState the component, NOT D2's hand-rolled 120px div — the frame draws a 291-tall
              instance with an icon, which is what this primitive is. Reviews are post-MVP and there
              is no reviews table: no rating, no count, no fake five stars. */}
          <EmptyState
            icon={<Star className="mx-auto h-12 w-12" />}
            message={t('product.detail.reviews_empty', lang)}
          />
        </Section>

        {/* « Signaler ce produit » — static muted text. The `reports` table is ready for it
            (target_type accepts 'product', and its reason CHECK matches the modal's four options
            one-for-one), but the modal is a WRITE path: a server action, a Zod schema, an RLS
            check and the still-missing icon-flag. That is its own PR, not a second focus in a
            read-only detail page. Same treatment as ServiceDetail.tsx:232. */}
        <p className="text-body-sm leading-[21px] text-text-muted">
          {t('product.detail.report', lang)}
        </p>
      </div>
    </div>
  )
}
