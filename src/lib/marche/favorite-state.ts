import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { reportQueryError } from '@/lib/supabase/query-error'
import { TARGET_COLUMN, type FavoriteKind } from '@/lib/favorites/targets'

/**
 * Has the SIGNED-IN viewer favorited this shop / freelancer? Seeds the heart on D3 / D4 so it renders in the right state on the
 * first paint (no client fetch, no flash). A guest is simply « not favorited » — the heart sends them to sign in.
 *
 * SECONDARY to the page: a failed read is reported and answers `false`; the worst case is a heart that shows « off » for something
 * already favorited, and the idempotent action makes a tap harmless either way.
 */
export const getFavoriteState = cache(async (kind: FavoriteKind, targetId: string): Promise<boolean> => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return false

  const { data, error } = await supabase
    .from('favorites')
    .select('id')
    .eq('user_id', user.id)
    .eq('item_type', kind)
    .eq(TARGET_COLUMN[kind], targetId)
    .maybeSingle()
  if (error) {
    reportQueryError(`favorite-state ${kind}`, error)
    return false
  }
  return data !== null
})
