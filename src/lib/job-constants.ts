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
