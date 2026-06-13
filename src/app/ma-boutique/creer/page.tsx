'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { ShopForm } from '@/components/ShopForm'
import type { CategoryRow } from '@/lib/types/shop-config'

export default function CreerBoutiquePage() {
  const supabase = createClient()
  const router = useRouter()
  const lang = useLang()

  const [loading, setLoading] = useState(true)
  const [categories, setCategories] = useState<CategoryRow[]>([])

  useEffect(() => {
    async function check() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/connexion'); return }

      const { data: profile } = await supabase
        .from('profiles').select('seller_type').eq('id', user.id).single()
      if (!profile || profile.seller_type !== 'shop_owner') { router.replace('/devenir-vendeur'); return }

      const { data: existingShop } = await supabase
        .from('shops').select('id').eq('owner_id', user.id).maybeSingle()
      if (existingShop) { router.replace('/ma-boutique'); return }

      const { data: cats, error: catsError } = await supabase
        .from('categories').select('id, name_fr, name_ar, slug').order('name_fr')
      if (catsError) console.error('[ma-boutique/creer] categories fetch error:', catsError)
      setCategories((cats as CategoryRow[]) ?? [])

      setLoading(false)
    }
    check()
  }, [])

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500 text-sm">{t('common.loading', lang)}</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex items-start justify-center bg-gray-50 px-4 py-12">
      <div className="bg-white rounded-lg shadow p-8 max-w-lg w-full">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">{t('boutique.create_title', lang)}</h1>
        <ShopForm
          mode="create"
          allCategories={categories}
          initialPaymentMethods={[]}
          initialCategoryIds={[]}
          onSuccess={() => router.push('/ma-boutique')}
        />
      </div>
    </main>
  )
}
