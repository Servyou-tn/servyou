import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { redirect } from 'next/navigation'
import { AppShell } from '@/components/shell/AppShell'
import { ParametresShell } from '@/components/parametres/ParametresShell'
import { getShellUser } from '@/lib/marche/shell-user'
import { getCurrentProfile } from '@/lib/marche/mon-compte'
import { getLang } from '@/lib/i18n/server'
import { t } from '@/lib/i18n'
import { FOCUS_RING } from '@/components/layout/styles'

export const metadata: Metadata = { title: 'Paramètres — Servyou' }

// I2 "Paramètres" — Figma 423:16615, measured (part 1 of the rebuild, feat/parametres-shell):
// two-column shell (sub-nav rail + content) replacing the old four-stacked-cards page. Only the
// Langue & région tab has real content this PR — see ParametresShell for the rest.
//
// Breadcrumb/H1/subline are static (no dirty/live state needed), so they stay server-rendered here
// rather than inside the client shell — same split EditProductForm uses for its own live-state
// header vs. this page's own header having nothing live to track.
export default async function ParametresPage() {
  const shell = await getShellUser()
  if (!shell) redirect('/connexion?next=/parametres')

  const profile = await getCurrentProfile()
  if (!profile) redirect('/connexion?next=/parametres')

  const lang = await getLang()

  return (
    <AppShell user={shell.topBarUser}>
      <div className="flex flex-col gap-2">
        <nav aria-label={t('parametres.title', lang)} className="flex items-center gap-2 text-sm text-text-muted">
          <Link href="/" className={`rounded hover:underline ${FOCUS_RING}`}>
            {t('parametres.breadcrumb.home', lang)}
          </Link>
          <ChevronRight className="size-3.5 rtl:rotate-180" aria-hidden="true" />
          <span>{t('parametres.title', lang)}</span>
        </nav>
        <h1 className="text-[32px] font-bold leading-[38px] text-text-primary">{t('parametres.title', lang)}</h1>
        <p className="text-sm text-text-secondary">
          {t('parametres.subline.text', lang)}
          <Link href="/mon-compte" className={`font-medium text-brand-blue-600 hover:underline ${FOCUS_RING}`}>
            {t('parametres.subline.link', lang)}
          </Link>
        </p>
      </div>

      <div className="mt-6">
        <ParametresShell profile={profile} />
      </div>
    </AppShell>
  )
}
