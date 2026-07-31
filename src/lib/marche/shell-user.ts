import { createClient } from '@/lib/supabase/server'
import type { TopBarUser } from '@/components/marche/ProfileAvatarMenu'

// Resolves the current user + their display name for the marche shell top bar.
// Returns null when logged out — /marche is public and keeps rendering (its top bar
// shows the "Se connecter" avatar). The three account pages call this then redirect to
// /connexion on null. profiles is owner-only read, so the name resolves only for the
// signed-in user; a missing-session getUser is expected and not surfaced as an error.
export async function getShellUser(): Promise<{ id: string; topBarUser: TopBarUser } | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('full_name, seller_type, avatar_url')
    .eq('id', user.id)
    .maybeSingle()
  if (error) console.error('[shell-user] profile fetch failed', error)

  return {
    id: user.id,
    topBarUser: {
      id: user.id,
      email: user.email ?? '',
      full_name: profile?.full_name ?? null,
      seller_type: (profile?.seller_type as 'shop_owner' | 'freelancer' | null) ?? null,
      avatar_url: profile?.avatar_url ?? null,
    },
  }
}
