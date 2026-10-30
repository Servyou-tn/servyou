import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { redirect } from 'next/navigation'
import { AppShell } from '@/components/shell/AppShell'
import { AnnonceForm } from '@/components/marche/AnnonceForm'
import { getShellUser } from '@/lib/marche/shell-user'
import { getCategories } from '@/lib/marche/my-data'
import { getAnnonceForEdit } from '@/lib/marche/annonce-edit'
import { annonceEditBlock, ANNONCE_EDIT_BLOCK_KEY } from '@/lib/marche/annonce-edit-rules'
import { formatJobBudget } from '@/lib/marche/format-job-budget'
import { getLang } from '@/lib/i18n/server'
import { t, type Lang } from '@/lib/i18n'
import { CARD_SHADOW, FOCUS_RING } from '@/components/layout/styles'
import { cn } from '@/lib/utils'

export const metadata: Metadata = { title: "Modifier l'annonce — Servyou" }

type Props = { params: Promise<{ id: string }> }

// « Modifier l'annonce » (PR-3): the F2 publish form reused, started from the stored post. Owner-only — a logged-out visitor goes to
// /connexion?next=…, and a non-owner, a missing id, a junk id and a deleted post all get the same « introuvable » card (no leak). A post that
// can no longer be edited (closed / expired / moderated, or already answered — the DB freezes the content once a proposal exists) gets a plain
// explanation instead of a form that would only be refused on save. updateAnnonce re-checks every one of these server-side.
export default async function ModifierAnnoncePage({ params }: Props) {
  const { id } = await params
  const lang = await getLang()

  const shell = await getShellUser()
  if (!shell) redirect(`/connexion?next=${encodeURIComponent(`/mes-annonces/${id}/modifier`)}`)

  const annonce = await getAnnonceForEdit(id, shell.id)
  if (!annonce) {
    return (
      <AppShell user={shell.topBarUser}>
        <Card title={t('annonces.detail.not_found', lang)} body={t('annonces.detail.not_found_desc', lang)} href="/mes-annonces" back={t('annonces.detail.back', lang)} />
      </AppShell>
    )
  }

  const block = annonceEditBlock({
    displayStatus: annonce.displayStatus,
    responseCount: annonce.responseCount,
    adminHiddenAt: annonce.adminHiddenAt,
  })
  if (block) {
    return (
      <AppShell user={shell.topBarUser}>
        <Card
          title={t('annonces.edit.blocked_title', lang)}
          body={t(ANNONCE_EDIT_BLOCK_KEY[block], lang)}
          href={`/mes-annonces/${annonce.id}`}
          back={t('annonces.edit.back', lang)}
        />
      </AppShell>
    )
  }

  const categories = await getCategories()
  // An old post saved with a min (a min–max range, or « à partir de » with no max): the single field shows the max (empty for the latter), the
  // old budget is named under it and kept unless the amount changes.
  const legacyRange = annonce.budgetMin != null ? formatJobBudget(annonce.budgetMin, annonce.budgetMax, lang) : null

  return (
    <AppShell user={shell.topBarUser}>
      <div className="flex flex-col gap-5 sm:gap-6">
        <Breadcrumb lang={lang} id={annonce.id} title={annonce.form.title} />
        <div className="min-w-0 xl:w-[750px]">
          <AnnonceForm categories={categories} edit={{ id: annonce.id, initial: annonce.form, legacyRange }} />
        </div>
      </div>
    </AppShell>
  )
}

// Same breadcrumb as F2 (13 Regular muted, current page not bolder), one level deeper: Mes annonces › the post › Modifier l'annonce.
function Breadcrumb({ lang, id, title }: { lang: Lang; id: string; title: string }) {
  const link = cn('rounded hover:text-text-primary hover:underline', FOCUS_RING)
  const chevron = (
    <li aria-hidden="true" className="flex items-center">
      <ChevronRight className="size-3.5 rtl:rotate-180" />
    </li>
  )
  return (
    <nav aria-label={t('annonce.form.crumb_aria', lang)}>
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-text-muted">
        <li>
          <Link href="/mes-annonces" className={link}>
            {t('annonce.form.crumb_annonces', lang)}
          </Link>
        </li>
        {chevron}
        <li className="min-w-0">
          <Link href={`/mes-annonces/${id}`} className={cn('block max-w-48 truncate sm:max-w-xs', link)}>
            {title}
          </Link>
        </li>
        {chevron}
        <li aria-current="page" className="whitespace-nowrap">
          {t('annonce.form.crumb_edit', lang)}
        </li>
      </ol>
    </nav>
  )
}

function Card({ title, body, href, back }: { title: string; body: string; href: string; back: string }) {
  return (
    <div className={`mx-auto max-w-md rounded-2xl bg-white p-12 text-center ${CARD_SHADOW}`}>
      <h1 className="text-lg font-semibold text-text-primary">{title}</h1>
      <p className="mt-2 text-sm text-text-muted">{body}</p>
      <Link
        href={href}
        className={`mt-6 inline-flex items-center rounded-full bg-brand-blue-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-blue-500 ${FOCUS_RING}`}
      >
        {back}
      </Link>
    </div>
  )
}
