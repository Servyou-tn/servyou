'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'

type Product = {
  id: string
  title: string
  price_tnd: number
  status: string
  tracks_stock: boolean
  stock_count: number | null
  categories: { name_fr: string } | null
}

const STATUS_KEYS: Record<string, string> = {
  active: 'common.status_active',
  hidden: 'common.status_hidden',
  sold_out: 'common.status_sold_out',
}

export default function ProduitsPage() {
  const supabase = createClient()
  const router = useRouter()
  const lang = useLang()

  const [loading, setLoading] = useState(true)
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
    if (!window.confirm(t('product.delete_confirm', lang, { title }))) return

    await supabase.from('products').delete().eq('id', id)
    setProducts(prev => prev.filter(p => p.id !== id))
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-500 text-sm">{t('common.loading', lang)}</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-12">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-800">{t('product.list_title', lang)}</h1>
          <Link
            href="/ma-boutique/produits/nouveau"
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded text-sm transition-colors"
          >
            {t('product.add_btn', lang)}
          </Link>
        </div>

        {products.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
            <p className="mb-4">{t('product.empty', lang)}</p>
            <Link href="/ma-boutique/produits/nouveau" className="text-blue-600 hover:underline text-sm">
              {t('product.empty_cta', lang)}
            </Link>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-start px-4 py-3 font-medium text-gray-600">{t('common.field_title', lang)}</th>
                  <th className="text-start px-4 py-3 font-medium text-gray-600">{t('common.field_category', lang)}</th>
                  <th className="text-start px-4 py-3 font-medium text-gray-600">{t('product.col_price', lang)}</th>
                  <th className="text-start px-4 py-3 font-medium text-gray-600">{t('product.col_stock', lang)}</th>
                  <th className="text-start px-4 py-3 font-medium text-gray-600">{t('product.col_status', lang)}</th>
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
                      {p.tracks_stock ? (p.stock_count ?? 0) : t('common.stock_always', lang)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                        p.status === 'active' ? 'bg-green-100 text-green-700' :
                        p.status === 'sold_out' ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {STATUS_KEYS[p.status] ? t(STATUS_KEYS[p.status], lang) : p.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-end whitespace-nowrap">
                      <Link
                        href={`/ma-boutique/produits/${p.id}`}
                        className="text-blue-600 hover:underline me-4"
                      >
                        {t('common.edit', lang)}
                      </Link>
                      <button
                        onClick={() => handleDelete(p.id, p.title)}
                        className="text-red-500 hover:underline"
                      >
                        {t('common.delete', lang)}
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
            {t('boutique.back', lang)}
          </Link>
        </div>
      </div>
    </main>
  )
}
