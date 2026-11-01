'use server'

import { validateContactForm, type ContactInput } from '@/lib/contact/contact-validation'
import { verifyTurnstile } from '@/lib/security/turnstile'
import { saveContactMessage } from '@/lib/contact/save-message'
import { createClient } from '@/lib/supabase/server'

export type ContactResult = {
  ok: boolean
  field?: 'name' | 'email' | 'subject' | 'message'
  botCheck?: boolean
  saveFailed?: boolean
}

// Re-validates (authoritative), STORES the message in public.contact_messages (service role, after the bot and
// length checks), logs a safe summary, and only then returns success — the success toast tells the user we'll
// reply in 24–48h. A failed store is an error, never a fake success (it used to be: the message was only logged).
//
// Public and unauthenticated, so (pre-beta review M5): every field is type-checked and length-capped, every submit
// costs a Turnstile check (verified BEFORE anything else is done with the input), and the log carries no personal
// data — no name, no email, no free text; only the subject key and the message length.
//
// Emailing each message to the founder comes after the Resend / OVH setup (docs/follow-ups/contact-messages.md).
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

  // The sender's account when signed in (the page is public: no session is the common case).
  let userId: string | null = null
  try {
    const { data } = await (await createClient()).auth.getUser()
    userId = data.user?.id ?? null
  } catch {
    userId = null
  }

  const saved = await saveContactMessage({
    name: input.name.trim(),
    email: input.email.trim(),
    subject: input.subject || null,
    message: input.message.trim(),
    userId,
  })
  if (!saved.ok) return { ok: false, saveFailed: true }

  console.log('[contact] message received', {
    subject: input.subject || null,
    messageLength: input.message.trim().length,
  })

  return { ok: true }
}
