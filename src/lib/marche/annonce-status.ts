import { JOB_POST_EXPIRY_DAYS } from '@/lib/job-constants'

const EXPIRY_MS = JOB_POST_EXPIRY_DAYS * 24 * 60 * 60 * 1000

// Age-only check, independent of status. Mirrors check_job_response_limits()'s own boundary
// exactly (`v_post.created_at < now() - interval '30 days'`, i.e. strictly more than 30 days old)
// — confirmed against the live DB (pg_proc), not assumed. Used both to compute display status
// below and to gate reopening a filled post: reopening one already past the window would
// immediately re-expire it (see mes-annonces/[id]/actions.ts's reopenMissionAction, which
// duplicates this same arithmetic server-side for its own authorization check — deliberately not
// routed through this helper, since a display resolver has no business gating a write).
export function isAnnoncePastExpiry(createdAt: string, now: Date = new Date()): boolean {
  return now.getTime() - new Date(createdAt).getTime() > EXPIRY_MS
}

export type AnnonceDisplayStatus = 'open' | 'filled' | 'expired'

// job_posts.status folded with computed expiry, for DISPLAY. Nothing in the system writes
// status='expired' today — confirmed against the live DB, not assumed from a comment: the CHECK
// constraint (job_posts_status_check) permits the value, but the only place expiry is enforced
// (check_job_response_limits, a BEFORE INSERT trigger on job_responses) just raises an exception
// on a new response past the window; it never updates job_posts.status, and no other trigger,
// function, or scheduled job on job_posts references 'expired' at all. So this is computed at
// read time from created_at, not trusted from the column — for every 'open' row, on every read.
//
// Precedence: 'filled' wins over expiry. A post the consumer deliberately closed as filled stays
// "Pourvue" regardless of age — it does not flip to "Expirée" the day after 30 days pass. This
// mirrors check_job_response_limits() itself, which rejects on `status != 'open'` BEFORE it ever
// reaches the 30-day check: filled is already a terminal state the expiry window doesn't apply to.
//
// CALL THIS SERVER-SIDE ONLY, with the result passed down as a plain field (like
// getAnnonceDetail's own isExpired always has). A resolver that reads `now` inside a 'use client'
// component's render body would execute once during SSR and again on client hydration with two
// different clocks — for a post near the 30-day boundary that is a hydration mismatch, not just a
// theoretical one.
export function resolveAnnonceStatus(
  status: 'open' | 'filled' | 'expired' | 'deleted',
  createdAt: string,
  now: Date = new Date(),
): AnnonceDisplayStatus {
  if (status === 'filled') return 'filled'
  if (status === 'expired') return 'expired'
  // status is 'open' here in practice (or defensively 'deleted' — both getMyAnnonces and
  // getAnnonceDetail already filter deleted rows out before this ever runs).
  return isAnnoncePastExpiry(createdAt, now) ? 'expired' : 'open'
}
