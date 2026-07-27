import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { AppShell } from '@/components/shell/AppShell'
import { ServiceDetail } from '@/components/marche/ServiceDetail'
import { getServiceDetail, getRelatedServices } from '@/lib/marche/service-detail'
import { getShellUser } from '@/lib/marche/shell-user'
import { getLang } from '@/lib/i18n/server'

// D2 — service detail, rebuilt from Figma 666:55479 (1440) / 668:55920 (375). Replaces the
// ComingSoon stub left by chore/strip-legacy-consumer-ui, which ignored the [id] entirely.
// Public route: nullable shell user, no auth gate. getServiceDetail already enforces
// moderation (status='active' AND the service's own admin_hidden_at IS NULL AND the
// freelancer's admin_hidden_at IS NULL via the !inner cascade), so a hidden service 404s
// rather than leaking.

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const service = await getServiceDetail(id)
  return { title: service ? `${service.title} — Servyou` : 'Service — Servyou' }
}

export default async function ServicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const service = await getServiceDetail(id)
  if (!service) notFound()

  const [shell, lang, related] = await Promise.all([
    getShellUser(),
    getLang(),
    getRelatedServices({
      serviceId: service.id,
      freelancerProfileId: service.freelancerProfileId,
      categoryId: service.categoryId,
    }),
  ])

  return (
    <AppShell user={shell?.topBarUser ?? null}>
      <ServiceDetail service={service} related={related} lang={lang} />
    </AppShell>
  )
}
