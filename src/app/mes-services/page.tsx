import type { Metadata } from 'next'
import Link from 'next/link'
import { Plus, Wrench } from 'lucide-react'
import { AppShell } from '@/components/shell/AppShell'
import { Pagination } from '@/components/shared/Pagination'
import { requireFreelancer } from '@/lib/auth/require-seller'
import {
  SERVICE_TABS,
  SERVICES_PER_PAGE,
  DEFAULT_SERVICE_TAB,
  SERVICE_SORTS,
  DEFAULT_SERVICE_SORT,
  type ServiceTab,
  type ServiceSort,
} from '@/lib/marche/seller-services'
import { getSellerServices } from '@/lib/marche/seller-services-query'
import { getLang } from '@/lib/i18n/server'
import { t } from '@/lib/i18n'
import { FOCUS_RING } from '@/components/layout/styles'
import { cn } from '@/lib/utils'
import { StatTile } from './_components/StatTile'
import { ServiceFiltersBar } from './_components/ServiceFiltersBar'
import { ServicesList } from './_components/ServicesList'

export const metadata: Metadata = { title: 'Mes services — Servyou' }

const ROUTE = '/mes-services'

// H5 « Mes services » — Figma 242:7941. Full reasoning: the H5 discovery pass this PR ships
// against, plus the founder's 9 rulings on top of it (PR body). Structure mirrors G5 (/mes-produits)
// at the page-assembly level (status tabs, URL-driven, shared Pagination) but the TABLE itself is a
// real deviation, not a reuse — see ServicesList.tsx / ServiceRow.tsx.

function parseTab(v: string | undefined): ServiceTab {
  return (SERVICE_TABS as readonly string[]).includes(v ?? '') ? (v as ServiceTab) : DEFAULT_SERVICE_TAB
}

function parseSort(v: string | undefined): ServiceSort {
  return (SERVICE_SORTS as readonly string[]).includes(v ?? '') ? (v as ServiceSort) : DEFAULT_SERVICE_SORT
}

function first(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v
}

export default async function MesServicesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const lang = await getLang()
  const { topBarUser, userId, freelancerProfile } = await requireFreelancer(ROUTE)

  if (!freelancerProfile) {
    // A freelancer (seller_type='freelancer') who never finished H2 step 1 — same state, same
    // strings as H4's own dashboard (tableau-de-bord/page.tsx's `!freelancerProfile` branch).
    return (
      <AppShell user={topBarUser}>
        <div className="flex flex-col gap-6">
          <Header lang={lang} />
          <div className="flex flex-col gap-2 rounded-2xl border border-border-subtle bg-surface-base p-6">
            <p className="text-body font-semibold text-text-primary">
              {t('freelance.dashboard.noProfile.title', lang)}
            </p>
            <p className="text-body-sm text-text-secondary">{t('freelance.dashboard.noProfile.body', lang)}</p>
            <Link
              href="/mon-profil-freelance/creer"
              className={cn(
                'mt-2 inline-flex h-10 w-fit items-center justify-center rounded-lg bg-brand-blue-600 px-4 text-base font-semibold text-text-inverse hover:bg-brand-blue-700',
                FOCUS_RING,
              )}
            >
              {t('freelance.dashboard.noProfile.cta', lang)}
            </Link>
          </div>
        </div>
      </AppShell>
    )
  }

  const tab = parseTab(first(sp.statut))
  const sort = parseSort(first(sp.tri))
  const q = first(sp.q) ?? ''
  const page = Math.max(1, Number(first(sp.page) ?? '1') || 1)
  const data = await getSellerServices(freelancerProfile.id, userId, { tab, page, q, sort })

  return (
    <AppShell user={topBarUser}>
      <div className="flex flex-col gap-6">
        <Header lang={lang} />

        <div className="flex flex-wrap gap-4">
          <StatTile
            label={t('service.stats.active_label', lang)}
            value={String(data.stats.activeCount)}
            subtitle={t('service.stats.active_subtitle', lang, { total: data.stats.totalCount })}
          />
          <StatTile
            label={t('service.stats.pending_label', lang)}
            value={String(data.stats.pendingOrders)}
            subtitle={t('service.stats.pending_subtitle', lang)}
          />
          <StatTile
            label={t('service.stats.received_label', lang)}
            value={String(data.stats.receivedOrders)}
            subtitle={t('service.stats.received_subtitle', lang)}
          />
          <StatTile
            label={t('service.stats.month_label', lang)}
            value={String(data.stats.thisMonthOrders)}
            delta={{
              direction: data.stats.monthDelta > 0 ? 'up' : data.stats.monthDelta < 0 ? 'down' : 'flat',
              text: t(
                data.stats.monthDelta > 0
                  ? 'service.stats.delta_up'
                  : data.stats.monthDelta < 0
                    ? 'service.stats.delta_down'
                    : 'service.stats.delta_flat',
                lang,
                { n: Math.abs(data.stats.monthDelta) },
              ),
              caption: t('service.stats.month_subtitle', lang),
            }}
          />
        </div>

        {data.counts.all === 0 ? (
          <div className="flex flex-col items-center gap-5 rounded-2xl border border-border-subtle bg-surface-base px-10 py-12 text-center">
            <span className="flex h-28 w-28 items-center justify-center rounded-full bg-surface-pill">
              <Wrench className="h-16 w-16 text-icon-muted" aria-hidden="true" />
            </span>
            <p className="text-h3 text-text-primary">{t('service.empty', lang)}</p>
            {/* INERT — H6 never shipped in code (/mes-services has no /creer subroute), same
                treatment as the header's own "+ Créer un service" below. */}
            <span
              aria-disabled="true"
              title={t('marche.sidebar.coming_soon', lang)}
              className="inline-flex h-10 w-fit cursor-not-allowed items-center justify-center rounded-lg bg-brand-blue-600/40 px-4 text-body font-semibold text-text-inverse opacity-70"
            >
              {t('service.empty_cta', lang)}
            </span>
          </div>
        ) : (
          <>
            <ServiceFiltersBar tab={tab} q={q} sort={sort} counts={data.counts} lang={lang} />

            {data.services.length === 0 ? (
              <p className="rounded-2xl border border-border-subtle bg-surface-base px-6 py-10 text-center text-body text-text-secondary">
                {t('service.tab_empty', lang)}
              </p>
            ) : (
              <ServicesList services={data.services} lang={lang} />
            )}

            <Pagination
              page={data.page}
              totalPages={data.totalPages}
              basePath={ROUTE}
              totalItems={data.totalCount}
              perPage={SERVICES_PER_PAGE}
            />
          </>
        )}
      </div>
    </AppShell>
  )
}

function Header({ lang }: { lang: Awaited<ReturnType<typeof getLang>> }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-h1 text-text-primary">{t('service.list_title', lang)}</h1>
        <p className="text-body-sm text-text-secondary">{t('service.list_subtitle', lang)}</p>
      </div>
      {/* INERT — H6 never shipped in code (no /mes-services/creer route). A real Link here would
          404; flip to one the moment that route lands, same rule H4's own header CTA documents. */}
      <button
        type="button"
        disabled
        aria-disabled="true"
        title={t('marche.sidebar.coming_soon', lang)}
        className="inline-flex h-10 w-fit shrink-0 cursor-not-allowed items-center justify-center gap-2 rounded-lg bg-brand-blue-600/40 px-4 text-base font-semibold text-text-inverse opacity-70"
      >
        <Plus className="h-4 w-4 shrink-0" aria-hidden="true" />
        {t('service.add_btn', lang)}
      </button>
    </div>
  )
}
