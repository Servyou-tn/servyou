// Pure validation for the contact form — shared by the client (inline errors) and the
// server action (authoritative re-check). No framework/server imports → unit-testable.

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
export const EMAIL_MAX = 254 // RFC 5321 path limit
export const SUBJECT_MAX = 100 // the select sends an i18n key (~40 characters)
export const MESSAGE_MAX = 2000

// Deliberately simple email shape check (a non-empty local part, an @, a dotted domain).
// Real deliverability is confirmed by the reply, not a regex.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email.trim())
}

export function validateContactForm(input: ContactInput): { ok: boolean; errors: ContactErrors } {
  const errors: ContactErrors = {}
  const name = input.name.trim()
  if (!name || name.length > NAME_MAX) errors.name = true
  if (!isValidEmail(input.email) || input.email.trim().length > EMAIL_MAX) errors.email = true
  if ((input.subject ?? '').length > SUBJECT_MAX) errors.subject = true
  const msg = input.message.trim()
  if (!msg || msg.length > MESSAGE_MAX) errors.message = true
  return { ok: Object.keys(errors).length === 0, errors }
}
