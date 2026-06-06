import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { t } from '@/lib/i18n'
import { DirArrow } from '@/components/DirArrow'
import { getLang } from '@/lib/i18n/server'
import { OrderLifecycleStepper } from '@/components/OrderLifecycleStepper'

export default async function MesDemandesPage() {
  const supabase = await createClient()
  const lang = await getLang()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: orders } = await supabase
    .from('orders')
    .select('id, order_type, status, created_at, quantity, cancelled_by, cancellation_reason, received_at, products(title), service_listings(title), profiles!seller_id(full_name)')
    .eq('buyer_id', user.id)
    .order('created_at', { ascending: false })

  type Order = {
    id: string
    order_type: string
    status: string
    created_at: string
    quantity: number | null
    cancelled_by: string | null
    cancellation_reason: string | null
    received_at: string | null
    products: { title: string } | null
    service_listings: { title: string } | null
    profiles: { full_name: string } | null
  }

  const rows = (orders as unknown as Order[]) ?? []

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-12">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">{t('orders.title', lang)}</h1>

        {rows.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
            <p className="mb-4">{t('orders.empty', lang)}</p>
            <Link href="/" className="text-blue-600 hover:underline text-sm">{t('orders.browse_cta', lang)}</Link>
          </div>
        ) : (
          <div className="space-y-3">
            {rows.map(o => {
              const title = o.order_type === 'product' ? o.products?.title : o.service_listings?.title
              const date = new Date(o.created_at).toLocaleDateString('fr-TN', { day: '2-digit', month: 'short', year: 'numeric' })
              return (
                <Link key={o.id} href={`/demande/confirmation/${o.id}`}
                  className="block bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow space-y-3">
                  <div>
                    <p className="font-medium text-gray-800">{title ?? '—'}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {o.order_type === 'product' ? t('orders.type_product', lang) : t('orders.type_service', lang)}
                      {o.quantity && o.order_type === 'product' ? ` · ${t('boutique.qty_label', lang)} ${o.quantity}` : ''}
                      {o.profiles?.full_name ? ` · ${o.profiles.full_name}` : ''}
                      {' · '}{date}
                    </p>
                  </div>
                  <OrderLifecycleStepper
                    status={o.status}
                    order_type={o.order_type === 'service' ? 'service' : 'product'}
                    cancelled_by={o.cancelled_by}
                    cancellation_reason={o.cancellation_reason}
                    received_at={o.received_at}
                  />
                </Link>
              )
            })}
          </div>
        )}

        <div className="mt-6">
          <Link href="/" className="text-sm text-blue-600 hover:underline"><DirArrow lang={lang} direction="back" />{' '}{t('common.back_home', lang)}</Link>
        </div>
      </div>
    </main>
  )
}
