'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Shop = {
  id: string
  name: string
  description: string | null
  city: string
}

export default function MaBoutiquePage() {
  const supabase = createClient()
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [shop, setShop] = useState<Shop | null>(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/login'); return }

      const { data: profile } = await supabase
        .from('profiles')
        .select('seller_type')
        .eq('id', user.id)
        .single()

      if (!profile || profile.seller_type !== 'shop_owner') {
        router.replace('/devenir-vendeur')
        return
      }

      const { data: shopData } = await supabase
        .from('shops')
        .select('id, name, description, city')
        .eq('owner_id', user.id)
        .maybeSingle()

      if (!shopData) { router.replace('/ma-boutique/creer'); return }

      setShop(shopData)
      setLoading(false)
    }
    load()
  }, [])

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500 text-sm">Chargement…</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex items-start justify-center bg-gray-50 px-4 py-12">
      <div className="bg-white rounded-lg shadow p-8 max-w-md w-full">
        <h1 className="text-2xl font-bold text-gray-800 mb-1">Ma Boutique</h1>
        <p className="text-xs text-gray-400 mb-6">Tableau de bord vendeur</p>

        <div className="space-y-3 mb-8">
          <div>
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Nom</span>
            <p className="text-gray-800 font-medium">{shop!.name}</p>
          </div>

          {shop!.description && (
            <div>
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Description</span>
              <p className="text-gray-700">{shop!.description}</p>
            </div>
          )}

          <div>
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Gouvernorat</span>
            <p className="text-gray-700">{shop!.city}</p>
          </div>
        </div>

        <div className="mt-6 mb-4 flex flex-wrap gap-3">
          <Link
            href="/ma-boutique/produits"
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-5 rounded text-sm transition-colors"
          >
            Gérer mes produits
          </Link>
          <Link
            href="/ma-boutique/commandes"
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-5 rounded text-sm transition-colors"
          >
            Commandes reçues
          </Link>
          <Link
            href={`/boutique/${shop!.id}`}
            className="inline-block border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium py-2 px-5 rounded text-sm transition-colors"
          >
            Voir ma boutique publique
          </Link>
        </div>

        <div className="mt-2">
          <Link href="/" className="text-sm text-blue-600 hover:underline">
            ← Retour à l'accueil
          </Link>
        </div>
      </div>
    </main>
  )
}
