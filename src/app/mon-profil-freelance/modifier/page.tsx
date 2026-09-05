import type { Metadata } from 'next'
import Link from 'next/link'
import { AppShell } from '@/components/shell/AppShell'
import { requireFreelancer } from '@/lib/auth/require-seller'
import { createClient } from '@/lib/supabase/server'
import { getFreelancerProfileForEdit } from '@/lib/marche/freelancer-profile-edit'
import { getLang } from '@/lib/i18n/server'
import { t } from '@/lib/i18n'
import { FOCUS_RING } from '@/components/layout/styles'
import { ProfileEditForm } from './_components/ProfileEditForm'

export const metadata: Metadata = { title: 'Modifier mon profil — Servyou' }

const ROUTE = '/mon-profil-freelance/modifier'

// H3 « Modifier mon profil » — Figma 404:11909, full field-by-field provenance in the PR
// description (measured/founder-ruled per field, mirroring h4-discovery.md's own convention).
export default async function ModifierProfilPage() {
  const lang = await getLang()
  const { topBarUser, freelancerProfile } = await requireFreelancer(ROUTE)

  if (!freelancerProfile) {
    return (
      <AppShell user={topBarUser}>
        <div className="flex flex-col gap-4 rounded-xl border border-border-subtle bg-surface-base p-6">
          <h1 className="text-h1 text-text-primary">{t('freelance.edit.noProfile.title', lang)}</h1>
          <p className="text-body text-text-secondary">{t('freelance.edit.noProfile.body', lang)}</p>
          <Link
            href="/mon-profil-freelance/creer"
            className={`mt-2 inline-flex h-10 w-fit items-center justify-center rounded-lg bg-brand-blue-600 px-4 text-base font-semibold text-text-inverse transition-colors hover:bg-brand-blue-700 active:bg-brand-blue-800 motion-reduce:transition-none ${FOCUS_RING}`}
          >
            {t('freelance.edit.noProfile.cta', lang)}
          </Link>
        </div>
      </AppShell>
    )
  }

  const supabase = await createClient()
  const data = await getFreelancerProfileForEdit(supabase, freelancerProfile.id, topBarUser.id)
  if (!data) {
    // freelancer_profiles row existed a moment ago (requireFreelancer just resolved it) but is
    // gone by the time this read runs — a genuine TOCTOU, not expected in practice. Same
    // "real state, not a crash" posture as the !freelancerProfile branch above.
    return (
      <AppShell user={topBarUser}>
        <div className="flex flex-col gap-4 rounded-xl border border-border-subtle bg-surface-base p-6">
          <p className="text-body text-text-secondary">{t('common.error_generic', lang)}</p>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell user={topBarUser}>
      <div className="flex flex-col gap-2">
        <nav aria-label="Fil d'Ariane" className="text-sm text-text-muted">
          {t('freelance.edit.breadcrumb', lang)}
        </nav>
        <h1 className="text-h1 text-text-primary">{t('freelance.edit.page_title', lang)}</h1>
        <p className="text-body-sm text-text-secondary">{t('freelance.edit.page_subtitle', lang)}</p>
      </div>

      <div className="mt-6">
        <ProfileEditForm initial={data} lang={lang} />
      </div>
    </AppShell>
  )
}
