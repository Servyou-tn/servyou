import { GOVERNORATES } from '@/lib/tunisia-governorates'
import { MIN_SIGNUP_AGE, computeAge, isValidPassword } from '@/lib/signup-validation'

// « Finalisez votre compte » (step 2): the field rules shared by the form and its server action, and what every refusal
// means for the page. complete_my_account (migration 20261115222457) answers with a HINT; GoTrue's updateUser with an
// error CODE. Both map to i18n KEYS here, never to the raw (French) message (docs/follow-ups/two-step-signup-db.md, item 2).

export type CompleteAccountField = 'fullName' | 'password' | 'dateOfBirth' | 'city' | 'terms'

export type CompleteAccountValues = {
  fullName: string
  password: string
  dateOfBirth: string
  city: string
  termsAccepted: boolean
}

export type FieldErrors = Partial<Record<CompleteAccountField, string>>

const GOVERNORATE_VALUES = new Set(GOVERNORATES.map((g) => g.value))
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

/** i18n keys per invalid field; {} = valid. The database re-checks every rule (and 16+ in the Tunis calendar). */
export function completeAccountFieldErrors(v: CompleteAccountValues, now: Date = new Date()): FieldErrors {
  const e: FieldErrors = {}
  const name = v.fullName.trim()
  if (name.length < 2) e.fullName = 'signup.form.errors.fullNameTooShort'
  else if (name.length > 100) e.fullName = 'signup.form.errors.fullNameTooLong'

  if (v.password.length < 8) e.password = 'signup.form.errors.passwordTooShort'
  else if (v.password.length > 72 || !isValidPassword(v.password)) e.password = 'signup.form.errors.passwordWeak'

  const dob = ISO_DATE.test(v.dateOfBirth) ? new Date(`${v.dateOfBirth}T00:00:00Z`) : null
  if (!dob || Number.isNaN(dob.getTime()) || v.dateOfBirth < '1900-01-01' || dob.getTime() > now.getTime()) {
    e.dateOfBirth = 'signup.form.errors.dateOfBirthInvalid'
  } else if (computeAge(v.dateOfBirth, now) < MIN_SIGNUP_AGE) {
    e.dateOfBirth = 'signup.form.errors.tooYoung.consumer'
  }

  if (!GOVERNORATE_VALUES.has(v.city)) e.city = 'signup.form.errors.cityRequired'
  if (v.termsAccepted !== true) e.terms = 'completeAccount.errors.termsRequired'
  return e
}

/** What a step-2 attempt means for the page. */
export type CompleteAccountOutcome =
  | { kind: 'done' }
  /** another session of the account is alive: end them again and retry the RPC once */
  | { kind: 'retry' }
  /** this session cannot complete the account: « Recevoir un nouveau lien » */
  | { kind: 'new_link' }
  /** the terms changed since the page was drawn */
  | { kind: 'reload'; key: string }
  | { kind: 'field'; field: CompleteAccountField; key: string }
  | { kind: 'error'; key: string }

const GENERIC: CompleteAccountOutcome = { kind: 'error', key: 'signup.form.errors.generic' }

/** complete_my_account's hint → outcome. Every hint the function raises is listed; anything else is generic. */
export function outcomeForRpcHint(hint: string | null | undefined): CompleteAccountOutcome {
  switch (hint) {
    case 'already_complete':
      return { kind: 'done' }
    case 'other_sessions':
      return { kind: 'retry' }
    case 'password_required':
    case 'email_link_required':
    case 'session_unknown':
      return { kind: 'new_link' }
    case 'name_invalid':
      return { kind: 'field', field: 'fullName', key: 'completeAccount.errors.nameInvalid' }
    case 'city_required':
      return { kind: 'field', field: 'city', key: 'signup.form.errors.cityRequired' }
    case 'birth_date_invalid':
      return { kind: 'field', field: 'dateOfBirth', key: 'signup.form.errors.dateOfBirthInvalid' }
    case 'too_young':
      return { kind: 'field', field: 'dateOfBirth', key: 'signup.form.errors.tooYoung.consumer' }
    case 'terms_required':
      return { kind: 'field', field: 'terms', key: 'completeAccount.errors.termsRequired' }
    case 'terms_outdated':
      return { kind: 'reload', key: 'completeAccount.errors.termsOutdated' }
    default:
      return GENERIC
  }
}

/** GoTrue's updateUser({ password }) error code → outcome. */
export function outcomeForPasswordError(code: string | undefined): CompleteAccountOutcome {
  switch (code) {
    // A stuck user back through a new link who retypes the password they set last time: GoTrue refuses an unchanged
    // password, and the RPC needs one set during THIS session anyway.
    case 'same_password':
      return { kind: 'field', field: 'password', key: 'completeAccount.errors.samePassword' }
    case 'weak_password':
      return { kind: 'field', field: 'password', key: 'signup.form.errors.passwordWeak' }
    // « Secure password change »: a session older than 24 hours must reauthenticate; a new link opens a fresh session
    // (docs/follow-ups/two-step-signup-db.md, item 1).
    case 'reauthentication_needed':
    case 'session_not_found':
    case 'session_expired':
    case 'refresh_token_not_found':
      return { kind: 'new_link' }
    case 'over_request_rate_limit':
    case 'over_email_send_rate_limit':
      return { kind: 'error', key: 'common.rate_limit' }
    default:
      return GENERIC
  }
}
