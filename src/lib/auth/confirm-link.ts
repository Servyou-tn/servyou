import { withNext } from './next-param'

// /auth/confirm's decisions, pure so they are unit-tested (the route only performs them).
//
// Three inputs reach it:
//   - `token_hash` + `type=email`: the pasted templates' link (docs/follow-ups/two-step-signup-plan.md §8). Verified with
//     verifyOtp on the server, so it works on ANY device: no PKCE verifier needed.
//   - `code`: GoTrue's default template (before the paste, or after a rollback): /verify redirects here with a PKCE code.
//     exchangeCodeForSession needs the verifier cookie, so this one works on the device that asked for the link only.
//   - `error` / `error_code`: GoTrue's own failure redirect (an expired or used link).

export type ConfirmInput =
  | { kind: 'token'; tokenHash: string }
  | { kind: 'code'; code: string }
  | { kind: 'failed'; reason: NewLinkReason }

export type NewLinkReason = 'expire' | 'invalide' | 'session'

// A hash is hex, a PKCE one « pkce_<hex> »; a code is a UUID. Anything else is junk, refused before any Auth call.
const TOKEN_HASH = /^[A-Za-z0-9_-]{8,256}$/
const CODE = /^[A-Za-z0-9-]{8,256}$/

export function parseConfirmParams(params: URLSearchParams): ConfirmInput {
  const errorCode = params.get('error_code')
  if (errorCode || params.get('error')) return { kind: 'failed', reason: errorCode === 'otp_expired' ? 'expire' : 'invalide' }

  const tokenHash = params.get('token_hash')
  if (tokenHash !== null) {
    return params.get('type') === 'email' && TOKEN_HASH.test(tokenHash)
      ? { kind: 'token', tokenHash }
      : { kind: 'failed', reason: 'invalide' }
  }

  const code = params.get('code')
  if (code !== null && CODE.test(code)) return { kind: 'code', code }
  return { kind: 'failed', reason: 'invalide' }
}

/** An Auth error from verifyOtp / exchangeCodeForSession → why the link failed. */
export function reasonForAuthError(code: string | undefined): NewLinkReason {
  return code === 'otp_expired' ? 'expire' : 'invalide'
}

export const NEW_LINK_PATH = '/inscription/nouveau-lien'
/** The « Continuer » page a template link passes through, so only a person's click spends it (route.ts). */
export const CONTINUE_PATH = '/inscription/confirmer'
export const COMPLETE_ACCOUNT_PATH = '/finaliser-mon-compte'

/** « Recevoir un nouveau lien », with why and the funnel's next. */
export function newLinkPath(reason: NewLinkReason, next: string | null): string {
  return withNext(`${NEW_LINK_PATH}?raison=${reason}`, next)
}

/**
 * Where a verified link goes. An incomplete account (or one whose profile could not be read: the step-2 page reads it
 * again and moves on if it is complete) → « Finalisez votre compte », keeping next. A complete account → next, or home.
 * `next` must already be validated (readNext).
 */
export function pathAfterConfirm(completed: boolean | null, next: string | null): string {
  if (completed === true) return next ?? '/'
  // Every link carries next (« / » by default: the templates append to its query); home is not worth carrying.
  return withNext(COMPLETE_ACCOUNT_PATH, next === '/' ? null : next)
}
