import { getLang } from '@/lib/i18n/server'
import { t, tn, type Lang } from '@/lib/i18n'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth/require-admin'
import { reportQueryError } from '@/lib/supabase/query-error'
import { getInitials } from '@/components/ui/initials'
import type { StatusValue } from '@/components/ui/status-pill'
import type { AdminTab } from '@/components/AdminTabs'
import { accountRoleI18nKey, accountRoles, type AccountRole } from '@/lib/roles'
import {
  JOINED_WINDOWS,
  USER_SORTS,
  USER_TABS,
  cityOptions,
  filterUsers,
  inTab,
  paginate,
  parseOne,
  parseUserTab,
  sortUsers,
  userStatus,
  type UserTab,
} from './_lib/users'
import { UsersListView, type UserListRow, type UsersSelect } from './_components/UsersListView'

// NOTE: reads the RAW profiles table (not public_profiles) — the admin needs email, phone (search only, never
// rendered here) and the suspended state, which public_profiles strips. This is allowed only by the admin-gated
// "Admin reads all profiles" SELECT policy added in migration 23.
type ProfileRow = {
  id: string
  full_name: string | null
  email: string | null
  phone: string | null
  seller_type: string | null
  is_admin: boolean
  city: string | null
  created_at: string
  suspended_at: string | null
}
type ShopRow = { id: string; name: string; owner_id: string }

const ROUTE = '/admin/utilisateurs'
const PER_PAGE = 10
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)

// Role pill tones as drawn (J2): Freelance / Boutique blue, Acheteur warning; Administrateur gets the accent.
const ROLE_PILL: Record<AccountRole, StatusValue> = {
  admin: 'completed',
  shop_owner: 'arrivee',
  freelancer: 'acceptee',
  consumer: 'pending',
}

function shortDate(iso: string, lang: Lang): string {
  return new Date(iso).toLocaleDateString(lang === 'ar' ? 'ar-TN' : 'fr-TN', { day: 'numeric', month: 'short' })
}

const TAB_LABEL: Record<(typeof USER_TABS)[number], string> = {
  all: 'admin.users.filter_all',
  consumer: 'admin.users.tab.consumer',
  freelancer: 'admin.users.tab.freelancer',
  shop_owner: 'admin.users.tab.shop_owner',
  suspended: 'admin.users.tab.suspended',
}

// Every role an account holds is a pill (an admin who owns a shop shows « Administrateur » AND « Boutique »), the
// shop name links to its public page, and ?role= filters the list (lib/roles.ts accountRoles / parseAccountRole).
export default async function UsersListPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  await requireAdmin(ROUTE)
  const sp = await searchParams
  const lang = await getLang()
  const supabase = await createClient()

  const tab: UserTab = parseUserTab(sp.role)
  const q = (one(sp.q) ?? '').slice(0, 100)
  const joined = parseOne(one(sp.inscription), JOINED_WINDOWS, 'all')
  const sort = parseOne(one(sp.tri), USER_SORTS, 'recent')
  const pageParam = Number(one(sp.page) ?? '1')

  // Shops are read on their own (not embedded): admins read every shop, hidden or not, through the shops SELECT
  // policy's is_admin() branch; the columns named here are in the shops column-level SELECT grant. Pending
  // deletion requests are read through their is_admin() SELECT policy.
  const [{ data: profiles, error }, { data: shops, error: shopsError }, { data: deletions, error: deletionsError }] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, full_name, email, phone, seller_type, is_admin, city, created_at, suspended_at')
      .order('created_at', { ascending: false }),
    supabase.from('shops').select('id, name, owner_id'),
    supabase.from('deletion_requests').select('user_id').eq('status', 'pending'),
  ])

  // A failed read is an error state, never the « no users » empty list, a silently missing shop or a « Actif »
  // pill on an account whose deletion is pending.
  if (error) reportQueryError('admin/utilisateurs list', error)
  if (shopsError) reportQueryError('admin/utilisateurs shops', shopsError)
  if (deletionsError) reportQueryError('admin/utilisateurs deletion requests', deletionsError)
  const failed = Boolean(error || shopsError || deletionsError)

  const shopByOwner = new Map(((shops as ShopRow[] | null) ?? []).map((s) => [s.owner_id, s]))
  const pendingDeletion = new Set(((deletions as Array<{ user_id: string }> | null) ?? []).map((d) => d.user_id))
  const allRows = ((profiles as ProfileRow[] | null) ?? []).map((u) => ({
    ...u,
    roles: accountRoles(u),
    shop: shopByOwner.get(u.id) ?? null,
    deletionPending: pendingDeletion.has(u.id),
  }))

  const cities = cityOptions(allRows)
  const city = typeof sp.ville === 'string' && cities.includes(sp.ville) ? sp.ville : null
  // eslint-disable-next-line react-hooks/purity -- request-time evaluation in an async Server Component (rendered once per request), the admin/statistiques precedent.
  const now = Date.now()
  const filtered = sortUsers(filterUsers(allRows, { tab, q, city, joined, now }), sort)
  const { items, page, totalPages } = paginate(filtered, pageParam, PER_PAGE)

  // « Activité » = orders the account took part in (as buyer or seller) — read for the visible page only.
  const pageIds = items.map((u) => u.id)
  const orderCount = new Map<string, number>()
  let ordersFailed = false
  if (!failed && pageIds.length > 0) {
    const list = pageIds.join(',')
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('buyer_id, seller_id')
      .or(`buyer_id.in.(${list}),seller_id.in.(${list})`)
    if (ordersError) {
      reportQueryError('admin/utilisateurs order counts', ordersError)
      ordersFailed = true
    }
    for (const o of orders ?? []) {
      for (const id of new Set([o.buyer_id, o.seller_id])) {
        if (pageIds.includes(id)) orderCount.set(id, (orderCount.get(id) ?? 0) + 1)
      }
    }
  }

  const rows: UserListRow[] = items.map((u) => ({
    id: u.id,
    href: `${ROUTE}/${u.id}`,
    name: u.full_name ?? '—',
    initials: getInitials(u.full_name ?? u.email),
    email: u.email,
    roles: u.roles.map((role) => ({ key: role, label: t(accountRoleI18nKey(role), lang), pill: ROLE_PILL[role] })),
    shop: u.shop ? { id: u.shop.id, name: u.shop.name } : null,
    city: u.city,
    joined: shortDate(u.created_at, lang),
    activity: ordersFailed ? null : tn('admin.users.orders_count', lang, orderCount.get(u.id) ?? 0),
    status: userStatus(u),
  }))

  // Query string helpers — every link keeps the other params and drops `page`.
  const current: Record<string, string | null> = {
    role: tab === 'all' ? null : tab,
    q: q || null,
    ville: city,
    inscription: joined === 'all' ? null : joined,
    tri: sort === 'recent' ? null : sort,
  }
  const hrefFor = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams()
    for (const [k, v] of Object.entries({ ...current, ...patch })) if (v) next.set(k, v)
    const qs = next.toString()
    return qs ? `${ROUTE}?${qs}` : ROUTE
  }

  const countFor = (key: UserTab) => allRows.filter((u) => inTab(u, key)).length
  const tabs: AdminTab[] = USER_TABS.map((key) => ({
    key,
    label: t(TAB_LABEL[key], lang),
    href: hrefFor({ role: key === 'all' ? null : key }),
    active: key === tab,
    count: countFor(key),
  }))
  // ?role=admin has no drawn tab; it still filters (built behaviour) and Tous stays unselected.

  const selects: UsersSelect[] = [
    {
      value: city ?? 'all',
      label: t('admin.users.filter_city_aria', lang),
      options: [
        { value: 'all', label: t('admin.users.filter_city_all', lang), href: hrefFor({ ville: null }) },
        ...cities.map((c) => ({ value: c, label: t('admin.users.filter_city_prefix', lang, { city: c }), href: hrefFor({ ville: c }) })),
      ],
    },
    {
      value: joined,
      label: t('admin.users.filter_joined_aria', lang),
      options: JOINED_WINDOWS.map((w) => ({ value: w, label: t(`admin.users.filter_joined_${w}`, lang), href: hrefFor({ inscription: w === 'all' ? null : w }) })),
    },
    {
      value: sort,
      label: t('admin.users.sort_aria', lang),
      options: USER_SORTS.map((s) => ({ value: s, label: t(`admin.users.sort_${s}`, lang), href: hrefFor({ tri: s === 'recent' ? null : s }) })),
    },
  ]

  const subtitle = failed
    ? null
    : [
        tn('admin.users.summary_accounts', lang, allRows.length),
        [
          tn('admin.users.summary_consumers', lang, countFor('consumer')),
          tn('admin.users.summary_freelancers', lang, countFor('freelancer')),
          tn('admin.users.summary_shops', lang, countFor('shop_owner')),
        ].join(lang === 'ar' ? '، ' : ', '),
      ].join(' · ')

  const emptyKey =
    allRows.length === 0 ? 'admin.users.empty' : q || city || joined !== 'all' ? 'admin.users.empty_search' : 'admin.users.empty_filtered'

  return (
    <UsersListView
      lang={lang}
      subtitle={subtitle}
      tabs={tabs}
      q={q}
      selects={selects}
      rows={rows}
      failed={failed}
      emptyKey={emptyKey}
      pagination={{ page, totalPages, totalItems: filtered.length, perPage: PER_PAGE }}
    />
  )
}
