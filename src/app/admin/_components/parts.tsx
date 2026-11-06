import Link from 'next/link'
import type { ReactNode } from 'react'
import { t, type Lang } from '@/lib/i18n'
import { FOCUS_RING } from '@/components/layout/styles'
import { StatusPill, type StatusValue } from '@/components/ui/status-pill'
import { statusLabelKey, type OrderStatus, type OrderType } from '@/lib/types/order-status'
import { ErrorState } from '@/components/marche/ErrorState'

// Small pieces shared by J1 / J8 / J9 (Figma NOV 4 — Admin).

/**
 * The `dir` for a figure: « 12,5 % », « 4 / 8 », « #A4F729 » are isolated LTR so they never reorder in Arabic; a
 * figure carrying an Arabic unit (« 9 س ») keeps the auto direction, so the unit reads after the number.
 */
export function figureDir(text: string): 'ltr' | undefined {
  return /[؀-ۿ]/.test(text) ? undefined : 'ltr'
}

/** A white card (pad 24, gap 16, radius 12): 18 Semi Bold title, optional indigo-600 link on the end side. */
export function Panel({ title, link, aside, children, className = '' }: { title: string; link?: { href: string; label: string; labelShort?: string }; aside?: string; children: ReactNode; className?: string }) {
  return (
    <section className={`flex min-w-0 flex-col gap-4 rounded-xl border border-border-subtle bg-surface-base p-4 lg:p-6 ${className}`}>
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-semibold text-text-primary">{title}</h2>
        {link ? (
          <Link href={link.href} className={`ms-auto shrink-0 rounded-sm text-body-sm font-medium text-brand-indigo-600 hover:underline ${FOCUS_RING}`}>
            {link.labelShort ? <><span className="lg:hidden">{link.labelShort}</span><span className="max-lg:hidden">{link.label}</span></> : link.label}
          </Link>
        ) : aside ? (
          <span className="ms-auto shrink-0 text-body-sm font-medium text-brand-indigo-600">{aside}</span>
        ) : null}
      </div>
      {children}
    </section>
  )
}

/** The frame's 12 Medium uppercase muted section caption (« SANTÉ DU MARCHÉ · 7 DERNIERS JOURS »). */
export function Overline({ children }: { children: ReactNode }) {
  return <p className="text-caption font-medium uppercase tracking-[0.06em] text-text-muted">{children}</p>
}

/** A panel's honest empty / failed body. */
export function PanelNote({ lang, failed, emptyKey }: { lang: Lang; failed: boolean; emptyKey: string }) {
  if (failed) return <ErrorState lang={lang} />
  return <p className="py-4 text-center text-body-sm text-text-muted">{t(emptyKey, lang)}</p>
}

// Order lifecycle → the locked StatusPill vocabulary (the seller dashboard's mapping, plus the two terminal states).
const ORDER_PILL: Record<OrderStatus, StatusValue> = {
  pending: 'pending',
  accepted: 'acceptee',
  prepared: 'préparée',
  dispatched: 'expediee',
  in_delivery: 'in-transit',
  arrived: 'arrivee',
  received: 'reçue',
  cancelled: 'annulée',
}

export function OrderStatusPill({ status, type, lang }: { status: string; type: string; lang: Lang }) {
  const s = (status in ORDER_PILL ? status : 'pending') as OrderStatus
  const kind: OrderType = type === 'service' ? 'service' : 'product'
  return <StatusPill status={ORDER_PILL[s]}>{t(statusLabelKey(s, kind), lang)}</StatusPill>
}
