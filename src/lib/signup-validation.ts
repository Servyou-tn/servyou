// Pure signup/password validators. The 16+ rule is the universal buying minimum
// (product.md); the password policy is ≥8 chars with at least one letter and one
// number (servyou-pages-elements-and-interactions.md B.1 — "stricter rules feel
// paternalistic and reduce conversion"). Extracted from the form so the rules are
// unit-tested and reused by the new-password recovery form. These are app-layer
// UX convenience: the 16+ gate is not DB-enforced (the 18+ sell gate is).
export const MIN_SIGNUP_AGE = 16
// Sellers (shop owners, freelancers) must be 18+ to sign up via their Step-2 page;
// the DB separately enforces 18+ when seller_type is actually set at /devenir-*.
export const MIN_SELLER_AGE = 18

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email.trim())
}

// Parse a YYYY-MM-DD native-date-input value as a LOCAL calendar date, so age is
// timezone-stable (new Date('YYYY-MM-DD') parses as UTC and would shift a day in
// negative offsets). Falls back to Date's own parser for anything else.
function parseDate(value: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(value)
}

/** Whole years between `dateOfBirth` (YYYY-MM-DD) and `now` (default: today). */
export function computeAge(dateOfBirth: string, now: Date = new Date()): number {
  const dob = parseDate(dateOfBirth)
  let age = now.getFullYear() - dob.getFullYear()
  const m = now.getMonth() - dob.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--
  return age
}

/** True when the date of birth is valid and the person is at least `minAge`.
 *  minAge is explicit (no default) so every caller picks the right role gate:
 *  consumers MIN_SIGNUP_AGE (16), sellers MIN_SELLER_AGE (18) — see ROLE_CONFIG. */
export function isOldEnoughToSignup(dateOfBirth: string, minAge: number, now: Date = new Date()): boolean {
  const dob = parseDate(dateOfBirth)
  if (Number.isNaN(dob.getTime())) return false
  return computeAge(dateOfBirth, now) >= minAge
}

export type PasswordStrength = 'weak' | 'medium' | 'strong'

/** Marketplace password policy: ≥8 chars, at least one letter AND one number. */
export function isValidPassword(pw: string): boolean {
  return pw.length >= 8 && /[a-zA-Z]/.test(pw) && /\d/.test(pw)
}

/** Visual strength tier for the signup/new-password strength meter. */
export function passwordStrength(pw: string): PasswordStrength {
  const hasLetter = /[a-zA-Z]/.test(pw)
  const hasNumber = /\d/.test(pw)
  const hasSpecial = /[^a-zA-Z0-9]/.test(pw)
  if (pw.length >= 10 && hasLetter && hasNumber && hasSpecial) return 'strong'
  if (pw.length >= 8 && hasLetter && hasNumber) return 'medium'
  return 'weak'
}
