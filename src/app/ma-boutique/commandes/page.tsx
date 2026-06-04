'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { DirArrow } from '@/components/DirArrow'

type Order = {
  id: string
  status: string
  created_at: string
  quantity: number
  delivery_name: string | null
  delivery_address: string | null
  delivery_phone: string | null
  buyer_note: string | null
  products: { title: string } | null
  profiles: { full_name: string } | null
}

const STATUS_LABELS: Record<string, { key: string; cls: string }> = {
  pending:   { key: 'common.status_pending',   cls: 'bg-yellow-100 text-yellow-700' },
  completed: { key: 'common.status_completed', cls: 'bg-green-100 text-green-700' },
  cancelled: { key: 'common.status_cancelled', cls: 'bg-red-100 text-red-600' },
}

export default function CommandesBoutiquePage() {
  const supabase = createClient()
  const router = useRouter()
  const lang = useLang()

  const [loading, setLoading] = useState(true)
  const [orders, setOrders] = useState<Order[]>([])

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/login'); return }

      const { data: profile } = await supabase
        .from('profiles').select('seller_type').eq('id', user.id).single()
      if (!profile || profile.seller_type !== 'shop_owner') { router.replace('/'); return }

      const { data: rows } = await supabase
        .from('orders')
        .select('id, status, created_at, quantity, delivery_name, delivery_address, delivery_phone, buyer_note, products(title), profiles:public_profiles!buyer_id(full_name)')
        .eq('seller_id', user.id)
        .eq('order_type', 'product')
        .order('created_at', { ascending: false })

      setOrders((rows as unknown as Order[]) ?? [])
      setLoading(false)
    }
    load()
  }, [])

  async function updateStatus(id: string, status: 'completed' | 'cancelled') {
    await supabase.from('orders').update({ status }).eq('id', id)
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o))
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
        <h1 className="text-2xl font-bold text-gray-800 mb-6">{t('boutique.orders_title', lang)}</h1>

        {orders.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
            {t('boutique.orders_empty', lang)}
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map(o => {
              const sl = STATUS_LABELS[o.status]
              const label = sl ? t(sl.key, lang) : o.status
              const cls = sl?.cls ?? 'bg-gray-100 text-gray-600'
              const date = new Date(o.created_at).toLocaleDateString('fr-TN', { day: '2-digit', month: 'short', year: 'numeric' })
              const waPhone = o.delivery_phone?.replace(/\s+/g, '')
              return (
                <div key={o.id} className="bg-white rounded-lg shadow p-5 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-gray-800">{o.products?.title ?? '—'}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {o.profiles?.full_name ?? t('boutique.buyer_fallback', lang)} · {t('boutique.qty_label', lang)} {o.quantity} · {date}
                      </p>
                    </div>
                    <span className={`text-xs font-medium px-2 py-1 rounded-full whitespace-nowrap ${cls}`}>{label}</span>
                  </div>

                  <div className="text-sm text-gray-600 space-y-0.5">
                    {o.delivery_name && <p><span className="font-medium">{t('boutique.field_delivery', lang)}</span> {o.delivery_name}</p>}
                    {o.delivery_address && <p><span className="font-medium">{t('boutique.field_address', lang)}</span> {o.delivery_address}</p>}
                    {o.delivery_phone && <p><span className="font-medium">{t('boutique.field_tel', lang)}</span> {o.delivery_phone}</p>}
                    {o.buyer_note && <p><span className="font-medium">{t('boutique.field_note', lang)}</span> {o.buyer_note}</p>}
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1">
                    {waPhone && (
                      <a href={`https://wa.me/${waPhone}`} target="_blank" rel="noopener noreferrer"
                        className="bg-green-500 hover:bg-green-600 text-white text-xs font-medium px-3 py-1.5 rounded transition-colors">
                        {t('common.whatsapp_contact', lang)}
                      </a>
                    )}
                    {o.status === 'pending' && (
                      <>
                        <button onClick={() => updateStatus(o.id, 'completed')}
                          className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium px-3 py-1.5 rounded transition-colors">
                          {t('common.mark_completed', lang)}
                        </button>
                        <button onClick={() => updateStatus(o.id, 'cancelled')}
                          className="border border-red-300 hover:bg-red-50 text-red-600 text-xs font-medium px-3 py-1.5 rounded transition-colors">
                          {t('common.cancel', lang)}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        <div className="mt-6">
          <Link href="/ma-boutique" className="text-sm text-blue-600 hover:underline"><DirArrow lang={lang} direction="back" />{' '}{t('boutique.back', lang)}</Link>
        </div>
      </div>
    </main>
  )
}
