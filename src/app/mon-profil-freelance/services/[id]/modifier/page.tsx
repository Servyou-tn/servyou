import type { Metadata } from 'next'
import { redirect, notFound } from 'next/navigation'
import { FreelancerLayout } from '@/components/freelance/FreelancerLayout'
import { ServiceForm } from '@/components/freelance/ServiceForm'
import { getShellUser } from '@/lib/marche/shell-user'
import {
  getFreelancerProfileId,
  getServiceCategories,
  getServiceForEdit,
} from '@/lib/freelance/services-data'
import { getLang } from '@/lib/i18n/server'
import { t } from '@/lib/i18n'

export const metadata: Metadata = { title: 'Modifier un service — Servyou' }

// Edit an existing service listing. Same guard chain as create, plus an ownership check:
// getServiceForEdit is scoped to the caller's freelancer_profile_id, so a non-owned / unknown id
// returns null → notFound() (404). RLS also enforces ownership on the UPDATE itself.
export default async function ModifierServicePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const shell = await getShellUser()
  if (!shell) redirect(`/connexion?next=/mon-profil-freelance/services/${id}/modifier`)
  if (shell.topBarUser.seller_type !== 'freelancer') redirect('/devenir-freelance')

  const profileId = await getFreelancerProfileId(shell.id)
  if (!profileId) redirect('/mon-profil-freelance/creer')

  const service = await getServiceForEdit(id, profileId)
  if (!service) notFound()

  const lang = await getLang()
  const categories = await getServiceCategories()

  return (
    <FreelancerLayout
      user={shell.topBarUser}
      subtitle={t('page_header.services_edit.subtitle', lang)}
      emphasisWord={t('page_header.services_edit.emphasis', lang)}
    >
      <ServiceForm
        mode="edit"
        serviceId={service.id}
        categories={categories}
        initialValues={{
          title: service.title,
          categoryId: service.categoryId,
          description: service.description,
          startingPrice: service.startingPrice,
          deliveryTime: service.deliveryTime,
          status: service.status,
          deliverables: service.deliverables,
          revisions: service.revisions,
          tags: service.tags,
          buyerBriefing: service.buyerBriefing,
        }}
      />
    </FreelancerLayout>
  )
}
