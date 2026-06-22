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
  message?: boolean
}

export const MESSAGE_MAX = 2000

// Deliberately simple email shape check (a non-empty local part, an @, a dotted domain).
// Real deliverability is confirmed by the reply, not a regex.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email.trim())
}

export function validateContactForm(input: ContactInput): { ok: boolean; errors: ContactErrors } {
  const errors: ContactErrors = {}
  if (!input.name.trim()) errors.name = true
  if (!isValidEmail(input.email)) errors.email = true
  const msg = input.message.trim()
  if (!msg || msg.length > MESSAGE_MAX) errors.message = true
  return { ok: Object.keys(errors).length === 0, errors }
}
