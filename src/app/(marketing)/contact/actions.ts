'use server'

import { validateContactForm, type ContactInput } from '@/lib/contact/contact-validation'
import { verifyTurnstile } from '@/lib/security/turnstile'

export type ContactResult = { ok: boolean; field?: 'name' | 'email' | 'subject' | 'message'; botCheck?: boolean }

// MVP stub: there is no contact_messages table and no transactional email service yet.
// This server action re-validates (authoritative), logs a safe summary, and returns
// success. The success toast tells the user we'll reply in 24–48h.
//
// Public and unauthenticated, so (pre-beta review M5): every field is type-checked and length-capped, every submit
// costs a Turnstile check (verified BEFORE anything else is done with the input), and the log carries no personal
// data — no name, no email, no free text; only the subject key and the message length.
//
// TODO Phase 10: wire to an email service (Resend) and/or persist to a contact_messages
// table. Tracked in docs/follow-ups.md.
export async function submitContactMessage(input: ContactInput, turnstileToken?: string): Promise<ContactResult> {
  if (
    typeof input !== 'object' ||
    input === null ||
    typeof input.name !== 'string' ||
    typeof input.email !== 'string' ||
    typeof input.message !== 'string' ||
    (input.subject !== undefined && typeof input.subject !== 'string')
  ) {
    return { ok: false, field: 'message' }
  }

  const bot = await verifyTurnstile(turnstileToken)
  if (!bot.ok) return { ok: false, botCheck: true }

  const { ok, errors } = validateContactForm(input)
  if (!ok) {
    return { ok: false, field: errors.name ? 'name' : errors.email ? 'email' : errors.subject ? 'subject' : 'message' }
  }

  console.log('[contact] message received', {
    subject: input.subject || null,
    messageLength: input.message.trim().length,
  })

  return { ok: true }
}
