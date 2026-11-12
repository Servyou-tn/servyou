// The one email shape check, shared by the contact form (public server action) and the auth forms.
// Pure (no framework/server imports) so the client and the server run the same rule.
//
// Audit H3: the old check was the regex /^[^\s@]+@[^\s@]+\.[^\s@]+$/ with no length limit in front of it. On a
// crafted address (many dots in the domain, then a character that fails the end anchor) it backtracks
// quadratically: a 64,000-character input took ~10 s of server time per submit. This version:
//   1. refuses anything over EMAIL_MAX before looking at its shape;
//   2. checks the shape with indexOf / slice — linear, nothing to backtrack.
// It accepts and refuses exactly what the old regex did for every input up to EMAIL_MAX characters
// (email-check.test.ts compares the two on fixed cases and 20,000 random strings).
//
// Deliberately simple shape (a non-empty local part, a single @, a domain with a dot that is neither its first
// nor its last character). Real deliverability is confirmed by the reply / the confirmation email, not here.

export const EMAIL_MAX = 254 // RFC 5321 path limit

// One character class, no quantifier: a single left-to-right scan that cannot backtrack. It keeps the exact
// whitespace set the old regex's \s refused (the same set String.prototype.trim strips).
const HAS_WHITESPACE = /\s/

export function isValidEmail(email: string): boolean {
  const value = email.trim()
  if (value.length > EMAIL_MAX) return false
  if (HAS_WHITESPACE.test(value)) return false

  const at = value.indexOf('@')
  if (at < 1 || at !== value.lastIndexOf('@')) return false // no @, empty local part, or more than one @

  const domain = value.slice(at + 1)
  const dot = domain.indexOf('.', 1) // a dot with at least one character before it…
  return dot !== -1 && dot < domain.length - 1 // …and at least one after it
}
