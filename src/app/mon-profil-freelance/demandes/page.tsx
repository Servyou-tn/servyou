'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Order = {
  id: string
  status: string
  created_at: string
  buyer_note: string | null
  service_listings: { title: string } | null
  profiles: { full_name: string; phone: string | null } | null
}

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  pending:   { label: 'En attente',  cls: 'bg-yellow-100 text-yellow-700' },
  completed: { label: 'Terminée',   cls: 'bg-green-100 text-green-700' },
  cancelled: { label: 'Annulée',    cls: 'bg-red-100 text-red-600' },
}

export default function DemandesFreelancePage() {
  const supabase = createClient()
  const router = useRouter()

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
        .select('id, status, created_at, buyer_note, service_listings(title), profiles!buyer_id(full_name, phone)')
        .eq('seller_id', user.id)
        .eq('order_type', 'service')
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
        <p className="text-gray-500 text-sm">Chargement…</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-12">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Demandes reçues</h1>

        {orders.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
            Aucune demande pour le moment.
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map(o => {
              const s = STATUS_LABELS[o.status] ?? { label: o.status, cls: 'bg-gray-100 text-gray-600' }
              const date = new Date(o.created_at).toLocaleDateString('fr-TN', { day: '2-digit', month: 'short', year: 'numeric' })
              const buyerPhone = o.profiles?.phone?.replace(/\s+/g, '')
              return (
                <div key={o.id} className="bg-white rounded-lg shadow p-5 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-gray-800">{o.service_listings?.title ?? '—'}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {o.profiles?.full_name ?? 'Client'} · {date}
                      </p>
                    </div>
                    <span className={`text-xs font-medium px-2 py-1 rounded-full whitespace-nowrap ${s.cls}`}>{s.label}</span>
                  </div>

                  {o.buyer_note && (
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Message :</span> {o.buyer_note}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-2 pt-1">
                    {buyerPhone && (
                      <a href={`https://wa.me/${buyerPhone}`} target="_blank" rel="noopener noreferrer"
                        className="bg-green-500 hover:bg-green-600 text-white text-xs font-medium px-3 py-1.5 rounded transition-colors">
                        Contacter sur WhatsApp
                      </a>
                    )}
                    {o.status === 'pending' && (
                      <>
                        <button onClick={() => updateStatus(o.id, 'completed')}
                          className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium px-3 py-1.5 rounded transition-colors">
                          Marquer terminée
                        </button>
                        <button onClick={() => updateStatus(o.id, 'cancelled')}
                          className="border border-red-300 hover:bg-red-50 text-red-600 text-xs font-medium px-3 py-1.5 rounded transition-colors">
                          Annuler
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
          <Link href="/mon-profil-freelance" className="text-sm text-blue-600 hover:underline">← Retour à mon espace freelance</Link>
        </div>
      </div>
    </main>
  )
}
