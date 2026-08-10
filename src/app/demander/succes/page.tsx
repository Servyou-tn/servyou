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
import { tndPrice } from '@/components/listings/listing-utils'

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

// ⚑ `valueDir` is OPT-IN per call site, not a blanket rule on the component. A phone number or a
// street address is digits/Latin content that must read as one coherent LTR unit regardless of
// page language (see ProductRecap below — found reversed in AR: "+216 20 123 456" rendered
// "456 123 20 216+", the same class of bug as D1's gallery counter). A timeframe value like
// "3 semaines"/"٣ أسابيع" is genuine Arabic-appropriate prose and must NOT be forced LTR — doing
// that unconditionally inside MetaRow would fix one call site and break another.
function MetaRow({ label, value, valueDir }: { label: string; value: string; valueDir?: 'ltr' }) {
  return (
    <p className="flex flex-wrap items-start gap-1 text-body-sm leading-[21px]">
      <span className="text-text-muted">{label}</span>
      <span dir={valueDir} className="font-medium text-text-primary">
        {value}
      </span>
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

// The product twin of Recap. Ships in the SAME PR as the E1-product form: `getOrderDetail`
// already fully populated the product branch (title/image/category/price, delivery
// name/street/quartier/ville/governorate/phone, frozen unit price + delivery fee) before this
// component existed to read it — shipping E1-product without this meant every real product
// order landed on generic copy that didn't say what was bought.
//
// Price breakdown reuses `demander.summary.*` verbatim — the SAME three rows (Produit ×n /
// Livraison / Total à payer) the buyer already saw on E1 before submitting, computed here from
// the FROZEN values (unitPriceFrozen / deliveryFeeFrozen), never a live re-fetch: a seller
// editing the price five minutes after checkout must not change what this confirmation reports.
function ProductRecap({ order, lang }: { order: OrderDetail; lang: Lang }) {
  const unitPrice = order.unitPriceFrozen ?? order.item.price
  const deliveryFee = order.deliveryFeeFrozen
  const subtotal = unitPrice != null ? unitPrice * order.quantity : null
  const total = subtotal != null && deliveryFee != null ? subtotal + deliveryFee : null

  // Comma-joined for DISPLAY only — this does not need to round-trip, unlike
  // encodeDeliveryAddress/parseDeliveryAddress, which own the STORAGE format.
  const addressParts = [order.deliveryStreet, order.deliveryQuartier, order.deliveryVille, order.deliveryGovernorate].filter(
    (p): p is string => Boolean(p),
  )

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

      {/* ⚑ `dir="ltr"` on every value span below — found reversed in AR verification: "120 TND"
          rendered "TND 120" (a digit run followed by a space then Latin letters swaps order under
          RTL — UAX#9 W7/N-rules; the SAME class of bug as D1's gallery counter, just between a
          number and a currency code instead of between two numbers). `tndPrice()` is locale-blind
          by design (docs/follow-ups.md — "tndPrice is locale-blind, ar.ts carries two currency
          notations") and this confirms that gap is a genuine bidi defect, not only a notation
          choice; not fixed at the source here — that's a cross-cutting change to a function five
          other surfaces call, out of scope for this PR. Fixed locally at every value THIS PR
          renders, same as the counter fix. */}
      {subtotal != null && (
        <div className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-body-sm text-text-secondary">
              {t('demander.summary.product', lang, { n: String(order.quantity) })}
            </span>
            <span dir="ltr" className="text-body-sm font-medium text-text-primary">
              {tndPrice(subtotal)}
            </span>
          </div>
          {deliveryFee != null && (
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-body-sm text-text-secondary">
                {t('demander.summary.delivery', lang)}
              </span>
              <span dir="ltr" className="text-body-sm font-medium text-text-primary">
                {tndPrice(deliveryFee)}
              </span>
            </div>
          )}
          {total != null && (
            <>
              <div className="h-px bg-border-subtle" aria-hidden="true" />
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-base font-semibold text-text-primary">
                  {t('demander.summary.total', lang)}
                </span>
                <span dir="ltr" className="text-base font-semibold text-brand-blue-800">
                  {tndPrice(total)}
                </span>
              </div>
            </>
          )}
        </div>
      )}

      <div className="h-px bg-border-subtle" aria-hidden="true" />

      <div className="flex flex-col gap-2">
        {order.deliveryName && <MetaRow label={t('demander.field.fullName', lang)} value={order.deliveryName} />}
        {/* Address AND phone: also found reversed in AR ("+216 20 123 456" → "456 123 20 216+",
            a leading house number migrating to the end of the joined address) — same fix. The
            governorate segment is always the canonical Latin value regardless of UI language
            (GOVERNORATES[].value, never .ar), so there is always a strong-LTR anchor in the
            address; ville/quartier are free text and COULD be typed in Arabic, but treating the
            whole address as one LTR-flowing structured string (house number leading) is the
            conventional handling for postal data, the same way a phone number is. */}
        {addressParts.length > 0 && (
          <MetaRow label={t('succes.recap.address', lang)} value={addressParts.join(', ')} valueDir="ltr" />
        )}
        {order.deliveryPhone && (
          <MetaRow
            label={t('demander.field.phone', lang)}
            value={formatPhone(order.deliveryPhone)}
            valueDir="ltr"
          />
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
  const service = order?.orderType === 'service' ? order : null
  const product = order?.orderType === 'product' ? order : null

  // Only the PRODUCT branch is order-type-aware — the unresolved/foreign-order case (order ===
  // null) keeps the pre-existing services default. Widening that fallback wasn't what the ruling
  // asked for; it targeted the concrete case of a real product order landing on service copy.
  const marketplaceHref = product ? '/marche/produits' : '/marche/services'
  const breadcrumbLabel = product
    ? t('product.detail.breadcrumb.products', lang)
    : t('serviceDetail.breadcrumb.services', lang)

  return (
    <AppShell user={shell.topBarUser}>
      <div className="flex flex-col gap-6 lg:gap-12">
        <nav aria-label="Fil d'Ariane" className="flex flex-wrap items-center gap-1.5 text-[13px] text-text-muted lg:gap-2">
          <Link href="/" className="hidden hover:text-text-secondary lg:inline">
            {t('serviceDetail.breadcrumb.home', lang)}
          </Link>
          <ChevronRight className="hidden h-3.5 w-3.5 shrink-0 rtl:rotate-180 lg:block" aria-hidden="true" />
          <Link href={marketplaceHref} className="hover:text-text-secondary">
            {breadcrumbLabel}
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
                {product
                  ? t('succes.subtext_product', lang, { shop: product.seller.name })
                  : service && service.deliveryPhone
                    ? t('succes.subtext', lang, {
                        name: service.seller.name,
                        phone: formatPhone(service.deliveryPhone),
                      })
                    : t('succes.subtext_generic', lang)}
              </p>
            </section>

            {service && <Recap order={service} lang={lang} />}
            {product && <ProductRecap order={product} lang={lang} />}

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
                      {product ? t(`succes.steps.product.${n}`, lang) : t(`succes.steps.${n}`, lang)}
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
                href={marketplaceHref}
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
