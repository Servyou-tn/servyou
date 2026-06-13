import { Manrope } from 'next/font/google'
import { NewPasswordForm, type NewPasswordInitialView } from '@/components/auth/NewPasswordForm'

// Manrope --font-display on the white <main> so the (client) per-state header and
// the box children inherit it. Like /verifier-email, the header text changes with
// client auth state, so NewPasswordForm owns the header + navy box; this page just
// supplies the white canvas + font. No footer for this page.
const manrope = Manrope({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
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
