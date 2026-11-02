// The password-reset email links straight to /nouveau-mot-de-passe?token_hash=…&type=recovery (Supabase « Reset
// Password » template). The page only reads the hash; NewPasswordForm spends it with verifyOtp when the user clicks
// « Continuer », never on load, so an email scanner that GETs the link cannot use it up. Unlike the PKCE ?code= link
// it needs no code verifier in the browser, so the link works on another device or browser.
//
// GoTrue's hash is hex, prefixed « pkce_ » when the reset was requested by a PKCE client; anything else is ignored and
// the page falls back to its usual checking → invalid path.

const TOKEN_HASH = /^[A-Za-z0-9_-]{16,128}$/

type SearchParams = Record<string, string | string[] | undefined>

export function recoveryTokenHash(searchParams: SearchParams): string | null {
  const { token_hash: tokenHash, type } = searchParams
  if (type !== 'recovery' || typeof tokenHash !== 'string' || !TOKEN_HASH.test(tokenHash)) return null
  return tokenHash
}
