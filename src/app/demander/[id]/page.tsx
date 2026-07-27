import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { Send } from 'lucide-react'
import { AppShell } from '@/components/shell/AppShell'
import { ComingSoon } from '@/components/shell/ComingSoon'
import { getShellUser } from '@/lib/marche/shell-user'
import { getRequestTarget, getBuyerPhone } from '@/lib/marche/demander'
import { getLang } from '@/lib/i18n/server'
import { t } from '@/lib/i18n'
import { ServiceRequestScreen } from './_components/ServiceRequestScreen'

export async function generateMetadata(): Promise<Metadata> {
  const lang = await getLang()
  return { title: `${t('demander.breadcrumb.request', lang)} — Servyou` }
}

type Props = { params: Promise<{ id: string }> }

// One route, two targets — and only ONE of them is rebuilt.
//   • SERVICE  → E1, built from Figma 680:56165 / 682:56521 / 682:56805.
//   • PRODUCT  → still the ComingSoon stub left by chore/strip-legacy-consumer-ui. The product
//     COD form is a different screen (Figma 589:43997, two-column with a sticky order summary
//     and a quantity stepper) and is out of scope for this PR. Do not read the rebuilt service
//     path as "the request page is done".
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

  if (target.type === 'product') {
    return (
      <AppShell user={shell.topBarUser}>
        <ComingSoon
          icon={<Send className="h-12 w-12" aria-hidden="true" />}
          title={t('placeholders.comingSoon.title', lang)}
          description={t('placeholders.comingSoon.request', lang)}
        />
      </AppShell>
    )
  }

  // profiles.phone is canonical (+216XXXXXXXX); the field renders the 8 local digits next to a
  // static +216, so strip the prefix for display. No phone on file → empty and required.
  const profilePhone = await getBuyerPhone(shell.id)
  const initialPhone = profilePhone ? profilePhone.replace(/^\+216/, '') : ''

  return (
    <AppShell user={shell.topBarUser}>
      <ServiceRequestScreen service={target.data} initialPhone={initialPhone} lang={lang} />
    </AppShell>
  )
}
