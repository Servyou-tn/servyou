import localFont from 'next/font/local'
import { NewPasswordForm, type NewPasswordInitialView } from '@/components/auth/NewPasswordForm'

// Manrope --font-display on the white <main> so the (client) per-state header and
// the box children inherit it. Like /verifier-email, the header text changes with
// client auth state, so NewPasswordForm owns the header + navy box; this page just
// supplies the white canvas + font. No footer for this page.
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

export default async function NouveauMotDePassePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const initialView: NewPasswordInitialView = sp.error ? 'invalid' : 'checking'

  return (
    <main id="main-content" className={`${manrope.variable} flex min-h-screen flex-col bg-white`}>
      <NewPasswordForm initialView={initialView} />
    </main>
  )
}
