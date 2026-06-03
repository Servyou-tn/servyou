'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Category = { id: string; name_fr: string }

export default function NouveauProduitPage() {
  const supabase = createClient()
  const router = useRouter()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [shopId, setShopId] = useState<string | null>(null)
  const [categories, setCategories] = useState<Category[]>([])

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priceTnd, setPriceTnd] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [status, setStatus] = useState('active')
  const [tracksStock, setTracksStock] = useState(false)
  const [stockCount, setStockCount] = useState('')

  useEffect(() => {
    async function check() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/login'); return }

      const { data: profile } = await supabase
        .from('profiles').select('seller_type').eq('id', user.id).single()
      if (!profile || profile.seller_type !== 'shop_owner') { router.replace('/devenir-vendeur'); return }

      const { data: shop } = await supabase
        .from('shops').select('id').eq('owner_id', user.id).maybeSingle()
      if (!shop) { router.replace('/ma-boutique/creer'); return }

      setShopId(shop.id)

      const { data: cats } = await supabase
        .from('categories').select('id, name_fr').order('name_fr')
      setCategories(cats ?? [])

      setLoading(false)
    }
    check()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    const price = parseFloat(priceTnd)
    if (!title.trim()) { setError('Le titre est requis.'); return }
    if (isNaN(price) || price < 0) { setError('Veuillez entrer un prix valide (>= 0).'); return }

    setSaving(true)

    const { error: insertError } = await supabase.from('products').insert({
      shop_id: shopId,
      title: title.trim(),
      description: description.trim() || null,
      price_tnd: price,
      category_id: categoryId || null,
      status,
      tracks_stock: tracksStock,
      stock_count: tracksStock ? (parseInt(stockCount) || 0) : null,
    })

    setSaving(false)

    if (insertError) {
      setError('Une erreur est survenue lors de l\'ajout. Veuillez réessayer.')
      return
    }

    router.push('/ma-boutique/produits')
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500 text-sm">Chargement…</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex items-start justify-center bg-gray-50 px-4 py-12">
      <div className="bg-white rounded-lg shadow p-8 max-w-lg w-full">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Ajouter un produit</h1>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="title">
              Titre <span className="text-red-500">*</span>
            </label>
            <input id="title" type="text" required value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="description">
              Description <span className="text-gray-400 font-normal">(optionnelle)</span>
            </label>
            <textarea id="description" rows={3} value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="price">
              Prix (TND) <span className="text-red-500">*</span>
            </label>
            <input id="price" type="number" min="0" step="0.01" required value={priceTnd}
              onChange={e => setPriceTnd(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="category">
              Catégorie
            </label>
            <select id="category" value={categoryId} onChange={e => setCategoryId(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
              <option value="">— Sans catégorie —</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name_fr}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="status">
              Statut
            </label>
            <select id="status" value={status} onChange={e => setStatus(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
              <option value="active">Actif</option>
              <option value="hidden">Masqué</option>
              <option value="sold_out">Épuisé</option>
            </select>
          </div>

          <div className="border border-gray-200 rounded p-3 space-y-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={tracksStock}
                onChange={e => setTracksStock(e.target.checked)}
                className="rounded border-gray-300" />
              <span className="text-sm font-medium text-gray-700">Gérer le stock</span>
            </label>
            {tracksStock && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="stockCount">
                  Quantité en stock
                </label>
                <input id="stockCount" type="number" min="0" step="1" value={stockCount}
                  onChange={e => setStockCount(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            )}
            {!tracksStock && (
              <p className="text-xs text-gray-500">Toujours disponible (stock non géré)</p>
            )}
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>
          )}

          <button type="submit" disabled={saving}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-medium py-2 px-4 rounded text-sm transition-colors">
            {saving ? 'Enregistrement…' : 'Ajouter le produit'}
          </button>
        </form>

        <div className="mt-6">
          <a href="/ma-boutique/produits" className="text-sm text-blue-600 hover:underline">
            ← Retour aux produits
          </a>
        </div>
      </div>
    </main>
  )
}
