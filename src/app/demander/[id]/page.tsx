import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { AppShell } from '@/components/shell/AppShell'
import { getShellUser } from '@/lib/marche/shell-user'
import { getRequestTarget, getBuyerPhone } from '@/lib/marche/demander'
import { getLang } from '@/lib/i18n/server'
import { t } from '@/lib/i18n'
import { ServiceRequestScreen } from './_components/ServiceRequestScreen'
import { ProductRequestScreen } from './_components/ProductRequestScreen'

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLang()
  return { title: `${t('demander.breadcrumb.request', lang)} — Servyou` }
}

type Props = { params: Promise<{ id: string }> }

// One route, two targets, both rebuilt.
//   • SERVICE  → E1, built from Figma 680:56165 / 682:56521 / 682:56805.
//   • PRODUCT  → E1-product, built from Figma 589:43997. Two-column with a sticky order summary
//     (which owns the CTA and the live quantity-derived totals) and a quantity stepper.
//
// Auth-gated as before: logged-out visitors go to /connexion with the return path preserved.
// getRequestTarget enforces moderation (status='active' + admin_hidden_at IS NULL on the listing
// AND the freelancer), so a hidden or suspended target 404s instead of accepting an order.
export default async function DemanderPage({ params }: Props) {
  const { id } = await params
  const shell = await getShellUser()
  if (!shell) redirect(`/connexion?next=${encodeURIComponent(`/demander/${id}`)}`)

  const [target, lang] = await Promise.all([getRequestTarget(id), getLang()])
  if (!target) notFound()

  // profiles.phone is canonical (+216XXXXXXXX); both branches render the 8 local digits next to
  // a static +216, so strip the prefix for display. No phone on file → empty and required.
  const profilePhone = await getBuyerPhone(shell.id)
  const initialPhone = profilePhone ? profilePhone.replace(/^\+216/, '') : ''

  if (target.type === 'product') {
    return (
      <AppShell user={shell.topBarUser}>
        <ProductRequestScreen product={target.data} initialPhone={initialPhone} lang={lang} />
      </AppShell>
    )
  }

  return (
    <AppShell user={shell.topBarUser}>
      <ServiceRequestScreen service={target.data} initialPhone={initialPhone} lang={lang} />
    </AppShell>
  )
}
