import { getLang } from '@/lib/i18n/server'
import { t, tn, type Lang } from '@/lib/i18n'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth/require-admin'
import { reportQueryError } from '@/lib/supabase/query-error'
import { formatTunisDate, formatTunisDateTime, formatTunisTime } from '@/lib/datetime'
import { getInitials } from '@/components/ui/initials'
import { ERASURE_AUDIT_ACTION } from '@/lib/admin/requests'
import { CONTACT_SUBJECTS } from '@/lib/contact/contact-validation'
import { REQUEST_TABS, hoursLeft, mailtoHref, needsErasureFinish, parseRequestTab, sortRequests, type RequestTab } from './_lib/view'
import { DemandesView, type RequestCard, type RequestTabView } from './_components/DemandesView'
import { ContactActions, DeletionActions, ExportActions, RefuseDeletion } from './_components/RequestActions'

// The account erasure (approveDeletionRequest → finishAccountErasure) removes Storage folders one call at a time;
// a big shop can outrun the default function duration (admin-deletion-auth.md #4). Server actions run with the
// page's segment config.
export const maxDuration = 60

const ROUTE = '/admin/demandes'
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)
const ROLE_KEY: Record<string, string> = { freelancer: 'shell.topbar.role.freelance', shop_owner: 'admin.users.role_shop_owner' }

type Deletion = { id: string; user_id: string; full_name: string | null; email: string | null; seller_type: string | null; reason: string | null; status: string; requested_at: string; processed_at: string | null; processed_by_name: string | null; open_orders: number }
type Export = { id: string; user_id: string; full_name: string | null; email: string | null; status: string; requested_at: string; processed_at: string | null; processed_by_name: string | null }
// subject is null or one of CONTACT_SUBJECTS (an i18n key) — submitContactMessage stores nothing else.
type Contact = { id: string; user_id: string | null; name: string; email: string; subject: string | null; message: string; status: string; created_at: string }

function stamp(iso: string, lang: Lang): string {
  return `${formatTunisDate(iso, lang, 'medium')} ${formatTunisTime(iso, lang)}`
}

export default async function RequestsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdmin(ROUTE)
  const sp = await searchParams
  const lang = await getLang()
  const supabase = await createClient()
  const tab: RequestTab = parseRequestTab(one(sp.onglet))
  // eslint-disable-next-line react-hooks/purity -- request-time evaluation in an async Server Component (rendered once per request), the admin/statistiques precedent.
  const now = Date.now()

  // The three list RPCs (Agent A, is_admin()-gated, SECURITY DEFINER), one call per status: an omitted p_status
  // means the RPC default ('pending' / 'new'), and the processed statuses are read only for « Traitées ».
  const processedTab = tab === 'processed'
  const many = async <T,>(name: string, calls: Array<PromiseLike<{ data: unknown; error: { message: string; code?: string; details?: string } | null }>>) => {
    const results = await Promise.all(calls)
    const error = results.find((r) => r.error)?.error ?? null
    if (error) reportQueryError(`admin/demandes ${name}`, error)
    return { rows: results.flatMap((r) => (r.data as T[] | null) ?? []), error }
  }
  const [delRes, expRes, msgRes] = await Promise.all([
    many<Deletion>('deletion requests', (['pending', 'approved', ...(processedTab ? ['rejected'] : [])] as const).map((p_status) => supabase.rpc('admin_list_deletion_requests', { p_status, p_limit: 200 }))),
    many<Export>('data exports', (['pending', ...(processedTab ? ['completed', 'rejected'] : [])] as const).map((p_status) => supabase.rpc('admin_list_data_exports', { p_status, p_limit: 200 }))),
    many<Contact>('contact messages', (['new', ...(processedTab ? ['handled'] : [])] as const).map((p_status) => supabase.rpc('admin_list_contact_messages', { p_status, p_limit: 200 }))),
  ])
  const deletions = delRes.rows
  const exports = expRes.rows
  const messages = msgRes.rows

  // Approved deletions whose user has no complete_account_erasure audit row → « Terminer la suppression ».
  const approvedIds = deletions.filter((d) => d.status === 'approved').map((d) => d.user_id)
  const erased = new Set<string>()
  let erasureFailed = false
  if (approvedIds.length > 0) {
    const { data, error } = await supabase.from('admin_audit_log').select('target_id').eq('action', ERASURE_AUDIT_ACTION).in('target_id', approvedIds)
    if (error) {
      reportQueryError('admin/demandes erasure audit rows', error)
      erasureFailed = true
    }
    for (const row of data ?? []) if (row.target_id) erased.add(row.target_id)
  }

  const cardsFor = async (): Promise<{ cards: RequestCard[]; failed: boolean }> => {
    if (tab === 'deletion') {
      // Pending (48 h promise) + approved-but-unfinished; a failed audit read cannot claim « terminée ».
      const rows = sortRequests(
        deletions
          .filter((d) => d.status === 'pending' || (!erasureFailed && needsErasureFinish(d, erased)))
          .map((d) => ({ ...d, at: d.requested_at })),
        'pending',
      )
      const userIds = rows.map((d) => d.user_id)
      const [cities, stats] = await Promise.all([
        userIds.length ? supabase.from('profiles').select('id, city').in('id', userIds) : Promise.resolve({ data: [], error: null }),
        Promise.all(rows.map((d) => deletionStats(supabase, d))),
      ])
      if (cities.error) reportQueryError('admin/demandes cities', cities.error)
      const cityOf = new Map((cities.data ?? []).map((c) => [c.id, c.city]))
      return {
        // A failed audit read hides the unfinished erasures: that is an error state, never « Aucune demande ».
        failed: Boolean(delRes.error) || erasureFailed,
        cards: rows.map((d, i) => {
          const role = t(ROLE_KEY[d.seller_type ?? ''] ?? 'shell.topbar.role.consumer', lang)
          const city = cityOf.get(d.user_id) ?? null
          const finish = d.status === 'approved'
          const h = hoursLeft(d.requested_at, now)
          const s = stats[i]
          const subject = d.full_name ?? d.email ?? '—'
          // An approved request's e-mail is already the tombstone address: no « Contacter » there.
          const mailto = d.email && !finish ? mailtoHref(d.email, t('admin.requests.mail_subject_deletion', lang)) : null
          return {
            id: d.id,
            name: d.full_name ?? '—',
            initials: getInitials(d.full_name ?? d.email),
            line: [d.email, role, city].filter(Boolean).join(' · '),
            lineMobile: [role, city].filter(Boolean).join(' · '),
            deadline: finish ? null : { label: h >= 0 ? tn('admin.requests.hours_left', lang, h) : tn('admin.requests.overdue', lang, -h), labelMobile: h >= 0 ? tn('admin.requests.hours_left_long', lang, h) : tn('admin.requests.overdue', lang, -h), overdue: h < 0 },
            pill: finish ? { status: 'annulée', label: t('admin.requests.erasure_incomplete_pill', lang) } : null,
            when: null,
            headline: t('admin.requests.deletion_headline', lang, { date: stamp(d.requested_at, lang) }),
            title: null,
            quote: d.reason?.trim() || null,
            body: finish ? t('admin.requests.finish_body', lang) : null,
            stats: finish ? [] : [
              { label: t(d.seller_type === 'shop_owner' ? 'admin.requests.stat_products' : 'admin.requests.stat_services', lang), value: s.listings === null ? '—' : String(s.listings) },
              { label: t('admin.requests.stat_open_orders', lang), value: String(d.open_orders) },
              { label: t('admin.requests.stat_done_orders', lang), value: s.done === null ? '—' : t('admin.requests.stat_done_value', lang, { count: s.done }) },
            ],
            statsMobile: finish || s.listings === null || s.done === null ? null : [
              tn(d.seller_type === 'shop_owner' ? 'admin.requests.m_products' : 'admin.requests.m_services', lang, s.listings),
              tn('admin.requests.m_open_orders', lang, d.open_orders),
              tn('admin.requests.m_done_orders', lang, s.done),
            ].join(' · '),
            warning: !finish && d.open_orders > 0 ? tn('admin.requests.open_orders_warning', lang, d.open_orders) : null,
            mailto: mailto ? { href: mailto, labelKey: 'admin.requests.action_contact', primary: false } : null,
            actionsBefore: <DeletionActions requestId={d.id} subject={subject} finish={finish} />,
            actionsAfter: finish ? null : <RefuseDeletion requestId={d.id} subject={subject} />,
          }
        }),
      }
    }
    if (tab === 'export') {
      const rows = exports.filter((x) => x.status === 'pending')
      return {
        failed: Boolean(expRes.error),
        cards: rows.map((x) => {
          const h = hoursLeft(x.requested_at, now)
          const subject = x.full_name ?? x.email ?? '—'
          const mailto = x.email ? mailtoHref(x.email, t('admin.requests.mail_subject_export', lang)) : null
          return {
            id: x.id, name: x.full_name ?? '—', initials: getInitials(x.full_name ?? x.email),
            line: x.email ?? '', lineMobile: x.email ?? '',
            deadline: { label: h >= 0 ? tn('admin.requests.hours_left', lang, h) : tn('admin.requests.overdue', lang, -h), labelMobile: h >= 0 ? tn('admin.requests.hours_left_long', lang, h) : tn('admin.requests.overdue', lang, -h), overdue: h < 0 },
            pill: null, when: null,
            headline: t('admin.requests.export_headline', lang, { date: stamp(x.requested_at, lang) }),
            title: null, quote: null, body: null, stats: [], statsMobile: null, warning: null,
            mailto: mailto ? { href: mailto, labelKey: 'admin.requests.action_contact', primary: false } : null,
            actionsBefore: <ExportActions exportId={x.id} subject={subject} />,
            actionsAfter: null,
          }
        }),
      }
    }
    if (tab === 'contact') {
      const rows = messages.filter((m) => m.status === 'new')
      return {
        failed: Boolean(msgRes.error),
        cards: rows.map((m) => {
          const subjectLabel = m.subject && (CONTACT_SUBJECTS as readonly string[]).includes(m.subject) ? t(m.subject, lang) : t('admin.requests.contact_no_subject', lang)
          const mailto = mailtoHref(m.email, `Re: ${subjectLabel}`)
          return {
            id: m.id, name: m.name, initials: getInitials(m.name),
            line: `${m.email} · ${t(m.user_id ? 'admin.requests.has_account' : 'admin.requests.no_account', lang)}`,
            lineMobile: m.email,
            deadline: null,
            pill: { status: 'pending', label: t('admin.requests.contact_new', lang) },
            when: formatTunisDateTime(m.created_at, lang),
            headline: null, title: subjectLabel, quote: null, body: m.message, stats: [], statsMobile: null, warning: null,
            mailto: mailto ? { href: mailto, labelKey: 'admin.requests.action_reply', primary: true } : null,
            actionsBefore: null,
            actionsAfter: <ContactActions messageId={m.id} subject={subjectLabel} />,
          }
        }),
      }
    }
    // Traitées — every processed request of the three kinds, newest first.
    const processed = [
      // An approved request whose erasure did not finish is not « Supprimé » (it also sits on the deletion tab).
      ...deletions.filter((d) => d.status !== 'pending').map((d) => ({ id: d.id, kind: 'deletion' as const, name: d.full_name ?? d.email ?? '—', status: d.status === 'approved' && (erasureFailed || needsErasureFinish(d, erased)) ? 'incomplete' : d.status, at: d.processed_at ?? d.requested_at, by: d.processed_by_name })),
      ...exports.filter((x) => x.status !== 'pending').map((x) => ({ id: x.id, kind: 'export' as const, name: x.full_name ?? x.email ?? '—', status: x.status, at: x.processed_at ?? x.requested_at, by: x.processed_by_name })),
      ...messages.filter((m) => m.status !== 'new').map((m) => ({ id: m.id, kind: 'contact' as const, name: m.name, status: m.status, at: m.created_at, by: null as string | null })),
    ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    return {
      failed: Boolean(delRes.error || expRes.error || msgRes.error),
      cards: processed.map((p) => ({
        id: `${p.kind}-${p.id}`, name: p.name, initials: getInitials(p.name),
        line: [t(`admin.requests.kind_${p.kind}`, lang), p.by ? t('admin.requests.processed_by', lang, { name: p.by }) : null].filter(Boolean).join(' · '),
        lineMobile: t(`admin.requests.kind_${p.kind}`, lang),
        deadline: null,
        pill: { status: p.status === 'rejected' ? 'paused' : p.status === 'incomplete' ? 'annulée' : 'reçue', label: t(p.status === 'incomplete' ? 'admin.requests.erasure_incomplete_pill' : `admin.requests.state_${p.status}`, lang) },
        when: formatTunisDate(p.at, lang, 'medium'),
        headline: null, title: null, quote: null, body: null, stats: [], statsMobile: null, warning: null, mailto: null,
        actionsBefore: null, actionsAfter: null,
      })),
    }
  }

  const { cards, failed } = await cardsFor()
  const pendingDeletion = deletions.filter((d) => d.status === 'pending').length
  const pendingExport = exports.filter((x) => x.status === 'pending').length
  const newMessages = messages.filter((m) => m.status === 'new').length
  const COUNT: Record<RequestTab, number | undefined> = {
    deletion: delRes.error ? undefined : pendingDeletion,
    export: expRes.error ? undefined : pendingExport,
    contact: msgRes.error ? undefined : newMessages,
    processed: undefined,
  }
  const tabs: RequestTabView[] = REQUEST_TABS.map((key) => ({
    key,
    label: t(`admin.requests.tab.${key}`, lang),
    labelShort: t(`admin.requests.tab_short.${key}`, lang),
    href: key === 'deletion' ? ROUTE : `${ROUTE}?onglet=${key}`,
    active: key === tab,
    count: COUNT[key],
  }))
  const EMPTY: Record<RequestTab, { titleKey: string; bodyKey: string }> = {
    deletion: { titleKey: 'admin.requests.empty_deletion', bodyKey: 'admin.requests.empty_deletion_body' },
    export: { titleKey: 'admin.requests.empty_export', bodyKey: 'admin.requests.empty_export_body' },
    contact: { titleKey: 'admin.requests.empty_contact', bodyKey: 'admin.requests.empty_contact_body' },
    processed: { titleKey: 'admin.requests.empty_processed', bodyKey: 'admin.requests.empty_processed_body' },
  }

  return <DemandesView lang={lang} tabs={tabs} cards={cards} failed={failed} empty={EMPTY[tab]} />
}

// « Services actifs » / « Produits actifs » and « Commandes terminées » for one pending deletion. null = read failed.
async function deletionStats(supabase: Awaited<ReturnType<typeof createClient>>, d: Deletion): Promise<{ listings: number | null; done: number | null }> {
  const doneRes = await supabase.from('orders').select('id', { count: 'exact', head: true }).or(`buyer_id.eq.${d.user_id},seller_id.eq.${d.user_id}`).eq('status', 'received')
  if (doneRes.error) reportQueryError('admin/demandes done orders', doneRes.error)
  let listings: number | null = 0
  if (d.seller_type === 'shop_owner') {
    const { data: shop, error } = await supabase.from('shops').select('id').eq('owner_id', d.user_id).maybeSingle()
    if (error) reportQueryError('admin/demandes shop', error)
    if (error) listings = null
    else if (shop) {
      const r = await supabase.from('products').select('id', { count: 'exact', head: true }).eq('shop_id', shop.id).eq('status', 'active')
      if (r.error) reportQueryError('admin/demandes products', r.error)
      listings = r.error ? null : (r.count ?? 0)
    }
  } else if (d.seller_type === 'freelancer') {
    const { data: fp, error } = await supabase.from('freelancer_profiles').select('id').eq('profile_id', d.user_id).maybeSingle()
    if (error) reportQueryError('admin/demandes freelancer profile', error)
    if (error) listings = null
    else if (fp) {
      const r = await supabase.from('service_listings').select('id', { count: 'exact', head: true }).eq('freelancer_profile_id', fp.id).eq('status', 'active')
      if (r.error) reportQueryError('admin/demandes services', r.error)
      listings = r.error ? null : (r.count ?? 0)
    }
  }
  return { listings, done: doneRes.error ? null : (doneRes.count ?? 0) }
}
