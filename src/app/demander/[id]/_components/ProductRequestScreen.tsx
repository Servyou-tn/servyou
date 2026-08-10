import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { t, type Lang } from '@/lib/i18n'
import { FOCUS_RING } from '@/components/layout/styles'
import type { ProductRequestTarget } from '@/lib/marche/demander'
import { ProductRequestForm } from './ProductRequestForm'

// E1-product — page shell: breadcrumb + the form (which owns its own two-column layout, see
// ProductRequestForm.tsx's header note for why the grid lives there rather than here).
//
// Breadcrumb mirrors D1's own pattern (ProductDetail.tsx), not E1-service's — both this page and
// D1 are PRODUCT surfaces sharing the same `product.detail.breadcrumb.*` vocabulary, and D1's
// shape is simpler: all crumbs always shown, flex-wrap, no responsive hide/show. E1-service hides
// its middle crumbs below `lg:`, but that mechanic is specific to a file this page doesn't share
// lineage with — copying it would be inventing a second collapse rule with no measurement behind
// it, the same class of thing the grid-overflow rulings already pushed back on twice.

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
    <div className="flex flex-col gap-6 xl:gap-8">
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
        {product.category && (
          <>
            <ChevronRight className="h-3.5 w-3.5 shrink-0 rtl:rotate-180" aria-hidden="true" />
            <span>{product.category}</span>
          </>
        )}
        <ChevronRight className="h-3.5 w-3.5 shrink-0 rtl:rotate-180" aria-hidden="true" />
        <Link href={`/produits/${product.id}`} className={`rounded-sm hover:text-text-secondary ${FOCUS_RING}`}>
          {product.title}
        </Link>
        <ChevronRight className="h-3.5 w-3.5 shrink-0 rtl:rotate-180" aria-hidden="true" />
        <span className="text-text-secondary">{t('demander.breadcrumb.request', lang)}</span>
      </nav>

      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold leading-8 text-brand-blue-800">
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
