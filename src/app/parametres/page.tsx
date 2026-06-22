import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { MarcheLayout } from '@/components/marche/MarcheLayout'
import { ParametresForm } from '@/components/parametres/ParametresForm'
import { PageHeader } from '@/components/shared/PageHeader'
import { getShellUser } from '@/lib/marche/shell-user'
import { getCurrentProfile } from '@/lib/marche/mon-compte'
import { getLang } from '@/lib/i18n/server'
import { t } from '@/lib/i18n'

export const metadata: Metadata = { title: 'Paramètres — Servyou' }

// Consumer settings (auth-gated → /connexion?next=/parametres). Four sections built on
// the /mon-compte template: Notifications + Visibilité + Comptes connectés are
// "Bientôt disponible" placeholders (post-MVP); Confidentialité→export and Langue work.
export default async function ParametresPage() {
  const shell = await getShellUser()
  if (!shell) redirect('/connexion?next=/parametres')

  const profile = await getCurrentProfile()
  if (!profile) redirect('/connexion?next=/parametres')

  const lang = await getLang()

  return (
    <MarcheLayout user={shell.topBarUser}>
      <PageHeader
        subtitle={t('page_header.parametres.subtitle', lang)}
        emphasisWord={t('page_header.parametres.emphasis', lang)}
      />
      <ParametresForm profile={profile} />
    </MarcheLayout>
  )
}
