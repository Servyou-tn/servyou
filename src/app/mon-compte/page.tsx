import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { AppShell } from '@/components/shell/AppShell'
import { MonCompteForm } from '@/components/mon-compte/MonCompteForm'
import { PageHeader } from '@/components/shared/PageHeader'
import { getShellUser } from '@/lib/marche/shell-user'
import { getCurrentProfile } from '@/lib/marche/mon-compte'
import { getLang } from '@/lib/i18n/server'
import { t } from '@/lib/i18n'

export const metadata: Metadata = { title: 'Mon compte — Servyou' }

// First consumer account page. Auth-gated (own data) → /connexion?next=/mon-compte when
// logged out. The locked pattern here (3 sections: identity / password / delete) is the
// template for future settings pages (/parametres, seller profile edits).
export default async function MonComptePage() {
  const shell = await getShellUser()
  if (!shell) redirect('/connexion?next=/mon-compte')

  const profile = await getCurrentProfile()
  if (!profile) redirect('/connexion?next=/mon-compte')

  const lang = await getLang()

  return (
    <AppShell user={shell.topBarUser}>
      <PageHeader
        subtitle={t('page_header.mon_compte.subtitle', lang)}
        emphasisWord={t('page_header.mon_compte.emphasis', lang)}
      />
      <MonCompteForm profile={profile} />
    </AppShell>
  )
}
