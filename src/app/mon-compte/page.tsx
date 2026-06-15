import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { MarcheLayout } from '@/components/marche/MarcheLayout'
import { MonCompteForm } from '@/components/mon-compte/MonCompteForm'
import { getShellUser } from '@/lib/marche/shell-user'
import { getCurrentProfile } from '@/lib/marche/mon-compte'

export const metadata: Metadata = { title: 'Mon compte — Servyou' }

// First consumer account page. Auth-gated (own data) → /connexion?next=/mon-compte when
// logged out. The locked pattern here (3 sections: identity / password / delete) is the
// template for future settings pages (/parametres, seller profile edits).
export default async function MonComptePage() {
  const shell = await getShellUser()
  if (!shell) redirect('/connexion?next=/mon-compte')

  const profile = await getCurrentProfile()
  if (!profile) redirect('/connexion?next=/mon-compte')

  return (
    <MarcheLayout user={shell.topBarUser}>
      <MonCompteForm profile={profile} />
    </MarcheLayout>
  )
}
