// Typed DB failures → what the proposal form shows (docs/design/h9-h13-measurements.md D-H13-3, gap G7).
//
// The job_responses triggers (migrations 20261026195409 / 20261026190353) raise with a stable `hint` code, so this maps
// CODES, never the French sentences. PostgREST returns the hint as `error.hint`. One failure has no hint: the
// statement-level « Ce compte est suspendu. » (trg_enforce_active_user, SQLSTATE 42501).
//
// Pure — the server action calls it with the raw error's fields and the tests pin the whole table.

export type ProposalFailure =
  // The post can no longer take this proposal — rendered in place, the message preserved, form read-only.
  | 'job_full'
  | 'job_filled'
  | 'job_deleted'
  | 'job_expired'
  | 'job_unavailable'
  | 'cap_active'
  | 'own_post'
  // The account cannot respond at all.
  | 'suspended'
  | 'no_profile'
  | 'not_allowed'
  // The DB refused a field the form should have caught — shown on that field.
  | 'invalid_links'
  | 'too_many_skills'
  | 'invalid_message'
  | 'invalid_price'
  | 'invalid_timeframe'
  // Anything else: amber « try again », the input kept.
  | 'technical'

/** `duplicate` is not a failure: the first insert succeeded, so the caller treats it as success (idempotent). */
export type ProposalDbOutcome = ProposalFailure | 'duplicate'

export type DbErrorShape = { code?: string | null; hint?: string | null; message?: string | null; details?: string | null }

const BY_HINT: Record<string, ProposalDbOutcome> = {
  job_full: 'job_full',
  job_filled: 'job_filled',
  job_deleted: 'job_deleted',
  job_expired: 'job_expired',
  job_unavailable: 'job_unavailable',
  job_closed: 'job_unavailable',
  job_not_found: 'job_unavailable',
  cap_active: 'cap_active',
  own_post: 'own_post',
  duplicate: 'duplicate',
  suspended: 'suspended',
  no_freelancer_profile: 'no_profile',
  not_self: 'not_allowed',
  not_freelancer: 'not_allowed',
  under_18: 'not_allowed',
  profile_hidden: 'not_allowed',
  invalid_links: 'invalid_links',
  too_many_skills: 'too_many_skills',
}

// A CHECK constraint violation carries no hint; the constraint's name is in the message / details.
const BY_CONSTRAINT: [string, ProposalDbOutcome][] = [
  ['job_responses_proposal_message_length', 'invalid_message'],
  ['job_responses_proposed_price_range', 'invalid_price'],
  ['job_responses_proposed_timeframe_length', 'invalid_timeframe'],
  ['job_responses_portfolio_links_shape', 'invalid_links'],
]

export function mapProposalDbError(err: DbErrorShape): ProposalDbOutcome {
  const hint = err.hint?.trim()
  if (hint && hint in BY_HINT) return BY_HINT[hint]

  const text = `${err.message ?? ''} ${err.details ?? ''}`
  for (const [constraint, outcome] of BY_CONSTRAINT) if (text.includes(constraint)) return outcome

  // « Ce compte est suspendu. » — the account-wide guard raises 42501 with no hint.
  if (err.code === '42501' && /suspendu/i.test(err.message ?? '')) return 'suspended'

  return 'technical'
}

/** Failures the form shows on a field instead of as an amber notice. */
export const FIELD_FAILURES: ReadonlySet<ProposalFailure> = new Set([
  'invalid_links',
  'too_many_skills',
  'invalid_message',
  'invalid_price',
  'invalid_timeframe',
])

/** Failures after which retrying is pointless: the form goes read-only and keeps the message for copying. */
export const TERMINAL_FAILURES: ReadonlySet<ProposalFailure> = new Set([
  'job_full',
  'job_filled',
  'job_deleted',
  'job_expired',
  'job_unavailable',
  'cap_active',
  'own_post',
  'suspended',
  'no_profile',
  'not_allowed',
])
