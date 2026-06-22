import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'

// Shared, request-deduped reads for the dashboard shell. The App Router can't pass
// props from a layout to its page, so the layout, the right rail, and the page each
// call these — React cache() collapses them to one query per request.

export type DashboardProfile = {
  full_name: string | null
  city: string | null
  seller_type: 'shop_owner' | 'freelancer' | null
}

export const getDashboardUser = cache(async () => {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user
})

export const getDashboardProfile = cache(async (userId: string): Promise<DashboardProfile | null> => {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('profiles')
    .select('full_name, city, seller_type')
    .eq('id', userId)
    .single()
  if (error) console.error('[dashboard/data] profile fetch error:', error)
  return (data as DashboardProfile) ?? null
})
