'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { ShopForm } from '@/components/ShopForm'
import type { Shop, CategoryRow, PaymentMethod } from '@/lib/types/shop-config'

export default function ModifierBoutiquePage() {
  const supabase = createClient()
  const router = useRouter()
  const lang = useLang()

  const [loading, setLoading] = useState(true)
  const [shop, setShop] = useState<Shop | null>(null)
  const [methods, setMethods] = useState<PaymentMethod[]>([])
  const [categoryIds, setCategoryIds] = useState<string[]>([])
  const [categories, setCategories] = useState<CategoryRow[]>([])

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/login'); return }

      const { data: profile } = await supabase
        .from('profiles').select('seller_type').eq('id', user.id).single()
      if (!profile || profile.seller_type !== 'shop_owner') { router.replace('/devenir-vendeur'); return }

      const { data: shopRow, error: shopError } = await supabase
        .from('shops')
        .select('id, owner_id, name, description, city, logo_url, banner_url, shop_type, delivery_setup, working_hours, location_detail, preferred_carriers, created_at, updated_at')
        .eq('owner_id', user.id)
        .maybeSingle()
      if (shopError) console.error('[ma-boutique/modifier] shop fetch error:', shopError)
      if (!shopRow) { router.replace('/ma-boutique/creer'); return }
      const s = shopRow as Shop
      setShop(s)

      const { data: methodRows, error: methodsError } = await supabase
        .from('shop_payment_methods').select('method').eq('shop_id', s.id)
      if (methodsError) console.error('[ma-boutique/modifier] payment methods fetch error:', methodsError)
      setMethods(((methodRows ?? []) as { method: PaymentMethod }[]).map(r => r.method))

      const { data: catRows, error: catRowsError } = await supabase
        .from('shop_categories').select('category_id').eq('shop_id', s.id)
      if (catRowsError) console.error('[ma-boutique/modifier] shop categories fetch error:', catRowsError)
      setCategoryIds(((catRows ?? []) as { category_id: string }[]).map(r => r.category_id))

      const { data: cats, error: catsError } = await supabase
        .from('categories').select('id, name_fr, name_ar, slug').order('name_fr')
      if (catsError) console.error('[ma-boutique/modifier] categories fetch error:', catsError)
      setCategories((cats as CategoryRow[]) ?? [])

      setLoading(false)
    }
    load()
  }, [])

  if (loading || !shop) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500 text-sm">{t('common.loading', lang)}</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex items-start justify-center bg-gray-50 px-4 py-12">
      <div className="bg-white rounded-lg shadow p-8 max-w-lg w-full">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">{t('boutique.edit_title', lang)}</h1>
        <ShopForm
          mode="edit"
          initialShop={shop}
          initialPaymentMethods={methods}
          initialCategoryIds={categoryIds}
          allCategories={categories}
          onSuccess={() => router.push('/ma-boutique')}
        />
      </div>
    </main>
  )
}
