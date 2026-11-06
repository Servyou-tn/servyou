import { t, type Lang } from '@/lib/i18n'
import { getInitials } from '@/components/ui/initials'
import { amountText, cityLabel, sinceText, type AdminOrderRow } from '../../_lib/format'
import type { OrderRowVM } from '../_components/OrdersListView'
import { articleText } from './orders'

/** admin_list_orders rows → the J9 table / card rows (names fall back to « — » for an erased account). */
export function buildOrderRows(list: AdminOrderRow[], now: number, lang: Lang): OrderRowVM[] {
  return list.map((o) => {
    const sellerKind = t(o.seller_kind === 'shop' ? 'admin.orders.seller_shop' : 'admin.orders.seller_freelance', lang)
    return {
      id: o.id,
      ref: o.ref,
      article: articleText(o.item_title, o.quantity),
      buyer: { name: o.buyer_name ?? '—', initials: getInitials(o.buyer_name), line: o.buyer_city ? cityLabel(o.buyer_city, lang) : null },
      seller: { name: o.seller_name ?? '—', initials: getInitials(o.seller_name), line: o.seller_city ? `${sellerKind} · ${cityLabel(o.seller_city, lang)}` : sellerKind },
      type: o.order_type,
      typeLabel: t(o.order_type === 'service' ? 'admin.orders.type_service' : 'admin.orders.type_product', lang),
      amount: amountText(o.amount_tnd, lang),
      status: o.status,
      // D7: when the status date is a fallback (updated_at), it is marked approximate.
      since: `${o.status_since_exact ? '' : '≈ '}${sinceText(o.status_since, now, lang)}`,
      blocked: o.is_blocked,
    }
  })
}
