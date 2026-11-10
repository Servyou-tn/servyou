import Link from 'next/link'
import { getLang } from '@/lib/i18n/server'
import { LOCALES, t, tn, type Lang } from '@/lib/i18n'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth/require-admin'
import { failQuery, isNoRowLike, reportQueryError } from '@/lib/supabase/query-error'
import { accountRoleI18nKey, accountRoles, resolveRole } from '@/lib/roles'
import { relativeTimeLabel } from '@/lib/relative-time'
import { statusPillFor } from '@/lib/orders/order-status'
import { getInitials } from '@/components/ui/initials'
import type { StatusValue } from '@/components/ui/status-pill'
import type { AdminTab } from '@/components/AdminTabs'
import { ageBand, journalActionKey, orderRef, parseOne, reportsReceivedFilter, userStatus } from '../_lib/users'
import {
  UserDetailView,
  type ContentRow,
  type DetailTabKey,
  type DetailTile,
  type InfoRow,
  type JournalRow,
  type OrderRow,
  type OrdersPanel,
  type ReportRow,
} from '../_components/UserDetailView'
import { SuspendForm } from './SuspendForm'
import { UnsuspendButton } from './UnsuspendButton'

type Props = { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }

const TABS: DetailTabKey[] = ['activite', 'commandes', 'contenu', 'signalements', 'journal']
const RECENT = 4
const FULL = 50
const AGE_KEY = { '18+': 'admin.users.age_adult', '16-17': 'admin.users.age_minor', under16: 'admin.users.age_under16' } as const
const TAB_LABEL: Record<DetailTabKey, string> = {
  activite: 'admin.users.tab.activity',
  commandes: 'admin.users.tab.orders',
  contenu: 'admin.users.tab.content',
  signalements: 'admin.users.tab.reports',
  journal: 'admin.users.tab.journal',
}
const ROLE_PILL = { admin: 'completed', shop_owner: 'arrivee', freelancer: 'acceptee', consumer: 'pending' } as const

function shortDate(iso: string, lang: Lang): string {
  return new Date(iso).toLocaleDateString(LOCALES[lang], { day: 'numeric', month: 'short' })
}
function fullDate(iso: string, lang: Lang): string {
  return new Date(iso).toLocaleDateString(LOCALES[lang], { day: 'numeric', month: 'short', year: 'numeric' })
}
// Relative up to yesterday, then the short date (« il y a 3h · Moatez », « 2 nov. · Moatez »).
function whenLabel(iso: string, lang: Lang, now: number): string {
  return now - new Date(iso).getTime() < 2 * 86_400_000 ? relativeTimeLabel(iso, lang, now) : shortDate(iso, lang)
}

type ContentItem = { id: string; type: 'product' | 'service' | 'job_post'; title: string; status: string; hidden: boolean }

// Visible / Masqué / Inactif — the admin moderation marker first, then the item's own status.
function contentPill(item: ContentItem, lang: Lang): { status: StatusValue; label: string } {
  if (item.hidden) return { status: 'moderated', label: t('admin.reports.pill_hidden', lang) }
  if (item.status === 'active' || item.status === 'open') return { status: 'reçue', label: t('admin.reports.pill_visible', lang) }
  return { status: 'paused', label: t('admin.users.content_inactive', lang) }
}

export default async function UserDetailPage({ params, searchParams }: Props) {
  const { id } = await params
  await requireAdmin(`/admin/utilisateurs/${id}`)
  const sp = await searchParams
  const lang = await getLang()
  const supabase = await createClient()
  const tab = parseOne(Array.isArray(sp.onglet) ? sp.onglet[0] : sp.onglet, TABS, 'activite')

  const { data: me, error: meError } = await supabase.auth.getUser()
  // Only the UI's self-suspend guard depends on this; the RPC blocks self-suspend too.
  if (meError) reportQueryError('admin/utilisateurs/[id] current user', meError)

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, phone, date_of_birth, city, language, seller_type, is_admin, created_at, suspended_at, suspended_reason')
    .eq('id', id)
    .maybeSingle()

  // « No row » (or a junk id) keeps the not-found block below; a failed query throws to error.tsx.
  if (error && !isNoRowLike(error)) failQuery('admin/utilisateurs/[id] profile', error)

  if (!profile) {
    return (
      <div className="flex max-w-2xl flex-col gap-4">
        <p className="text-body-sm text-text-secondary">{t('admin.users.error_not_found', lang)}</p>
        <Link href="/admin/utilisateurs" className="self-start text-body-sm font-medium text-brand-indigo-600 hover:underline">
          {t('admin.users.back_to_list', lang)}
        </Link>
      </div>
    )
  }

  const u = profile
  const isSelf = me.user?.id === u.id
  const role = resolveRole(u)
  const roles = accountRoles(u)
  const limit = tab === 'activite' ? RECENT : FULL

  // Seller links + content the account owns. Admins read every row through each table's is_admin() branch.
  const [shopRes, fpRes, jobsRes] = await Promise.all([
    supabase.from('shops').select('id, name').eq('owner_id', u.id).maybeSingle(),
    supabase.from('freelancer_profiles').select('id, headline').eq('profile_id', u.id).maybeSingle(),
    supabase.from('job_posts').select('id, title, status, admin_hidden_at, created_at').eq('consumer_id', u.id).order('created_at', { ascending: false }),
  ])
  if (shopRes.error) reportQueryError('admin/utilisateurs/[id] shop', shopRes.error)
  if (fpRes.error) reportQueryError('admin/utilisateurs/[id] freelancer profile', fpRes.error)
  if (jobsRes.error) reportQueryError('admin/utilisateurs/[id] job posts', jobsRes.error)
  const shop = shopRes.data
  const fp = fpRes.data

  const [productsRes, servicesRes] = await Promise.all([
    shop ? supabase.from('products').select('id, title, status, admin_hidden_at, created_at').eq('shop_id', shop.id).order('created_at', { ascending: false }) : null,
    fp ? supabase.from('service_listings').select('id, title, status, admin_hidden_at, created_at').eq('freelancer_profile_id', fp.id).order('created_at', { ascending: false }) : null,
  ])
  if (productsRes?.error) reportQueryError('admin/utilisateurs/[id] products', productsRes.error)
  if (servicesRes?.error) reportQueryError('admin/utilisateurs/[id] services', servicesRes.error)

  const items: ContentItem[] = [
    ...(productsRes?.data ?? []).map((p) => ({ id: p.id, type: 'product' as const, title: p.title, status: p.status, hidden: Boolean(p.admin_hidden_at) })),
    ...(servicesRes?.data ?? []).map((s) => ({ id: s.id, type: 'service' as const, title: s.title, status: s.status, hidden: Boolean(s.admin_hidden_at) })),
    ...(jobsRes.data ?? []).map((j) => ({ id: j.id, type: 'job_post' as const, title: j.title, status: j.status, hidden: Boolean(j.admin_hidden_at) })),
  ]
  const contentFailed = Boolean(shopRes.error || fpRes.error || jobsRes.error || productsRes?.error || servicesRes?.error)
  const titleOf = new Map<string, string>(items.map((i) => [i.id, i.title]))
  if (shop) titleOf.set(shop.id, shop.name)

  const contentIds = {
    product: items.filter((i) => i.type === 'product').map((i) => i.id),
    service: items.filter((i) => i.type === 'service').map((i) => i.id),
    job_post: items.filter((i) => i.type === 'job_post').map((i) => i.id),
    shop: shop ? [shop.id] : [],
    freelancer_profile: fp ? [fp.id] : [],
  }
  const reportsFilter = reportsReceivedFilter(u.id, contentIds)

  const orderCols = 'id, item_title, quantity, status, order_type, created_at, buyer_id, seller_id'
  const [sellerCount, buyerCount, sellerOrders, buyerOrders, reportsRes, deletionRes, journalRes] = await Promise.all([
    supabase.from('orders').select('id', { count: 'exact', head: true }).eq('seller_id', u.id),
    supabase.from('orders').select('id', { count: 'exact', head: true }).eq('buyer_id', u.id),
    supabase.from('orders').select(orderCols).eq('seller_id', u.id).order('created_at', { ascending: false }).limit(limit),
    supabase.from('orders').select(orderCols).eq('buyer_id', u.id).order('created_at', { ascending: false }).limit(limit),
    supabase.from('reports').select('id, reason, status, target_type, target_id, created_at', { count: 'exact' }).or(reportsFilter).order('created_at', { ascending: false }).limit(FULL),
    supabase.from('deletion_requests').select('id').eq('user_id', u.id).eq('status', 'pending').limit(1),
    supabase
      .from('admin_audit_log')
      .select('id, action, admin_id, target_type, target_id, created_at')
      .in('target_id', [u.id, ...Object.values(contentIds).flat()])
      .order('created_at', { ascending: false })
      .limit(tab === 'journal' ? FULL : 3),
  ])
  const reads = { sellerCount, buyerCount, sellerOrders, buyerOrders, reportsRes, deletionRes, journalRes }
  for (const [key, res] of Object.entries(reads)) {
    if (res.error) reportQueryError(`admin/utilisateurs/[id] ${key}`, res.error)
  }

  // Names for order counterparts and journal authors (the admin reads all profiles, migration 23).
  const nameIds = [
    ...(sellerOrders.data ?? []).map((o) => o.buyer_id),
    ...(buyerOrders.data ?? []).map((o) => o.seller_id),
    ...(journalRes.data ?? []).map((j) => j.admin_id),
  ]
  const names = new Map<string, string>()
  if (nameIds.length > 0) {
    const { data: people, error: peopleError } = await supabase.from('profiles').select('id, full_name').in('id', [...new Set(nameIds)])
    if (peopleError) reportQueryError('admin/utilisateurs/[id] names', peopleError)
    for (const p of people ?? []) if (p.full_name) names.set(p.id, p.full_name)
  }

  // eslint-disable-next-line react-hooks/purity -- request-time evaluation in an async Server Component (rendered once per request), the admin/statistiques precedent.
  const now = Date.now()
  const countValue = (r: { count: number | null; error: unknown }): string => (r.error ? '—' : String(r.count ?? 0))
  const tabHref = (key: DetailTabKey) => (key === 'activite' ? `/admin/utilisateurs/${u.id}` : `/admin/utilisateurs/${u.id}?onglet=${key}`)

  const toOrderRows = (rows: typeof sellerOrders.data, side: 'seller' | 'buyer'): OrderRow[] =>
    (rows ?? []).map((o) => {
      const pill = statusPillFor(o.status, o.order_type === 'product' ? 'product' : 'service')
      return {
        id: o.id,
        ref: orderRef(o.id),
        item: `${o.item_title ?? '—'}${o.quantity > 1 ? ` ×${o.quantity}` : ''}`,
        counterpart: names.get(side === 'seller' ? o.buyer_id : o.seller_id) ?? '—',
        pill: pill ? { status: pill.pill, label: t(pill.labelKey, lang) } : null,
        date: shortDate(o.created_at, lang),
      }
    })
  const sellerPanel: OrdersPanel = {
    titleKey: 'admin.users.orders_recent_seller', counterpartKey: 'admin.users.col_buyer',
    rows: toOrderRows(sellerOrders.data, 'seller'), failed: Boolean(sellerOrders.error),
    allHref: tab === 'activite' ? tabHref('commandes') : null,
  }
  const buyerPanel: OrdersPanel = {
    titleKey: 'admin.users.orders_recent_buyer', counterpartKey: 'admin.users.col_seller',
    rows: toOrderRows(buyerOrders.data, 'buyer'), failed: Boolean(buyerOrders.error),
    allHref: tab === 'activite' ? tabHref('commandes') : null,
  }
  // A seller's « Activité » shows the orders they received (J3); a buyer's, the ones they placed.
  const orders = role ? [sellerPanel, buyerPanel] : [buyerPanel, sellerPanel]

  const reportRows: ReportRow[] = (reportsRes.data ?? []).map((r) => ({
    id: r.id,
    reasonLabel: t(`admin.reports.reason_${r.reason}`, lang),
    content: r.target_type === 'user' ? t('admin.reports.target_type_user', lang) : (titleOf.get(r.target_id) ?? '—'),
    status: r.status,
  }))
  const openReports = (reportsRes.data ?? []).filter((r) => r.status === 'open' || r.status === 'under_review').length

  const contentRoute: Record<ContentItem['type'], string> = { product: '/produits', service: '/services', job_post: '/missions' }
  const contentRows: ContentRow[] = items.map((i) => ({
    id: i.id,
    typeLabel: t(`admin.reports.target_type_${i.type}`, lang),
    title: i.title,
    pill: contentPill(i, lang),
    // Hidden or inactive content 404s on its public page — no link for those rows.
    href: !i.hidden && (i.status === 'active' || i.status === 'open') ? `${contentRoute[i.type]}/${i.id}` : null,
  }))

  const journalRows: JournalRow[] = (journalRes.data ?? []).map((j) => {
    const target = j.target_id && j.target_id !== u.id ? titleOf.get(j.target_id) : undefined
    return {
      id: j.id,
      title: [t(journalActionKey(j.action), lang), target].filter(Boolean).join(' · '),
      sub: [whenLabel(j.created_at, lang, now), names.get(j.admin_id)].filter(Boolean).join(' · '),
    }
  })

  // Tile 3 follows the account's content: a shop's products, a freelancer's services, otherwise its annonces.
  const tile3Items = shop ? items.filter((i) => i.type === 'product') : fp ? items.filter((i) => i.type === 'service') : items.filter((i) => i.type === 'job_post')
  const tile3Hidden = tile3Items.filter((i) => i.hidden).length
  // A failed shop / freelancer read could silently turn the tile into « Annonces »: any content failure → « — ».
  const tile3Failed = contentFailed
  const tiles: DetailTile[] = [
    { label: t('admin.users.activity_orders_as_seller', lang), value: countValue(sellerCount), subtitle: t('admin.users.tile_as_seller', lang), accent: 'blue' },
    { label: t('admin.users.activity_orders_as_buyer', lang), value: countValue(buyerCount), subtitle: t('admin.users.tile_as_buyer', lang), accent: 'neutral' },
    {
      label: t(shop ? 'admin.users.tile_products' : fp ? 'admin.users.tile_services' : 'admin.users.tile_job_posts', lang),
      value: tile3Failed ? '—' : String(tile3Items.length),
      subtitle: tile3Failed ? null : `${tn('admin.users.tile_visible', lang, tile3Items.length - tile3Hidden)} · ${tn('admin.users.tile_hidden', lang, tile3Hidden)}`,
      accent: 'neutral',
    },
    {
      label: t('admin.users.activity_reports_against', lang),
      // Reports are matched on the content ids: an incomplete content read would undercount, so it shows « — ».
      value: reportsRes.error || contentFailed ? '—' : String(reportsRes.count ?? (reportsRes.data ?? []).length),
      subtitle: reportsRes.error || contentFailed ? null : tn('admin.users.tile_open_reports', lang, openReports),
      accent: 'neutral',
    },
  ]

  const band = ageBand(u.date_of_birth, now)
  const info: InfoRow[] = [
    { label: t('admin.users.field_role', lang), value: roles.map((r) => t(accountRoleI18nKey(r), lang)).join(', ') },
    ...(shop ? [{ label: t('admin.users.info_shop', lang), value: productsRes?.error ? shop.name : `${shop.name} · ${tn('admin.users.info_products', lang, contentIds.product.length)}` }] : []),
    ...(fp ? [{ label: t('admin.users.info_freelance', lang), value: fp.headline ?? '—' }] : []),
    { label: t('admin.users.field_language', lang), value: u.language === 'ar' ? t('admin.users.lang_ar', lang) : u.language === 'fr' ? t('admin.users.lang_fr', lang) : '—' },
    { label: t('admin.users.field_phone', lang), value: u.phone ?? '—', ltr: true },
    { label: t('admin.users.info_age', lang), value: band ? t(AGE_KEY[band], lang) : '—' },
    // Kept from the built page: the suspension date and its internal reason.
    ...(u.suspended_at
      ? [
          { label: t('admin.users.field_suspended_at', lang), value: fullDate(u.suspended_at, lang) },
          { label: t('admin.users.field_suspended_reason', lang), value: u.suspended_reason ?? '—' },
        ]
      : []),
  ]

  const tabs: AdminTab[] = TABS.map((key) => ({ key, label: t(TAB_LABEL[key], lang), href: tabHref(key), active: key === tab }))

  const publicPage = shop
    ? { href: `/boutique/${shop.id}`, labelKey: 'admin.users.public_shop' }
    : fp
      ? { href: `/freelance/${fp.id}`, labelKey: 'admin.users.public_freelance' }
      : null

  const action = isSelf ? (
    <p className="text-body-sm text-text-muted">{t('admin.users.self_action_blocked', lang)}</p>
  ) : u.suspended_at ? (
    <UnsuspendButton targetUserId={u.id} />
  ) : (
    <SuspendForm targetUserId={u.id} />
  )

  return (
    <UserDetailView
      lang={lang}
      name={u.full_name ?? '—'}
      initials={getInitials(u.full_name ?? u.email)}
      roles={roles.map((r) => ({ key: r, label: t(accountRoleI18nKey(r), lang), pill: ROLE_PILL[r] }))}
      // A failed deletion-request read cannot claim « Actif »: no status pill then (« — » in the view).
      status={deletionRes.error && !u.suspended_at ? null : userStatus({ suspended_at: u.suspended_at, deletionPending: (deletionRes.data ?? []).length > 0 })}
      meta={[
        ...(u.email ? [{ text: u.email, ltr: true }] : []),
        ...(u.phone ? [{ text: u.phone, ltr: true }] : []),
        ...(u.city ? [{ text: u.city }] : []),
        { text: t('admin.users.joined_on', lang, { date: fullDate(u.created_at, lang) }) },
      ]}
      publicPage={publicPage}
      action={action}
      tiles={tiles}
      tabs={tabs}
      tab={tab}
      orders={orders}
      reports={{ rows: contentFailed ? [] : tab === 'activite' ? reportRows.slice(0, 3) : reportRows, failed: Boolean(reportsRes.error) || contentFailed, allHref: null }}
      content={{ rows: contentRows, failed: contentFailed }}
      info={info}
      journal={{ rows: contentFailed ? [] : journalRows, failed: Boolean(journalRes.error) || contentFailed, allHref: null }}
    />
  )
}
