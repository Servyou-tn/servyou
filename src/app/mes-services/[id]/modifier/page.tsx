import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { ReactNode } from 'react'
import { ChevronRight } from 'lucide-react'
import { AppShell } from '@/components/shell/AppShell'
import { ModerationBanner } from '@/components/ModerationBanner'
import { StatusPill } from '@/components/ui/status-pill'
import { FOCUS_RING } from '@/components/layout/styles'
import { requireFreelancer } from '@/lib/auth/require-seller'
import { getServiceForEdit } from '@/lib/freelance/service-draft-query'
import { getLang } from '@/lib/i18n/server'
import { t, type Lang } from '@/lib/i18n'
import { createClient } from '@/lib/supabase/server'
import { cn } from '@/lib/utils'
import { ServiceWizard } from '../../creer/_components/ServiceWizard'
import { StepPublication } from '../../creer/_components/StepPublication'
import { getStatusPresentation } from '../../_components/service-status'

export const metadata: Metadata = { title: 'Modifier le service — Servyou' }

// H7 « Modifier un service » — /mes-services/[id]/modifier (docs/design/h7-deltas.md). No Figma frame
// exists for it: it is the H6 wizard (docs/design/h6-measurements.md, h6-pr*-deltas.md) in edit mode.
//
// Who sees what, decided here on the server from the row itself:
//   • unknown id, malformed id, somebody else's service → one indistinguishable 404 (same convention as
//     G7 / G9, so the response can't probe which ids exist);
//   • a DRAFT → exactly the create flow (resume, autosave, step 5 « Publier mon service »), on this id;
//   • active or paused → edit mode: all five steps prefilled, no autosave, explicit save, status unchanged;
//   • paused BY THE MODERATION (admin_hidden_at) → read-only: the existing ModerationBanner notice and the
//     récapitulatif without « Modifier ». updateServiceAction refuses it too — this is not the only lock.
// Pause / activate / delete stay in H5; this page only shows the current status pill.

export default async function ModifierServicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [lang, { topBarUser, freelancerProfile }] = await Promise.all([
    getLang(),
    requireFreelancer(`/mes-services/${id}/modifier`),
  ])

  // A freelancer without a profile row owns no service.
  if (!freelancerProfile) notFound()

  const supabase = await createClient()
  const service = await getServiceForEdit(supabase, freelancerProfile.id, id)
  if (!service) notFound()

  if (service.status === 'draft') {
    return (
      <AppShell user={topBarUser}>
        <div className="flex flex-col gap-6">
          <PageIntro lang={lang} titleKey="service.wizard.page_title" subtitleKey="service.wizard.page_subtitle" />
          <ServiceWizard initialDraftId={service.id} initialForm={service.form} initialStep={service.step} />
        </div>
      </AppShell>
    )
  }

  const status = getStatusPresentation(service, lang)

  return (
    <AppShell user={topBarUser}>
      <div className="flex flex-col gap-6">
        <PageIntro
          lang={lang}
          titleKey="service.edit.page_title"
          subtitleKey="service.edit.page_subtitle"
          pill={<StatusPill status={status.pillStatus}>{status.pillLabel}</StatusPill>}
        />
        {service.adminHiddenAt != null ? (
          <div className="flex flex-col gap-2">
            <ModerationBanner variant="service" />
            <section className="flex flex-col gap-5 rounded-xl border border-border-subtle bg-surface-base p-6">
              <p className="text-body-sm text-text-secondary">{t('service.edit.readonly_note', lang)}</p>
              <StepPublication lang={lang} form={service.form} errorKey={null} failedFields={[]} disabled readOnly />
            </section>
          </div>
        ) : (
          <ServiceWizard
            mode="edit"
            serviceId={service.id}
            initialDraftId={null}
            initialForm={service.form}
            initialStep={service.step}
          />
        )}
      </div>
    </AppShell>
  )
}

// The H6 page-header (459:18746): breadcrumb → H1 → subtitle, stacked gap 8; here the H1 carries the
// service's current status pill beside it. « Mes services » links back to H5.
function PageIntro({
  lang,
  titleKey,
  subtitleKey,
  pill,
}: {
  lang: Lang
  titleKey: string
  subtitleKey: string
  pill?: ReactNode
}) {
  return (
    <div className="flex flex-col gap-2">
      <nav aria-label={t('service.wizard.breadcrumb_aria', lang)}>
        <ol className="flex items-center gap-2 text-sm font-medium text-text-muted">
          <li>
            <Link href="/mes-services" className={cn('rounded hover:text-text-primary hover:underline', FOCUS_RING)}>
              {t('service.list_title', lang)}
            </Link>
          </li>
          <li aria-hidden="true" className="flex items-center">
            <ChevronRight className="h-3.5 w-3.5 rtl:rotate-180" />
          </li>
          <li aria-current="page">{t(titleKey, lang)}</li>
        </ol>
      </nav>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-h1 text-text-primary">{t(titleKey, lang)}</h1>
        {pill}
      </div>
      <p className="text-body-sm text-text-secondary">{t(subtitleKey, lang)}</p>
    </div>
  )
}
