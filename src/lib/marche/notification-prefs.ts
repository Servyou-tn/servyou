import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { reportQueryError } from '@/lib/supabase/query-error'
import { DEFAULT_NOTIF_PREFS, withDefaults, type NotifPrefs } from '@/lib/notifications/prefs'

export type NotificationPrefsResult = { ok: true; prefs: NotifPrefs } | { ok: false }

/**
 * The caller's e-mail preferences for Paramètres → Notifications. RLS scopes the read to the owner's single row.
 *
 * No row is a NORMAL answer, not an error: a profile only gets one on its first save, so it reads as the column defaults.
 * A FAILED read is different — it is SECONDARY to the page (the other tabs still work), so it is reported and returned as
 * `{ ok: false }`; the tab then shows a retry state instead of a toggle list of defaults the user could « save » over their
 * real choices.
 */
export const getNotificationPrefs = cache(async (userId: string): Promise<NotificationPrefsResult> => {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('notification_preferences')
    .select('email_new_orders, email_proposals, email_reviews, email_low_stock, email_missions_matching, email_newsletter')
    .eq('profile_id', userId)
    .maybeSingle()
  if (error) {
    reportQueryError('parametres notification_preferences', error)
    return { ok: false }
  }
  return { ok: true, prefs: data ? withDefaults(data) : { ...DEFAULT_NOTIF_PREFS } }
})
