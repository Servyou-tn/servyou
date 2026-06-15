import type { Metadata } from 'next'
import Link from 'next/link'
import { MarcheLayout } from '@/components/marche/MarcheLayout'
import { ServiceDetail } from '@/components/services/ServiceDetail'
import { getShellUser } from '@/lib/marche/shell-user'
import { getServiceDetail, getRelatedServices } from '@/lib/marche/service-detail'
import { getLang } from '@/lib/i18n/server'
import { t } from '@/lib/i18n'
import { CARD_SHADOW, FOCUS_RING } from '@/components/layout/styles'

type Props = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const service = await getServiceDetail(id) // cached — shared with the page render
  return { title: service ? `${service.title} — Servyou` : 'Service introuvable — Servyou' }
}

// Public service detail page — sister of /produits/[id]. getShellUser is nullable
// (logged-out visitors get the "Se connecter" avatar); moderation is enforced in
// getServiceDetail (status='active' + service & freelancer not admin-hidden → null →
// not-found state).
export default async function ServicePage({ params }: Props) {
  const { id } = await params
  const lang = await getLang()
  const shell = await getShellUser()
  const service = await getServiceDetail(id)

  if (!service) {
    return (
      <MarcheLayout user={shell?.topBarUser ?? null}>
        <div className={`mx-auto max-w-md rounded-2xl bg-white p-12 text-center ${CARD_SHADOW}`}>
          <h1 className="text-lg font-semibold text-text-primary">{t('service.not_found', lang)}</h1>
          <p className="mt-2 text-sm text-text-muted">{t('service.not_found_desc', lang)}</p>
          <Link
            href="/marche?type=service"
            className={`mt-6 inline-flex items-center rounded-full bg-brand-accent px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-accent-light ${FOCUS_RING}`}
          >
            {t('marche.browse_cta', lang)}
          </Link>
        </div>
      </MarcheLayout>
    )
  }

  const related = await getRelatedServices({
    serviceId: service.id,
    freelancerProfileId: service.freelancerProfileId,
    categoryId: service.categoryId,
  })

  return (
    <MarcheLayout user={shell?.topBarUser ?? null}>
      <ServiceDetail service={service} related={related} isAuthenticated={Boolean(shell)} />
    </MarcheLayout>
  )
}
