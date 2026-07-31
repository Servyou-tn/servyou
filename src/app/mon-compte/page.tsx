import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { UserCircle } from 'lucide-react'
import { AppShell } from '@/components/shell/AppShell'
import { ComingSoon } from '@/components/shell/ComingSoon'
import { getShellUser } from '@/lib/marche/shell-user'
import { getLang } from '@/lib/i18n/server'
import { t } from '@/lib/i18n'
import { AvatarUploadCard } from './_components/AvatarUploadCard'

export const metadata: Metadata = { title: 'Mon compte — Servyou' }

// Legacy account UI stripped (chore/strip-legacy-consumer-ui). Rebuilt from Figma (I1) in a
// later PR. Auth-gated as before — logged-out visitors go to /connexion with the return path
// preserved.
//
// The avatar card is ADDED above the placeholder rather than replacing it: it is the one consumer
// shipping with the storage foundation, and the rest of the account UI (identity fields, password,
// delete) is still I1's to build. Keeping ComingSoon below is what stops this reading as "the
// account page is done". When I1 lands, the card moves into its identity panel.
export default async function MonComptePage() {
  const shell = await getShellUser()
  if (!shell) redirect('/connexion?next=/mon-compte')
  const lang = await getLang()
  return (
    <AppShell user={shell.topBarUser}>
      <div className="flex flex-col gap-6">
        <AvatarUploadCard
          avatarUrl={shell.topBarUser.avatar_url ?? null}
          fullName={shell.topBarUser.full_name}
          lang={lang}
        />
        <ComingSoon
          icon={<UserCircle className="h-12 w-12" aria-hidden="true" />}
          title={t('placeholders.comingSoon.title', lang)}
          description={t('placeholders.comingSoon.account', lang)}
        />
      </div>
    </AppShell>
  )
}
