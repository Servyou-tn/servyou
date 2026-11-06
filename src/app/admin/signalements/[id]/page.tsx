import Link from 'next/link'
import { getLang } from '@/lib/i18n/server'
import { t, tn, type Lang } from '@/lib/i18n'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/auth/require-admin'
import { failQuery, isNoRowLike, reportQueryError } from '@/lib/supabase/query-error'
import { relativeTimeLabel } from '@/lib/relative-time'
import { getInitials } from '@/components/ui/initials'
import { tndPrice } from '@/components/listings/listing-utils'
import { isModerationTargetType } from '@/lib/admin/action-input'
import { reportRef, severityTone } from '../_lib/queue'
import { countReportsBy, resolveTargets, targetKey, targetSecondary, targetTitle, type AdminProfile } from '../_lib/targets'
import { ReportDetailView, type DetailContent, type DetailOther, type DetailPerson } from '../_components/ReportDetailView'
import { ClaimButton } from './ClaimButton'
import { DecisionPanel } from './DecisionPanel'
import type { ModerationTargetType } from '../actions'

type Props = { params: Promise<{ id: string }> }

// Base route per target_type. target_id maps to each route's natural id (shop id, product id,
// freelancer_profile id, service_listing id, job_post id). Content opens its public page in a new tab;
// 'user' opens the admin user page (/admin/utilisateurs/[id]) in the same tab.
const TARGET_ROUTES: Record<string, string> = {
  shop: '/boutique',
  // The public detail routes are /produits/[id] and /services/[id] (plural).
  product: '/produits',
  freelancer_profile: '/freelance',
  service: '/services',
  job_post: '/missions',
  user: '/admin/utilisateurs',
}

const ROLE_KEY: Record<string, string> = {
  freelancer: 'shell.topbar.role.freelance',
  shop_owner: 'shell.topbar.role.shopOwner',
}

function shortDate(iso: string, lang: Lang): string {
  return new Date(iso).toLocaleDateString(lang === 'ar' ? 'ar-TN' : 'fr-TN', { day: 'numeric', month: 'short' })
}

function fullDate(iso: string, lang: Lang): string {
  return new Date(iso).toLocaleDateString(lang === 'ar' ? 'ar-TN' : 'fr-TN', { day: '2-digit', month: 'short', year: 'numeric' })
}

// « Quand » in « Autres signalements »: relative up to yesterday, then the short date (« 2 nov. »).
function whenLabel(iso: string, lang: Lang, now: number): string {
  return now - new Date(iso).getTime() < 2 * 86_400_000 ? relativeTimeLabel(iso, lang, now) : shortDate(iso, lang)
}

function personLine(p: AdminProfile | undefined, lang: Lang, joined: boolean): string | null {
  if (!p) return null
  const parts = [
    t(ROLE_KEY[p.seller_type ?? ''] ?? 'shell.topbar.role.consumer', lang),
    p.city,
    joined ? t('admin.reports.joined_on', lang, { date: shortDate(p.created_at, lang) }) : null,
  ]
  return parts.filter(Boolean).join(' · ')
}

export default async function ReportDetailPage({ params }: Props) {
  const { id } = await params
  await requireAdmin(`/admin/signalements/${id}`)
  const lang = await getLang()
  const supabase = await createClient()

  const { data: report, error } = await supabase
    .from('reports')
    .select('id, reporter_id, target_type, target_id, reason, description, status, admin_note, created_at, updated_at')
    .eq('id', id)
    .single()

  // « No row » (or a junk id) keeps the not-found block below; a failed query throws to error.tsx.
  if (error && !isNoRowLike(error)) failQuery('admin/signalements/[id] report', error)

  if (!report) {
    return (
      <div className="flex max-w-2xl flex-col gap-4">
        <p className="text-body-sm text-text-secondary">{t('admin.reports.error_not_found', lang)}</p>
        <Link href="/admin/signalements" className="self-start text-body-sm font-medium text-brand-indigo-600 hover:underline">
          {t('admin.reports.back_to_queue', lang)}
        </Link>
      </div>
    )
  }

  const r = report

  // Other reports on the same content (newest first) — their reporters' names resolve with the rest.
  const { data: othersData, error: othersError } = await supabase
    .from('reports')
    .select('id, reporter_id, reason, status, created_at')
    .eq('target_type', r.target_type)
    .eq('target_id', r.target_id)
    .neq('id', r.id)
    .order('created_at', { ascending: false })
    .limit(20)
  if (othersError) reportQueryError('admin/signalements/[id] other reports', othersError)
  const othersRows = othersData ?? []

  const [{ targets, profiles, failed: targetsFailed }, reporterCounts, me] = await Promise.all([
    resolveTargets(supabase, [r], [r.reporter_id, ...othersRows.map((o) => o.reporter_id)], 'admin/signalements/[id]'),
    countReportsBy(supabase, [r.reporter_id], 'admin/signalements/[id] reporter counts'),
    supabase.auth.getUser(),
  ])
  // Only the UI's self-suspend guard depends on this; the RPC blocks self-suspend too.
  if (me.error) reportQueryError('admin/signalements/[id] current user', me.error)
  const myId = me.data.user?.id ?? null

  const target = targets.get(targetKey(r.target_type, r.target_id))
  const owner = target?.ownerId ? profiles.get(target.ownerId) : undefined
  const reporter = profiles.get(r.reporter_id)
  const moderatable = isModerationTargetType(r.target_type)

  // The moderation note (admin_hidden_reason has no client SELECT grant): get_moderation_reason() for owner/admin.
  let hiddenReason: string | null = null
  if (moderatable && target?.hiddenAt) {
    const { data: reason, error: reasonError } = await supabase.rpc('get_moderation_reason', {
      target_type: r.target_type,
      target_id: r.target_id,
    })
    if (reasonError) reportQueryError('admin/signalements/[id] moderation reason', reasonError)
    hiddenReason = reason ?? null
  }

  // eslint-disable-next-line react-hooks/purity -- request-time evaluation in an async Server Component (rendered once per request), the admin/statistiques precedent.
  const now = Date.now()
  const reasonLabel = t(`admin.reports.reason_${r.reason}`, lang)
  const typeLabel = t(`admin.reports.target_type_${r.target_type}`, lang)

  // Contenu signalé — « iPhone 15 Pro neuf — 900 TND » · « Produit · OM shop (Ahmed) · Tunis · publié le 2 nov. »
  const baseTitle = targetTitle(target, owner)
  const ownerName = owner?.full_name ?? null
  const who = target?.shopName && ownerName && r.target_type !== 'shop' ? `${target.shopName} (${ownerName})` : targetSecondary(r.target_type, target, owner)
  const content: DetailContent = {
    type: r.target_type,
    title: target?.priceTnd ? `${baseTitle} — ${tndPrice(target.priceTnd, lang)}` : baseTitle,
    meta: [
      typeLabel,
      who,
      r.target_type === 'product' || r.target_type === 'service' ? target?.city : null,
      target?.createdAt && r.target_type !== 'user' ? t('admin.reports.published_on', lang, { date: shortDate(target.createdAt, lang) }) : null,
    ].filter((p): p is string => Boolean(p)),
    excerpt: target?.excerpt ? target.excerpt.replace(/\s+/g, ' ').trim() : null,
    pill:
      !target ? null
      : r.target_type === 'user' ? (owner?.suspended_at ? { status: 'suspendu', label: t('admin.users.status_suspended', lang) } : null)
      : target.hiddenAt ? { status: 'moderated', label: t('admin.reports.pill_hidden', lang) }
      : { status: 'reçue', label: t('admin.reports.pill_visible', lang) },
    hiddenNote: target?.hiddenAt
      ? `${t('admin.moderation.moderated_at_label', lang)} ${fullDate(target.hiddenAt, lang)}${hiddenReason ? ` · ${hiddenReason}` : ''}`
      : null,
    missing: !target,
    unreadable: !target && targetsFailed,
  }

  const targetBase = TARGET_ROUTES[r.target_type]
  const openPage = targetBase
    ? r.target_type === 'user'
      ? { href: `${targetBase}/${r.target_id}`, external: false, labelKey: 'admin.reports.view_user' }
      : { href: `${targetBase}/${r.target_id}`, external: true, labelKey: 'admin.reports.open_page' }
    : null

  const others: DetailOther[] = othersRows.map((o) => ({
    id: o.id,
    reasonLabel: t(`admin.reports.reason_${o.reason}`, lang),
    by: profiles.get(o.reporter_id)?.full_name ?? '—',
    when: whenLabel(o.created_at, lang, now),
    status: o.status,
  }))

  const sent = reporterCounts?.sent.get(r.reporter_id) ?? null
  const dismissed = reporterCounts?.dismissed.get(r.reporter_id) ?? 0
  const reporterCard: DetailPerson = {
    name: reporter?.full_name ?? '—',
    initials: getInitials(reporter?.full_name),
    line: personLine(reporter, lang, true),
    stats: sent === null ? null : `${tn('admin.reports.sent_count', lang, sent)} · ${tn('admin.reports.dismissed_count', lang, dismissed)}`,
  }

  // The content owner — the person « Suspendre l'utilisateur » acts on (the reported user for a user report).
  const ownerCard: DetailPerson | null = owner
    ? {
        name: target?.shopName && r.target_type !== 'user' ? `${owner.full_name ?? '—'} (${target.shopName})` : (owner.full_name ?? '—'),
        initials: getInitials(owner.full_name),
        line: personLine(owner, lang, false),
        stats: owner.suspended_at
          ? [t('admin.reports.owner_suspended', lang, { date: fullDate(owner.suspended_at, lang) }), owner.suspended_reason].filter(Boolean).join(' · ')
          : null,
        statsDanger: true,
        href: `/admin/utilisateurs/${owner.id}`,
      }
    : null

  const open = r.status === 'open' || r.status === 'under_review'
  const modTarget = moderatable && target ? { targetType: r.target_type as ModerationTargetType, targetId: r.target_id } : null
  const ownerActionable = owner && owner.id !== myId ? owner : null

  return (
    <ReportDetailView
      lang={lang}
      refLabel={reportRef(r.id)}
      subtitle={t('admin.reports.detail_subtitle', lang, {
        time: relativeTimeLabel(r.created_at, lang, now),
        reason: lang === 'fr' ? reasonLabel.toLocaleLowerCase('fr') : reasonLabel,
      })}
      status={r.status}
      claim={r.status === 'open' ? <ClaimButton reportId={r.id} /> : null}
      openPage={openPage}
      content={content}
      reasonTone={severityTone(r.reason)}
      reasonLabel={reasonLabel}
      description={r.description}
      others={others}
      othersFailed={Boolean(othersError)}
      closed={
        r.status === 'resolved' || r.status === 'dismissed'
          ? {
              headerKey: r.status === 'resolved' ? 'admin.reports.field_admin_note' : 'admin.reports.dismissed_header',
              note: r.admin_note,
              date: fullDate(r.updated_at, lang),
            }
          : null
      }
      decision={
        <DecisionPanel
          reportId={r.id}
          canDecide={open}
          hide={modTarget && !target?.hiddenAt ? modTarget : null}
          unhide={modTarget && target?.hiddenAt ? modTarget : null}
          suspend={ownerActionable && !ownerActionable.suspended_at ? { userId: ownerActionable.id } : null}
          unsuspend={ownerActionable && ownerActionable.suspended_at ? { userId: ownerActionable.id } : null}
        />
      }
      reporter={reporterCard}
      owner={ownerCard}
    />
  )
}
