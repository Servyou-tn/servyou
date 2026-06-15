'use client'

import { useState } from 'react'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { SegmentedControl, type SegmentedControlOption } from '@/components/ui/segmented-control'
import { OrderCard } from './OrderCard'
import type { MyOrder } from '@/lib/marche/my-data'

type Filter = 'all' | 'active' | 'delivered' | 'cancelled'

const FILTERS: { key: Filter; labelKey: string }[] = [
  { key: 'all', labelKey: 'mescommandes.filter.all' },
  { key: 'active', labelKey: 'mescommandes.filter.active' },
  { key: 'delivered', labelKey: 'mescommandes.filter.delivered' },
  { key: 'cancelled', labelKey: 'mescommandes.filter.cancelled' },
]

function matches(o: MyOrder, f: Filter): boolean {
  if (f === 'all') return true
  if (f === 'delivered') return o.status === 'received'
  if (f === 'cancelled') return o.status === 'cancelled'
  // active = in-progress (everything not terminal)
  return o.status !== 'received' && o.status !== 'cancelled'
}

// Client-side filtering over the buyer's orders (instant, no round-trip).
export function MesCommandesList({ orders }: { orders: MyOrder[] }) {
  const lang = useLang()
  const [filter, setFilter] = useState<Filter>('all')
  const visible = orders.filter((o) => matches(o, filter))

  const filterOptions: SegmentedControlOption<Filter>[] = FILTERS.map((f) => ({
    value: f.key,
    label: t(f.labelKey, lang),
  }))

  return (
    <div>
      <div className="mb-6">
        <SegmentedControl
          options={filterOptions}
          value={filter}
          onChange={setFilter}
          ariaLabel={t('marche.sidebar.commandes', lang)}
        />
      </div>

      <div className="flex flex-col gap-4">
        {visible.map((o) => (
          <OrderCard key={o.id} order={o} />
        ))}
      </div>
    </div>
  )
}
