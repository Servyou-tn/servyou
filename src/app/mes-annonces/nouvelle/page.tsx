import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { redirect } from 'next/navigation'
import { AppShell } from '@/components/shell/AppShell'
import { AnnonceForm } from '@/components/marche/AnnonceForm'
import { getShellUser } from '@/lib/marche/shell-user'
import { getCategories } from '@/lib/marche/my-data'
import { getLang } from '@/lib/i18n/server'
import { t, type Lang } from '@/lib/i18n'
import { FOCUS_RING } from '@/components/layout/styles'
import { cn } from '@/lib/utils'

export const metadata: Metadata = { title: 'Publier une annonce — Servyou' }

const TIPS = ['annonce.form.tip_1', 'annonce.form.tip_2', 'annonce.form.tip_3', 'annonce.form.tip_4', 'annonce.form.tip_5'] as const

// F2 « Publier une annonce » — Figma 1478:29808 (+ 375 frame 1488:65880). Auth-gated; the insert (RLS: consumer_id = auth.uid()) is the
// real guard, with shared app-layer validation (job-post-validation.ts) for friendly errors. Breadcrumb, then the form card (750) and the
// tips card side by side from `xl`; below it the tips card stacks under the form, as at 375.
export default async function NouvelleAnnoncePage() {
  const shell = await getShellUser()
  if (!shell) redirect('/connexion')

  const lang = await getLang()
  const categories = await getCategories()

  return (
    <AppShell user={shell.topBarUser}>
      <div className="flex flex-col gap-5 sm:gap-6">
        <Breadcrumb lang={lang} />
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:gap-8">
          <div className="min-w-0 xl:w-[750px] xl:shrink">
            <AnnonceForm categories={categories} />
          </div>
          <TipsCard lang={lang} />
        </div>
      </div>
    </AppShell>
  )
}

// Breadcrumb 13 Regular muted: « Mes annonces › Publier une annonce » — both parts muted, the current page is NOT bolder (frame).
function Breadcrumb({ lang }: { lang: Lang }) {
  return (
    <nav aria-label={t('annonce.form.crumb_aria', lang)}>
      <ol className="flex items-center gap-2 text-[13px] text-text-muted">
        <li>
          <Link href="/mes-annonces" className={cn('rounded hover:text-text-primary hover:underline', FOCUS_RING)}>
            {t('annonce.form.crumb_annonces', lang)}
          </Link>
        </li>
        <li aria-hidden="true" className="flex items-center">
          <ChevronRight className="size-3.5 rtl:rotate-180" />
        </li>
        <li aria-current="page">{t('annonce.form.crumb_current', lang)}</li>
      </ol>
    </nav>
  )
}

// SIDEBAR card (1478:29837): surface/base, border 2 blue/600, radius 12, p 24 (px 16 at 375), gap 16. Title 15/20 Semi Bold, lead
// 15/22 Semi Bold blue/800, a divider, then five « ✓ » lines 12/18 muted.
function TipsCard({ lang }: { lang: Lang }) {
  return (
    <aside className="flex min-w-0 flex-col gap-4 rounded-xl border-2 border-brand-blue-600 bg-surface-base px-4 py-6 xl:min-w-[280px] xl:flex-1 xl:p-6">
      <h2 className="text-[15px] font-semibold leading-5 text-text-primary">{t('annonce.form.tips_title', lang)}</h2>
      <p className="text-[15px] font-semibold leading-[22px] text-brand-blue-800">{t('annonce.form.tips_lead', lang)}</p>
      <hr className="border-border-subtle" />
      <ul className="flex flex-col gap-4">
        {TIPS.map((key) => (
          <li key={key} className="text-caption leading-[18px] text-text-muted">
            <span aria-hidden="true">✓ </span>
            {t(key, lang)}
          </li>
        ))}
      </ul>
    </aside>
  )
}
