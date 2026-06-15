import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { MarcheLayout } from '@/components/marche/MarcheLayout'
import { ParametresForm } from '@/components/parametres/ParametresForm'
import { getShellUser } from '@/lib/marche/shell-user'
import { getCurrentProfile } from '@/lib/marche/mon-compte'

export const metadata: Metadata = { title: 'Paramètres — Servyou' }

// Consumer settings (auth-gated → /connexion?next=/parametres). Four sections built on
// the /mon-compte template: Notifications + Visibilité + Comptes connectés are
// "Bientôt disponible" placeholders (post-MVP); Confidentialité→export and Langue work.
export default async function ParametresPage() {
  const shell = await getShellUser()
  if (!shell) redirect('/connexion?next=/parametres')

  const profile = await getCurrentProfile()
  if (!profile) redirect('/connexion?next=/parametres')

  return (
    <MarcheLayout user={shell.topBarUser}>
      <ParametresForm profile={profile} />
    </MarcheLayout>
  )
}
