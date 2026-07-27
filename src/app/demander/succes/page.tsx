import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ChevronRight, CircleCheckBig } from 'lucide-react'
import { AppShell } from '@/components/shell/AppShell'
import { Avatar } from '@/components/ui/avatar'
import { getInitials } from '@/components/ui/initials'
import { FOCUS_RING } from '@/components/layout/styles'
import { getShellUser } from '@/lib/marche/shell-user'
import { getOrderDetail, type OrderDetail } from '@/lib/marche/order-detail'
import { getLang } from '@/lib/i18n/server'
import { t, type Lang } from '@/lib/i18n'

// E2 — « Demande envoyée ». Measured against Figma 690:56989 (1440) and 691:57255 (375).
//
// Route shape is a QUERY param, not a path segment: /demander/succes?order=<uuid>. A bare
// /demander/succes therefore degrades to a generic confirmation instead of 404-ing, and the
// static `succes` segment wins over the sibling `[id]` route for this exact path.
//
// The récap is gated on ownership, not on the id being well-formed: getOrderDetail re-checks
// buyer_id === auth.uid() and returns null otherwise, so someone else's order id in the URL
// renders the generic confirmation — never a stranger's brief, price and phone number.
//
// Layout: a centered 640 column (gap 24) under a full-width breadcrumb, content gap 48.

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLang()
  return { title: `${t('succes.pageTitle', lang)} — Servyou` }
}

type Props = { searchParams: Promise<{ order?: string }> }

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <section
      className={`flex flex-col gap-4 rounded-card border border-border-subtle bg-surface-base p-6 ${className ?? ''}`}
    >
      {children}
    </section>
  )
}

// Stored canonically (+216XXXXXXXX); 690:57165 reads it back as "+216 55 123 456". Anything that
// is not the canonical shape is shown untouched rather than mangled.
function formatPhone(raw: string): string {
  const m = /^\+216(\d{2})(\d{3})(\d{3})$/.exec(raw)
  return m ? `+216 ${m[1]} ${m[2]} ${m[3]}` : raw
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <p className="flex flex-wrap items-start gap-1 text-body-sm leading-[21px]">
      <span className="text-text-muted">{label}</span>
      <span className="font-medium text-text-primary">{value}</span>
    </p>
  )
}

// The buyer's own recap — description plus whichever optional fields they filled. Both meta rows
// are conditional: they are unfolded from buyer_note and are null when the buyer skipped them.
function Recap({ order, lang }: { order: OrderDetail; lang: Lang }) {
  const price = order.item.price != null ? `${order.item.price.toLocaleString('fr-FR')} TND` : null

  return (
    <Card>
      <h2 className="text-[15px] font-semibold leading-5 text-text-primary">
        {t('demander.recap.title', lang)}
      </h2>

      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-2">
          {order.item.title && (
            <p className="text-[15px] font-semibold leading-[22px] text-brand-blue-800">
              {order.item.title}
            </p>
          )}
          {order.item.category && (
            <ul className="flex flex-wrap gap-2">
              <li className="rounded-md bg-brand-blue-50 px-2 py-1 text-caption font-medium text-brand-blue-700">
                {order.item.category}
              </li>
            </ul>
          )}
        </div>
        {price && (
          <div className="flex shrink-0 flex-col items-end gap-1">
            <p className="text-caption leading-4 text-text-muted">{t('serviceDetail.priceFrom', lang)}</p>
            <p className="text-[15px] font-semibold leading-[22px] text-brand-blue-800">{price}</p>
          </div>
        )}
      </div>

      <div className="h-px bg-border-subtle" aria-hidden="true" />

      <div className="flex items-center gap-3">
        <Avatar size="md" initials={getInitials(order.seller.name)} />
        <div className="flex min-w-0 flex-col gap-0.5">
          <p className="truncate text-body-sm font-semibold leading-5 text-text-primary">
            {order.seller.name}
          </p>
          {order.seller.city && (
            <p className="text-[13px] leading-[18px] text-text-muted">{order.seller.city}</p>
          )}
        </div>
      </div>

      <div className="h-px bg-border-subtle" aria-hidden="true" />

      <div className="flex flex-col gap-2">
        {order.serviceDescription && (
          <p className="whitespace-pre-line text-body-sm leading-[21px] text-text-secondary">
            {order.serviceDescription}
          </p>
        )}
        {order.serviceTimeframe && (
          <MetaRow label={t('demander.recap.delai', lang)} value={order.serviceTimeframe} />
        )}
        {order.serviceBudget && (
          <MetaRow label={t('demander.recap.budget', lang)} value={`${order.serviceBudget} TND`} />
        )}
      </div>
    </Card>
  )
}

export default async function DemandeSuccesPage({ searchParams }: Props) {
  const shell = await getShellUser()
  if (!shell) redirect('/connexion')

  const [{ order: orderId }, lang] = await Promise.all([searchParams, getLang()])
  const order = orderId ? await getOrderDetail(orderId, shell.id) : null
  // Product orders reach their own confirmation once the product form ships; here they fall back
  // to the generic copy rather than borrowing a service recap.
  const service = order?.orderType === 'service' ? order : null

  return (
    <AppShell user={shell.topBarUser}>
      <div className="flex flex-col gap-6 lg:gap-12">
        <nav aria-label="Fil d'Ariane" className="flex flex-wrap items-center gap-1.5 text-[13px] text-text-muted lg:gap-2">
          <Link href="/" className="hidden hover:text-text-secondary lg:inline">
            {t('serviceDetail.breadcrumb.home', lang)}
          </Link>
          <ChevronRight className="hidden h-3.5 w-3.5 shrink-0 rtl:rotate-180 lg:block" aria-hidden="true" />
          <Link href="/marche/services" className="hover:text-text-secondary">
            {t('serviceDetail.breadcrumb.services', lang)}
          </Link>
          <ChevronRight className="h-3 w-3 shrink-0 rtl:rotate-180 lg:h-3.5 lg:w-3.5" aria-hidden="true" />
          <span className="text-text-secondary">{t('succes.breadcrumb', lang)}</span>
        </nav>

        <div className="flex justify-center">
          <div className="flex w-full max-w-160 flex-col gap-6">
            {/* successCard — 2px success/500 outline, centered, 64 check. */}
            <section className="flex flex-col items-center gap-6 rounded-card border-2 border-success-500 bg-surface-base p-8">
              <CircleCheckBig className="h-16 w-16 shrink-0 text-success-500" aria-hidden="true" />
              <h1 className="text-center text-2xl font-semibold leading-[30px] text-brand-blue-800">
                {t('succes.title', lang)}
              </h1>
              <p className="text-center text-[15px] leading-6 text-text-muted">
                {service && service.deliveryPhone
                  ? t('succes.subtext', lang, {
                      name: service.seller.name,
                      phone: formatPhone(service.deliveryPhone),
                    })
                  : t('succes.subtext_generic', lang)}
              </p>
            </section>

            {service && <Recap order={service} lang={lang} />}

            <Card>
              <h2 className="text-[15px] font-semibold leading-5 text-text-primary">
                {t('succes.steps.title', lang)}
              </h2>
              <ol className="flex flex-col gap-4">
                {(['1', '2', '3'] as const).map((n) => (
                  <li key={n} className="flex items-center gap-3">
                    <span
                      aria-hidden="true"
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-pill bg-brand-blue-50 text-body-sm font-semibold text-brand-blue-700"
                    >
                      {n}
                    </span>
                    <span className="text-body-sm leading-[21px] text-text-secondary">
                      {t(`succes.steps.${n}`, lang)}
                    </span>
                  </li>
                ))}
              </ol>
            </Card>

            {/* Desktop: centered pair. Mobile 691:57332: stacked full-width, primary first. */}
            <div className="flex flex-col gap-3 lg:flex-row lg:justify-center lg:gap-4">
              <Link
                href="/mes-commandes"
                className={`inline-flex h-12 items-center justify-center rounded-lg bg-brand-blue-600 px-5 text-base font-semibold text-text-inverse transition-colors hover:bg-brand-blue-700 ${FOCUS_RING}`}
              >
                {t('succes.cta.orders', lang)}
              </Link>
              <Link
                href="/marche/services"
                className={`inline-flex h-12 items-center justify-center rounded-lg border border-border-strong bg-surface-base px-5 text-base font-semibold text-text-primary transition-colors hover:bg-surface-subtle ${FOCUS_RING}`}
              >
                {t('succes.cta.marketplace', lang)}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
