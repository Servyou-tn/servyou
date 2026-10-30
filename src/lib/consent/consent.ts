// Cookie consent — the pure part (no React, no next/headers): the cookie's name, shape, validity and serialisation. A7 (banner + modal).
//
// The cookie is `servyou_consent`, first-party, `{ v: 1, audience: boolean, ts: number }` (ts = ms since epoch when the choice was saved).
// It is valid for 6 months, then the visitor is asked again; a bumped CONSENT_VERSION asks everyone again too. Validity is checked HERE as
// well as by Max-Age — a cookie is client-controlled input, so a forged or stale value reads as « no consent », never as a grant.
//
// Categories: `essential` (Supabase auth, Turnstile) and `preferences` (servyou_lang, written only when the visitor picks a language) are
// necessary and always on; `audience` is the only optional one and is OFF unless the visitor said yes. Nothing reads it today — a future
// analytics script must load only behind `hasConsent(consent, 'audience')` (server: lib/consent/server.ts, client: useConsent()).

export const CONSENT_COOKIE = 'servyou_consent'
export const CONSENT_VERSION = 1

const DAY_MS = 24 * 60 * 60 * 1000
/** 6 months. */
export const CONSENT_VALIDITY_DAYS = 183
export const CONSENT_MAX_AGE_SECONDS = CONSENT_VALIDITY_DAYS * 24 * 60 * 60
/** A `ts` slightly ahead of this clock is a skewed client, not a forgery — anything beyond a day is refused. */
const FUTURE_SKEW_MS = DAY_MS

export type ConsentCategory = 'audience'

export type Consent = { v: typeof CONSENT_VERSION; audience: boolean; ts: number }

/** The stored cookie value → a valid Consent, or null (absent, malformed, wrong version, from the future, or older than 6 months). */
export function parseConsent(raw: string | null | undefined, now: number = Date.now()): Consent | null {
  if (!raw) return null
  let value: unknown
  try {
    value = JSON.parse(raw)
  } catch {
    return null
  }
  if (typeof value !== 'object' || value === null) return null
  const { v, audience, ts } = value as Record<string, unknown>
  if (v !== CONSENT_VERSION) return null
  if (typeof audience !== 'boolean') return null
  if (typeof ts !== 'number' || !Number.isFinite(ts)) return null
  if (ts > now + FUTURE_SKEW_MS) return null
  if (now - ts > CONSENT_VALIDITY_DAYS * DAY_MS) return null
  return { v: CONSENT_VERSION, audience, ts }
}

export function makeConsent(audience: boolean, now: number = Date.now()): Consent {
  return { v: CONSENT_VERSION, audience, ts: now }
}

/** True only for a valid, explicit « yes » to that category. No consent at all (null) is « no ». */
export function hasConsent(consent: Consent | null, category: ConsentCategory): boolean {
  return consent?.[category] === true
}

/** The `document.cookie` string that stores a choice. `secure` follows the page protocol (a Secure cookie is dropped by some browsers on plain http). */
export function consentCookieString(consent: Consent, secure: boolean): string {
  return [
    `${CONSENT_COOKIE}=${encodeURIComponent(JSON.stringify(consent))}`,
    'Path=/',
    `Max-Age=${CONSENT_MAX_AGE_SECONDS}`,
    'SameSite=Lax',
    ...(secure ? ['Secure'] : []),
  ].join('; ')
}
