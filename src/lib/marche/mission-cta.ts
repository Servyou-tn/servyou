import { MAX_ACTIVE_RESPONSES_PER_FREELANCER, MAX_RESPONSES_PER_POST } from '@/lib/job-constants'
import { isAnnoncePastExpiry } from '@/lib/marche/annonce-status'

// H10 CTA state machine (docs/design/h9-h13-measurements.md §2.2, D-H10-3). The page is read-and-decide:
// the CTA must say what the freelancer can do BEFORE they open the form. Mirrors check_job_response_limits()
// + enforce_job_responder_capability(), but the DB stays the last line — this only picks the message.
//
// Precedence (first match wins): own post → already answered → closed (deleted/moderated) → pourvue →
// expirée → no freelancer profile → 10/10 → 5 actives → can respond. Closed states come before the profile
// prompt on purpose: « complete your profile » is useless on a post nobody can answer.

export type MissionCtaState =
  | 'can_respond'
  | 'answered'
  | 'own_post'
  | 'closed'
  | 'filled'
  | 'expired'
  | 'no_profile'
  | 'full'
  | 'cap_active'

export type MissionCtaInput = {
  isOwnPost: boolean
  answered: boolean
  hasFreelancerProfile: boolean
  postStatus: 'open' | 'filled' | 'expired' | 'deleted'
  /** job_posts.admin_hidden_at is set. */
  hidden: boolean
  createdAt: string
  responseCount: number
  /** The viewer's responses on posts that are still open and inside the window. */
  activeResponses: number
}

export function resolveMissionCta(i: MissionCtaInput, now: Date): MissionCtaState {
  if (i.isOwnPost) return 'own_post'
  if (i.answered) return 'answered'
  if (i.postStatus === 'deleted' || i.hidden) return 'closed'
  if (i.postStatus === 'filled') return 'filled'
  if (i.postStatus === 'expired' || isAnnoncePastExpiry(i.createdAt, now)) return 'expired'
  if (!i.hasFreelancerProfile) return 'no_profile'
  if (i.responseCount >= MAX_RESPONSES_PER_POST) return 'full'
  if (i.activeResponses >= MAX_ACTIVE_RESPONSES_PER_FREELANCER) return 'cap_active'
  return 'can_respond'
}
