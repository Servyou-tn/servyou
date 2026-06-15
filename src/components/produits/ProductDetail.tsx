'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, Share2, AlertTriangle, Check } from 'lucide-react'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { FOCUS_RING } from '@/components/layout/styles'
import { FavoriteButton } from '@/components/FavoriteButton'
import { ProductListingCard, type ProductListing } from '@/components/listings/ProductListingCard'
import { ProductGallery } from './ProductGallery'
import type { ProductDetailData } from '@/lib/marche/product-detail'

function formatPrice(n: number): string {
  return `${new Intl.NumberFormat('fr-TN').format(n)} TND`
}

function ShopLogo({ name, logoUrl, size }: { name: string; logoUrl: string | null; size: 32 | 64 }) {
  const dim = size === 64 ? 'h-16 w-16 text-xl' : 'h-8 w-8 text-sm'
  if (logoUrl) {
    return (
      <span className={`relative ${dim} shrink-0 overflow-hidden rounded-full bg-slate-100`}>
        <Image src={logoUrl} alt="" fill sizes={`${size}px`} className="object-cover" />
      </span>
    )
  }
  return (
    <span
      className={`grid ${dim} shrink-0 place-items-center rounded-full bg-brand-primary font-semibold text-white`}
      aria-hidden="true"
    >
      {(name.trim()[0] ?? '?').toUpperCase()}
    </span>
  )
}

// Redesigned product detail body: two-column on desktop (gallery + below-fold content in
// the left column, a sticky info card in the right), single column on mobile. DOM order is
// gallery → info → below-fold, so the mobile stack reads gallery → info → description →
// shop → related, while explicit grid placement keeps gallery/below-fold left and the
// sticky card right on desktop. All existing data + favorites logic is reused unchanged.
export function ProductDetail({
  product,
  related,
  isAuthenticated,
}: {
  product: ProductDetailData
  related: ProductListing[]
  isAuthenticated: boolean
}) {
  const lang = useLang()
  const [expanded, setExpanded] = useState(false)
  const [copied, setCopied] = useState(false)

  const longDesc = (product.description?.length ?? 0) > 400
  const lowStock =
    product.tracks_stock &&
    product.stock_count != null &&
    product.stock_count > 0 &&
    product.stock_count < 10

  const demanderHref = isAuthenticated
    ? `/demander/${product.id}`
    : `/connexion?next=${encodeURIComponent(`/demander/${product.id}`)}`

  async function handleShare() {
    const url = window.location.href
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: product.title, url })
      } catch {
        // user dismissed the share sheet — no-op
      }
      return
    }
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard unavailable — no-op
    }
  }

  return (
    <div className="lg:grid lg:grid-cols-5 lg:gap-8">
      {/* LEFT col (3/5), row 1 — gallery */}
      <div className="lg:col-span-3 lg:col-start-1 lg:row-start-1">
        <ProductGallery images={product.images} title={product.title} />
      </div>

      {/* RIGHT col (2/5) — sticky info card (spans both rows so it has scroll room). On
          mobile this sits right after the gallery in the DOM, unsticky. */}
      <div className="mt-6 lg:col-span-2 lg:col-start-4 lg:row-span-2 lg:row-start-1 lg:mt-0">
        <div className="card-premium outline-brand rounded-2xl bg-white p-6 lg:sticky lg:top-24">
          {/* A — category chip + favorite heart */}
          <div className="flex items-start justify-between gap-3">
            {product.category ? (
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-text-muted">
                {product.category}
              </span>
            ) : (
              <span />
            )}
            <FavoriteButton item_type="product" item_id={product.id} />
          </div>

          {/* B — title */}
          <h1 className="mt-3 text-2xl font-bold leading-tight text-text-primary">{product.title}</h1>

          {/* C — price + low-stock */}
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <p className="text-3xl font-bold text-brand-primary">{formatPrice(product.price_tnd)}</p>
            {lowStock && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700">
                <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                {t('product.detail.stock_low', lang, { n: product.stock_count as number })}
              </span>
            )}
          </div>

          {/* D — seller block (non-clickable: /boutique not rebuilt yet) */}
          {product.shop && (
            <div className="mt-4 border-t border-border-subtle pt-4">
              <p className="text-xs uppercase tracking-wide text-text-muted">{t('product.sold_by', lang)}</p>
              <div className="mt-2 flex items-center gap-3">
                <ShopLogo name={product.shop.name} logoUrl={product.shop.logo_url} size={32} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-text-primary">{product.shop.name}</p>
                  {product.shop.city && (
                    <p className="truncate text-xs text-text-muted">{product.shop.city}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* E — primary CTA */}
          <Link
            href={demanderHref}
            className={`mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-brand-accent text-base font-semibold text-white shadow-md transition-all duration-200 ease-out hover:bg-brand-accent-light hover:shadow-lg ${FOCUS_RING}`}
          >
            {t('product.detail.cta', lang)}
            <ArrowRight className="h-5 w-5 rtl:-scale-x-100" aria-hidden="true" />
          </Link>

          {/* F — secondary actions (report omitted: no consumer ReportModal yet) */}
          <div className="mt-3">
            <button
              type="button"
              onClick={handleShare}
              className={`inline-flex h-10 items-center gap-2 rounded-full bg-slate-50 px-4 text-sm font-medium text-text-primary transition-colors hover:bg-slate-100 ${FOCUS_RING}`}
            >
              {copied ? (
                <Check className="h-4 w-4" aria-hidden="true" />
              ) : (
                <Share2 className="h-4 w-4" aria-hidden="true" />
              )}
              {copied ? t('product.detail.link_copied', lang) : t('product.detail.share', lang)}
            </button>
          </div>
        </div>
      </div>

      {/* LEFT col, row 2 — below-the-fold content, aligned under the gallery */}
      <div className="lg:col-span-3 lg:col-start-1 lg:row-start-2">
        {/* 3.1 — description */}
        {product.description && (
          <section className="card-premium mt-8 rounded-2xl bg-white p-6">
            <h2 className="text-lg font-semibold text-text-primary">{t('product.detail.description', lang)}</h2>
            <p
              className={`mt-3 whitespace-pre-line text-base leading-relaxed text-text-primary ${
                longDesc && !expanded ? 'line-clamp-4' : ''
              }`}
            >
              {product.description}
            </p>
            {longDesc && (
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className={`mt-2 rounded text-sm font-medium text-brand-accent transition-colors hover:text-brand-primary ${FOCUS_RING}`}
              >
                {expanded ? t('product.detail.see_less', lang) : t('product.detail.see_more', lang)}
              </button>
            )}
          </section>
        )}

        {/* 3.2 — shop block (non-clickable until /boutique is rebuilt) */}
        {product.shop && (
          <section className="card-premium mt-6 flex items-center gap-4 rounded-2xl bg-white p-6">
            <ShopLogo name={product.shop.name} logoUrl={product.shop.logo_url} size={64} />
            <div className="min-w-0 flex-1">
              <p className="text-base font-semibold text-text-primary">{product.shop.name}</p>
              {product.shop.city && <p className="text-sm text-text-muted">{product.shop.city}</p>}
              {product.shop.description && (
                <p className="mt-1 line-clamp-1 text-sm text-text-muted">{product.shop.description}</p>
              )}
            </div>
          </section>
        )}

        {/* 3.3 — related products carousel */}
        {related.length > 0 && (
          <section className="mt-8">
            <h2 className="mb-4 text-lg font-semibold text-text-primary">
              {t('product.detail.related_similar', lang)}
            </h2>
            <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2">
              {related.map((p) => (
                <div key={p.id} className="w-64 shrink-0 snap-start">
                  <ProductListingCard product={p} />
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
