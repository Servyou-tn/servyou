// Must stay in sync with check_job_response_limits() trigger in the DB.
export const MAX_RESPONSES_PER_POST = 10
export const MAX_ACTIVE_RESPONSES_PER_FREELANCER = 5
export const JOB_POST_EXPIRY_DAYS = 30

// H9/H10 board display rules (D-H9-6, §1.3 of docs/design/h9-h13-measurements.md). Presentation only —
// nothing in the DB depends on these.
export const NEW_MISSION_WINDOW_HOURS = 48
// Competition pill levels over job_posts.response_count: 0–3 low · 4–7 medium · 8–10 high.
export const COMPETITION_LOW_MAX = 3
export const COMPETITION_MEDIUM_MAX = 7

// H12 proposal form — mirrors the job_responses CHECKs / triggers (migration 20261026195409). The DB is the last
// line; these keep the form and the server action from sending what it will refuse.
export const PROPOSAL_MESSAGE_MIN = 20
export const PROPOSAL_MESSAGE_MAX = 1000
export const PROPOSAL_LINKS_MAX = 3
export const PROPOSAL_LINK_LABEL_MAX = 60
export const PROPOSAL_LINK_URL_MAX = 500
export const PROPOSAL_TIMEFRAME_MAX = 60
export const PROPOSAL_SKILLS_MAX = 8
export const PROPOSAL_SKILL_MAX = 60
/** proposed_price_tnd must be >= 0 and strictly below this. */
export const PROPOSAL_PRICE_LIMIT = 1_000_000
