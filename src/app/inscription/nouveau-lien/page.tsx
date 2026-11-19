import type { Metadata } from 'next'
import Link from 'next/link'
import { getLang } from '@/lib/i18n/server'
import { t } from '@/lib/i18n'
import { localizedMetadata } from '@/lib/i18n/metadata'
import { AuthFunnelLayout } from '@/components/auth/AuthFunnelLayout'
import { EmailLinkForm } from '@/components/auth/EmailLinkForm'
import { readNext, withNext } from '@/lib/auth/next-param'
import { isValidEmail } from '@/lib/signup-validation'

export async function generateMetadata(): Promise<Metadata> {
  return localizedMetadata('newLink.title')
}

// « Recevoir un nouveau lien » (two-step sign-up). Where a link that failed at /auth/confirm lands (?raison=expire |
// invalide), and where « Finalisez votre compte » sends a session that cannot finish (?raison=session: no session, a
// password session, or one older than 24 hours). The form e-mails a fresh link to /auth/confirm, which opens a new
// session. Under /inscription, so the middleware leaves it alone and the SEO rules already cover it (noindex).
const SUBTITLE_KEY: Record<string, string> = {
  expire: 'newLink.reason.expired',
  invalide: 'newLink.reason.invalid',
  session: 'completeAccount.stuck',
}

export default async function NouveauLienPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const lang = await getLang()
  const sp = await searchParams
  const next = readNext(sp.next)
  const reason = typeof sp.raison === 'string' ? sp.raison : ''
  const email = typeof sp.email === 'string' && isValidEmail(sp.email) ? sp.email : ''
  return (
    <AuthFunnelLayout
      maxWidthClass="max-w-[480px]"
      title={t('newLink.title', lang)}
      subtitle={t(SUBTITLE_KEY[reason] ?? 'newLink.subtitle', lang)}
      homeBar
      homeLabel={t('auth.home', lang)}
      footer={
        <Link href={withNext('/connexion', next)} className="font-semibold text-[var(--brand-blue-600)] hover:underline">
          {t('verifyEmail.state3.backToSignin', lang)}
        </Link>
      }
    >
      <EmailLinkForm withName={false} next={next} initialEmail={email} submitKey="newLink.submit" />
    </AuthFunnelLayout>
  )
}
