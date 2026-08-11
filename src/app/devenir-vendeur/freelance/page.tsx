import type { Metadata } from 'next'
import { MarcheLayout } from '@/components/marche/MarcheLayout'
import { DevenirFreelanceContent } from '@/components/devenir/DevenirFreelanceContent'
import { getShellUser } from '@/lib/marche/shell-user'

export const metadata: Metadata = {
  title: 'Devenir freelance — Servyou',
  description:
    'Travaillez en freelance sur Servyou. Listez vos services, trouvez des missions, développez votre activité. Sans commission.',
}

// Moved from /devenir-freelance (unchanged content) — the shared role-choice entry now
// lives at /devenir-vendeur and links here. The role guard that used to live on this page
// (AlreadyHaveRole for an existing freelancer) moved upstream to the shared entry, which
// now marks this card unavailable before a visitor ever reaches this page — so it is not
// repeated here. Public: visitor → CTA to /inscription?next=…; consumer → CTA to
// /mon-profil-freelance/creer.
export default async function DevenirVendeurFreelancePage() {
  const shell = await getShellUser()

  return (
    <MarcheLayout user={shell?.topBarUser ?? null}>
      <DevenirFreelanceContent isAuthenticated={Boolean(shell)} />
    </MarcheLayout>
  )
}
