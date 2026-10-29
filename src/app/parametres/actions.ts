'use server'

import { createClient } from '@/lib/supabase/server'
import { getLang } from '@/lib/i18n/server'
import { t } from '@/lib/i18n'
import { NotifPrefsInput } from '@/lib/notifications/prefs'

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
    if (error.code === '23505') return { ok: false, reason: 'already_pending' }
    console.error('[requestDataExportAction] insert error:', error.message, error.code, error.details)
    return { ok: false, reason: 'error' }
  }
  return { ok: true }
}

export type SaveNotificationPrefsResult = { ok: true } | { ok: false; error: string }

// Saves the caller's e-mail preferences (Paramètres → Notifications). The row key is the SESSION's user, never an argument:
// `profile_id = auth.uid()` is also what the INSERT/UPDATE policies require. An UPSERT because a profile only gets a row on its
// first save; PostgREST updates only the columns it is given, so the client sends just the toggles the caller's role can see and
// the others keep their stored (or default) values.
export async function saveNotificationPrefsAction(input: unknown): Promise<SaveNotificationPrefsResult> {
  const lang = await getLang()
  const parsed = NotifPrefsInput.safeParse(input)
  if (!parsed.success || Object.keys(parsed.data).length === 0) {
    return { ok: false, error: t('common.error_generic', lang) }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: t('common.error_generic', lang) }

  const { error } = await supabase
    .from('notification_preferences')
    .upsert({ profile_id: user.id, ...parsed.data }, { onConflict: 'profile_id' })
  if (error) {
    console.error('[saveNotificationPrefsAction] upsert error:', error.message, error.code, error.details)
    return { ok: false, error: t('parametres.notifications.error_save', lang) }
  }
  return { ok: true }
}
