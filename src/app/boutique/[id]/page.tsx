import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { AppShell } from '@/components/shell/AppShell'
import { ShopDetail } from './_components/ShopDetail'
import { getShopDetail, getShopProducts } from '@/lib/marche/shop-detail'
import { getShellUser } from '@/lib/marche/shell-user'
import { getFavoriteState } from '@/lib/marche/favorite-state'
import { getLang } from '@/lib/i18n/server'

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
  const shop = await getShopDetail(id)
  return { title: shop ? `${shop.name} — Servyou` : 'Boutique — Servyou' }
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
