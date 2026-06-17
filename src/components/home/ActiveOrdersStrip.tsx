import Link from 'next/link'
import Image from 'next/image'
import { t } from '@/lib/i18n'
import type { Lang } from '@/lib/i18n'
import { FOCUS_RING, CARD_SHADOW, HOVER_SHADOW } from '@/components/layout/styles'
import { OrderStatusBadge } from '@/components/marche/OrderStatusBadge'
import { statusLabelKey, type OrderStatus } from '@/lib/types/order-status'
import { PackageIcon, BriefcaseIcon } from '@/components/marche/icons'
import type { MyOrder } from '@/lib/marche/my-data'
import { HorizontalStrip } from './HorizontalStrip'

// Compact order card for the homepage strip — thumbnail + title + status badge. Both
// product AND service orders link to /mes-commandes/[id] (the unified order-detail page
// handles either order_type; /mes-missions/[id] is the separate job-posts surface).
function CompactOrderCard({ order, lang }: { order: MyOrder; lang: Lang }) {
  const title = order.title ?? t('mescommandes.item_unavailable', lang)
  const statusLabel = t(statusLabelKey(order.status as OrderStatus, order.order_type), lang)
  const Thumb = order.order_type === 'service' ? BriefcaseIcon : PackageIcon

  return (
    <Link
      href={`/mes-commandes/${order.id}`}
      className={`flex w-[240px] shrink-0 flex-col gap-3 rounded-2xl border border-border-subtle bg-white p-4 transition-all duration-200 ease-out ${CARD_SHADOW} ${HOVER_SHADOW} ${FOCUS_RING}`}
    >
      <div className="relative h-28 w-full overflow-hidden rounded-xl bg-[#F4F4F4]">
        {order.order_type === 'product' && order.image_url ? (
          <Image src={order.image_url} alt="" fill sizes="240px" className="object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center" aria-hidden="true">
            <Thumb className="h-9 w-9 text-[#B8B8B8]" />
          </div>
        )}
      </div>
      <p className="line-clamp-1 text-sm font-semibold text-[#0A0A0A]">{title}</p>
      <OrderStatusBadge status={order.status} label={statusLabel} />
    </Link>
  )
}

export function ActiveOrdersStrip({ orders, lang }: { orders: MyOrder[]; lang: Lang }) {
  return (
    <HorizontalStrip
      title={t('home.sections.activeOrders', lang)}
      viewAllHref="/mes-commandes"
      lang={lang}
    >
      {orders.map((o) => (
        <CompactOrderCard key={o.id} order={o} lang={lang} />
      ))}
    </HorizontalStrip>
  )
}
