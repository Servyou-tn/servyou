import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { AppShell } from '@/components/shell/AppShell'
import { ProductDetail } from '@/components/produits/ProductDetail'
import { getProductDetail, getRelatedProducts } from '@/lib/marche/product-detail'
import { getShellUser } from '@/lib/marche/shell-user'
import { getLang } from '@/lib/i18n/server'

// D1 — product detail, rebuilt from Figma 562:39013. Replaces the ComingSoon stub left by
// chore/strip-legacy-consumer-ui, which ignored the [id] segment entirely. Mirrors
// services/[id]/page.tsx, which is the same shape one route over.
//
// Public route: nullable shell user, no auth gate. `getProductDetail` already enforces moderation
// (status='active' AND the owning shop's admin_hidden_at IS NULL via the `shops!inner` cascade), so
// a hidden product — or one belonging to an admin-moderated shop — 404s rather than leaking. That
// query was resurrected from commit 59cb952^ and had ZERO importers until this file; it is wired
// here, not rewritten.
//
// The id is a bare uuid. `products` has no slug column and there is no pretty URL to build.

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  // getProductDetail is wrapped in React cache(), so this and the render below share ONE fetch per
  // request rather than hitting Postgres twice for the same row.
  const product = await getProductDetail(id)
  return { title: product ? `${product.title} — Servyou` : 'Produit — Servyou' }
}

export default async function ProduitPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const product = await getProductDetail(id)
  if (!product) notFound()

  const [shell, lang, related] = await Promise.all([
    getShellUser(),
    getLang(),
    getRelatedProducts({
      productId: product.id,
      shopId: product.shopId,
      categoryId: product.categoryId,
    }),
  ])

  return (
    <AppShell user={shell?.topBarUser ?? null}>
      <ProductDetail product={product} related={related} lang={lang} />
    </AppShell>
  )
}
