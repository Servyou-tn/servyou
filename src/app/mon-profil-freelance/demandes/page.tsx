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
import { OrderDisputeSection } from '@/components/OrderDisputeSection'
import { type OrderStatus, nextStatus, isCancellable, advanceLabelKey } from '@/lib/types/order-status'

type Order = {
  id: string
  status: string
  created_at: string
  buyer_note: string | null
  buyer_id: string
  cancelled_by: string | null
  cancellation_reason: string | null
  received_at: string | null
  service_listings: { title: string } | null
  profiles: { full_name: string; phone: string | null } | null
}

export default function DemandesFreelancePage() {
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
      if (!profile || profile.seller_type !== 'freelancer') { router.replace('/'); return }

      const { data: rows } = await supabase
        .from('orders')
        .select('id, status, created_at, buyer_note, buyer_id, cancelled_by, cancellation_reason, received_at, service_listings(title)')
        .eq('seller_id', user.id)
        .eq('order_type', 'service')
        .order('created_at', { ascending: false })

      const rawOrders = (rows as unknown as Order[]) ?? []
      const buyerIds = [...new Set(rawOrders.map(o => o.buyer_id))]

      const nameMap: Record<string, string> = {}
      const phoneMap: Record<string, string | null> = {}

      if (buyerIds.length > 0) {
        const { data: pubs } = await supabase.from('public_profiles').select('id, full_name').in('id', buyerIds)
        for (const pub of pubs ?? []) nameMap[pub.id] = pub.full_name ?? ''

        await Promise.all(buyerIds.map(async bid => {
          const { data: ph } = await supabase.rpc('get_contact_phone', { target: bid })
          phoneMap[bid] = ph ?? null
        }))
      }

      setOrders(rawOrders.map(o => ({
        ...o,
        profiles: { full_name: nameMap[o.buyer_id] ?? '', phone: phoneMap[o.buyer_id] ?? null },
      })))
      setLoading(false)
    }
    load()
  }, [])

  async function updateStatus(id: string, status: OrderStatus) {
    const { error } = await supabase.from('orders').update({ status }).eq('id', id)
    if (error) { console.error('[mon-profil-freelance/demandes] updateStatus error:', error); return }
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
        <h1 className="text-2xl font-bold text-gray-800 mb-6">{t('freelance.requests_title', lang)}</h1>

        {orders.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
            {t('freelance.no_requests', lang)}
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map(o => {
              const date = new Date(o.created_at).toLocaleDateString('fr-TN', { day: '2-digit', month: 'short', year: 'numeric' })
              const buyerPhone = o.profiles?.phone?.replace(/\s+/g, '')
              const advance = nextStatus(o.status as OrderStatus, 'service')
              const showCancel = isCancellable(o.status as OrderStatus)
              return (
                <div key={o.id} className="bg-white rounded-lg shadow p-5 space-y-3">
                  <div>
                    <p className="font-semibold text-gray-800">{o.service_listings?.title ?? '—'}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {o.profiles?.full_name || t('boutique.buyer_fallback', lang)} · {date}
                    </p>
                  </div>

                  <OrderLifecycleStepper
                    status={o.status}
                    order_type="service"
                    cancelled_by={o.cancelled_by}
                    cancellation_reason={o.cancellation_reason}
                    received_at={o.received_at}
                  />

                  {o.buyer_note && (
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">{t('common.message_label', lang)}</span> {o.buyer_note}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    {buyerPhone && (
                      <a href={`https://wa.me/${buyerPhone}`} target="_blank" rel="noopener noreferrer"
                        className="bg-green-500 hover:bg-green-600 text-white text-xs font-medium px-3 py-1.5 rounded transition-colors">
                        {t('common.whatsapp_contact', lang)}
                      </a>
                    )}
                    {advance && advance !== 'received' && (
                      <button onClick={() => updateStatus(o.id, advance)}
                        className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium px-3 py-1.5 rounded transition-colors">
                        {t(advanceLabelKey(advance, 'service'), lang)}
                      </button>
                    )}
                    {showCancel && (
                      <CancelOrderModal
                        orderId={o.id}
                        cancelledBy="seller"
                        currentStatus={o.status as OrderStatus}
                        orderType="service"
                      />
                    )}
                    {o.status === 'arrived' && (
                      <span className="text-xs text-gray-500">{t('common.awaiting_buyer', lang)}</span>
                    )}
                  </div>

                  <OrderDisputeSection orderId={o.id} status={o.status} />
                </div>
              )
            })}
          </div>
        )}

        <div className="mt-6">
          <Link href="/mon-profil-freelance" className="text-sm text-blue-600 hover:underline"><DirArrow lang={lang} direction="back" />{' '}{t('freelance.back', lang)}</Link>
        </div>
      </div>
    </main>
  )
}
