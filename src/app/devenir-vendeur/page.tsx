import type { Metadata } from 'next'
import { Briefcase, Store } from 'lucide-react'
import { AppShell } from '@/components/shell/AppShell'
import { RoleChoiceCard } from './_components/RoleChoiceCard'
import { AgeGateCard } from './_components/AgeGateCard'
import { AgeGateRefusalCard } from './_components/AgeGateRefusalCard'
import { getShellUser } from '@/lib/marche/shell-user'
import { getCurrentProfile } from '@/lib/marche/mon-compte'
import { resolveRole } from '@/lib/roles'
import { isOldEnoughToSignup, MIN_SELLER_AGE } from '@/lib/signup-validation'
import { getLang } from '@/lib/i18n/server'
import { t } from '@/lib/i18n'

export const metadata: Metadata = {
  title: 'Devenir vendeur — Servyou',
  description:
    'Lancez votre activité sur Servyou, en freelance ou en boutique. Sans commission. Pour vendre en Tunisie.',
}

// The shared seller entry (Figma 469:20560, founder-confirmed as a NEW page, not a
// redesign of the old /devenir-vendeur pitch). Runs BOTH gates once, before either role
// pitch is offered:
//   AGE  — date_of_birth is a display field (NOT NULL, populated for every real profile).
//          Under 18 swaps the whole cards+age-gate region for the refusal card (555:37196).
//          The DB trigger (23514) stays as the last line of defence, now unreachable via UI.
//   ROLE — a user who already holds one role sees the OTHER card unavailable with a short
//          explanation, never hidden. Their OWN matching card stays a plain link to its
//          pitch page (see docs/design/g1-discovery.md — routing it to their workspace
//          instead is a second, unrequested behaviour, logged for a founder call).
//
// Public: anonymous visitors see both cards (linking through to the pitch pages, which
// already branch signed-out CTAs to /inscription). The age-gate region only renders once
// there's a profile to read a date_of_birth from.
export default async function DevenirVendeurChoicePage() {
  const shell = await getShellUser()
  const lang = await getLang()
  const profile = shell ? await getCurrentProfile() : null
  const role = resolveRole(profile)
  const isUnderage = profile ? !isOldEnoughToSignup(profile.date_of_birth, MIN_SELLER_AGE) : false

  return (
    <AppShell user={shell?.topBarUser ?? null}>
      <div className="mx-auto max-w-[720px] px-4 py-10 sm:px-6 lg:px-0">
        {profile && isUnderage ? (
          <AgeGateRefusalCard dateOfBirth={profile.date_of_birth} lang={lang} />
        ) : (
          <>
            <div className="text-center">
              <p className="text-caption font-semibold tracking-wide text-brand-blue-600 uppercase">
                {t('devenir.choice.hero.eyebrow', lang)}
              </p>
              <h1 className="mt-3 text-h1 font-bold text-text-primary">{t('devenir.choice.hero.headline', lang)}</h1>
              <p className="mx-auto mt-3 max-w-lg text-body text-text-secondary">
                {t('devenir.choice.hero.subheadline', lang)}
              </p>
            </div>

            <div className="mt-10 grid grid-cols-1 gap-5 md:grid-cols-2">
              <RoleChoiceCard
                id="role-choice-freelance"
                href="/devenir-vendeur/freelance"
                icon={<Briefcase className="h-6 w-6 text-brand-blue-600" aria-hidden="true" />}
                title={t('devenir.choice.freelance.title', lang)}
                description={t('devenir.choice.freelance.description', lang)}
                points={[
                  t('devenir.choice.freelance.point1', lang),
                  t('devenir.choice.freelance.point2', lang),
                  t('devenir.choice.freelance.point3', lang),
                ]}
                disabled={role === 'shop_owner'}
                unavailableLabel={t('devenir.choice.unavailable.asShopOwner', lang)}
              />
              <RoleChoiceCard
                id="role-choice-boutique"
                href="/devenir-vendeur/boutique"
                icon={<Store className="h-6 w-6 text-brand-blue-600" aria-hidden="true" />}
                title={t('devenir.choice.boutique.title', lang)}
                description={t('devenir.choice.boutique.description', lang)}
                points={[
                  t('devenir.choice.boutique.point1', lang),
                  t('devenir.choice.boutique.point2', lang),
                  t('devenir.choice.boutique.point3', lang),
                ]}
                disabled={role === 'freelancer'}
                unavailableLabel={t('devenir.choice.unavailable.asFreelancer', lang)}
              />
            </div>

            {profile && <AgeGateCard dateOfBirth={profile.date_of_birth} lang={lang} />}
          </>
        )}
      </div>
    </AppShell>
  )
}
