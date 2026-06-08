'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { DirArrow } from '@/components/DirArrow'
import { ModerationBanner } from '@/components/ModerationBanner'

type Category = { id: string; name_fr: string }

export default function EditProduitPage() {
  const supabase = createClient()
  const router = useRouter()
  const { id } = useParams<{ id: string }>()
  const lang = useLang()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [categories, setCategories] = useState<Category[]>([])
  const [adminHidden, setAdminHidden] = useState(false)

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

      const { data: product } = await supabase
        .from('products')
        .select('id, title, description, price_tnd, category_id, status, tracks_stock, stock_count, shop_id, admin_hidden_at')
        .eq('id', id)
        .single()

      if (!product || product.shop_id !== shop.id) {
        router.replace('/ma-boutique/produits')
        return
      }

      setTitle(product.title)
      setDescription(product.description ?? '')
      setPriceTnd(String(product.price_tnd))
      setCategoryId(product.category_id ?? '')
      setStatus(product.status)
      setTracksStock(product.tracks_stock)
      setStockCount(product.stock_count != null ? String(product.stock_count) : '')
      setAdminHidden(product.admin_hidden_at != null)

      const { data: cats } = await supabase
        .from('categories').select('id, name_fr').order('name_fr')
      setCategories(cats ?? [])

      setLoading(false)
    }
    check()
  }, [id])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    const price = parseFloat(priceTnd)
    if (!title.trim()) { setError(t('product.error_title', lang)); return }
    if (isNaN(price) || price < 0) { setError(t('product.error_price', lang)); return }

    setSaving(true)

    const { error: updateError } = await supabase.from('products').update({
      title: title.trim(),
      description: description.trim() || null,
      price_tnd: price,
      category_id: categoryId || null,
      status,
      tracks_stock: tracksStock,
      stock_count: tracksStock ? (parseInt(stockCount) || 0) : null,
    }).eq('id', id)

    setSaving(false)

    if (updateError) {
      setError(t('product.error_update', lang))
      return
    }

    router.push('/ma-boutique/produits')
  }

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
        {adminHidden && <ModerationBanner variant="product" />}
        <h1 className="text-2xl font-bold text-gray-800 mb-6">{t('product.edit_title', lang)}</h1>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="title">
              {t('common.field_title', lang)} <span className="text-red-500">*</span>
            </label>
            <input id="title" type="text" required value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="description">
              {t('common.field_description', lang)} <span className="text-gray-400 font-normal">{t('common.optional_f', lang)}</span>
            </label>
            <textarea id="description" rows={3} value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="price">
              {t('product.field_price', lang)} <span className="text-red-500">*</span>
            </label>
            <input id="price" type="number" min="0" step="0.01" required value={priceTnd}
              onChange={e => setPriceTnd(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="category">
              {t('common.field_category', lang)}
            </label>
            <select id="category" value={categoryId} onChange={e => setCategoryId(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
              <option value="">{t('common.no_category', lang)}</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name_fr}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="status">
              {t('common.field_status', lang)}
            </label>
            <select id="status" value={status} onChange={e => setStatus(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
              <option value="active">{t('common.status_active', lang)}</option>
              <option value="hidden">{t('common.status_hidden', lang)}</option>
              <option value="sold_out">{t('common.status_sold_out', lang)}</option>
            </select>
          </div>

          <div className="border border-gray-200 rounded p-3 space-y-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={tracksStock}
                onChange={e => setTracksStock(e.target.checked)}
                className="rounded border-gray-300" />
              <span className="text-sm font-medium text-gray-700">{t('product.field_stock_manage', lang)}</span>
            </label>
            {tracksStock && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="stockCount">
                  {t('product.field_stock_count', lang)}
                </label>
                <input id="stockCount" type="number" min="0" step="1" value={stockCount}
                  onChange={e => setStockCount(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            )}
            {!tracksStock && (
              <p className="text-xs text-gray-500">{t('product.stock_always_hint', lang)}</p>
            )}
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>
          )}

          <button type="submit" disabled={saving}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-medium py-2 px-4 rounded text-sm transition-colors">
            {saving ? t('common.saving', lang) : t('common.save', lang)}
          </button>
        </form>

        <div className="mt-6">
          <a href="/ma-boutique/produits" className="text-sm text-blue-600 hover:underline">
            <DirArrow lang={lang} direction="back" />{' '}{t('product.back', lang)}
          </a>
        </div>
      </div>
    </main>
  )
}
