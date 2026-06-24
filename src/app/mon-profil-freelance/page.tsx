import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { AlertCircle, CheckCircle2 } from 'lucide-react'
import { FreelancerLayout } from '@/components/freelance/FreelancerLayout'
import { OrderStatusBadge } from '@/components/marche/OrderStatusBadge'
import { EmptyState } from '@/components/marche/EmptyState'
import { getShellUser } from '@/lib/marche/shell-user'
import { getFreelancerDashboard, getRecentPendingDemandes } from '@/lib/freelance/dashboard-data'
import { statusLabelKey, type OrderStatus } from '@/lib/types/order-status'
import { getLang } from '@/lib/i18n/server'
import { t } from '@/lib/i18n'

export const metadata: Metadata = { title: 'Mon espace freelance — Servyou' }

// The freelancer workspace landing page. Server Component: auth + role + profile guards run
// before any render, then the dashboard reads happen server-side. Guard chain (extracted from
// the recovered pre-cleanup dashboard, re-pointed to the real routes):
//   1. not authenticated        → /connexion (with ?next back here)
//   2. not a freelancer         → /devenir-freelance (the upgrade page)
//   3. freelancer, no profile   → in-shell empty state + CTA to /mon-profil-freelance/creer
//      (a soft fall-through, not a redirect, because /creer ships in PR-F1.2)
export default async function MonProfilFreelancePage() {
  const shell = await getShellUser()
  if (!shell) redirect('/connexion?next=/mon-profil-freelance')
  if (shell.topBarUser.seller_type !== 'freelancer') redirect('/devenir-freelance')

  const lang = await getLang()
  const subtitle = t('page_header.mon_profil_freelance.subtitle', lang)
  const emphasis = t('page_header.mon_profil_freelance.emphasis', lang)

  const dash = await getFreelancerDashboard(shell.id)

  // Freelancer upgraded but no profile row yet → empty-state CTA inside the shell.
  if (!dash.profile) {
    return (
      <FreelancerLayout user={shell.topBarUser} subtitle={subtitle} emphasisWord={emphasis}>
        <div className="mt-10 flex flex-col items-center justify-center rounded-2xl border border-border-subtle bg-white px-6 py-16 text-center">
          <h2 className="text-lg font-semibold text-text-primary">
            {t('freelance.dashboard.no_profile.title', lang)}
          </h2>
          <Link
            href="/mon-profil-freelance/creer"
            className="mt-5 inline-flex h-11 items-center justify-center rounded-full bg-brand-accent px-6 text-sm font-medium text-white transition-colors hover:bg-brand-accent/90"
          >
            {t('freelance.dashboard.no_profile.cta', lang)}
          </Link>
        </div>
      </FreelancerLayout>
    )
  }

  // Profile exists → surface the pending demandes awaiting the freelancer's response.
  // seller_id keys on the auth uid (shell.id), not the freelancer_profiles row id.
  const pendingDemandes = await getRecentPendingDemandes(shell.id)

  const m = dash.metrics
  const stats: { label: string; value: string; muted?: boolean }[] = [
    { label: t('freelance.dashboard.metric.active_services', lang), value: String(m.activeServices) },
    { label: t('freelance.dashboard.metric.pending_requests', lang), value: String(m.pendingRequests) },
    { label: t('freelance.dashboard.metric.sent_responses', lang), value: String(m.sentResponses) },
    {
      label: t('freelance.dashboard.metric.saved_missions', lang),
      value: m.savedMissions == null ? t('marche.sidebar.coming_soon', lang) : String(m.savedMissions),
      muted: m.savedMissions == null,
    },
  ]

  const actions: { label: string; href: string }[] = [
    { label: t('freelance.dashboard.action.add_service', lang), href: '/mon-profil-freelance/services/ajouter' },
    { label: t('freelance.dashboard.action.browse_missions', lang), href: '/emplois' },
    { label: t('freelance.dashboard.action.edit_profile', lang), href: '/mon-profil-freelance/modifier' },
  ]

  return (
    <FreelancerLayout user={shell.topBarUser} subtitle={subtitle} emphasisWord={emphasis}>
      {/* a) Summary metrics — 4 stat cards */}
      <div className="mt-2 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className="rounded-2xl border border-border-subtle bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.06)]"
          >
            <div className={s.muted ? 'text-sm font-medium text-text-muted' : 'text-2xl font-bold text-text-primary'}>
              {s.value}
            </div>
            <div className="mt-1 text-sm text-text-muted">{s.label}</div>
          </div>
        ))}
      </div>

      {/* a2) Actions requises — pending service demandes awaiting the freelancer's response.
          Restrained per constitution: an amber icon + label signal attention, no loud color block. */}
      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between gap-4">
          <h2 className="flex items-center gap-2 text-base font-semibold text-text-primary">
            <AlertCircle className="h-5 w-5 text-amber-500" aria-hidden="true" />
            {t('freelance.dashboard.actions_required.title', lang)}
          </h2>
          {pendingDemandes.length > 0 && (
            <Link
              href="/mon-profil-freelance/commandes?status=pending"
              className="whitespace-nowrap text-sm font-medium text-brand-accent hover:underline"
            >
              {t('freelance.dashboard.actions_required.view_all', lang)}
            </Link>
          )}
        </div>

        {pendingDemandes.length === 0 ? (
          <EmptyState
            icon={<CheckCircle2 className="mx-auto h-12 w-12" strokeWidth={1.5} aria-hidden="true" />}
            message={t('freelance.dashboard.actions_required.empty', lang)}
          />
        ) : (
          <ul className="space-y-3">
            {pendingDemandes.map((demande) => (
              <li
                key={demande.id}
                className="flex items-center justify-between gap-4 rounded-2xl border border-border-subtle bg-white p-4"
              >
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-sm font-medium text-text-primary">
                    {demande.serviceTitle ?? '—'}
                  </h3>
                  <p className="mt-1 text-xs text-text-muted">
                    {[demande.buyerName || '—', demande.buyerCity, new Date(demande.created_at).toLocaleDateString('fr-FR')]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <OrderStatusBadge
                    status="pending"
                    label={t(statusLabelKey('pending', 'service'), lang)}
                  />
                  <Link
                    href={`/mon-profil-freelance/commandes/${demande.id}`}
                    className="whitespace-nowrap text-sm font-medium text-brand-accent hover:underline"
                  >
                    {t('common.view_details', lang)}
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* b) Quick actions — secondary brand-tinted outline pills (not the loud solid CTA) */}
      <div className="mt-6 flex flex-wrap gap-3">
        {actions.map((a) => (
          <Link
            key={a.href}
            href={a.href}
            className="inline-flex h-11 items-center justify-center rounded-full border border-brand-accent/40 bg-brand-accent/5 px-5 text-sm font-medium text-brand-accent transition-colors hover:bg-brand-accent/10"
          >
            {a.label}
          </Link>
        ))}
      </div>

      {/* c) Recent activity — last 3 incoming service requests */}
      <div className="mt-8">
        <h2 className="mb-3 text-base font-semibold text-text-primary">
          {t('freelance.dashboard.recent_activity.title', lang)}
        </h2>
        {dash.recentRequests.length === 0 ? (
          <div className="rounded-2xl border border-border-subtle bg-white px-6 py-10 text-center text-sm text-text-muted">
            {t('freelance.dashboard.recent_activity.empty', lang)}
          </div>
        ) : (
          <ul className="space-y-2">
            {dash.recentRequests.map((r) => (
              <li
                key={r.id}
                className="flex items-center justify-between gap-4 rounded-2xl border border-border-subtle bg-white px-4 py-3"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-text-primary">{r.serviceTitle ?? '—'}</div>
                  <div className="text-xs text-text-muted">
                    {r.requesterName || '—'} · {new Date(r.created_at).toLocaleDateString('fr-FR')}
                  </div>
                </div>
                <OrderStatusBadge
                  status={r.status}
                  label={t(statusLabelKey(r.status as OrderStatus, 'service'), lang)}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </FreelancerLayout>
  )
}
