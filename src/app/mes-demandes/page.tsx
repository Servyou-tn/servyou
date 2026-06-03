import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  pending:   { label: 'En attente',  cls: 'bg-yellow-100 text-yellow-700' },
  completed: { label: 'Terminée',   cls: 'bg-green-100 text-green-700' },
  cancelled: { label: 'Annulée',    cls: 'bg-red-100 text-red-600' },
}

export default async function MesDemandesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

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
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Mes demandes</h1>

        {rows.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
            <p className="mb-4">Vous n'avez pas encore envoyé de demande.</p>
            <Link href="/" className="text-blue-600 hover:underline text-sm">Parcourir les produits et services</Link>
          </div>
        ) : (
          <div className="space-y-3">
            {rows.map(o => {
              const title = o.order_type === 'product' ? o.products?.title : o.service_listings?.title
              const s = STATUS_LABELS[o.status] ?? { label: o.status, cls: 'bg-gray-100 text-gray-600' }
              const date = new Date(o.created_at).toLocaleDateString('fr-TN', { day: '2-digit', month: 'short', year: 'numeric' })
              return (
                <Link key={o.id} href={`/demande/confirmation/${o.id}`}
                  className="block bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-gray-800">{title ?? '—'}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {o.order_type === 'product' ? 'Produit' : 'Service'}
                        {o.quantity && o.order_type === 'product' ? ` · Qté : ${o.quantity}` : ''}
                        {o.profiles?.full_name ? ` · ${o.profiles.full_name}` : ''}
                        {' · '}{date}
                      </p>
                    </div>
                    <span className={`text-xs font-medium px-2 py-1 rounded-full whitespace-nowrap ${s.cls}`}>{s.label}</span>
                  </div>
                </Link>
              )
            })}
          </div>
        )}

        <div className="mt-6">
          <Link href="/" className="text-sm text-blue-600 hover:underline">← Retour à l'accueil</Link>
        </div>
      </div>
    </main>
  )
}
