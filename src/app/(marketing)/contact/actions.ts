'use server'

import { validateContactForm, type ContactInput } from '@/lib/contact/contact-validation'

export type ContactResult = { ok: boolean; field?: 'name' | 'email' | 'message' }

// MVP stub: there is no contact_messages table and no transactional email service yet.
// This server action re-validates (authoritative), logs a safe summary, and returns
// success. The success toast tells the user we'll reply in 24–48h.
//
// TODO Phase 10: wire to an email service (Resend) and/or persist to a contact_messages
// table. Tracked in docs/follow-ups.md.
export async function submitContactMessage(input: ContactInput): Promise<ContactResult> {
  const { ok, errors } = validateContactForm(input)
  if (!ok) {
    return { ok: false, field: errors.name ? 'name' : errors.email ? 'email' : 'message' }
  }

  console.log('[contact] message received', {
    name: input.name.trim(),
    email: input.email.trim(),
    subject: input.subject ?? null,
    messageLength: input.message.trim().length,
  })

  return { ok: true }
}
