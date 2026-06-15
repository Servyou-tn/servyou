import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'

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
  if (error) {
    console.error('[mon-compte] profile fetch error:', error)
    return null
  }
  return (data as CurrentProfile | null) ?? null
})
