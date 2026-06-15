import type { Metadata } from 'next'
import Link from 'next/link'
import { MarcheLayout } from '@/components/marche/MarcheLayout'
import { ProductDetail } from '@/components/produits/ProductDetail'
import { getShellUser } from '@/lib/marche/shell-user'
import { getProductDetail, getRelatedProducts } from '@/lib/marche/product-detail'
import { getLang } from '@/lib/i18n/server'
import { t } from '@/lib/i18n'
import { CARD_SHADOW, FOCUS_RING } from '@/components/layout/styles'

type Props = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const product = await getProductDetail(id) // cached — shared with the page render
  return { title: product ? `${product.title} — Servyou` : 'Produit introuvable — Servyou' }
}

// Public product detail page — wrapped in the marche shell. getShellUser is nullable
// (logged-out visitors get the "Se connecter" avatar); moderation is enforced in
// getProductDetail (status='active' + shop not admin-hidden → null → not-found state).
export default async function ProduitPage({ params }: Props) {
  const { id } = await params
  const lang = await getLang()
  const shell = await getShellUser()
  const product = await getProductDetail(id)

  if (!product) {
    return (
      <MarcheLayout user={shell?.topBarUser ?? null}>
        <div className={`mx-auto max-w-md rounded-2xl bg-white p-12 text-center ${CARD_SHADOW}`}>
          <h1 className="text-lg font-semibold text-text-primary">{t('product.not_found', lang)}</h1>
          <p className="mt-2 text-sm text-text-muted">{t('product.not_found_desc', lang)}</p>
          <Link
            href="/marche"
            className={`mt-6 inline-flex items-center rounded-full bg-brand-accent px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-accent-light ${FOCUS_RING}`}
          >
            {t('marche.browse_cta', lang)}
          </Link>
        </div>
      </MarcheLayout>
    )
  }

  const related = await getRelatedProducts({
    productId: product.id,
    shopId: product.shopId,
    categoryId: product.categoryId,
  })

  return (
    <MarcheLayout user={shell?.topBarUser ?? null}>
      <ProductDetail product={product} related={related} isAuthenticated={Boolean(shell)} />
    </MarcheLayout>
  )
}
