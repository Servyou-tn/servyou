// Pure validation for the contact form — shared by the client (inline errors) and the
// server action (authoritative re-check). No framework/server imports → unit-testable.

import { EMAIL_MAX, isValidEmail } from '../email-check'

// The email rule (254-character limit first, then a linear shape check — audit H3) lives in email-check.ts,
// shared with the auth forms. Re-exported so existing imports keep working.
export { EMAIL_MAX, isValidEmail }

export type ContactInput = {
  name: string
  email: string
  message: string
  subject?: string
}

export type ContactErrors = {
  name?: boolean
  email?: boolean
  subject?: boolean
  message?: boolean
}

// A limit on every field (pre-beta review M5): the action is public, so nothing unbounded reaches the server.
export const NAME_MAX = 100
export const SUBJECT_MAX = 100 // the select sends an i18n key (~40 characters)

// The select's options. The server accepts only these (or none), so the logged subject is never attacker text.
export const CONTACT_SUBJECTS = [
  'contact.form.subject.general',
  'contact.form.subject.technical',
  'contact.form.subject.suggestion',
  'contact.form.subject.abuse',
  'contact.form.subject.other',
] as const
export const MESSAGE_MAX = 2000

export function validateContactForm(input: ContactInput): { ok: boolean; errors: ContactErrors } {
  const errors: ContactErrors = {}
  const name = input.name.trim()
  if (!name || name.length > NAME_MAX) errors.name = true
  if (!isValidEmail(input.email)) errors.email = true // the EMAIL_MAX limit is checked first, inside
  const subject = input.subject ?? ''
  if (subject.length > SUBJECT_MAX || (subject !== '' && !(CONTACT_SUBJECTS as readonly string[]).includes(subject))) {
    errors.subject = true
  }
  const msg = input.message.trim()
  if (!msg || msg.length > MESSAGE_MAX) errors.message = true
  return { ok: Object.keys(errors).length === 0, errors }
}
