import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { redirect } from 'next/navigation'
import { AppShell } from '@/components/shell/AppShell'
import { AnnonceForm } from '@/components/marche/AnnonceForm'
import { getShellUser } from '@/lib/marche/shell-user'
import { getCategories } from '@/lib/marche/my-data'
import { getLang } from '@/lib/i18n/server'
import { t } from '@/lib/i18n'
import { FOCUS_RING } from '@/components/layout/styles'
import { cn } from '@/lib/utils'

export const metadata: Metadata = { title: 'Nouvelle annonce — Servyou' }

// PR-D — rebuilt on the design system. Auth-gated; the insert (RLS: consumer_id = auth.uid()) is
// the real guard, with shared app-layer validation (job-post-validation.ts) for friendly errors.
export default async function NouvelleAnnoncePage() {
  const shell = await getShellUser()
  if (!shell) redirect('/connexion')

  const lang = await getLang()
  const categories = await getCategories()

  return (
    <AppShell user={shell.topBarUser}>
      <PageIntro lang={lang} />
      <AnnonceForm categories={categories} />
    </AppShell>
  )
}

// Breadcrumb + plain title + subtitle — measured from G6's own `PageIntro`
// (app/mes-produits/ajouter/page.tsx), NOT `shared/PageHeader` (that component is the premium
// animated subtitle row for the CONSUMER DASHBOARD SHELL, wrong identity for a seller-shape form;
// see that file's own header note). Matching G6/E1 identity is this PR's goal.
function PageIntro({ lang }: { lang: Awaited<ReturnType<typeof getLang>> }) {
  return (
    <div className="mb-8 max-w-[760px]">
      <nav aria-label="Fil d'Ariane" className="mb-3">
        <ol className="flex items-center gap-1.5 text-sm text-text-muted">
          <li>
            <Link
              href="/mes-annonces"
              className={cn('rounded hover:text-text-primary hover:underline', FOCUS_RING)}
            >
              {t('annonce.form.crumb_annonces', lang)}
            </Link>
          </li>
          <li aria-hidden="true" className="flex items-center">
            <ChevronRight className="h-4 w-4 rtl:rotate-180" />
          </li>
          <li aria-current="page" className="font-medium text-text-primary">
            {t('annonce.form.crumb_current', lang)}
          </li>
        </ol>
      </nav>
      <h1 className="text-2xl font-semibold text-text-primary">{t('annonce.form.page_title', lang)}</h1>
      <p className="mt-1.5 text-sm text-text-muted">{t('annonce.form.page_subtitle', lang)}</p>
    </div>
  )
}
