import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { Send } from 'lucide-react'
import { AppShell } from '@/components/shell/AppShell'
import { ComingSoon } from '@/components/shell/ComingSoon'
import { getShellUser } from '@/lib/marche/shell-user'
import { getLang } from '@/lib/i18n/server'
import { t } from '@/lib/i18n'

export const metadata: Metadata = { title: 'Demander — Servyou' }

type Props = { params: Promise<{ id: string }> }

// Legacy request-form UI stripped (chore/strip-legacy-consumer-ui). Rebuilt from Figma (E1)
// in a later PR. Auth-gated as before — logged-out visitors go to /connexion with the return
// path preserved.
export default async function DemanderPage({ params }: Props) {
  const shell = await getShellUser()
  if (!shell) {
    const { id } = await params
    redirect(`/connexion?next=${encodeURIComponent(`/demander/${id}`)}`)
  }
  const lang = await getLang()
  return (
    <AppShell user={shell.topBarUser}>
      <ComingSoon
        icon={<Send className="h-12 w-12" aria-hidden="true" />}
        title={t('placeholders.comingSoon.title', lang)}
        description={t('placeholders.comingSoon.request', lang)}
      />
    </AppShell>
  )
}
