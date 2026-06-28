import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AppShell } from '@/components/shell/AppShell'
import { OrderDetail } from '@/components/marche/OrderDetail'
import { getShellUser } from '@/lib/marche/shell-user'
import { getOrderDetail } from '@/lib/marche/order-detail'
import { getLang } from '@/lib/i18n/server'
import { t } from '@/lib/i18n'
import { CARD_SHADOW, FOCUS_RING } from '@/components/layout/styles'

type Props = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const shell = await getShellUser()
  const order = shell ? await getOrderDetail(id, shell.id) : null // cached — shared with the page
  return { title: order?.item.title ? `Commande ${order.item.title} — Servyou` : 'Commande — Servyou' }
}

// The buyer's order-detail page. Auth-gated (own order) → logged-out visitors are sent to
// /connexion?next=/mes-commandes/[id]. getOrderDetail re-checks buyer ownership on top of RLS
// (defense in depth); a non-owner, a missing order, or an invalid id all yield the same
// not-found state — no information leak about whether an id exists.
export default async function CommandeDetailPage({ params }: Props) {
  const { id } = await params
  const lang = await getLang()

  const shell = await getShellUser()
  if (!shell) redirect(`/connexion?next=${encodeURIComponent(`/mes-commandes/${id}`)}`)

  const order = await getOrderDetail(id, shell.id)
  if (!order) {
    return (
      <AppShell user={shell.topBarUser}>
        <div className={`mx-auto max-w-md rounded-2xl bg-white p-12 text-center ${CARD_SHADOW}`}>
          <h1 className="text-lg font-semibold text-text-primary">{t('orders.not_found', lang)}</h1>
          <p className="mt-2 text-sm text-text-muted">{t('orders.detail_not_found_desc', lang)}</p>
          <Link
            href="/mes-commandes"
            className={`mt-6 inline-flex items-center rounded-full bg-brand-accent px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-accent-light ${FOCUS_RING}`}
          >
            {t('orders.detail_back', lang)}
          </Link>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell user={shell.topBarUser}>
      <OrderDetail order={order} />
    </AppShell>
  )
}
