import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { redirect } from 'next/navigation'
import { AppShell } from '@/components/shell/AppShell'
import { AideCenter } from '@/components/aide/AideCenter'
import { ContactPanel } from '@/components/aide/ContactPanel'
import { FOCUS_RING } from '@/components/layout/styles'
import { getShellUser } from '@/lib/marche/shell-user'
import { getCurrentProfile } from '@/lib/marche/mon-compte'
import { getLang } from '@/lib/i18n/server'
import { t } from '@/lib/i18n'
import { resolveRole } from '@/lib/roles'
import { AIDE_GROUP_ICON, AIDE_QUESTIONS_PER_GROUP, aideGroupIdsForRole } from '@/lib/aide/groups'
import type { AideGroupView } from '@/lib/aide/search'

export const metadata: Metadata = { title: 'Aide — Servyou' }

// I-Aide « Aide » — Figma 449:17900 (freelancer), 558:38359 (shop_owner), 449:18408 (buyer). ONE route, three
// configurations by seller_type: the role picks WHICH groups render (lib/aide/groups.ts), the layout is the same.
//
// The role comes from getCurrentProfile(), not from getShellUser(): the shell keeps a partial display (no role)
// when the profile read fails, and a role-dependent page must not guess — a freelancer would silently get the
// buyer's help. A failed read throws to error.tsx instead (loader-error-surfacing ruling 3, as on /parametres).
export default async function AidePage() {
  // Independent reads, one round trip; the guards run after.
  const [shell, profile, lang] = await Promise.all([getShellUser(), getCurrentProfile(), getLang()])
  if (!shell || !profile) redirect('/connexion?next=/aide')

  const role = resolveRole(profile)

  const groups: AideGroupView[] = aideGroupIdsForRole(role).map((id) => ({
    id,
    icon: AIDE_GROUP_ICON[id],
    title: t(`aide.g.${id}.title`, lang),
    items: Array.from({ length: AIDE_QUESTIONS_PER_GROUP }, (_, i) => {
      const n = i + 1
      return { id: `${id}.${n}`, q: t(`aide.g.${id}.q${n}`, lang), a: t(`aide.g.${id}.a${n}`, lang) }
    }),
  }))

  return (
    <AppShell user={shell.topBarUser}>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <nav aria-label={t('aide.breadcrumb.label', lang)} className="flex items-center gap-2 text-sm text-text-muted">
            <Link href="/" className={`rounded hover:underline ${FOCUS_RING}`}>
              {t('aide.breadcrumb.home', lang)}
            </Link>
            <ChevronRight className="size-3.5 rtl:rotate-180" aria-hidden="true" />
            <span aria-current="page">{t('aide.title', lang)}</span>
          </nav>
          <h1 className="text-[32px] font-bold leading-[38px] text-text-primary">{t('aide.title', lang)}</h1>
          <p className="text-sm text-text-secondary">{t('aide.subtitle', lang)}</p>
        </div>

        <AideCenter
          groups={groups}
          placeholder={t(`aide.search.placeholder.${role ?? 'consumer'}`, lang)}
          rail={<ContactPanel lang={lang} />}
        />
      </div>
    </AppShell>
  )
}
