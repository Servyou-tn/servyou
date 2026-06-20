'use client'

import { useSearchParams } from 'next/navigation'
import { OrderCard } from './OrderCard'
import type { MyOrder } from '@/lib/marche/my-data'

type Filter = 'all' | 'active' | 'delivered' | 'cancelled'

function matches(o: MyOrder, f: Filter): boolean {
  if (f === 'all') return true
  if (f === 'delivered') return o.status === 'received'
  if (f === 'cancelled') return o.status === 'cancelled'
  // active = in-progress (everything not terminal)
  return o.status !== 'received' && o.status !== 'cancelled'
}

// Client-side filtering over the buyer's orders (instant). The status filter now lives in
// the sidebar (the "Mes commandes" expandable group writes ?statut=); this list reads that
// param and renders the matching subset. An absent/unknown param means "Toutes".
export function MesCommandesList({ orders }: { orders: MyOrder[] }) {
  const sp = useSearchParams()
  const raw = sp.get('statut')
  const filter: Filter = raw === 'active' || raw === 'delivered' || raw === 'cancelled' ? raw : 'all'
  const visible = orders.filter((o) => matches(o, filter))

  return (
    <div className="flex flex-col gap-4">
      {visible.map((o) => (
        <OrderCard key={o.id} order={o} />
      ))}
    </div>
  )
}
