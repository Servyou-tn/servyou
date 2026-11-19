'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useLang } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { roleConfig, type SignupRole } from '@/lib/signup-role'
import { GoogleIcon } from '@/components/auth/Icons'
import { display } from '@/components/auth/field-styles'
import { FOCUS_RING } from '@/components/layout/styles'
import { EmailLinkForm } from '@/components/auth/EmailLinkForm'

// Step 1 of the two-step sign-up (founder decisions 1 and 6, docs/follow-ups/two-step-signup-plan.md): the name and the
// e-mail only. The e-mailed link (/auth/confirm) opens « Finalisez votre compte » for the password, birth date, city and
// terms. The role's destination (or the funnel's ?next=) rides on the link itself, not in sessionStorage, so it survives
// a link opened on another device. An existing account gets a sign-in link instead (decision 2).
//
// ── Google OAuth: built but DISABLED ─────────────────────────────────────────
// A first Google sign-in will create an incomplete account and reuse step 2 (plan §4 « Google, later »). It still needs
// /auth/callback and the provider, which belong to the Google PR. Typed `boolean` so the branch stays type-reachable.
const ENABLE_GOOGLE_OAUTH: boolean = false

export function SignupForm({ role, next = null }: { role: SignupRole; /** The funnel's validated ?next= (page-side readNext). */ next?: string | null }) {
  const lang = useLang()
  const config = roleConfig(role)
  const destination = next ?? config.destination
  const [googleErrorKey, setGoogleErrorKey] = useState<string | null>(null)

  async function handleGoogle() {
    setGoogleErrorKey(null)
    const { error } = await createClient().auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(destination)}` },
    })
    if (error) {
      console.error('[SignupForm] Google OAuth error:', error.message, error.code, error.status)
      setGoogleErrorKey('signup.form.errors.googleFailed')
    }
  }

  return (
    <>
      {ENABLE_GOOGLE_OAUTH ? (
        <>
          <button
            type="button"
            onClick={handleGoogle}
            className={`${display} inline-flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-[var(--border-subtle)] bg-white text-body font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-subtle)] ${FOCUS_RING}`}
          >
            <GoogleIcon className="h-5 w-5" />
            {t('signup.form.googleButton', lang)}
          </button>
          {googleErrorKey ? (
            <p role="alert" className="mt-3 text-sm text-red-300">
              {t(googleErrorKey, lang)}
            </p>
          ) : null}
          <div className="my-5 flex items-center gap-3" aria-hidden="true">
            <span className="h-px flex-1 bg-white/20" />
            <span className="text-body-sm font-medium uppercase tracking-wide text-brand-blue-200">{t('signup.form.divider', lang)}</span>
            <span className="h-px flex-1 bg-white/20" />
          </div>
        </>
      ) : null}

      <EmailLinkForm withName next={destination} submitKey="emailLink.submit" />
    </>
  )
}
