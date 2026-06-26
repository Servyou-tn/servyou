import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Bookmark } from 'lucide-react'
import { FreelancerLayout } from '@/components/freelance/FreelancerLayout'
import { EmptyState } from '@/components/marche/EmptyState'
import { getShellUser } from '@/lib/marche/shell-user'
import { getLang } from '@/lib/i18n/server'
import { t } from '@/lib/i18n'

export const metadata: Metadata = { title: 'Missions sauvegardées — Servyou' }

// Placeholder for the freelancer's saved missions (PR-F2.3.1) — kills the sidebar 404 with a real,
// guarded page + empty state; the actual save feature (+ saved_missions table) ships in PR-F5. Same
// auth/role guard chain as the dashboard. No data reads: an empty state + a "Bientôt disponible"
// note. The h1 is owned by FreelancerLayout's PageHeader (subtitle), so the body carries no second h1.
export default async function MissionsSauvegardeesPage() {
  const shell = await getShellUser()
  if (!shell) redirect('/connexion?next=/mon-profil-freelance/missions-sauvegardees')
  if (shell.topBarUser.seller_type !== 'freelancer') redirect('/devenir-freelance')

  const lang = await getLang()
  return (
    <FreelancerLayout
      user={shell.topBarUser}
      subtitle={t('page_header.freelance_saved.subtitle', lang)}
      emphasisWord={t('page_header.freelance_saved.emphasis', lang)}
    >
      <div className="mt-2 space-y-5">
        <EmptyState
          icon={<Bookmark className="mx-auto h-12 w-12" strokeWidth={1.5} aria-hidden="true" />}
          message={t('freelance.missions_sauvegardees.empty_title', lang)}
          cta={{ label: t('freelance.missions_sauvegardees.empty_cta', lang), href: '/emplois' }}
        />
        <div className="mx-auto max-w-md text-center">
          <p className="text-sm text-text-muted">{t('freelance.missions_sauvegardees.empty_description', lang)}</p>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
            <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
              {t('marche.sidebar.coming_soon', lang)}
            </span>
            <span className="text-sm text-text-muted">{t('freelance.missions_sauvegardees.coming_soon_note', lang)}</span>
          </div>
        </div>
      </div>
    </FreelancerLayout>
  )
}
