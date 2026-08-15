import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { AppShell } from '@/components/shell/AppShell'
import { EditShopForm } from './_components/EditShopForm'
import { requireShopOwner } from '@/lib/auth/require-seller'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'Modifier ma boutique — Servyou' }

const ROUTE = '/ma-boutique/modifier'

// G3 "Modifier ma boutique" — the identity-field edit surface (name, city, description, logo,
// banner). Reached from the dashboard's Quick Actions ("Modifier ma boutique",
// tableau-de-bord-vendeur/page.tsx:82), which already pointed here before this route existed.
//
// requireShopOwner guards auth + role, same as every other shop_owner workspace page. A
// shop_owner with no shop yet (never finished G2) has nothing to edit — bounced to G2's own form,
// same fallback configuration/page.tsx uses for the identical state.
export default async function ModifierBoutiquePage() {
  const { topBarUser, shop } = await requireShopOwner(ROUTE)
  if (!shop) redirect('/ma-boutique/creer')

  const supabase = await createClient()
  const { data: fullShop, error } = await supabase
    .from('shops')
    .select('name, city, description, logo_url, banner_url')
    .eq('id', shop.id)
    .single()

  if (error || !fullShop) {
    console.error('[ma-boutique/modifier] shop fetch failed:', error?.message, error?.code, error?.details)
    throw new Error('shop fetch failed while loading /ma-boutique/modifier')
  }

  return (
    <AppShell user={topBarUser}>
      <EditShopForm
        shopId={shop.id}
        initial={{
          name: fullShop.name,
          city: fullShop.city ?? '',
          description: fullShop.description ?? '',
          logoUrl: fullShop.logo_url,
          bannerUrl: fullShop.banner_url,
        }}
      />
    </AppShell>
  )
}
