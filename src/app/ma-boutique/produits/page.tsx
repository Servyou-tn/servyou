'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Product = {
  id: string
  title: string
  price_tnd: number
  status: string
  tracks_stock: boolean
  stock_count: number | null
  categories: { name_fr: string } | null
}

const STATUS_LABELS: Record<string, string> = {
  active: 'Actif',
  hidden: 'Masqué',
  sold_out: 'Épuisé',
}

export default function ProduitsPage() {
  const supabase = createClient()
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [shopId, setShopId] = useState<string | null>(null)
  const [products, setProducts] = useState<Product[]>([])

  async function loadData() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.replace('/login'); return }

    const { data: profile } = await supabase
      .from('profiles').select('seller_type').eq('id', user.id).single()
    if (!profile || profile.seller_type !== 'shop_owner') { router.replace('/devenir-vendeur'); return }

    const { data: shop } = await supabase
      .from('shops').select('id').eq('owner_id', user.id).maybeSingle()
    if (!shop) { router.replace('/ma-boutique/creer'); return }

    setShopId(shop.id)

    const { data: rows } = await supabase
      .from('products')
      .select('id, title, price_tnd, status, tracks_stock, stock_count, categories(name_fr)')
      .eq('shop_id', shop.id)
      .order('created_at', { ascending: false })

    setProducts((rows as unknown as Product[]) ?? [])
    setLoading(false)
  }

  useEffect(() => { loadData() }, [])

  async function handleDelete(id: string, title: string) {
    if (!window.confirm(`Supprimer le produit "${title}" ? Cette action est irréversible.`)) return

    await supabase.from('products').delete().eq('id', id)
    setProducts(prev => prev.filter(p => p.id !== id))
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500 text-sm">Chargement…</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-12">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Mes produits</h1>
          <Link
            href="/ma-boutique/produits/nouveau"
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded text-sm transition-colors"
          >
            + Ajouter un produit
          </Link>
        </div>

        {products.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
            <p className="mb-4">Vous n'avez pas encore de produits.</p>
            <Link href="/ma-boutique/produits/nouveau" className="text-blue-600 hover:underline text-sm">
              Ajouter votre premier produit
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Titre</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Catégorie</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Prix</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Stock</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Statut</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {products.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-800">{p.title}</td>
                    <td className="px-4 py-3 text-gray-600">{p.categories?.name_fr ?? '—'}</td>
                    <td className="px-4 py-3 text-gray-700">{p.price_tnd.toFixed(2)} TND</td>
                    <td className="px-4 py-3 text-gray-600">
                      {p.tracks_stock ? (p.stock_count ?? 0) : 'Toujours disponible'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                        p.status === 'active' ? 'bg-green-100 text-green-700' :
                        p.status === 'sold_out' ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {STATUS_LABELS[p.status] ?? p.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <Link
                        href={`/ma-boutique/produits/${p.id}`}
                        className="text-blue-600 hover:underline mr-4"
                      >
                        Modifier
                      </Link>
                      <button
                        onClick={() => handleDelete(p.id, p.title)}
                        className="text-red-500 hover:underline"
                      >
                        Supprimer
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-6">
          <Link href="/ma-boutique" className="text-sm text-blue-600 hover:underline">
            ← Retour à ma boutique
          </Link>
        </div>
      </div>
    </main>
  )
}
