import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { failQuery, reportQueryError } from '@/lib/supabase/query-error'

// Current user's own profile for /mon-compte. profiles is owner-only read, so this
// resolves only for the signed-in user. There's no avatar_url column in the schema, so
// the photo field is a disabled placeholder in the UI.
export type CurrentProfile = {
  id: string
  full_name: string
  email: string
  phone: string | null
  city: string | null
  date_of_birth: string
  language: string
  seller_type: string | null
  created_at: string
}

export const getCurrentProfile = cache(async (): Promise<CurrentProfile | null> => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, phone, city, date_of_birth, language, seller_type, created_at')
    .eq('id', user.id)
    .maybeSingle()
  // Throws: null here makes /mon-compte and /parametres redirect to /connexion, so an outage read
  // as « you are signed out ». A signed-in user with no row still returns null.
  if (error) failQuery('mon-compte profile', error)
  return (data as CurrentProfile | null) ?? null
})

export type DeletionContext = {
  /** A deletion request is already waiting for the team (one pending per user, by unique index). */
  pending: boolean
  /** Orders the user is a party to (buyer or seller) that are not terminal. */
  openOrders: number
}

// What the delete-account modal needs. Terminal order states are the ones check_order_status_transition
// refuses to leave: received and cancelled — everything else is open. Informational only (a hard block
// would be a business rule, which belongs in the database). Read through the user's own session: both
// tables are owner-readable. A failed read is logged and degrades to "nothing known": a duplicate
// request is still refused by the unique index, and the warning is advice, not a gate.
export async function getDeletionContext(userId: string): Promise<DeletionContext> {
  const supabase = await createClient()
  const [pending, open] = await Promise.all([
    supabase.from('deletion_requests').select('id').eq('user_id', userId).eq('status', 'pending').limit(1),
    supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
      .not('status', 'in', '(received,cancelled)'),
  ])
  if (pending.error) reportQueryError('mon-compte pending deletion', pending.error)
  if (open.error) reportQueryError('mon-compte open orders', open.error)
  return { pending: (pending.data ?? []).length > 0, openOrders: open.count ?? 0 }
}
