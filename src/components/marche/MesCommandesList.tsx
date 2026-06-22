import { OrderCard } from './OrderCard'
import type { MyOrder } from '@/lib/marche/my-data'

// Pure renderer for the buyer's orders. The ?statut= filter + ?page= pagination now run on the
// server (see /mes-commandes/page.tsx), so this just lays out whatever slice it is handed.
export function MesCommandesList({ orders }: { orders: MyOrder[] }) {
  return (
    <div className="flex flex-col gap-4">
      {orders.map((o) => (
        <OrderCard key={o.id} order={o} />
      ))}
    </div>
  )
}
