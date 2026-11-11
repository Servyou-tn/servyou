import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ChevronLeft, ChevronRight, CircleCheckBig } from 'lucide-react'
import { AppShell } from '@/components/shell/AppShell'
import { Avatar } from '@/components/ui/avatar'
import { getInitials } from '@/components/ui/initials'
import { FOCUS_RING } from '@/components/layout/styles'
import { getShellUser } from '@/lib/marche/shell-user'
import { getOrderDetail, type OrderDetail } from '@/lib/marche/order-detail'
import { settle } from '@/lib/supabase/query-error'
import { getLang } from '@/lib/i18n/server'
import { t, type Lang } from '@/lib/i18n'
import { tndCurrency, tndPrice, tndPriceGrouped } from '@/components/listings/listing-utils'
import { formatPhoneDisplay } from '@/lib/phone'

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
//
// 375 re-measured against m375-e2-envoyee (docs/design/m375-e1-e2-deltas.md): « ‹ Services › Confirmation » on a 16 line; Figma's
// strokes sit INSIDE its boxes, so below lg the CSS border takes its width out of the padding (success card 30, cards 23).

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLang()
  return { title: `${t('succes.pageTitle', lang)} — Servyou` }
}

type Props = { searchParams: Promise<{ order?: string }> }

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <section
      className={`flex flex-col gap-4 rounded-card border border-border-subtle bg-surface-base p-6 max-lg:p-[23px] ${className ?? ''}`}
    >
      {children}
    </section>
  )
}

// Arabic only: a value dropped into a translated sentence is isolated so it cannot reorder with the Arabic around it (walk #26 / E2 Q1:
// the phone read « .456 123 55 216+ »). LRI…PDI forces a phone left-to-right; FSI…PDI lets a name take its own direction. FR text is
// returned untouched.
const isolateLtr = (value: string, lang: Lang) => (lang === 'ar' ? `\u2066${value}\u2069` : value)
const isolateAuto = (value: string, lang: Lang) => (lang === 'ar' ? `\u2068${value}\u2069` : value)
const categoryName = (order: OrderDetail, lang: Lang) =>
  lang === 'ar' && order.item.categoryAr ? order.item.categoryAr : lang === 'en' && order.item.categoryEn ? order.item.categoryEn : order.item.category

// ⚑ `valueDir` is OPT-IN per call site, not a blanket rule on the component. A phone number or a
// street address is digits/Latin content that must read as one coherent LTR unit regardless of
// page language (see ProductRecap below — found reversed in AR: "+216 20 123 456" rendered
// "456 123 20 216+", the same class of bug as D1's gallery counter). A timeframe value like
// "3 semaines"/"٣ أسابيع" is genuine Arabic-appropriate prose and must NOT be forced LTR — doing
// that unconditionally inside MetaRow would fix one call site and break another.
function MetaRow({ label, value, valueDir }: { label: string; value: string; valueDir?: 'ltr' | 'auto' }) {
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
  const price = order.item.price != null ? tndPriceGrouped(order.item.price, lang) : null

  return (
    <Card>
      <h2 className="text-[15px] font-semibold leading-5 text-text-primary">
        {t('demander.recap.title', lang)}
      </h2>

      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-2">
          {order.item.title && (
            <p className="text-[15px] font-semibold leading-[22px] text-brand-blue-800">
              <bdi>{order.item.title}</bdi>
            </p>
          )}
          {order.item.category && (
            <ul className="flex flex-wrap gap-2">
              <li className="rounded-md bg-brand-blue-50 px-2 py-1 text-caption font-medium text-brand-blue-700">
                {categoryName(order, lang)}
              </li>
            </ul>
          )}
        </div>
        {price && (
          <div className="flex shrink-0 flex-col items-end gap-1">
            <p className="text-caption leading-4 text-text-muted">{t('serviceDetail.priceFrom', lang)}</p>
            <p className="text-[15px] font-semibold leading-[22px] text-brand-blue-800">
              <bdi>{price}</bdi>
            </p>
          </div>
        )}
      </div>

      <div className="h-px bg-border-subtle" aria-hidden="true" />

      <div className="flex items-center gap-3">
        <Avatar size="md" initials={getInitials(order.seller.name)} />
        <div className="flex min-w-0 flex-col gap-0.5">
          <p className="truncate text-body-sm font-semibold leading-5 text-text-primary">
            <bdi>{order.seller.name}</bdi>
          </p>
          {order.seller.city && (
            <p className="text-[13px] leading-[18px] text-text-muted">{order.seller.city}</p>
          )}
        </div>
      </div>

      <div className="h-px bg-border-subtle" aria-hidden="true" />

      <div className="flex flex-col gap-2">
        {order.serviceDescription && (
          <p dir="auto" className="whitespace-pre-line text-body-sm leading-[21px] text-text-secondary">
            {order.serviceDescription}
          </p>
        )}
        {order.serviceTimeframe && (
          <MetaRow label={t('demander.recap.delai', lang)} value={order.serviceTimeframe} valueDir="auto" />
        )}
        {order.serviceBudget && (
          <MetaRow label={t('demander.recap.budget', lang)} value={`${order.serviceBudget} ${tndCurrency(lang)}`} valueDir="auto" />
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
              <bdi>{order.item.title}</bdi>
            </p>
          )}
          {order.item.category && (
            <ul className="flex flex-wrap gap-2">
              <li className="rounded-md bg-brand-blue-50 px-2 py-1 text-caption font-medium text-brand-blue-700">
                {categoryName(order, lang)}
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
            <bdi>{order.seller.name}</bdi>
          </p>
          {order.seller.city && (
            <p className="text-[13px] leading-[18px] text-text-muted">{order.seller.city}</p>
          )}
        </div>
      </div>

      <div className="h-px bg-border-subtle" aria-hidden="true" />

      {/* Prices: tndPrice(value, lang) inside a <bdi> (walk #25) — « 120 TND » LTR in FR, « 120 د.ت » RTL in AR (the seller dashboard's
          notation and reading order), isolated so the digits never swap with the label beside them. */}
      {subtotal != null && (
        <div className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-body-sm text-text-secondary">
              {t('demander.summary.product', lang, { n: String(order.quantity) })}
            </span>
            <bdi className="text-body-sm font-medium text-text-primary">{tndPrice(subtotal, lang)}</bdi>
          </div>
          {deliveryFee != null && (
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-body-sm text-text-secondary">
                {t('demander.summary.delivery', lang)}
              </span>
              <bdi className="text-body-sm font-medium text-text-primary">{tndPrice(deliveryFee, lang)}</bdi>
            </div>
          )}
          {total != null && (
            <>
              <div className="h-px bg-border-subtle" aria-hidden="true" />
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-base font-semibold text-text-primary">
                  {t('demander.summary.total', lang)}
                </span>
                <bdi className="text-base font-semibold text-brand-blue-800">{tndPrice(total, lang)}</bdi>
              </div>
            </>
          )}
        </div>
      )}

      <div className="h-px bg-border-subtle" aria-hidden="true" />

      <div className="flex flex-col gap-2">
        {order.deliveryName && <MetaRow label={t('demander.field.fullName', lang)} value={order.deliveryName} valueDir="auto" />}
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
            value={formatPhoneDisplay(order.deliveryPhone)}
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
  // The order is already COMMITTED when the buyer lands here, so a failed récap read must not become a 500
  // (they may order again): it is reported and the generic confirmation is shown — the one caller for
  // which « null on a failed read » is the deliberate safety net.
  const loaded = orderId ? await settle('demander/succes order', getOrderDetail(orderId, shell.id)) : null
  const order = loaded?.ok ? loaded.data : null
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
        <nav aria-label="Fil d'Ariane" className="flex flex-wrap items-center gap-1.5 text-[13px] text-text-muted max-lg:leading-4 lg:gap-2">
          <Link href="/" className="hidden hover:text-text-secondary lg:inline">
            {t('serviceDetail.breadcrumb.home', lang)}
          </Link>
          <ChevronRight className="hidden h-3.5 w-3.5 shrink-0 rtl:rotate-180 lg:block" aria-hidden="true" />
          {/* max-lg py / -my 3.5: a 44 px tap target around the 16 px crumb (≥ 44 on mobile) without moving the layout. */}
          <Link href={marketplaceHref} className="inline-flex items-center gap-1.5 hover:text-text-secondary max-lg:-my-3.5 max-lg:py-3.5 lg:gap-0">
            <ChevronLeft className="size-4 shrink-0 rtl:rotate-180 lg:hidden" aria-hidden="true" />
            {breadcrumbLabel}
          </Link>
          <ChevronRight className="h-3 w-3 shrink-0 rtl:rotate-180 lg:h-3.5 lg:w-3.5" aria-hidden="true" />
          <span className="text-text-secondary">{t('succes.breadcrumb', lang)}</span>
        </nav>

        <div className="flex justify-center">
          <div className="flex w-full max-w-160 flex-col gap-6">
            {/* successCard — 2px success/500 outline, centered, 64 check. */}
            <section className="flex flex-col items-center gap-6 rounded-card border-2 border-success-500 bg-surface-base p-8 max-lg:p-[30px]">
              <CircleCheckBig className="h-16 w-16 shrink-0 text-success-500" aria-hidden="true" />
              <h1 className="text-center text-2xl font-semibold leading-[30px] text-brand-blue-800">
                {t('succes.title', lang)}
              </h1>
              <p className="text-center text-[15px] leading-6 text-text-muted">
                {product
                  ? t('succes.subtext_product', lang, { shop: isolateAuto(product.seller.name, lang) })
                  : service && service.deliveryPhone
                    ? t('succes.subtext', lang, {
                        name: isolateAuto(service.seller.name, lang),
                        phone: isolateLtr(formatPhoneDisplay(service.deliveryPhone), lang),
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
                href={product ? '/mes-commandes?tab=produits' : '/mes-commandes?tab=services'}
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
