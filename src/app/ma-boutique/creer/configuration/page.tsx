import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { AppShell } from '@/components/shell/AppShell'
import { ConfigurationForm } from './_components/ConfigurationForm'
import { getShellUser } from '@/lib/marche/shell-user'
import { resolveOwnedShopId } from '@/lib/shops/owner-shop'
import { getProductCategories } from '@/lib/marche/product-categories'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = { title: 'Configuration de la boutique — Servyou' }

const ROUTE = '/ma-boutique/creer/configuration'

type ShopConfigRow = {
  shop_type: string | null
  delivery_setup: string | null
  working_hours: string | null
  location_detail: string | null
  preferred_carriers: string | null
  shop_payment_methods: { method: string }[] | null
  shop_categories: { category_id: string }[] | null
}

// G2 step 2 "Configuration" — Figma 556:37564, full reasoning in docs/design/g2-discovery.md §12-18.
//
// UPDATE, NOT INSERT — the shop already exists by the time this page renders (step 1's job). The
// guard is keyed on shop EXISTENCE only, same key step 1 uses (g2-discovery.md §7d /§18): a direct
// URL hit with no shop bounces to step 1, which already owns the full consumer/shop_owner/freelancer
// branching — this route doesn't re-derive any of that.
export default async function ConfigurationPage() {
  const shell = await getShellUser()
  if (!shell) redirect(`/connexion?next=${encodeURIComponent(ROUTE)}`)

  const supabase = await createClient()

  const owned = await resolveOwnedShopId(supabase, shell.id)
  if (!owned.ok) {
    if (owned.reason === 'query_failed') {
      throw new Error('shop fetch failed while guarding /ma-boutique/creer/configuration')
    }
    // No shop yet (never finished step 1, or a cold direct URL hit) — step 1's own guard decides
    // the right destination (form vs AlreadyHaveRole vs redirect), this route doesn't re-derive it.
    redirect('/ma-boutique/creer')
  }
  const shopId = owned.shopId

  const [{ data: shop, error: shopErr }, categories] = await Promise.all([
    supabase
      .from('shops')
      .select(
        'shop_type, delivery_setup, working_hours, location_detail, preferred_carriers, shop_payment_methods ( method ), shop_categories ( category_id )',
      )
      .eq('id', shopId)
      .single(),
    getProductCategories(),
  ])

  if (shopErr || !shop) {
    console.error('[configuration] shop fetch failed:', shopErr?.message, shopErr?.code, shopErr?.details)
    throw new Error('shop config fetch failed')
  }

  const row = shop as unknown as ShopConfigRow

  return (
    <AppShell user={shell.topBarUser}>
      <ConfigurationForm
        categories={categories}
        initial={{
          shopType: row.shop_type,
          deliverySetup: row.delivery_setup,
          workingHours: row.working_hours ?? '',
          locationDetail: row.location_detail ?? '',
          preferredCarriers: row.preferred_carriers ?? '',
          paymentMethods: (row.shop_payment_methods ?? []).map((r) => r.method),
          categoryIds: (row.shop_categories ?? []).map((r) => r.category_id),
        }}
      />
    </AppShell>
  )
}
