import type { SupabaseClient } from '@supabase/supabase-js'
import type { Lang } from '@/lib/i18n'
import { isUsefulNext } from './next-param'

// Step 1 of the two-step sign-up (founder decision 1, docs/follow-ups/two-step-signup-plan.md): a passwordless e-mail
// link. signInWithOtp creates the account with NO password, or, for an address that already has an account, sends a
// sign-in link (decision 2). Both land on /auth/confirm, verified on the server, so the link works on any device.
//
// Every place that e-mails a link goes through sendEmailLink: the sign-up form, the « Recevoir un nouveau lien » page and
// /verifier-email's resend. Once the two templates are pasted, a link minted any other way (signUp, resend({ type:
// 'signup' }) to /verifier-email) would come out broken: the templates append « &token_hash=…&type=email » to the
// redirect, which must therefore always be /auth/confirm with a query.

export const AUTH_CONFIRM_PATH = '/auth/confirm'

/** /auth/confirm on this origin, ALWAYS carrying `?next=` ('/' by default): the e-mail templates append `&token_hash=…`. */
export function confirmRedirectUrl(origin: string, next: string | null | undefined): string {
  const target = isUsefulNext(next) ? next : '/'
  return `${origin.replace(/\/+$/, '')}${AUTH_CONFIRM_PATH}?next=${encodeURIComponent(target)}`
}

export type SendLinkErrorKey =
  | 'common.error_bot_check'
  | 'common.rate_limit'
  | 'signup.form.errors.emailInvalid'
  | 'signup.form.errors.generic'

/** auth-js error code → the i18n key the form shows. Never the raw message. */
export function sendLinkErrorKey(code: string | undefined): SendLinkErrorKey {
  switch (code) {
    case 'captcha_failed':
      return 'common.error_bot_check'
    case 'over_email_send_rate_limit':
    case 'over_request_rate_limit':
      return 'common.rate_limit'
    case 'email_address_invalid':
      return 'signup.form.errors.emailInvalid'
    default:
      return 'signup.form.errors.generic'
  }
}

export type SendEmailLinkInput = {
  email: string
  /** Step 1's name. Read only when the account is new (handle_new_user); step 2 shows it prefilled and editable. */
  fullName?: string
  /** The interface language (decision 6), stored on a new account. */
  lang: Lang
  next: string | null
  origin: string
  captchaToken?: string
}

/** Sends the e-mail link. null = sent; otherwise the i18n key of the error to show. */
export async function sendEmailLink(supabase: SupabaseClient, input: SendEmailLinkInput): Promise<SendLinkErrorKey | null> {
  const fullName = input.fullName?.trim()
  const { error } = await supabase.auth.signInWithOtp({
    email: input.email.trim().toLowerCase(),
    options: {
      shouldCreateUser: true,
      emailRedirectTo: confirmRedirectUrl(input.origin, input.next),
      ...(input.captchaToken ? { captchaToken: input.captchaToken } : {}),
      data: { ...(fullName ? { full_name: fullName } : {}), language: input.lang },
    },
  })
  if (!error) return null
  console.error('[sendEmailLink] signInWithOtp error:', error.message, error.code, error.status)
  return sendLinkErrorKey(error.code)
}
