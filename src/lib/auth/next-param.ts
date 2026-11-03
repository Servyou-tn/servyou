import { isValidInternalPath } from '@/lib/internal-path'

// The `?next=` a guard put on /connexion (e.g. « Demander ce produit » while logged out → /connexion?next=/demander/{id}) has to survive
// the whole funnel: sign-in ⇄ sign-up role picker → role form → email verification. These helpers are the one place that reads it from a
// page's search params (validated with the open-redirect guard) and writes it back onto a funnel link. Pure, so the contract is unit-tested.

// The funnel's own pages are never a useful destination: next=/connexion would sign the visitor in and land them back on a sign-in
// form (a review finding on this PR). Same for sign-up, the auth routes, email verification and the two password pages.
const FUNNEL_PATH = /^\/(connexion|inscription|auth|verifier-email|nouveau-mot-de-passe|mot-de-passe-oublie)(\/|\?|#|$)/

/** A safe internal path (open-redirect guard) that is not one of the funnel's own pages. */
export function isUsefulNext(path: string | null | undefined): path is string {
  return Boolean(path) && isValidInternalPath(path) && !FUNNEL_PATH.test(path as string)
}

/** The validated `next` from a page's search params, or null (missing, an array's junk, unsafe, or a funnel page). */
export function readNext(raw: string | string[] | undefined): string | null {
  const value = Array.isArray(raw) ? raw[0] : raw
  return isUsefulNext(value) ? value : null
}

/** `href` with `?next=` carried over (or `&next=` when it already has a query). No safe next → `href` unchanged. */
export function withNext(href: string, next: string | null | undefined): string {
  if (!isUsefulNext(next)) return href
  return `${href}${href.includes('?') ? '&' : '?'}next=${encodeURIComponent(next)}`
}

const DEMANDER = /^\/demander\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i

/** The listing id when `next` is the request form (`/demander/{uuid}`) — the case the sign-in page explains. */
export function demanderTargetId(next: string | null | undefined): string | null {
  const match = next ? DEMANDER.exec(next) : null
  return match ? match[1] : null
}
