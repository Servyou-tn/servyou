import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { AppShell } from '@/components/shell/AppShell'
import { PageHeader } from '@/components/marche/PageHeader'
import { PageHeader as PageSubtitle } from '@/components/shared/PageHeader'
import { getShellUser } from '@/lib/marche/shell-user'
import { getMyFavorites } from '@/lib/marche/my-data'
import { getLang } from '@/lib/i18n/server'
import { t } from '@/lib/i18n'
import { FavorisTabs } from './_components/FavorisTabs'

export const metadata: Metadata = { title: 'Mes favoris — Servyou' }

// F1 — /mes-favoris. Wires the existing getMyFavorites (lib/marche/my-data.ts), which had zero
// callers before this PR — same unused-data-layer pattern D1 found for getProductDetail. It
// already handles moderation visibility and shapes output into the ProductListing/ServiceListing
// types the shared cards consume, so this page only needs to fetch once and hand the two arrays
// to the client tab switcher (FavorisTabs). Auth-gated as before.
export default async function MesFavorisPage() {
  const shell = await getShellUser()
  if (!shell) redirect('/connexion')

  const [lang, { products, services }] = await Promise.all([getLang(), getMyFavorites(shell.id)])
  const total = products.length + services.length

  return (
    <AppShell user={shell.topBarUser}>
      <PageSubtitle
        subtitle={t('page_header.favoris.subtitle', lang)}
        emphasisWord={t('page_header.favoris.emphasis', lang)}
      />
      {total > 0 && <PageHeader countLabel={t('mesfavoris.count', lang, { n: total })} />}
      <FavorisTabs products={products} services={services} />
    </AppShell>
  )
}
