import Link from 'next/link'
import { ChevronLeft, ChevronRight, Clock, Star } from 'lucide-react'
import { t, type Lang } from '@/lib/i18n'
import { FOCUS_RING } from '@/components/layout/styles'
import { DirArrow } from '@/components/DirArrow'
import { FavoriteButton } from '@/components/FavoriteButton'
import { Avatar } from '@/components/ui/avatar'
import { StatusPill } from '@/components/ui/status-pill'
import { getInitials } from '@/components/ui/initials'
import { EmptyState } from '@/components/marche/EmptyState'
import { tndPrice, tndAmount } from '@/components/listings/listing-utils'
import { ProductBrowseCard } from '@/components/produits/ProductBrowseCard'
import type { ProductListing } from '@/components/listings/ProductListingCard'
import type { ProductDetailData } from '@/lib/marche/product-detail'
import { resolveStockState } from '@/lib/marche/product-stock'
import { ProductGallery } from './ProductGallery'
import { ProductDescription } from './ProductDescription'
import { ShareLinkButton } from './ShareLinkButton'
import { SocialLinks } from '@/components/social/SocialLinks'
import { ReportListingModal } from '@/components/report/ReportListingModal'

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
// Deliberately NOT built, by ruling, recorded in the discovery doc: the share dialog (`563:39668`) — see
// ShareLinkButton for the icon reason. The report modal (`563:39705`) is BUILT (feat/signaler-product-service):
// the report line at the foot of this file opens ReportListingModal. Both « Voir la boutique » affordances now link to
// `/boutique/[id]` (D3 shipped 2026-08-12, bare uuid — `shops` has no slug column, see
// docs/follow-ups.md "D3 URL shape — RESOLVED").
//
// 375 — frame sl-d1-375 (1549:41101), docs/design/m375-d1-produit-deltas.md. Every mobile value is a `max-lg:` override or a `lg:hidden` block, so
// from `lg` the page is the desktop build above, unchanged. One 343 column at gap 20: breadcrumb · gallery · title + chip · price | delivery ·
// stock · CTA · shop row · « Suivez la boutique » · COD note · Favori / Partager · description · related rail · Avis · Signaler.
// The DOM is the 375 order; the blocks that sit elsewhere on desktop (chip, COD note, shop row, favourite / share) render twice, one copy
// hidden per width — never `order`, so the tab order follows what is seen at both widths (WCAG 2.4.3).

// Section header — 26 leading in the frame on all four belowFold sections, gap 16 to its body.
// 375: 18/22 Semi Bold, gap 12 (relatedSection / reviewsSection). `titleClassName`: the description has no visible heading at 375 (sr-only there).
function Section({ title, titleClassName = '', children }: { title: string; titleClassName?: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-4 max-lg:gap-3">
      <h2 className={`text-xl font-semibold leading-[26px] text-text-primary max-lg:text-lg max-lg:leading-[22px] ${titleClassName}`}>{title}</h2>
      {children}
    </section>
  )
}

export function ProductDetail({
  product,
  related,
  lang,
  isLoggedIn,
}: {
  product: ProductDetailData
  related: ProductListing[]
  lang: Lang
  isLoggedIn: boolean
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
  const shopHref = product.shopId ? `/boutique/${product.shopId}` : null
  const shopSocialLinks = product.shop?.socialLinks ?? []
  // The frame draws a TEXT NODE — « AS » — in both logo slots, not an image. `shops.logo_url` is
  // null on every row and is settable nowhere until G3 exists, so the monogram is the design, not
  // a fallback for a missing asset.
  const monogram = getInitials(shopName)

  // 504×48, full width. Hand-rolled rather than composed from <Button> because the live state is an
  // anchor and the sold-out state is a disabled control — one shared class string keeps the two
  // pixel-identical instead of hoping two primitives agree.
  const ctaBase =
    'flex h-12 w-full items-center justify-center rounded-lg px-6 text-base font-semibold transition-colors max-lg:rounded-[10px] max-lg:px-5'
  const codNote = t('product.detail.cod_note', lang)

  return (
    <div className="flex flex-col gap-10 max-lg:gap-5">
      {/* ─────────── topGroup — breadcrumb + gap 16 + aboveFold ─────────── */}
      <div className="flex flex-col gap-4 max-lg:gap-5">
        {/* Four crumbs: Accueil › Produits › catégorie › titre. The category is plain text, not a
            link — `categories` is flat and products have no per-category route of their own.
            375 (`breadcrumb`): « ‹ Produits › {catégorie} », 13 Regular, gap 6, chevron-left 16 / chevron-right 12, one line. The frame's
            « ‹ {secteur} › {sous-catégorie} » has no data behind it (product categories are ONE level: parent_id is null on every product
            row), so this is D2's mobile shape « ‹ Services › … » — Q1 in the deltas doc. Accueil and the title are desktop-only. */}
        <nav
          aria-label="Fil d'Ariane"
          className="flex flex-wrap items-center gap-2 text-[13px] leading-[17px] text-text-muted max-lg:gap-1.5 max-lg:leading-4"
        >
          <Link href="/" className={`rounded-sm hover:text-text-secondary max-lg:hidden ${FOCUS_RING}`}>
            {t('product.detail.breadcrumb.home', lang)}
          </Link>
          <ChevronRight className="h-3.5 w-3.5 shrink-0 rtl:rotate-180 max-lg:hidden" aria-hidden="true" />
          <Link href="/marche/produits" className={`inline-flex items-center gap-1.5 rounded-sm hover:text-text-secondary lg:gap-0 ${FOCUS_RING}`}>
            <ChevronLeft className="size-4 shrink-0 rtl:rotate-180 lg:hidden" aria-hidden="true" />
            {t('product.detail.breadcrumb.products', lang)}
          </Link>
          {category && (
            <>
              <ChevronRight className="h-3.5 w-3.5 shrink-0 rtl:rotate-180 max-lg:size-3" aria-hidden="true" />
              <span className="max-lg:text-text-secondary">{category}</span>
            </>
          )}
          <ChevronRight className="h-3.5 w-3.5 shrink-0 rtl:rotate-180 max-lg:hidden" aria-hidden="true" />
          <span className="text-text-secondary max-lg:hidden">{product.title}</span>
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
        <div className="flex flex-col gap-6 max-lg:gap-5 xl:grid xl:grid-cols-[minmax(0,600px)_504px] xl:items-start xl:gap-8">
          <ProductGallery images={product.images} title={product.title} productId={product.id} />

          {/* infoCol — uniform gap 16 between all six children, measured. */}
          <div className="flex flex-col gap-4 max-lg:gap-5">
            {/* Badge — hug width, NOT the frame's 130: that was the specimen's own label
                (« Textile artisanal »). The live categories are sector-level and longer.
                Desktop only: at 375 the category is the blue chip UNDER the title. */}
            {category && (
              <span className="w-fit rounded-lg bg-surface-sunken px-3 py-1 text-body-sm font-medium text-text-secondary max-lg:hidden">
                {category}
              </span>
            )}

            <div className="flex flex-col gap-2 max-lg:gap-5">
              {/* 375 `titleBlock`: title 22 Semi Bold (28) blue-800, gap 12, chip blue-50 r6 pad 4 / 8, 12 Medium blue-700 (15) — the frame's
                  chip is a sub-category; products have only the category (Q2). */}
              <div className="flex flex-col gap-3">
                <h1 className="text-[28px] font-semibold leading-[38px] text-brand-blue-800 max-lg:text-[22px] max-lg:leading-7">
                  {product.title}
                </h1>
                {category && (
                  <span className="w-fit rounded-md bg-brand-blue-50 px-2 py-1 text-caption font-medium leading-[15px] text-brand-blue-700 lg:hidden">
                    {category}
                  </span>
                )}
              </div>
              {/* priceBlock — 34 / 21 / 21 leading at gap 4. Both derived lines need
                  delivery_fee_tnd, which is why the fetch had to carry it.
                  375 `priceDelaiRow`: ONE row, space-between — price 24 Semi Bold (29) · icon-clock 16 + « + 7 TND de livraison » 13 muted (16),
                  gap 6. The total line is not drawn at 375 (Q6). */}
              <div className="flex flex-col gap-1 max-lg:flex-row max-lg:items-center max-lg:justify-between max-lg:gap-4">
                <p className="text-[28px] font-semibold leading-[34px] text-brand-blue-800 max-lg:text-2xl max-lg:leading-[29px]">
                  {tndPrice(product.price_tnd)}
                </p>
                {/* ⚑ tndAmount, NOT String(). These two lines carry the unit inside a translated
                    template, so they cannot go through tndPrice — and String() formats them by a
                    different rule than the price above it, which puts « 1249.99 TND » directly
                    over « + 7.5 TND ». Same formatter, three lines, one decimal convention. */}
                <p className="text-body-sm leading-[21px] text-text-secondary max-lg:flex max-lg:items-center max-lg:gap-1.5 max-lg:text-[13px] max-lg:leading-4 max-lg:text-text-muted">
                  <Clock className="size-4 shrink-0 lg:hidden" aria-hidden="true" />
                  {t('product.detail.delivery_fee', lang, {
                    fee: tndAmount(product.delivery_fee_tnd),
                  })}
                </p>
                <p className="text-body-sm leading-[21px] text-text-secondary max-lg:hidden">
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
              <p className="text-body-sm font-medium leading-[21px] text-warning-500 max-lg:text-warning-700">
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
                // E1's product branch (`demander/[id]/page.tsx` → ProductRequestScreen, the COD form).
                <Link
                  href={`/demander/${product.id}`}
                  className={`${ctaBase} bg-brand-blue-600 text-white hover:bg-brand-blue-700 ${FOCUS_RING}`}
                >
                  {t('product.detail.cta', lang)}
                </Link>
              )}
              <p className="text-body-sm leading-[21px] text-text-muted max-lg:hidden">{codNote}</p>
            </div>

            {/* ── 375 only: shop row · « Suivez la boutique » · COD note · Favori / Partager (desktop has them elsewhere, below) ── */}
            {shopName && (
              <ShopRow name={shopName} city={product.shop?.city ?? null} logoUrl={product.shop?.logo_url ?? null} href={shopHref} lang={lang} />
            )}

            {/* « Suivez la boutique » below lg (approved 2026-10-31, sl-d1-375): its own row right under the shop row, start pad 12. From lg it
                lives in the shop panel below instead (sl-d1-1440 draws it only there), so it never shows twice. */}
            {shopSocialLinks.length > 0 && (
              <FollowShop links={shopSocialLinks} shopName={shopName} lang={lang} className="ps-3 lg:hidden" />
            )}

            {/* COD note at 375: 12 Regular muted (18), with the frame's 💬 (decorative). */}
            <p className="text-caption leading-[18px] text-text-muted lg:hidden">
              <span aria-hidden="true">💬 </span>
              {codNote}
            </p>

            {/* `heartShareRow` at 375: two equal 44 px bordered r10 buttons at gap 12, icon 20 + « Favori » / « Partager » 13 Medium — D2's controls. */}
            <div className="grid grid-cols-2 gap-3 lg:hidden">
              <FavoriteButton item_type="product" item_id={product.id} variant="box" label={t('product.detail.favorite', lang)} />
              <ShareLinkButton variant="bordered" />
            </div>

            {/* secondaryRow — heart + « Enregistrer », then « Partager » at gap 24. */}
            <div className="flex items-center gap-6 max-lg:hidden">
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
              <div className="flex items-center gap-3 rounded-xl border border-border-subtle bg-white p-4 max-lg:hidden">
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
                {shopHref && (
                  <Link
                    href={shopHref}
                    className={`ms-auto shrink-0 text-body-sm leading-[21px] text-text-muted transition-colors hover:text-text-secondary ${FOCUS_RING}`}
                  >
                    {t('product.detail.view_shop', lang)} <DirArrow lang={lang} direction="forward" />
                  </Link>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─────────── belowFold — 40 under topGroup, 32 between children ─────────── */}
      <div className="flex flex-col gap-8 max-lg:gap-5">
        {product.description && (
          <Section title={t('product.detail.description', lang)} titleClassName="max-lg:sr-only">
            <ProductDescription description={product.description} />
          </Section>
        )}

        {/* shopPanel — 1136×154: pad 24, logo 56, gap 16, column at gap 4. Desktop only: the 375 frame has no shop panel, its shop row
            above is the only shop block (Q4). */}
        {shopName && (
          <div className="flex gap-4 rounded-2xl border border-border-subtle bg-white p-6 max-lg:hidden">
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
              {/* « Suivez la boutique » (sl-d1-1440): in the panel's column, between the description and « Voir tous les produits ». */}
              {shopSocialLinks.length > 0 && (
                <FollowShop links={shopSocialLinks} shopName={shopName} lang={lang} className="max-lg:hidden" />
              )}
              {shopHref && (
                <Link
                  href={shopHref}
                  className={`text-body-sm leading-[21px] text-text-muted transition-colors hover:text-text-secondary ${FOCUS_RING}`}
                >
                  {t('product.detail.view_all_products', lang)}{' '}
                  <DirArrow lang={lang} direction="forward" />
                </Link>
              )}
            </div>
          </div>
        )}

        {related.length > 0 && (
          <Section title={t('product.detail.related_similar', lang)}>
            {/* C1's grid exactly — 4 × 272×373 at spacing 16 at 1440. The responsive ramp is C1's
                own (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`), which is itself unmeasured below
                1440; inheriting it keeps the two product surfaces identical rather than inventing a
                second answer. `getRelatedProducts` caps at 8; the frame draws 4. */}
            {/* 375 `cardsRow`: ONE row of 272 × 373 cards at gap 12, running to the screen's end edge so the next card peeks (D2's rail).
                -mx-4 px-4: the row reaches the screen edge while the first card starts at the page margin; py-1.5 / -my-1.5 leaves room for the
                cards' focus ring. From `sm` it is the grid, unchanged. */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 max-sm:-mx-4 max-sm:-my-1.5 max-sm:flex max-sm:snap-x max-sm:gap-3 max-sm:overflow-x-auto max-sm:px-4 max-sm:py-1.5">
              {related.slice(0, 4).map((item) => (
                <div key={item.id} className="max-sm:w-[272px] max-sm:shrink-0 max-sm:snap-start max-sm:scroll-ms-4">
                  <ProductBrowseCard product={item} sizes="(max-width: 639px) 272px, (max-width: 1024px) 50vw, 25vw" />
                </div>
              ))}
            </div>
          </Section>
        )}

        <Section title={t('product.detail.reviews', lang)}>
          {/* EmptyState the component, NOT D2's hand-rolled 120px div — the frame draws a 291-tall
              instance with an icon, which is what this primitive is. Reviews are post-MVP and there
              is no reviews table: no rating, no count, no fake five stars. */}
          <div className="max-lg:hidden">
            <EmptyState
              icon={<Star className="mx-auto h-12 w-12" />}
              message={t('product.detail.reviews_empty', lang)}
            />
          </div>
          {/* 375 `reviewsEmpty`: 343 × 81, r10, pad 32, text 14 muted (17) — as D2's white card + border (founder-approved for D2's identical
              box, Nov 1: the frame's surface/subtle fill vanishes on the grey shell) — Q5. py 31: the CSS border adds the 1 px the frame's
              inside stroke does not, so the box stays 81. */}
          <div className="flex items-center justify-center rounded-[10px] border border-border-subtle bg-surface-base px-6 py-[31px] text-center lg:hidden">
            <p className="text-sm leading-[17px] text-text-muted">{t('product.detail.reviews_empty', lang)}</p>
          </div>
        </Section>

        {/* « Signaler ce produit » — Figma 563:39705. Muted text trigger (the frame draws no icon) that opens the
            shared report modal; logged-out visitors are sent to sign in first. */}
        <div>
          <ReportListingModal kind="product" targetId={product.id} targetName={product.title} isLoggedIn={isLoggedIn} />
        </div>
      </div>
    </div>
  )
}

// 375 `shopRow`: 343 × 64, pad 12, gap 12, r12, surface/subtle; Avatar md (the logo, else the shop's initials like desktop — founder, Q3); name 14 Semi Bold
// blue-800 (17) + « Boutique · {ville} · Voir la boutique » 12 muted (16), one line each; chevron-right 18 muted. The whole row is the link to the
// shop (no chevron and no « Voir la boutique » when there is no shop id to link to). The city is seller-typed, so it is <bdi>-isolated.
function ShopRow({ name, city, logoUrl, href, lang }: { name: string; city: string | null; logoUrl: string | null; href: string | null; lang: Lang }) {
  const body = (
    <>
      <Avatar size="md" src={logoUrl} name={name} initials={getInitials(name)} />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="truncate text-sm font-semibold leading-[17px] text-brand-blue-800">{name}</p>
        <p className="truncate text-xs leading-4 text-text-muted">
          {t('product.detail.shop_kind', lang)}
          {city && (
            <>
              {' · '}
              <bdi>{city}</bdi>
            </>
          )}
          {href && ` · ${t('product.detail.view_shop', lang)}`}
        </p>
      </div>
      {href && <ChevronRight className="size-[18px] shrink-0 text-text-muted rtl:rotate-180" aria-hidden="true" />}
    </>
  )
  const box = 'flex items-center gap-3 rounded-xl bg-surface-subtle p-3 lg:hidden'
  return href ? (
    <Link href={href} className={`${box} ${FOCUS_RING}`}>
      {body}
    </Link>
  ) : (
    <div className={box}>{body}</div>
  )
}

// « Suivez la boutique » + the shop's social glyphs (approved 2026-10-31): one row, caption 12 Medium muted, 10 before the 20 glyphs, which sit 14
// apart. The links kit's 34 targets give that step; the negative margins hand back their 7 px padding (so the gap is 10 to the glyph and the row
// stays 20 tall).
function FollowShop({
  links,
  shopName,
  lang,
  className = '',
}: {
  links: NonNullable<ProductDetailData['shop']>['socialLinks']
  shopName: string
  lang: Lang
  className?: string
}) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <p className="text-caption font-medium text-text-muted">{t('product.detail.follow_shop', lang)}</p>
      <SocialLinks links={links.map((l) => ({ id: l.platform, url: l.url }))} name={shopName} lang={lang} className="-my-1.75 -ms-1.75" />
    </div>
  )
}
