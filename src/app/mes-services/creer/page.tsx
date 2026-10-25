import type { Metadata } from 'next'
import Link from 'next/link'
import { AppShell } from '@/components/shell/AppShell'
import { FOCUS_RING } from '@/components/layout/styles'
import { requireFreelancer } from '@/lib/auth/require-seller'
import { getResumableDraft } from '@/lib/freelance/service-draft-query'
import { EMPTY_DRAFT } from '@/lib/freelance/service-draft'
import { getLang } from '@/lib/i18n/server'
import { t } from '@/lib/i18n'
import { createClient } from '@/lib/supabase/server'
import { cn } from '@/lib/utils'
import { WizardPageIntro } from '../_components/WizardPageIntro'
import { ServiceWizard } from './_components/ServiceWizard'

export const metadata: Metadata = { title: 'Créer un service — Servyou' }

const ROUTE = '/mes-services/creer'

// H6 « Créer un service » — Figma 459:18610 (step 1) / 461:19405 (step 2) / 459:18966 (step 3) /
// 459:19023 (step 4) / 459:19071 (step 5), measured in docs/design/h6-measurements.md; diffs + founder
// rulings in docs/design/h6-pr2-deltas.md, h6-pr3-deltas.md and h6-pr4-deltas.md.
// PR-2 shipped the shell + steps 1–2, PR-3 steps 3–4, PR-4 step 5 + « Publier mon service » (→ ./succes)
// and the four « Créer un service » CTAs that lead here (H5 header + empty state, H4 dashboard ×2).
//
// The page resolves who is creating and where they left off; everything after that is the client
// ServiceWizard. Resume is silent (founder ruling): the newest draft, on the first step it doesn't
// pass yet — see getResumableDraft.

export default async function CreerServicePage() {
  const [lang, { topBarUser, freelancerProfile }] = await Promise.all([getLang(), requireFreelancer(ROUTE)])

  if (!freelancerProfile) {
    // A freelancer (seller_type='freelancer') who never finished H2 step 1 — same state and strings as
    // H5 (/mes-services) and H4: a service needs a freelancer_profiles row to belong to.
    return (
      <AppShell user={topBarUser}>
        <div className="flex flex-col gap-6">
          <WizardPageIntro lang={lang} titleKey="service.wizard.page_title" subtitleKey="service.wizard.page_subtitle" />
          <div className="flex flex-col gap-2 rounded-2xl border border-border-subtle bg-surface-base p-6">
            <p className="text-body font-semibold text-text-primary">{t('freelance.dashboard.noProfile.title', lang)}</p>
            <p className="text-body-sm text-text-secondary">{t('freelance.dashboard.noProfile.body', lang)}</p>
            <Link
              href="/mon-profil-freelance/creer"
              className={cn(
                'mt-2 inline-flex h-10 w-fit items-center justify-center rounded-lg bg-brand-blue-600 px-4 text-base font-semibold text-text-inverse hover:bg-brand-blue-700',
                FOCUS_RING,
              )}
            >
              {t('freelance.dashboard.noProfile.cta', lang)}
            </Link>
          </div>
        </div>
      </AppShell>
    )
  }

  const supabase = await createClient()
  const draft = await getResumableDraft(supabase, freelancerProfile.id)

  return (
    <AppShell user={topBarUser}>
      <div className="flex flex-col gap-6">
        <WizardPageIntro lang={lang} titleKey="service.wizard.page_title" subtitleKey="service.wizard.page_subtitle" />
        <ServiceWizard
          initialDraftId={draft?.id ?? null}
          initialForm={draft?.form ?? EMPTY_DRAFT}
          initialStep={draft?.step ?? 1}
        />
      </div>
    </AppShell>
  )
}
