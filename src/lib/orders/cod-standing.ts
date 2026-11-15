// The buyer's own COD standing (db/migrations/20261115182353_cod_no_show.sql, get_my_cod_standing): the caller's 1-order cap
// and the end of an active block, never the refusal count. Server-side only: it takes the request's Supabase client.

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/database.types'
import { t, type Lang } from '@/lib/i18n'
import { formatTunisDate } from '@/lib/datetime'

export type CodStanding = { openOrderCap: boolean; blockedUntil: string | null }

/** The caller's standing, or null when it can't be read (the caller then falls back to a message without a date). */
export async function getMyCodStanding(supabase: SupabaseClient<Database>): Promise<CodStanding | null> {
  const { data, error } = await supabase.rpc('get_my_cod_standing')
  if (error) {
    console.error('[getMyCodStanding] rpc error:', error.message, error.code, error.details)
    return null
  }
  const row = data?.[0]
  if (!row) return null
  return { openOrderCap: row.open_order_cap === true, blockedUntil: row.blocked_until ?? null }
}

/** The block refusal shown to the buyer, with the block's end date (Africa/Tunis) when it can be read. */
export async function codBlockedMessage(supabase: SupabaseClient<Database>, lang: Lang): Promise<string> {
  const standing = await getMyCodStanding(supabase)
  if (!standing?.blockedUntil) return t('demander.error.cod_blocked_generic', lang)
  return t('demander.error.cod_blocked', lang, { date: formatTunisDate(standing.blockedUntil, lang, 'long') })
}
