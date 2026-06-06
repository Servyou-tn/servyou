'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { DirArrow } from '@/components/DirArrow'
import { OrderLifecycleStepper } from '@/components/OrderLifecycleStepper'
import { CancelOrderModal } from '@/components/CancelOrderModal'
import { type OrderStatus, nextStatus, isCancellable, advanceLabelKey } from '@/lib/types/order-status'

type Order = {
  id: string
  status: string
  created_at: string
  quantity: number
  delivery_name: string | null
  delivery_address: string | null
  delivery_phone: string | null
  buyer_note: string | null
  cancelled_by: string | null
  cancellation_reason: string | null
  received_at: string | null
  products: { title: string } | null
  profiles: { full_name: string } | null
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
        .select('id, status, created_at, quantity, delivery_name, delivery_address, delivery_phone, buyer_note, cancelled_by, cancellation_reason, received_at, products(title), profiles:public_profiles!buyer_id(full_name)')
        .eq('seller_id', user.id)
        .eq('order_type', 'product')
        .order('created_at', { ascending: false })

      setOrders((rows as unknown as Order[]) ?? [])
      setLoading(false)
    }
    load()
  }, [])

  async function updateStatus(id: string, status: OrderStatus) {
    const { error } = await supabase.from('orders').update({ status }).eq('id', id)
    if (error) { console.error('[ma-boutique/commandes] updateStatus error:', error); return }
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
              const date = new Date(o.created_at).toLocaleDateString('fr-TN', { day: '2-digit', month: 'short', year: 'numeric' })
              const waPhone = o.delivery_phone?.replace(/\s+/g, '')
              const advance = nextStatus(o.status as OrderStatus, 'product')
              const showCancel = isCancellable(o.status as OrderStatus)
              return (
                <div key={o.id} className="bg-white rounded-lg shadow p-5 space-y-3">
                  <div>
                    <p className="font-semibold text-gray-800">{o.products?.title ?? '—'}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {o.profiles?.full_name ?? t('boutique.buyer_fallback', lang)} · {t('boutique.qty_label', lang)} {o.quantity} · {date}
                    </p>
                  </div>

                  <OrderLifecycleStepper
                    status={o.status}
                    order_type="product"
                    cancelled_by={o.cancelled_by}
                    cancellation_reason={o.cancellation_reason}
                    received_at={o.received_at}
                  />

                  <div className="text-sm text-gray-600 space-y-0.5">
                    {o.delivery_name && <p><span className="font-medium">{t('boutique.field_delivery', lang)}</span> {o.delivery_name}</p>}
                    {o.delivery_address && <p><span className="font-medium">{t('boutique.field_address', lang)}</span> {o.delivery_address}</p>}
                    {o.delivery_phone && <p><span className="font-medium">{t('boutique.field_tel', lang)}</span> {o.delivery_phone}</p>}
                    {o.buyer_note && <p><span className="font-medium">{t('boutique.field_note', lang)}</span> {o.buyer_note}</p>}
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {waPhone && (
                      <a href={`https://wa.me/${waPhone}`} target="_blank" rel="noopener noreferrer"
                        className="bg-green-500 hover:bg-green-600 text-white text-xs font-medium px-3 py-1.5 rounded transition-colors">
                        {t('common.whatsapp_contact', lang)}
                      </a>
                    )}
                    {advance && advance !== 'received' && (
                      <button onClick={() => updateStatus(o.id, advance)}
                        className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium px-3 py-1.5 rounded transition-colors">
                        {t(advanceLabelKey(advance, 'product'), lang)}
                      </button>
                    )}
                    {showCancel && (
                      <CancelOrderModal
                        orderId={o.id}
                        cancelledBy="seller"
                        currentStatus={o.status as OrderStatus}
                        orderType="product"
                      />
                    )}
                    {o.status === 'arrived' && (
                      <span className="text-xs text-gray-500">{t('common.awaiting_buyer', lang)}</span>
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
