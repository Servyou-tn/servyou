import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { MarcheLayout } from '@/components/marche/MarcheLayout'
import { ProductRequestForm } from '@/components/demander/ProductRequestForm'
import { ServiceRequestForm } from '@/components/demander/ServiceRequestForm'
import { getShellUser } from '@/lib/marche/shell-user'
import { getRequestTarget } from '@/lib/marche/demander'
import { getLang } from '@/lib/i18n/server'
import { t } from '@/lib/i18n'
import { CARD_SHADOW, FOCUS_RING } from '@/components/layout/styles'

type Props = { params: Promise<{ id: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const target = await getRequestTarget(id) // cached — shared with the page render
  return { title: target ? `Demander ${target.data.title} — Servyou` : 'Demande introuvable — Servyou' }
}

// One route, both request types. Authentication is required (own order) → logged-out
// visitors are sent to /connexion?next=/demander/[id]. getRequestTarget detects whether
// [id] is a product or a service (and enforces moderation); null → "Demande introuvable"
// inside the shell.
export default async function DemanderPage({ params }: Props) {
  const { id } = await params
  const lang = await getLang()

  const shell = await getShellUser()
  if (!shell) redirect(`/connexion?next=${encodeURIComponent(`/demander/${id}`)}`)

  const target = await getRequestTarget(id)
  if (!target) {
    return (
      <MarcheLayout user={shell.topBarUser}>
        <div className={`mx-auto max-w-md rounded-2xl bg-white p-12 text-center ${CARD_SHADOW}`}>
          <h1 className="text-lg font-semibold text-text-primary">{t('demander.notFound', lang)}</h1>
          <p className="mt-2 text-sm text-text-muted">{t('demander.notFound_desc', lang)}</p>
          <Link
            href="/marche"
            className={`mt-6 inline-flex items-center rounded-full bg-brand-accent px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-accent-light ${FOCUS_RING}`}
          >
            {t('marche.browse_cta', lang)}
          </Link>
        </div>
      </MarcheLayout>
    )
  }

  return (
    <MarcheLayout user={shell.topBarUser}>
      {target.type === 'product' ? (
        <ProductRequestForm product={target.data} defaultName={shell.topBarUser.full_name ?? ''} />
      ) : (
        <ServiceRequestForm service={target.data} />
      )}
    </MarcheLayout>
  )
}
