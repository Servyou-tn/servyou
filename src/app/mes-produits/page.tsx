import type { Metadata } from 'next'
import Link from 'next/link'
import { Package } from 'lucide-react'
import { AppShell } from '@/components/shell/AppShell'
import { Pagination } from '@/components/shared/Pagination'
import { requireShopOwner } from '@/lib/auth/require-seller'
import {
  PRODUCT_TABS,
  PRODUCTS_PER_PAGE,
  DEFAULT_PRODUCT_TAB,
  type ProductTab,
} from '@/lib/marche/seller-products'
import { getSellerProducts } from '@/lib/marche/seller-products-query'
import { getLang } from '@/lib/i18n/server'
import { t } from '@/lib/i18n'
import { FOCUS_RING } from '@/components/layout/styles'
import { cn } from '@/lib/utils'
import { ProductsList } from './_components/ProductsList'

export const metadata: Metadata = { title: 'Mes produits — Servyou' }

const ROUTE = '/mes-produits'

// G5 « Mes produits » — Figma 522:29106, specimens 523:30264/523:30284/523:30408.
// Full reasoning: docs/design/g5-discovery.md.
//
// Structure mirrors G8 (/commandes-recues): status tabs over the list, URL-driven (`statut` +
// `page`), the shared Pagination component. The two real deltas from G8 are Vendus (a second,
// unfiltered order signal per row — §8.3) and bulk select (§8.5, current-page-only, pre-check and
// report on both risky actions), neither of which G8 needed.

function parseTab(v: string | undefined): ProductTab {
  return (PRODUCT_TABS as readonly string[]).includes(v ?? '') ? (v as ProductTab) : DEFAULT_PRODUCT_TAB
}

function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v
}

export default async function MesProduitsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const lang = await getLang()
  const { topBarUser, shop } = await requireShopOwner(ROUTE)

  if (!shop) {
    // A shop_owner who never completed G2 — same state, same strings as G4's dashboard
    // (seller-dashboard noshop panel): not a crash, not a redirect, the page just says so.
    return (
      <AppShell user={topBarUser}>
        <div className="flex flex-col gap-6">
          <Header lang={lang} />
          <div className="flex flex-col gap-2 rounded-2xl border border-border-subtle bg-surface-base p-6">
            <p className="text-body font-semibold text-text-primary">
              {t('seller.dashboard.noshop.title', lang)}
            </p>
            <p className="text-body-sm text-text-secondary">{t('seller.dashboard.noshop.body', lang)}</p>
          </div>
        </div>
      </AppShell>
    )
  }

  const tab = parseTab(first(sp.statut))
  const page = Math.max(1, Number(first(sp.page) ?? '1') || 1)
  const data = await getSellerProducts(shop.id, { tab, page })

  const hrefFor = (next: { statut?: ProductTab; page?: number }) => {
    const q = new URLSearchParams()
    const s = next.statut ?? tab
    if (s !== DEFAULT_PRODUCT_TAB) q.set('statut', s)
    // Changing tab resets to page 1 — the old page number could be out of range for the new tab.
    const p = next.page ?? 1
    if (p > 1) q.set('page', String(p))
    const qs = q.toString()
    return qs ? `${ROUTE}?${qs}` : ROUTE
  }

  return (
    <AppShell user={topBarUser}>
      <div className="flex flex-col gap-6">
        <Header lang={lang} />

        {data.counts.all === 0 ? (
          <div className="flex flex-col items-center gap-5 rounded-2xl border border-border-subtle bg-surface-base px-10 py-12 text-center">
            <span className="flex h-28 w-28 items-center justify-center rounded-full bg-surface-pill">
              <Package className="h-16 w-16 text-icon-muted" aria-hidden="true" />
            </span>
            <div className="flex flex-col gap-2">
              <p className="text-h3 text-text-primary">{t('product.empty', lang)}</p>
            </div>
            <Link
              href="/mes-produits/ajouter"
              className={cn(
                'inline-flex h-10 items-center rounded-lg bg-brand-blue-600 px-4 text-body font-semibold text-text-inverse hover:bg-brand-blue-700',
                FOCUS_RING,
              )}
            >
              {t('product.empty_cta', lang)}
            </Link>
          </div>
        ) : (
          <>
            {/* Status tabs, URL-driven — same pattern as G8's tablist (commandes-recues/page.tsx). */}
            <div
              role="tablist"
              aria-label={t('product.tabs_aria', lang)}
              className="flex overflow-x-auto border-b border-border-subtle"
            >
              {PRODUCT_TABS.map((key) => {
                const active = key === tab
                return (
                  <Link
                    key={key}
                    href={hrefFor({ statut: key })}
                    role="tab"
                    aria-selected={active}
                    className={cn(
                      'relative flex h-11 shrink-0 items-center justify-center gap-1.5 px-4 text-body whitespace-nowrap transition-colors',
                      active
                        ? 'font-semibold text-brand-blue-600'
                        : 'font-medium text-text-muted hover:text-text-primary',
                      FOCUS_RING,
                    )}
                  >
                    {t(`product.tab.${key}`, lang)}
                    <span dir="ltr" className="text-caption text-text-muted">
                      ({data.counts[key]})
                    </span>
                    {active ? (
                      <span
                        aria-hidden="true"
                        className="absolute inset-x-0 bottom-0 h-0.5 bg-brand-blue-600"
                      />
                    ) : null}
                  </Link>
                )
              })}
            </div>

            {data.products.length === 0 ? (
              <p className="rounded-2xl border border-border-subtle bg-surface-base px-6 py-10 text-center text-body text-text-secondary">
                {t('product.tab_empty', lang)}
              </p>
            ) : (
              <ProductsList products={data.products} lang={lang} />
            )}
          </>
        )}

        <Pagination
          page={data.page}
          totalPages={data.totalPages}
          basePath={ROUTE}
          totalItems={data.totalCount}
          perPage={PRODUCTS_PER_PAGE}
        />
      </div>
    </AppShell>
  )
}

function Header({ lang }: { lang: Awaited<ReturnType<typeof getLang>> }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-h1 text-text-primary">{t('product.list_title', lang)}</h1>
        <p className="text-body-sm text-text-secondary">{t('product.list_subtitle', lang)}</p>
      </div>
      <Link
        href="/mes-produits/ajouter"
        className={cn(
          'inline-flex h-10 items-center rounded-lg bg-brand-blue-600 px-4 text-body font-semibold text-text-inverse hover:bg-brand-blue-700',
          FOCUS_RING,
        )}
      >
        {t('product.add_btn', lang)}
      </Link>
    </div>
  )
}
