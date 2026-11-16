import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getLang } from '@/lib/i18n/server'
import { t } from '@/lib/i18n'
import { localizedMetadata } from '@/lib/i18n/metadata'
import { AuthFunnelLayout } from '@/components/auth/AuthFunnelLayout'
import { readNext } from '@/lib/auth/next-param'
import { newLinkPath } from '@/lib/auth/confirm-link'
import { TERMS_VERSION } from '@/lib/legal/terms-version'
import { MIN_SIGNUP_AGE } from '@/lib/signup-validation'
import { CompleteAccountForm } from './_components/CompleteAccountForm'

export async function generateMetadata(): Promise<Metadata> {
  return localizedMetadata('completeAccount.title')
}

// « Finalisez votre compte » — step 2 of the two-step sign-up (founder decisions 6 and 7; plan §4). The e-mailed link
// signed the person in (/auth/confirm); here they choose a password and give their birth date (16+), city and the terms,
// with the name typed at step 1 prefilled and editable. Until this is done the middleware sends every page here
// (src/lib/auth/completion-gate.ts) and, from DB-2, the database refuses the account's writes.
//
// Only a session opened by an e-mailed link can finish (complete_my_account checks the JWT's amr). A password session —
// someone who set a password here last time but never finished — sees « Recevoir un nouveau lien » straight away
// instead of a form that would be refused. The RPC is the guard; this read only spares a doomed attempt.
export default async function FinaliserMonComptePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const lang = await getLang()
  const next = readNext((await searchParams).next)
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect(newLinkPath('session', next))

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('full_name, completed_at')
    .eq('id', user.id)
    .maybeSingle()
  if (error) console.error('[finaliser-mon-compte] profile lookup error:', error.message, error.code, error.details)
  if (profile?.completed_at) redirect(next ?? '/')

  const { data: claims } = await supabase.auth.getClaims()
  const amr = claims?.claims.amr ?? []
  const fromEmailLink = amr.some((entry) => (typeof entry === 'string' ? entry : entry.method) === 'otp')
  // The birth-date picker's max (16+), computed once here so the server and the browser draw the same attribute.
  const maxBirthDate = new Date(Date.UTC(new Date().getUTCFullYear() - MIN_SIGNUP_AGE, new Date().getUTCMonth(), new Date().getUTCDate()))
    .toISOString()
    .slice(0, 10)

  return (
    <AuthFunnelLayout
      maxWidthClass="max-w-[560px]"
      title={t('completeAccount.title', lang)}
      subtitle={t('completeAccount.subtitle', lang)}
      homeBar
      homeLabel={t('auth.home', lang)}
      footer={
        // A way out that is not « finish »: the step-2 gate covers every other page.
        <form action="/auth/signout" method="post">
          <button type="submit" className="inline-flex min-h-11 items-center font-semibold text-[var(--brand-blue-600)] hover:underline">
            {t('nav.logout', lang)}
          </button>
        </form>
      }
    >
      <CompleteAccountForm
        initialName={profile?.full_name ?? ''}
        email={user.email ?? ''}
        next={next}
        termsVersion={TERMS_VERSION}
        maxBirthDate={maxBirthDate}
        fromEmailLink={fromEmailLink}
      />
    </AuthFunnelLayout>
  )
}
