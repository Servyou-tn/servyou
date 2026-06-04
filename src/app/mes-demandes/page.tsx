import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { t } from '@/lib/i18n'
import { DirArrow } from '@/components/DirArrow'
import { getLang } from '@/lib/i18n/server'

export default async function MesDemandesPage() {
  const supabase = await createClient()
  const lang = await getLang()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const STATUS_LABELS: Record<string, { key: string; cls: string }> = {
    pending:   { key: 'common.status_pending',   cls: 'bg-yellow-100 text-yellow-700' },
    completed: { key: 'common.status_completed', cls: 'bg-green-100 text-green-700' },
    cancelled: { key: 'common.status_cancelled', cls: 'bg-red-100 text-red-600' },
  }

  const { data: orders } = await supabase
    .from('orders')
    .select('id, order_type, status, created_at, quantity, products(title), service_listings(title), profiles!seller_id(full_name)')
    .eq('buyer_id', user.id)
    .order('created_at', { ascending: false })

  type Order = {
    id: string
    order_type: string
    status: string
    created_at: string
    quantity: number | null
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
              const sl = STATUS_LABELS[o.status]
              const label = sl ? t(sl.key, lang) : o.status
              const cls = sl?.cls ?? 'bg-gray-100 text-gray-600'
              const date = new Date(o.created_at).toLocaleDateString('fr-TN', { day: '2-digit', month: 'short', year: 'numeric' })
              return (
                <Link key={o.id} href={`/demande/confirmation/${o.id}`}
                  className="block bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-gray-800">{title ?? '—'}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {o.order_type === 'product' ? t('orders.type_product', lang) : t('orders.type_service', lang)}
                        {o.quantity && o.order_type === 'product' ? ` · ${t('boutique.qty_label', lang)} ${o.quantity}` : ''}
                        {o.profiles?.full_name ? ` · ${o.profiles.full_name}` : ''}
                        {' · '}{date}
                      </p>
                    </div>
                    <span className={`text-xs font-medium px-2 py-1 rounded-full whitespace-nowrap ${cls}`}>{label}</span>
                  </div>
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
