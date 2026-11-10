import { getLang } from '@/lib/i18n/server'
import { LOCALES, t, type Lang } from '@/lib/i18n'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth/require-admin'
import { reportQueryError } from '@/lib/supabase/query-error'
import { getInitials } from '@/components/ui/initials'
import { tndPrice } from '@/components/listings/listing-utils'
import type { AdminTab } from '@/components/AdminTabs'
import {
  CONTENT_SORTS,
  CONTENT_STATUSES,
  CONTENT_TABS,
  contentStatus,
  countReports,
  filterContent,
  paginate,
  parseOne,
  sortContent,
  type ContentStatus,
  type ContentTab,
} from './_lib/content'
import { ContentListView, type ContentRow, type ContentSelect } from './_components/ContentListView'

// J4 « Contenu » (Figma NOV 4 — Admin): everything published, per table, with Masquer / Réafficher. Admins read
// every row (hidden or not) through each table's is_admin() SELECT branch; names come from `profiles` (admin
// reads all rows) and never select phone, e-mail or date_of_birth. One flat query per table, no embeds
// (job_posts has two FKs to profiles — PGRST201).

const ROUTE = '/admin/contenu'
const PER_PAGE = 10
const LIMIT = 500
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)

const TABLE: Record<ContentTab, 'products' | 'service_listings' | 'shops' | 'job_posts' | 'freelancer_profiles'> = {
  product: 'products',
  service: 'service_listings',
  shop: 'shops',
  job_post: 'job_posts',
  freelancer_profile: 'freelancer_profiles',
}
const PUBLIC_ROUTE: Record<ContentTab, string> = {
  product: '/produits',
  service: '/services',
  shop: '/boutique',
  job_post: '/missions',
  freelancer_profile: '/freelance',
}
const ROLE_KEY: Record<string, string> = { freelancer: 'shell.topbar.role.freelance', shop_owner: 'admin.users.role_shop_owner' }

type Base = {
  id: string
  title: string
  meta: string | null
  ownerId: string | null
  shopName: string | null
  shopCity: string | null
  categoryId: string | null
  status: ContentStatus
  created_at: string
}

function shortDate(iso: string, lang: Lang): string {
  return new Date(iso).toLocaleDateString(LOCALES[lang], { day: 'numeric', month: 'short' })
}

async function loadTab(supabase: Awaited<ReturnType<typeof createClient>>, tab: ContentTab, lang: Lang): Promise<{ rows: Base[]; failed: boolean }> {
  const where = `admin/contenu ${tab}`
  if (tab === 'product') {
    const { data, error } = await supabase.from('products').select('id, title, price_tnd, category_id, status, admin_hidden_at, created_at, shop_id').order('created_at', { ascending: false }).limit(LIMIT)
    if (error) reportQueryError(where, error)
    const shopIds = [...new Set((data ?? []).map((p) => p.shop_id))]
    const { data: shops, error: shopsError } = shopIds.length ? await supabase.from('shops').select('id, name, city, owner_id').in('id', shopIds) : { data: [], error: null }
    if (shopsError) reportQueryError(`${where} shops`, shopsError)
    const shopById = new Map((shops ?? []).map((s) => [s.id, s]))
    return {
      failed: Boolean(error || shopsError),
      rows: (data ?? []).map((p) => {
        const s = shopById.get(p.shop_id)
        return { id: p.id, title: p.title, meta: tndPrice(p.price_tnd, lang), ownerId: s?.owner_id ?? null, shopName: s?.name ?? null, shopCity: s?.city ?? null, categoryId: p.category_id, status: contentStatus(tab, p), created_at: p.created_at }
      }),
    }
  }
  if (tab === 'service') {
    const { data, error } = await supabase.from('service_listings').select('id, title, starting_price_tnd, category_id, status, admin_hidden_at, created_at, freelancer_profile_id').order('created_at', { ascending: false }).limit(LIMIT)
    if (error) reportQueryError(where, error)
    const fpIds = [...new Set((data ?? []).map((s) => s.freelancer_profile_id))]
    const { data: fps, error: fpError } = fpIds.length ? await supabase.from('freelancer_profiles').select('id, profile_id').in('id', fpIds) : { data: [], error: null }
    if (fpError) reportQueryError(`${where} freelancer profiles`, fpError)
    const ownerOf = new Map((fps ?? []).map((f) => [f.id, f.profile_id]))
    return {
      failed: Boolean(error || fpError),
      rows: (data ?? []).map((s) => ({ id: s.id, title: s.title, meta: s.starting_price_tnd != null ? tndPrice(s.starting_price_tnd, lang) : null, ownerId: ownerOf.get(s.freelancer_profile_id) ?? null, shopName: null, shopCity: null, categoryId: s.category_id, status: contentStatus(tab, s), created_at: s.created_at })),
    }
  }
  if (tab === 'shop') {
    const { data, error } = await supabase.from('shops').select('id, name, city, owner_id, admin_hidden_at, created_at').order('created_at', { ascending: false }).limit(LIMIT)
    if (error) reportQueryError(where, error)
    return { failed: Boolean(error), rows: (data ?? []).map((s) => ({ id: s.id, title: s.name, meta: s.city, ownerId: s.owner_id, shopName: null, shopCity: null, categoryId: null, status: contentStatus(tab, s), created_at: s.created_at })) }
  }
  if (tab === 'job_post') {
    const { data, error } = await supabase.from('job_posts').select('id, title, city, category_id, consumer_id, status, admin_hidden_at, created_at').order('created_at', { ascending: false }).limit(LIMIT)
    if (error) reportQueryError(where, error)
    return { failed: Boolean(error), rows: (data ?? []).map((j) => ({ id: j.id, title: j.title, meta: j.city, ownerId: j.consumer_id, shopName: null, shopCity: null, categoryId: j.category_id, status: contentStatus(tab, j), created_at: j.created_at })) }
  }
  const { data, error } = await supabase.from('freelancer_profiles').select('id, profile_id, headline, is_published, admin_hidden_at, created_at').order('created_at', { ascending: false }).limit(LIMIT)
  if (error) reportQueryError(where, error)
  return { failed: Boolean(error), rows: (data ?? []).map((f) => ({ id: f.id, title: '', meta: f.headline, ownerId: f.profile_id, shopName: null, shopCity: null, categoryId: null, status: contentStatus(tab, f), created_at: f.created_at })) }
}

export default async function ContentPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdmin(ROUTE)
  const sp = await searchParams
  const lang = await getLang()
  const supabase = await createClient()

  const tab = parseOne(one(sp.type), CONTENT_TABS, 'product')
  const status = parseOne(one(sp.statut), CONTENT_STATUSES, 'all')
  const sort = parseOne(one(sp.tri), CONTENT_SORTS, 'reported')
  const q = (one(sp.q) ?? '').slice(0, 100)
  const pageParam = Number(one(sp.page) ?? '1')

  const [counts, loaded, reportsRes, categoriesRes] = await Promise.all([
    Promise.all(CONTENT_TABS.map((k) => supabase.from(TABLE[k]).select('id', { count: 'exact', head: true }))),
    loadTab(supabase, tab, lang),
    // Open reports for this tab's table — filtered by type, so no id list rides in the URL.
    supabase.from('reports').select('target_id').eq('target_type', tab).in('status', ['open', 'under_review']),
    supabase.from('categories').select('id, name_fr, name_ar'),
  ])
  counts.forEach((c, i) => { if (c.error) reportQueryError(`admin/contenu count ${CONTENT_TABS[i]}`, c.error) })
  if (reportsRes.error) reportQueryError('admin/contenu reports', reportsRes.error)
  if (categoriesRes.error) reportQueryError('admin/contenu categories', categoriesRes.error)
  const reportCount = countReports(reportsRes.data ?? [])
  const categoryName = new Map((categoriesRes.data ?? []).map((c) => [c.id, lang === 'ar' ? c.name_ar : c.name_fr]))

  const ownerIds = [...new Set(loaded.rows.map((r) => r.ownerId).filter((id): id is string => Boolean(id)))]
  const { data: owners, error: ownersError } = ownerIds.length
    ? await supabase.from('profiles').select('id, full_name, city, seller_type').in('id', ownerIds)
    : { data: [], error: null }
  if (ownersError) reportQueryError('admin/contenu owners', ownersError)
  const ownerById = new Map((owners ?? []).map((o) => [o.id, o]))

  const enriched = loaded.rows.map((r) => {
    const owner = r.ownerId ? ownerById.get(r.ownerId) : undefined
    const title = tab === 'freelancer_profile' ? (owner?.full_name ?? '—') : r.title
    const ownerName = tab === 'product' ? (r.shopName ?? '—') : (owner?.full_name ?? '—')
    return { ...r, title, owner: ownerName, reports: reportCount.get(r.id) ?? 0, ownerCity: tab === 'product' ? r.shopCity : (owner?.city ?? null), ownerRole: owner?.seller_type ?? null }
  })

  const categoryIds = [...new Set(enriched.map((r) => r.categoryId).filter((id): id is string => Boolean(id)))]
  const category = typeof sp.categorie === 'string' && categoryIds.includes(sp.categorie) ? sp.categorie : null
  const filtered = sortContent(filterContent(enriched, { q, status, category }), sort)
  const { items, page, totalPages } = paginate(filtered, pageParam, PER_PAGE)

  const rows: ContentRow[] = items.map((r) => {
    const cat = r.categoryId ? categoryName.get(r.categoryId) : null
    return {
      id: r.id,
      type: tab,
      title: r.title,
      meta: [r.meta, cat].filter(Boolean).join(' · ') || null,
      ownerName: r.owner,
      ownerInitials: getInitials(r.owner),
      ownerLine: [tab === 'product' ? t('admin.users.role_shop_owner', lang) : r.ownerRole ? t(ROLE_KEY[r.ownerRole] ?? 'shell.topbar.role.consumer', lang) : t('shell.topbar.role.consumer', lang), r.ownerCity].filter(Boolean).join(' · '),
      published: shortDate(r.created_at, lang),
      reports: reportsRes.error ? null : r.reports,
      status: r.status,
      // Only visible content has a public page; hidden / draft / inactive would 404.
      href: r.status === 'visible' ? `${PUBLIC_ROUTE[tab]}/${r.id}` : null,
    }
  })

  const current: Record<string, string | null> = { type: tab === 'product' ? null : tab, statut: status === 'all' ? null : status, tri: sort === 'reported' ? null : sort, categorie: category, q: q || null }
  const hrefFor = (patch: Record<string, string | null>) => {
    const next = new URLSearchParams()
    for (const [k, v] of Object.entries({ ...current, ...patch })) if (v) next.set(k, v)
    const qs = next.toString()
    return qs ? `${ROUTE}?${qs}` : ROUTE
  }

  const tabs: AdminTab[] = CONTENT_TABS.map((key, i) => ({
    key,
    label: t(`admin.content.tab.${key}`, lang),
    // Switching table resets the table-specific filters (status, category, search, page).
    href: key === 'product' ? ROUTE : `${ROUTE}?type=${key}`,
    active: key === tab,
    count: counts[i].error ? undefined : (counts[i].count ?? 0),
  }))

  const selects: ContentSelect[] = [
    {
      value: status,
      label: t('admin.content.filter_status_aria', lang),
      options: CONTENT_STATUSES.map((s) => ({ value: s, label: t(`admin.content.filter_status_${s}`, lang), href: hrefFor({ statut: s === 'all' ? null : s }) })),
    },
    {
      value: sort,
      label: t('admin.content.sort_aria', lang),
      options: CONTENT_SORTS.map((s) => ({ value: s, label: t(`admin.content.sort_${s}`, lang), href: hrefFor({ tri: s === 'reported' ? null : s }) })),
    },
    ...(categoryIds.length > 0
      ? [{
          value: category ?? 'all',
          label: t('admin.content.filter_category_aria', lang),
          options: [
            { value: 'all', label: t('admin.content.filter_category_all', lang), href: hrefFor({ categorie: null }) },
            ...categoryIds
              .map((id) => ({ id, name: categoryName.get(id) ?? '—' }))
              .sort((a, b) => a.name.localeCompare(b.name, lang))
              .map((c) => ({ value: c.id, label: c.name, href: hrefFor({ categorie: c.id }) })),
          ],
        }]
      : []),
  ]

  const emptyKey = loaded.rows.length === 0 ? 'admin.content.empty' : 'admin.content.empty_filtered'

  return (
    <ContentListView
      lang={lang}
      tabs={tabs}
      q={q}
      selects={selects}
      rows={rows}
      failed={loaded.failed || Boolean(ownersError)}
      emptyKey={emptyKey}
      pagination={{ page, totalPages, totalItems: filtered.length, perPage: PER_PAGE }}
      basePath={ROUTE}
    />
  )
}
