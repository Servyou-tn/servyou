import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { MarcheLayout } from '@/components/marche/MarcheLayout'
import { PageHeader } from '@/components/marche/PageHeader'
import { MesFavorisView } from '@/components/marche/MesFavorisView'
import { getShellUser } from '@/lib/marche/shell-user'
import { getMyFavorites } from '@/lib/marche/my-data'
import { getLang } from '@/lib/i18n/server'
import { t } from '@/lib/i18n'

export const metadata: Metadata = { title: 'Mes favoris — Servyou' }

// The user's favorited products + services. Auth-gated (own data).
export default async function MesFavorisPage() {
  const shell = await getShellUser()
  if (!shell) redirect('/connexion')

  const lang = await getLang()
  const { products, services } = await getMyFavorites(shell.id)
  const total = products.length + services.length

  return (
    <MarcheLayout user={shell.topBarUser}>
      <PageHeader
        title={t('favorites.title', lang)}
        countLabel={total > 0 ? t('mesfavoris.count', lang, { n: total }) : undefined}
      />
      <MesFavorisView products={products} services={services} />
    </MarcheLayout>
  )
}
