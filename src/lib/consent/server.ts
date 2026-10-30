import { cookies } from 'next/headers'
import { CONSENT_COOKIE, hasConsent as consentGranted, parseConsent, type Consent, type ConsentCategory } from './consent'

// Server side of the consent helper: the root layout reads the cookie so the banner is (or is not) in the first HTML — no flash — and a server
// component or route that wants to load something optional asks `hasConsent('audience')`. Reading cookies makes the caller dynamic, as getLang()
// already does for the layout.

/** The visitor's valid stored consent, or null (never asked / expired / a bumped version / a forged value). */
export async function getConsent(): Promise<Consent | null> {
  const jar = await cookies()
  // Next hands the cookie decoded for plain values, but ours is URI-encoded JSON.
  const raw = jar.get(CONSENT_COOKIE)?.value
  if (!raw) return null
  let decoded = raw
  try {
    decoded = decodeURIComponent(raw)
  } catch {
    return null
  }
  return parseConsent(decoded)
}

/** `await hasConsent('audience')` — true only after an explicit, still-valid « yes ». Future analytics loads only behind this. */
export async function hasConsent(category: ConsentCategory): Promise<boolean> {
  return consentGranted(await getConsent(), category)
}
