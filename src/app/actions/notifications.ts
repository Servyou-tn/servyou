'use server'

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

// Read on open (plan §3 decision 4, founder 2026-11-16): opening an item marks THAT item read; « Tout marquer comme lu »
// marks them all; opening the dropdown alone marks nothing (no call).
//
// mark_my_notifications_read(p_ids) treats a missing / null p_ids as « every unread row of the caller ». So the input
// is a discriminated union: `one` ALWAYS sends [id], and only an explicit `all` sends no ids. A malformed id is refused
// here and never reaches the RPC (it would otherwise be a 22P02, or worse, be read as « all »).
// The RPC re-derives the owner itself (auth.uid(); only the caller's own unread rows), so a forged id of someone else's
// notification marks nothing.
const MarkReadInput = z.discriminatedUnion('scope', [
  z.object({ scope: z.literal('one'), id: z.string().uuid() }),
  z.object({ scope: z.literal('all') }),
])

export type MarkReadInput = z.infer<typeof MarkReadInput>
export type MarkReadResult = { ok: true; marked: number } | { ok: false }

export async function markNotificationsReadAction(input: unknown): Promise<MarkReadResult> {
  const parsed = MarkReadInput.safeParse(input)
  if (!parsed.success) return { ok: false }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false }

  const { data, error } = await supabase.rpc(
    'mark_my_notifications_read',
    parsed.data.scope === 'one' ? { p_ids: [parsed.data.id] } : {},
  )
  if (error) {
    console.error('[markNotificationsRead] rpc error:', error.message, error.code, error.details)
    return { ok: false }
  }
  return { ok: true, marked: data ?? 0 }
}
