import Link from 'next/link'
import localFont from 'next/font/local'
import { getLang } from '@/lib/i18n/server'
import { t } from '@/lib/i18n'
import { VerifyEmailFlow, type VerifyInitialView } from '@/components/auth/VerifyEmailFlow'

// Manrope --font-display on the white <main> so both the (client) per-state header
// and the box children inherit it. The page can't go through AuthFunnelLayout
// because the header text changes with client auth state; it provides the white
// canvas + font + static footer, and VerifyEmailFlow owns the per-state header +
// navy AuthShell box.
// One face per weight Google served, all the same variable file (src/fonts/README.md). Every
// Manrope call site names its const `manrope`: localFont uses it as the family name, so the faces
// of all call sites on a page merge into one family, as Google's shared "Manrope" family did.
const manrope = localFont({
  src: [
    { path: '../../fonts/manrope-latin.woff2', weight: '400', style: 'normal' },
    { path: '../../fonts/manrope-latin.woff2', weight: '500', style: 'normal' },
    { path: '../../fonts/manrope-latin.woff2', weight: '600', style: 'normal' },
    { path: '../../fonts/manrope-latin.woff2', weight: '700', style: 'normal' },
  ],
  variable: '--font-display',
  display: 'swap',
})
const display = 'font-[family-name:var(--font-display)]'

export default async function VerifierEmailPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const lang = await getLang()
  const sp = await searchParams

  // Initial state from the URL: an error code → State 3; a verification code being
  // exchanged → loading; otherwise the just-signed-up "check your email" State 1.
  const initialView: VerifyInitialView = sp.error ? 'failed' : sp.code ? 'loading' : 'pending'
  const initialEmail = typeof sp.email === 'string' ? sp.email : ''

  // Footer "Besoin d'aide ? {contact}" with {contact} rendered as a /contact link.
  const helpParts = t('verifyEmail.footer.help', lang).split('{contact}')

  return (
    <main id="main-content" className={`${manrope.variable} flex min-h-screen flex-col bg-white`}>
      <VerifyEmailFlow initialView={initialView} initialEmail={initialEmail} />
      <footer className={`${display} px-4 pb-6 pt-8 text-center text-body font-medium text-[var(--text-muted)] md:pb-8 md:pt-12`}>
        {helpParts[0]}
        <Link href="/contact" className="font-semibold text-[var(--brand-blue-600)] hover:underline">
          {t('verifyEmail.footer.contact', lang)}
        </Link>
        {helpParts[1] ?? ''}
      </footer>
    </main>
  )
}
