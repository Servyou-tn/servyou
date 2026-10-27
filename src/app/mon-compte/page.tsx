import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { redirect } from 'next/navigation'
import { AppShell } from '@/components/shell/AppShell'
import { getShellUser } from '@/lib/marche/shell-user'
import { getCurrentProfile, getDeletionContext } from '@/lib/marche/mon-compte'
import { getLang } from '@/lib/i18n/server'
import { t } from '@/lib/i18n'
import { FOCUS_RING } from '@/components/layout/styles'
import { MonCompteForm } from './_components/MonCompteForm'

export const metadata: Metadata = { title: 'Mon compte — Servyou' }

// I1 « Mon compte » — Figma 724:63872 (1440) / 728:64216 (375); measurements in
// docs/design/i1-k-measurements.md. Identity + security + avatar + city; preferences live in I2
// (/parametres), professional profiles in H3/G3. Auth-gated: logged-out visitors go to /connexion with
// the return path preserved. Breadcrumb and heading are static, so they stay server-rendered here.
export default async function MonComptePage() {
  const shell = await getShellUser()
  if (!shell) redirect('/connexion?next=/mon-compte')

  const profile = await getCurrentProfile()
  if (!profile) redirect('/connexion?next=/mon-compte')

  const [lang, deletion] = await Promise.all([getLang(), getDeletionContext(shell.id)])

  return (
    <AppShell user={shell.topBarUser}>
      <div className="mx-auto flex w-full max-w-180 flex-col gap-2">
        <nav aria-label={t('monCompte.title', lang)} className="hidden items-center gap-2 text-sm font-medium text-text-muted sm:flex">
          <Link href="/" className={`rounded hover:underline ${FOCUS_RING}`}>
            {t('monCompte.breadcrumb.home', lang)}
          </Link>
          <ChevronRight className="size-3.5 rtl:rotate-180" aria-hidden="true" />
          <span>{t('monCompte.title', lang)}</span>
        </nav>
        <h1 className="text-2xl font-semibold text-text-primary sm:text-[28px] sm:font-bold sm:leading-[38px]">
          {t('monCompte.title', lang)}
        </h1>
      </div>

      <div className="mt-6">
        <MonCompteForm profile={profile} avatarUrl={shell.topBarUser.avatar_url ?? null} deletion={deletion} lang={lang} />
      </div>
    </AppShell>
  )
}
