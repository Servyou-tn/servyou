import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AppShell } from '@/components/shell/AppShell'
import { AnnonceDetail } from '@/components/marche/AnnonceDetail'
import { getShellUser } from '@/lib/marche/shell-user'
import { getAnnonceDetail } from '@/lib/marche/annonce-detail'
import { getLang } from '@/lib/i18n/server'
import { t } from '@/lib/i18n'
import { CARD_SHADOW, FOCUS_RING } from '@/components/layout/styles'

type Props = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const shell = await getShellUser()
  const annonce = shell ? await getAnnonceDetail(id, shell.id) : null // cached — shared with the page
  return { title: annonce?.title ? `${annonce.title} — Servyou` : 'Annonce — Servyou' }
}

// The consumer's annonce-detail page. Auth-gated (own post) → logged-out visitors are sent to
// /connexion?next=/mes-annonces/[id]. getAnnonceDetail re-checks author ownership on top of RLS
// (defense in depth); a non-owner, a missing post, an invalid id, or a soft-deleted post all
// yield the same not-found state — no information leak about whether an id exists.
export default async function AnnonceDetailPage({ params }: Props) {
  const { id } = await params
  const lang = await getLang()

  const shell = await getShellUser()
  if (!shell) redirect(`/connexion?next=${encodeURIComponent(`/mes-annonces/${id}`)}`)

  const annonce = await getAnnonceDetail(id, shell.id)
  if (!annonce) {
    return (
      <AppShell user={shell.topBarUser}>
        <div className={`mx-auto max-w-md rounded-2xl bg-white p-12 text-center ${CARD_SHADOW}`}>
          <h1 className="text-lg font-semibold text-text-primary">{t('annonces.detail.not_found', lang)}</h1>
          <p className="mt-2 text-sm text-text-muted">{t('annonces.detail.not_found_desc', lang)}</p>
          <Link
            href="/mes-annonces"
            className={`mt-6 inline-flex items-center rounded-full bg-brand-blue-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-blue-500 ${FOCUS_RING}`}
          >
            {t('annonces.detail.back', lang)}
          </Link>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell user={shell.topBarUser}>
      <AnnonceDetail annonce={annonce} />
    </AppShell>
  )
}
