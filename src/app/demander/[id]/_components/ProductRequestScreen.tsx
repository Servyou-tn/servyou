import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { t, type Lang } from '@/lib/i18n'
import { FOCUS_RING } from '@/components/layout/styles'
import type { ProductRequestTarget } from '@/lib/marche/demander'
import { ProductRequestForm } from './ProductRequestForm'
import { localName } from '@/lib/i18n/local-name'

// E1-product — page shell: breadcrumb + the form (which owns its own two-column layout, see
// ProductRequestForm.tsx's header note for why the grid lives there rather than here).
//
// Breadcrumb mirrors D1's own pattern (ProductDetail.tsx), not E1-service's — both this page and
// D1 are PRODUCT surfaces sharing the same `product.detail.breadcrumb.*` vocabulary, and D1's
// shape is simpler: all crumbs always shown, flex-wrap, no responsive hide/show. E1-service hides
// its middle crumbs below `lg:`, but that mechanic is specific to a file this page doesn't share
// lineage with — copying it would be inventing a second collapse rule with no measurement behind
// it, the same class of thing the grid-overflow rulings already pushed back on twice.
//
// Below lg (founder, 2026-11-03 — E1 / E2 Q4): « ‹ Produits › Demander », E1-service's mobile shape (m375-e1-demander) — Accueil,
// the category and the title are desktop-only, the line is 16 tall and « ‹ Produits » has a 44 px tap target. From lg unchanged.

export function ProductRequestScreen({
  product,
  initialPhone,
  lang,
}: {
  product: ProductRequestTarget
  initialPhone: string
  lang: Lang
}) {
  return (
    // Below lg (m375-e1-produit): the crumb, H1 8 apart, the form 20 under the header; H1 32 Bold / 38 text/primary.
    <div className="flex flex-col gap-6 xl:gap-8 max-lg:gap-5">
      <nav
        aria-label="Fil d'Ariane"
        className="flex flex-wrap items-center gap-2 text-[13px] leading-[17px] text-text-muted max-lg:gap-1.5 max-lg:leading-4"
      >
        <Link href="/" className={`rounded-sm hover:text-text-secondary max-lg:hidden ${FOCUS_RING}`}>
          {t('product.detail.breadcrumb.home', lang)}
        </Link>
        <ChevronRight className="h-3.5 w-3.5 shrink-0 rtl:rotate-180 max-lg:hidden" aria-hidden="true" />
        <Link
          href="/marche/produits"
          className={`inline-flex items-center gap-1.5 rounded-sm hover:text-text-secondary max-lg:-my-3.5 max-lg:py-3.5 lg:gap-0 ${FOCUS_RING}`}
        >
          <ChevronLeft className="size-4 shrink-0 rtl:rotate-180 lg:hidden" aria-hidden="true" />
          {t('product.detail.breadcrumb.products', lang)}
        </Link>
        {product.category && (
          <>
            <ChevronRight className="h-3.5 w-3.5 shrink-0 rtl:rotate-180 max-lg:hidden" aria-hidden="true" />
            <span className="max-lg:hidden">{localName(product.category, lang)}</span>
          </>
        )}
        <ChevronRight className="h-3.5 w-3.5 shrink-0 rtl:rotate-180 max-lg:hidden" aria-hidden="true" />
        <Link href={`/produits/${product.id}`} className={`rounded-sm hover:text-text-secondary max-lg:hidden ${FOCUS_RING}`}>
          {product.title}
        </Link>
        <ChevronRight className="h-3.5 w-3.5 shrink-0 rtl:rotate-180 max-lg:size-3" aria-hidden="true" />
        <span className="text-text-secondary">{t('demander.breadcrumb.request', lang)}</span>
      </nav>

      <div className="flex flex-col gap-2 max-lg:-mt-3">
        <h1 className="text-2xl font-semibold leading-8 text-brand-blue-800 max-lg:text-[32px] max-lg:font-bold max-lg:leading-[38px] max-lg:text-text-primary">
          {t('demander.title.product', lang)}
        </h1>
      </div>

      <ProductRequestForm
        productId={product.id}
        title={product.title}
        price={product.price}
        deliveryFee={product.deliveryFee}
        imageUrl={product.imageUrl}
        shopName={product.shop.name}
        initialPhone={initialPhone}
        tracksStock={product.tracksStock}
        stockCount={product.stockCount}
        lang={lang}
      />
    </div>
  )
}
