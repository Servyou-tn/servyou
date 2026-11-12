import type { Metadata } from 'next'
import { shopMetadata } from '@/lib/seo/detail-metadata'
import { notFound } from 'next/navigation'
import { AppShell } from '@/components/shell/AppShell'
import { ShopDetail } from './_components/ShopDetail'
import { getShopDetail, getShopProducts } from '@/lib/marche/shop-detail'
import { getShellUser } from '@/lib/marche/shell-user'
import { getFavoriteState } from '@/lib/marche/favorite-state'
import { getLang } from '@/lib/i18n/server'
import { t } from '@/lib/i18n'

// D3 — public shop storefront, rebuilt from Figma 540:32918/540:32920. Mirrors
// /produits/[id]/page.tsx exactly: public route (nullable shell, no auth gate),
// admin_hidden_at-gated fetch wrapped in cache() so generateMetadata + the render share one
// fetch, notFound() on a missing/hidden shop rather than leaking. The id is a bare uuid —
// `shops` has no slug column (docs/follow-ups.md, "D3 URL shape — RESOLVED 2026-08-12").

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const [shop, lang] = await Promise.all([getShopDetail(id), getLang()])
  // A missing / hidden shop is a 404: no description or canonical, and the root's noindex stays.
  return shop ? shopMetadata(shop, lang) : { title: t('boutique.not_found', lang) }
}

export default async function BoutiquePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const shop = await getShopDetail(id)
  if (!shop) notFound()

  const [shell, lang, products, isFavorited] = await Promise.all([
    getShellUser(),
    getLang(),
    getShopProducts(shop.id, shop.name, shop.city),
    getFavoriteState('shop', shop.id),
  ])

  return (
    <AppShell user={shell?.topBarUser ?? null}>
      <ShopDetail shop={shop} products={products} lang={lang} isLoggedIn={Boolean(shell)} isFavorited={isFavorited} />
    </AppShell>
  )
}
