// Pure logic for /admin/demandes (Figma J10 + admin-m375-requests): tabs, the 48 h promise countdown and the
// « Terminer la suppression » rule. No Supabase here. (src/lib/admin/** is Agent A's; nothing here changes it.)

export const REQUEST_TABS = ['deletion', 'export', 'contact', 'processed'] as const
export type RequestTab = (typeof REQUEST_TABS)[number]

export function parseRequestTab(value: unknown): RequestTab {
  return typeof value === 'string' && (REQUEST_TABS as readonly string[]).includes(value) ? (value as RequestTab) : 'deletion'
}

// The built copy promises 48 h for every request kind (Mon compte, Paramètres, Contact — discovery
// admin-requests-backend.md §Promises).
export const PROMISE_HOURS = 48

/** Whole hours left before the 48 h promise lapses; negative = overdue. */
export function hoursLeft(requestedAt: string, now: number, promiseHours = PROMISE_HOURS): number {
  const deadline = new Date(requestedAt).getTime() + promiseHours * 3_600_000
  const ms = deadline - now
  return ms >= 0 ? Math.floor(ms / 3_600_000) : -Math.ceil(-ms / 3_600_000)
}

/**
 * An approved deletion whose user has no `complete_account_erasure` audit row did not finish its login / files
 * step (follow-up #2 of admin-deletion-auth.md): the page offers « Terminer la suppression », which re-runs
 * approveDeletionRequest — on an approved request it only finishes the erasure.
 */
export function needsErasureFinish(request: { status: string; user_id: string }, erasedUserIds: ReadonlySet<string>): boolean {
  return request.status === 'approved' && !erasedUserIds.has(request.user_id)
}

/** Pending first, oldest first (the 48 h promise); the rest newest first — the RPCs' documented order, re-applied after merging lists. */
export function sortRequests<T extends { status: string; at: string }>(rows: readonly T[], pendingStatus: string): T[] {
  const t = (r: T) => new Date(r.at).getTime()
  return [...rows].sort((a, b) => {
    const ap = a.status === pendingStatus, bp = b.status === pendingStatus
    if (ap !== bp) return ap ? -1 : 1
    return ap ? t(a) - t(b) : t(b) - t(a)
  })
}

/** A mailto: href with an encoded subject — never built from unvalidated input other than the e-mail itself. */
// The address comes from the contact form (sender-controlled): anything that could open a header field
// (?bcc=, &body=, #, %-escapes, , ; lists) is refused, so the link can only ever carry our own subject.
export function mailtoHref(email: string, subject: string): string | null {
  if (!/^[^\s@<>"?&=#%,;]+@[^\s@<>"?&=#%,;]+\.[^\s@<>"?&=#%,;]+$/.test(email)) return null
  return `mailto:${email}?subject=${encodeURIComponent(subject)}`
}
