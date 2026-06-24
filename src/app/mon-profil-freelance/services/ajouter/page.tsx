import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { FreelancerLayout } from '@/components/freelance/FreelancerLayout'
import { ServiceForm } from '@/components/freelance/ServiceForm'
import { getShellUser } from '@/lib/marche/shell-user'
import { getFreelancerProfileId, getServiceCategories } from '@/lib/freelance/services-data'
import { getLang } from '@/lib/i18n/server'
import { t } from '@/lib/i18n'

export const metadata: Metadata = { title: 'Ajouter un service — Servyou' }

// Create a new service listing. Server Component; guard chain mirrors the services list (not authed
// → /connexion, not a freelancer → /devenir-freelance, no freelancer_profiles row → /creer).
export default async function AjouterServicePage() {
  const shell = await getShellUser()
  if (!shell) redirect('/connexion?next=/mon-profil-freelance/services/ajouter')
  if (shell.topBarUser.seller_type !== 'freelancer') redirect('/devenir-freelance')

  const profileId = await getFreelancerProfileId(shell.id)
  if (!profileId) redirect('/mon-profil-freelance/creer')

  const lang = await getLang()
  const categories = await getServiceCategories()

  return (
    <FreelancerLayout
      user={shell.topBarUser}
      subtitle={t('page_header.services_add.subtitle', lang)}
      emphasisWord={t('page_header.services_add.emphasis', lang)}
    >
      <ServiceForm mode="create" categories={categories} />
    </FreelancerLayout>
  )
}
