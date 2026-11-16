import { COMPLETE_ACCOUNT_PATH } from './confirm-link'
import { withNext } from './next-param'

// The app half of the two-step sign-up gate (plan §4 « The app side »): a signed-in account whose profile is not complete
// (completed_at null: the e-mail link was used, « Finalisez votre compte » not done) is sent to that page on every page
// navigation. The database half (DB-2) refuses its writes. The middleware's matcher already skips the auth pages and
// /auth/signout; these stay reachable too: the page itself, and what its form links to.
const OPEN_WHILE_INCOMPLETE = /^\/(finaliser-mon-compte|conditions|confidentialite|contact)(\/|$)/

export type GateRequest = {
  pathname: string
  search: string
  method: string
  /** A page navigation (HTML or an RSC fetch), not a JSON / asset GET. */
  isNavigation: boolean
}

/**
 * The step-2 URL to redirect to, or null to let the request through.
 * `completedAt` is the profile's value: null = incomplete; undefined = no profile row or the read failed (fail open,
 * like the suspension check: the database gate does not depend on this).
 */
export function completionRedirect(request: GateRequest, completedAt: string | null | undefined): string | null {
  if (completedAt !== null) return null
  if (request.method !== 'GET' || !request.isNavigation) return null
  if (OPEN_WHILE_INCOMPLETE.test(request.pathname)) return null
  return withNext(COMPLETE_ACCOUNT_PATH, request.pathname === '/' ? null : request.pathname + request.search)
}

export { COMPLETE_ACCOUNT_PATH }
