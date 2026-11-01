import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { AppShell } from '@/components/shell/AppShell'
import { FreelancerDetail } from './_components/FreelancerDetail'
import {
  getFreelancerDetail,
  getFreelancerServices,
  getCompletedProjectCount,
  getViewerContactPhone,
  getViewerPendingRequest,
} from '@/lib/marche/freelancer-detail'
import { getShellUser } from '@/lib/marche/shell-user'
import { getFavoriteState } from '@/lib/marche/favorite-state'
import { getLang } from '@/lib/i18n/server'

// D4 — public freelancer profile, rebuilt from Figma 390:10676. Mirrors /boutique/[id]/page.tsx
// exactly: public route (nullable shell, no auth gate), admin_hidden_at-gated fetch wrapped in
// cache() so generateMetadata + the render share one fetch, notFound() on a missing/hidden/
// unpublished target rather than leaking. The id is freelancer_profiles.id, a bare uuid.

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const freelancer = await getFreelancerDetail(id)
  return { title: freelancer ? `${freelancer.fullName} — Servyou` : 'Freelance — Servyou' }
}

export default async function FreelancePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const freelancer = await getFreelancerDetail(id)
  if (!freelancer) notFound()

  const [shell, lang, services, completedProjectCount, contactPhone, isFavorited] = await Promise.all([
    getShellUser(),
    getLang(),
    getFreelancerServices(freelancer.id, freelancer.fullName, freelancer.city),
    getCompletedProjectCount(freelancer.profileId),
    getViewerContactPhone(freelancer.profileId),
    getFavoriteState('freelancer', freelancer.id),
  ])

  // Only asked when there is no number to show: the viewer's pending request is what explains its absence (phone reveal rule).
  // An anonymous visitor has no request to wait on, so no extra auth round trip for them.
  const pendingRequest = contactPhone || !shell ? false : await getViewerPendingRequest(freelancer.profileId)

  return (
    <AppShell user={shell?.topBarUser ?? null}>
      <FreelancerDetail
        freelancer={freelancer}
        services={services}
        completedProjectCount={completedProjectCount}
        contactPhone={contactPhone}
        lang={lang}
        isLoggedIn={Boolean(shell)}
        isFavorited={isFavorited}
        pendingRequest={pendingRequest}
      />
    </AppShell>
  )
}
