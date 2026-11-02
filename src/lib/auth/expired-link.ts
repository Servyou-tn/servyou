// A used or expired email link: GoTrue redirects with ?error=access_denied&error_code=otp_expired to the link's
// redirect target — or to the Site URL (the home page) when that target is not on the dashboard's Redirect URLs allow
// list, which is where password-reset links landed with no message. The home page forwards the error to
// /nouveau-mot-de-passe, and that page shows « Lien expiré, demandez-en un nouveau » for it.
//
// GoTrue does not say which email the link came from. Sign-up confirmations go to the allow-listed /verifier-email
// (email-redirect.ts), so an otp_expired on the home page is the reset link — except a sign-up from a Vercel preview,
// whose link falls back to the Site URL too.

export const EXPIRED_LINK_CODE = 'otp_expired'

type SearchParams = Record<string, string | string[] | undefined>

export function isExpiredLinkError(searchParams: SearchParams): boolean {
  return searchParams.error_code === EXPIRED_LINK_CODE
}

export function expiredLinkRedirect(searchParams: SearchParams): string | null {
  if (!isExpiredLinkError(searchParams)) return null
  return `/nouveau-mot-de-passe?error=access_denied&error_code=${EXPIRED_LINK_CODE}`
}
