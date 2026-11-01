import { createAdminClient } from '@/lib/supabase/admin'

// Stores a /contact message in public.contact_messages — service role only (RLS on, no policy, no client privilege;
// see its migration). Called by submitContactMessage AFTER the Turnstile check and the length checks, with values
// already validated. Read by the founder in the Supabase table view; deleted after 12 months.
export type ContactMessageRow = {
  name: string
  email: string
  subject: string | null
  message: string
  userId: string | null
}

export async function saveContactMessage(row: ContactMessageRow): Promise<{ ok: boolean }> {
  const { error } = await createAdminClient().from('contact_messages').insert({
    name: row.name,
    email: row.email,
    subject: row.subject,
    message: row.message,
    user_id: row.userId,
  })
  if (error) {
    // Fields only, never the row: it carries the sender's name, email and message.
    console.error('[saveContactMessage] insert failed:', error.message, error.code, error.details)
    return { ok: false }
  }
  return { ok: true }
}
