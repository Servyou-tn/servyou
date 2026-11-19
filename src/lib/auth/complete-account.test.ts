import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { completeAccountFieldErrors, outcomeForPasswordError, outcomeForRpcHint } from './complete-account'
import { t } from '@/lib/i18n'

// « Finalisez votre compte »: every refusal complete_my_account can raise, and every GoTrue code updateUser can answer,
// maps to an outcome the page handles — never the raw French message (docs/follow-ups/two-step-signup-db.md, item 2).

describe('outcomeForRpcHint — complete_my_account', () => {
  it.each([
    ['already_complete', { kind: 'done' }],
    ['other_sessions', { kind: 'retry' }],
    ['password_required', { kind: 'new_link' }],
    ['email_link_required', { kind: 'new_link' }],
    ['session_unknown', { kind: 'new_link' }],
    ['name_invalid', { kind: 'field', field: 'fullName', key: 'completeAccount.errors.nameInvalid' }],
    ['city_required', { kind: 'field', field: 'city', key: 'signup.form.errors.cityRequired' }],
    ['birth_date_invalid', { kind: 'field', field: 'dateOfBirth', key: 'signup.form.errors.dateOfBirthInvalid' }],
    ['too_young', { kind: 'field', field: 'dateOfBirth', key: 'signup.form.errors.tooYoung.consumer' }],
    ['terms_required', { kind: 'field', field: 'terms', key: 'completeAccount.errors.termsRequired' }],
    ['terms_outdated', { kind: 'reload', key: 'completeAccount.errors.termsOutdated' }],
  ])('%s', (hint, outcome) => {
    expect(outcomeForRpcHint(hint)).toEqual(outcome)
  })

  it('anything else (no hint: « permission denied », a network error) is the generic error', () => {
    for (const hint of [null, undefined, '', 'unexpected']) {
      expect(outcomeForRpcHint(hint)).toEqual({ kind: 'error', key: 'signup.form.errors.generic' })
    }
  })

  it('covers every hint the migration raises (a new one would land in the generic branch)', () => {
    const sql = readFileSync(join(process.cwd(), 'db/migrations/20261115222457_two_step_signup.sql'), 'utf8')
    const body = sql.slice(sql.indexOf('create or replace function public.complete_my_account'), sql.indexOf('grant execute on function public.complete_my_account'))
    const hints = [...body.matchAll(/hint = '([a-z_]+)'/g)].map((m) => m[1])
    expect(hints.length).toBe(11)
    for (const hint of hints) expect(outcomeForRpcHint(hint).kind, hint).not.toBe('error')
  })
})

describe('outcomeForPasswordError — updateUser({ password })', () => {
  it.each([
    ['same_password', { kind: 'field', field: 'password', key: 'completeAccount.errors.samePassword' }],
    ['weak_password', { kind: 'field', field: 'password', key: 'signup.form.errors.passwordWeak' }],
    // « Secure password change »: a link session older than 24 hours → a new link opens a fresh one.
    ['reauthentication_needed', { kind: 'new_link' }],
    ['session_not_found', { kind: 'new_link' }],
    ['session_expired', { kind: 'new_link' }],
    ['refresh_token_not_found', { kind: 'new_link' }],
    ['over_request_rate_limit', { kind: 'error', key: 'common.rate_limit' }],
    ['over_email_send_rate_limit', { kind: 'error', key: 'common.rate_limit' }],
    [undefined, { kind: 'error', key: 'signup.form.errors.generic' }],
    ['unexpected', { kind: 'error', key: 'signup.form.errors.generic' }],
  ])('%s', (code, outcome) => {
    expect(outcomeForPasswordError(code)).toEqual(outcome)
  })
})

describe('every key an outcome or a field error can carry exists in FR, AR and EN', () => {
  const keys = [
    'completeAccount.errors.nameInvalid', 'completeAccount.errors.termsRequired', 'completeAccount.errors.termsOutdated',
    'completeAccount.errors.samePassword', 'signup.form.errors.cityRequired', 'signup.form.errors.dateOfBirthInvalid',
    'signup.form.errors.tooYoung.consumer', 'signup.form.errors.passwordWeak', 'signup.form.errors.passwordTooShort',
    'signup.form.errors.fullNameTooShort', 'signup.form.errors.fullNameTooLong', 'signup.form.errors.generic', 'common.rate_limit',
  ]
  it.each(keys)('%s', (key) => {
    for (const lang of ['fr', 'ar', 'en'] as const) expect(t(key, lang), `${key} ${lang}`).not.toBe(key)
  })
})

describe('completeAccountFieldErrors — the form and the action share these rules', () => {
  const NOW = new Date('2026-11-16T12:00:00Z')
  const valid = { fullName: 'Amira Ben Salah', password: 'Soleil2026', dateOfBirth: '1995-04-12', city: 'Sfax', termsAccepted: true }

  it('accepts a complete, valid step 2', () => {
    expect(completeAccountFieldErrors(valid, NOW)).toEqual({})
  })

  it('16 years old today passes; one day short does not', () => {
    expect(completeAccountFieldErrors({ ...valid, dateOfBirth: '2010-11-16' }, NOW)).toEqual({})
    expect(completeAccountFieldErrors({ ...valid, dateOfBirth: '2010-11-17' }, NOW)).toEqual({ dateOfBirth: 'signup.form.errors.tooYoung.consumer' })
  })

  it('refuses each field on its own', () => {
    expect(completeAccountFieldErrors({ ...valid, fullName: ' A ' }, NOW)).toEqual({ fullName: 'signup.form.errors.fullNameTooShort' })
    expect(completeAccountFieldErrors({ ...valid, fullName: 'x'.repeat(101) }, NOW)).toEqual({ fullName: 'signup.form.errors.fullNameTooLong' })
    expect(completeAccountFieldErrors({ ...valid, password: 'abc12' }, NOW)).toEqual({ password: 'signup.form.errors.passwordTooShort' })
    expect(completeAccountFieldErrors({ ...valid, password: 'abcdefghij' }, NOW)).toEqual({ password: 'signup.form.errors.passwordWeak' })
    expect(completeAccountFieldErrors({ ...valid, dateOfBirth: '' }, NOW)).toEqual({ dateOfBirth: 'signup.form.errors.dateOfBirthInvalid' })
    expect(completeAccountFieldErrors({ ...valid, dateOfBirth: '1899-12-31' }, NOW)).toEqual({ dateOfBirth: 'signup.form.errors.dateOfBirthInvalid' })
    expect(completeAccountFieldErrors({ ...valid, dateOfBirth: '2027-01-01' }, NOW)).toEqual({ dateOfBirth: 'signup.form.errors.dateOfBirthInvalid' })
    expect(completeAccountFieldErrors({ ...valid, city: '' }, NOW)).toEqual({ city: 'signup.form.errors.cityRequired' })
    expect(completeAccountFieldErrors({ ...valid, city: 'Paris' }, NOW)).toEqual({ city: 'signup.form.errors.cityRequired' })
    expect(completeAccountFieldErrors({ ...valid, termsAccepted: false }, NOW)).toEqual({ terms: 'completeAccount.errors.termsRequired' })
  })
})
