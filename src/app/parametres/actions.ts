'use server'

import { createClient } from '@/lib/supabase/server'

// Records a data-export request (admin-mediated; does not export). The partial unique
// index blocks a second pending request (23505) → 'already_pending'. Returns a coarse
// reason code; the modal maps it to the right toast + open/close behavior.
export type ExportResult = { ok: true } | { ok: false; reason: 'already_pending' | 'error' }

export async function requestDataExportAction(): Promise<ExportResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, reason: 'error' }

  const { error } = await supabase.from('data_exports').insert({ user_id: user.id })
  if (error) {
    if ((error as { code?: string }).code === '23505') return { ok: false, reason: 'already_pending' }
    console.error('[requestDataExportAction] insert error:', error)
    return { ok: false, reason: 'error' }
  }
  return { ok: true }
}
