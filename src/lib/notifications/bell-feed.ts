import { createClient } from '@/lib/supabase/server'
import { reportQueryError } from '@/lib/supabase/query-error'
import { BELL_LIMIT, type BellFeed, type BellItem, type BellRow } from './bell'
import { toBellItem } from './bell-kinds'

// The bell's two reads for one page load (plan §3 decision 3: no Realtime — the badge is server-rendered and refreshed
// on page load). Only ever called for a SIGNED-IN reader: anon has no SELECT grant on notifications.
//   • the list: the 20 newest rows, with the order they are about (the recipient reads it as a party, RLS
//     « Buyer and seller read their orders »). notifications has ONE foreign key to orders, so no FK hint is needed;
//   • the unread count, which can exceed the 20 listed (partial index notifications_recipient_unread_idx).
// RLS already limits both to the caller's rows; the recipient_id filter is there for the indexes.
// A failed read is a SECONDARY failure (the shell must not take the page down): reported, and the panel says it could
// not load — never an empty list, never a « 0 ».
export async function loadBellFeed(readerId: string): Promise<BellFeed> {
  const supabase = await createClient()
  const [list, unread] = await Promise.all([
    supabase
      .from('notifications')
      .select(
        'id, kind, from_status, to_status, created_at, read_at, order:orders(id, buyer_id, seller_id, order_type, item_title, refusal_reason)',
      )
      .eq('recipient_id', readerId)
      .order('created_at', { ascending: false })
      .limit(BELL_LIMIT),
    supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('recipient_id', readerId)
      .is('read_at', null),
  ])

  if (list.error) {
    reportQueryError('bell list', list.error)
    return { ok: false }
  }
  if (unread.error || unread.count === null) {
    reportQueryError('bell unread count', unread.error ?? new Error('no count returned'))
    return { ok: false }
  }

  const rows = list.data as BellRow[]
  const items = rows.map((row) => toBellItem(row, readerId)).filter((item): item is BellItem => item !== null)
  // Unreachable today (the DB CHECK allows the two kinds bell-kinds.ts maps; RLS and the trigger make every row about an
  // order its recipient is a party to), but a dropped row would leave the badge counting something the list does not
  // show: say so instead of failing silently. A DB kind shipped before its map entry would land here.
  if (items.length < rows.length) {
    reportQueryError(
      'bell rows',
      new Error(`${rows.length - items.length} of ${rows.length} rows not shown (unknown kind or unreadable subject)`),
    )
  }
  return { ok: true, items, unreadCount: unread.count }
}
