import { redirect } from 'next/navigation'
import { getLang } from '@/lib/i18n/server'
import { t } from '@/lib/i18n'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth/require-admin'
import { reportQueryError } from '@/lib/supabase/query-error'
import { GOVERNORATES } from '@/lib/tunisia-governorates'
import type { AdminTab } from '@/components/AdminTabs'
import { ALL_TIME, type AdminOrderRow } from '../_lib/format'
import { buildOrderRows } from './_lib/rows'
import {
  ORDER_PERIODS,
  ORDER_SORTS,
  ORDER_TABS,
  ORDER_TYPES,
  daysArg,
  pageOffset,
  parseOne,
  searchArg,
  tabCount,
  type OrderTab,
} from './_lib/orders'
import { OrdersListView, type OrderSelect } from './_components/OrdersListView'

// J9 « Commandes » (Figma NOV 4 — Admin) on admin_list_orders + admin_count_orders (migration 20261106093535,
// docs/discovery/admin-dashboard-stats.md): one shared filter in the database, so the tab badges and the rows can
// never disagree. Paged in the database (10 per page). Search: the #ref, the article, the buyer or the seller name.
// City (D3) matches the buyer's or the seller's. « Depuis » is the time in the current status (D7); a blocked order
// (pending > 48 h, or « Arrivée » > 7 days) shows it in red. Amounts are declared, cash on delivery (D1); an order
// before the price snapshot has none (D10, « — »). The RPCs return no delivery field, phone or e-mail.

const ROUTE = '/admin/commandes'
const PER_PAGE = 10
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)

export default async function AdminOrdersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdmin(ROUTE)
  const sp = await searchParams
  const lang = await getLang()
  const supabase = await createClient()
  // eslint-disable-next-line react-hooks/purity -- request-time evaluation in an async Server Component (rendered once per request).
  const now = Date.now()

  const tab: OrderTab = parseOne(one(sp.onglet), ORDER_TABS, 'all')
  const type = parseOne(one(sp.type), ORDER_TYPES, 'all')
  const city = parseOne(one(sp.ville), GOVERNORATES.map((g) => g.value), '')
  const period = parseOne(one(sp.periode), ORDER_PERIODS, '30')
  const sort = parseOne(one(sp.tri), ORDER_SORTS, 'newest')
  const q = (one(sp.q) ?? '').slice(0, 80)
  const pageParam = Math.max(1, Math.floor(Number(one(sp.page) ?? '1')) || 1)

  const filters = {
    p_search: searchArg(q),
    p_type: type === 'all' ? undefined : type,
    p_city: city || undefined,
    p_days: daysArg(period) ?? ALL_TIME,
  }
  const [countRes, listRes] = await Promise.all([
    supabase.rpc('admin_count_orders', filters),
    supabase.rpc('admin_list_orders', { ...filters, p_tab: tab, p_sort: sort, p_limit: PER_PAGE, p_offset: pageOffset(pageParam, PER_PAGE) }),
  ])
  if (countRes.error) reportQueryError('admin/commandes admin_count_orders', countRes.error)
  if (listRes.error) reportQueryError('admin/commandes admin_list_orders', listRes.error)
  const counts = countRes.data?.[0] ?? null
  const list = (listRes.data ?? []) as AdminOrderRow[]
  const total = list[0]?.total_count ?? (counts ? tabCount(counts, tab) : 0)

  const current: Record<string, string | null> = {
    onglet: tab === 'all' ? null : tab,
    q: q || null,
    type: type === 'all' ? null : type,
    ville: city || null,
    periode: period === '30' ? null : period,
    tri: sort === 'newest' ? null : sort,
  }
  const hrefFor = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams()
    for (const [k, v] of Object.entries({ ...current, ...patch })) if (v) next.set(k, v)
    const qs = next.toString()
    return qs ? `${ROUTE}?${qs}` : ROUTE
  }

  const tabs: AdminTab[] = ORDER_TABS.map((key) => ({
    key,
    label: t(`admin.orders.tab_${key}`, lang),
    href: hrefFor({ onglet: key === 'all' ? null : key }),
    active: key === tab,
    count: counts ? tabCount(counts, key) : undefined,
  }))

  const selects: OrderSelect[] = [
    {
      value: type,
      label: t('admin.orders.filter_type_aria', lang),
      options: ORDER_TYPES.map((v) => ({ value: v, label: t(`admin.orders.type_${v}`, lang), href: hrefFor({ type: v === 'all' ? null : v }) })),
    },
    {
      value: city || 'all',
      label: t('admin.orders.filter_city_aria', lang),
      options: [
        { value: 'all', label: t('admin.orders.city_all', lang), href: hrefFor({ ville: null }) },
        ...GOVERNORATES.map((g) => ({ value: g.value, label: lang === 'ar' ? g.ar : g.fr, href: hrefFor({ ville: g.value }) })),
      ],
    },
    {
      value: period,
      label: t('admin.orders.filter_period_aria', lang),
      options: ORDER_PERIODS.map((v) => ({ value: v, label: t(`admin.orders.period_${v}`, lang), href: hrefFor({ periode: v === '30' ? null : v }) })),
    },
    {
      value: sort,
      label: t('admin.orders.filter_sort_aria', lang),
      options: ORDER_SORTS.map((v) => ({ value: v, label: t(`admin.orders.sort_${v}`, lang), href: hrefFor({ tri: v === 'newest' ? null : v }) })),
    },
  ]

  const rows = buildOrderRows(list, now, lang)

  const filtered = Boolean(q || type !== 'all' || city || period !== '30')
  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE))
  // A page past the end (an old link, a shrunk result) lands on the last page, never on an empty dead end.
  if (!listRes.error && list.length === 0 && pageParam > totalPages && total > 0) redirect(hrefFor({ page: String(totalPages) }))

  return (
    <OrdersListView
      lang={lang}
      tabs={tabs}
      q={q}
      selects={selects}
      rows={rows}
      failed={Boolean(listRes.error)}
      emptyKey={filtered || tab !== 'all' ? 'admin.orders.empty_filtered' : 'admin.orders.empty'}
      blocked={counts && tab !== 'blocked' ? { count: counts.blocked, href: hrefFor({ onglet: 'blocked', page: null }) } : null}
      pagination={{ page: Math.min(pageParam, totalPages), totalPages, totalItems: total, perPage: PER_PAGE }}
      basePath={ROUTE}
    />
  )
}
