import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Briefcase } from 'lucide-react'
import { FreelancerLayout } from '@/components/freelance/FreelancerLayout'
import { EmptyState } from '@/components/marche/EmptyState'
import { ServiceCard } from '@/components/freelance/ServiceCard'
import { getShellUser } from '@/lib/marche/shell-user'
import { getFreelancerProfileId, getMyServices } from '@/lib/freelance/services-data'
import { getLang } from '@/lib/i18n/server'
import { t } from '@/lib/i18n'

export const metadata: Metadata = { title: 'Mes services — Servyou' }

// The freelancer's services list (owner view) — manage your offerings. Server Component; the guard
// chain mirrors the dashboard: not authed → /connexion, not a freelancer → /devenir-freelance, no
// freelancer_profiles row yet → /mon-profil-freelance/creer. The "Ajouter" CTA and each card's
// "Modifier" link target routes that ship in later PRs (F2.2 / F2.3) and 404 until then.
export default async function MesServicesPage() {
  const shell = await getShellUser()
  if (!shell) redirect('/connexion?next=/mon-profil-freelance/services')
  if (shell.topBarUser.seller_type !== 'freelancer') redirect('/devenir-freelance')

  const profileId = await getFreelancerProfileId(shell.id)
  if (!profileId) redirect('/mon-profil-freelance/creer')

  const lang = await getLang()
  const services = await getMyServices(profileId)

  return (
    <FreelancerLayout
      user={shell.topBarUser}
      subtitle={t('freelance.services.subtitle', lang)}
      emphasisWord={t('freelance.services.emphasis', lang)}
    >
      {/* Top action bar — total count + add CTA. */}
      <div className="mb-6 flex items-center justify-between gap-3">
        <p className="text-sm text-text-muted">
          {t('freelance.services.total', lang, { count: services.length })}
        </p>
        <Link
          href="/mon-profil-freelance/services/ajouter"
          className="inline-flex h-11 shrink-0 items-center justify-center rounded-full bg-brand-accent px-5 text-sm font-medium text-white transition-colors hover:bg-brand-accent/90"
        >
          {t('freelance.services.add', lang)}
        </Link>
      </div>

      {services.length === 0 ? (
        <EmptyState
          icon={<Briefcase className="mx-auto h-12 w-12" strokeWidth={1.5} aria-hidden="true" />}
          message={t('freelance.services.empty', lang)}
          cta={{ label: t('freelance.services.create_first', lang), href: '/mon-profil-freelance/services/ajouter' }}
        />
      ) : (
        <ul className="space-y-3">
          {services.map((service) => (
            <ServiceCard key={service.id} service={service} />
          ))}
        </ul>
      )}
    </FreelancerLayout>
  )
}
