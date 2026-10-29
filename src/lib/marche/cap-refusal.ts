// The anti-abuse caps on orders and job posts (migrations 100 / 101: db/migrations/20261029201248_orders_rate_limit.sql,
// 20261029201254_job_posts_cap.sql) raise 23514 with a stable hint. These map that hint to the i18n key the action returns; anything else stays the
// action's generic error. Matched on code AND hint, so a CHECK violation (23514, no hint) is never mistaken for a cap.

type DbError = { code?: string | null; hint?: string | null }

const ORDER_CAP_KEYS = {
  order_cap_seller: 'demander.error.cap_seller',
  order_cap_daily: 'demander.error.cap_daily',
} as const

const JOB_POST_CAP_KEYS = {
  job_post_cap_open: 'annonce.error.cap_open',
  job_post_cap_daily: 'annonce.error.cap_daily',
} as const

export type OrderCapKey = (typeof ORDER_CAP_KEYS)[keyof typeof ORDER_CAP_KEYS]
export type JobPostCapKey = (typeof JOB_POST_CAP_KEYS)[keyof typeof JOB_POST_CAP_KEYS]

function capKey<K extends string>(error: DbError | null | undefined, keys: Record<string, K>): K | null {
  if (!error || error.code !== '23514' || !error.hint) return null
  return Object.hasOwn(keys, error.hint) ? keys[error.hint] : null
}

export const orderCapKey = (error: DbError | null | undefined): OrderCapKey | null => capKey(error, ORDER_CAP_KEYS)
export const jobPostCapKey = (error: DbError | null | undefined): JobPostCapKey | null => capKey(error, JOB_POST_CAP_KEYS)
