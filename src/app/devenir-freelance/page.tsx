import type { Metadata } from 'next'
import { MarcheLayout } from '@/components/marche/MarcheLayout'
import { DevenirFreelanceContent } from '@/components/devenir/DevenirFreelanceContent'
import { AlreadyHaveRole } from '@/components/devenir/AlreadyHaveRole'
import { getShellUser } from '@/lib/marche/shell-user'
import { getCurrentProfile } from '@/lib/marche/mon-compte'
import { resolveRole } from '@/lib/roles'
import { getLang } from '@/lib/i18n/server'
import { t } from '@/lib/i18n'

export const metadata: Metadata = {
  title: 'Devenir freelance — Servyou',
  description:
    'Travaillez en freelance sur Servyou. Listez vos services, trouvez des missions, développez votre activité. Sans commission.',
}

// Public role-upgrade page. Three states: visitor → CTA to /inscription?next=…;
// consumer (seller_type null) → CTA to /mon-profil-freelance/creer; existing freelancer →
// AlreadyHaveRole.
export default async function DevenirFreelancePage() {
  const shell = await getShellUser()
  const lang = await getLang()
  const profile = shell ? await getCurrentProfile() : null

  return (
    <MarcheLayout user={shell?.topBarUser ?? null}>
      {resolveRole(profile) === 'freelancer' ? (
        <AlreadyHaveRole
          headline={t('devenir.freelance.already.headline', lang)}
          subheadline={t('devenir.freelance.already.subheadline', lang)}
          manageHref="/mon-profil-freelance"
          manageLabel={t('devenir.freelance.already.manage', lang)}
        />
      ) : (
        <DevenirFreelanceContent isAuthenticated={Boolean(shell)} />
      )}
    </MarcheLayout>
  )
}
