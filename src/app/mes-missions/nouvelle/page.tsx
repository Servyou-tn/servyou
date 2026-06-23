import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { MarcheLayout } from '@/components/marche/MarcheLayout'
import { MissionForm } from '@/components/marche/MissionForm'
import { getShellUser } from '@/lib/marche/shell-user'
import { getCategories } from '@/lib/marche/my-data'
import { PageHeader } from '@/components/shared/PageHeader'
import { getLang } from '@/lib/i18n/server'
import { t } from '@/lib/i18n'

export const metadata: Metadata = { title: 'Nouvelle mission — Servyou' }

// Minimal create-mission form. Auth-gated; the insert (RLS: consumer_id = auth.uid()) is
// the real guard, with shared app-layer validation for friendly errors.
export default async function NouvelleMissionPage() {
  const shell = await getShellUser()
  if (!shell) redirect('/connexion')

  const lang = await getLang()
  const categories = await getCategories()

  return (
    <MarcheLayout user={shell.topBarUser}>
      <PageHeader
        subtitle={t('page_header.nouvelle_mission.subtitle', lang)}
        emphasisWord={t('page_header.nouvelle_mission.emphasis', lang)}
      />
      <MissionForm categories={categories} />
    </MarcheLayout>
  )
}
