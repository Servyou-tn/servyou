import { isValidInternalPath } from '@/lib/internal-path'

// The `?next=` a guard put on /connexion (e.g. « Demander ce produit » while logged out → /connexion?next=/demander/{id}) has to survive
// the whole funnel: sign-in ⇄ sign-up role picker → role form → email verification. These helpers are the one place that reads it from a
// page's search params (validated with the open-redirect guard) and writes it back onto a funnel link. Pure, so the contract is unit-tested.

/** The validated `next` from a page's search params, or null (missing, an array's junk, or not a safe internal path). */
export function readNext(raw: string | string[] | undefined): string | null {
  const value = Array.isArray(raw) ? raw[0] : raw
  return value && isValidInternalPath(value) ? value : null
}

/** `href` with `?next=` carried over (or `&next=` when it already has a query). No safe next → `href` unchanged. */
export function withNext(href: string, next: string | null | undefined): string {
  if (!next || !isValidInternalPath(next)) return href
  return `${href}${href.includes('?') ? '&' : '?'}next=${encodeURIComponent(next)}`
}

const DEMANDER = /^\/demander\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i

/** The listing id when `next` is the request form (`/demander/{uuid}`) — the case the sign-in page explains. */
export function demanderTargetId(next: string | null | undefined): string | null {
  const match = next ? DEMANDER.exec(next) : null
  return match ? match[1] : null
}
