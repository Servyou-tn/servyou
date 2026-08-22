import { JOB_POST_EXPIRY_DAYS } from '@/lib/job-constants'

const DAY_MS = 24 * 60 * 60 * 1000
const EXPIRY_MS = JOB_POST_EXPIRY_DAYS * DAY_MS

/** The countdown only starts inside the last week of the 30-day window — outside it, the post is
 *  just "open" with nothing urgent to say. */
export const EXPIRY_COUNTDOWN_THRESHOLD_DAYS = 7

// Days remaining before a post auto-expires, or null outside the countdown window. This is about
// the POST (will it stop accepting responses soon), not the WORK (the consumer's own deadline
// field) — the two are unrelated dates and must not share a visual treatment (see AnnonceCard).
//
// Once msRemaining <= 0 the post has already crossed annonce-status.ts's own boundary
// (isAnnoncePastExpiry's strict `>`), so this returns null and resolveAnnonceStatus's 'expired'
// takes over the messaging — this function never needs to know about 'filled'/'expired' itself,
// since a caller only asks it for a post it already knows is displayStatus 'open'.
export function getExpiryCountdownDays(createdAt: string, now: Date = new Date()): number | null {
  const msRemaining = EXPIRY_MS - (now.getTime() - new Date(createdAt).getTime())
  if (msRemaining <= 0) return null
  const daysLeft = Math.ceil(msRemaining / DAY_MS)
  return daysLeft <= EXPIRY_COUNTDOWN_THRESHOLD_DAYS ? daysLeft : null
}
