import type { ProposalState } from './proposals'

// Journey gates G1 / G2 (migration 20261106153901_journey_gates, docs/discovery/journey-gates.md « App »): the pure rules
// the UI needs — the proposal outcome column, the choose_job_response refusals, and the order-accept phone refusal. No
// Supabase import, so a client component can use the types and the mappings are unit-testable.
//
// ⚑ LOCAL TYPES. `job_responses.status` and `choose_job_response` are live, but the regenerated database.types.ts ships with
// the record PR of feat/journey-gates-db (Agent A). Until it lands, the column and the RPC are typed here; swap these for
// Database['public'][...] then (follow-up).

/** job_responses.status — written only by the choose_job_response RPC and the job_posts sync trigger. */
export type JobResponseStatus = 'pending' | 'chosen' | 'not_chosen'

export function parseJobResponseStatus(value: unknown): JobResponseStatus {
  return value === 'chosen' || value === 'not_chosen' ? value : 'pending'
}

type DbError = { code?: string | null; hint?: string | null; message?: string | null }

/** choose_job_response's refusals (by hint) → the i18n key the owner reads. Anything else → the generic error. */
const CHOOSE_ERROR_KEY: Record<string, string> = {
  job_filled: 'annonces.choose.error_filled',
  job_deleted: 'annonces.choose.error_unavailable',
  job_unavailable: 'annonces.choose.error_unavailable',
  job_expired: 'annonces.choose.error_expired',
  freelancer_unavailable: 'annonces.choose.error_freelancer',
  not_found: 'annonces.choose.error_not_found',
  not_signed_in: 'annonce.error.not_authorized',
  suspended: 'annonces.choose.error_suspended',
}

export function chooseErrorKey(error: DbError): string {
  return (error.hint && CHOOSE_ERROR_KEY[error.hint]) || 'common.error_generic'
}

/** filled → open refused once a freelancer is chosen (sync_job_responses_on_post_status, 23514 job_response_chosen). */
export function isReopenAfterChoice(error: DbError): boolean {
  return error.code === '23514' && error.hint === 'job_response_chosen'
}

/** pending → accepted refused for a seller with no phone (check_order_status_transition, 23514 seller_phone_required). */
export function isSellerPhoneRequired(error: DbError): boolean {
  return error.code === '23514' && error.hint === 'seller_phone_required'
}

/**
 * What a freelancer reads on /mes-propositions — the proposal's own outcome, not the post's state:
 * chosen → « Choisie »; not chosen → « Non retenue »; still pending on an open post → « En attente »; pending on a post past its
 * 30 days → « Expirée » (derived from the date, like G10); pending on a post closed by hand without a choice → « Non retenue »
 * (the sync trigger writes not_chosen for those; this covers rows from before it). A post the freelancer can no longer read stays
 * « Indisponible ».
 */
export type ProposalOutcome = 'chosen' | 'not_chosen' | 'pending' | 'expired' | 'unavailable'

export function proposalOutcome(status: JobResponseStatus, postState: ProposalState): ProposalOutcome {
  if (status === 'chosen') return 'chosen'
  if (status === 'not_chosen') return 'not_chosen'
  if (postState === 'unavailable') return 'unavailable'
  if (postState === 'expired') return 'expired'
  if (postState === 'filled') return 'not_chosen'
  return 'pending'
}

/** « Choisir ce freelance » is offered only on an open post (in its 30 days) that has no chosen proposal yet. */
export function canChooseProposal(postDisplayStatus: 'open' | 'filled' | 'expired', anyChosen: boolean, adminHidden: boolean): boolean {
  return postDisplayStatus === 'open' && !anyChosen && !adminHidden
}
