import { createClient } from '@/lib/supabase/server'
import { reportQueryError } from '@/lib/supabase/query-error'
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
  // Ruling 3: the top bar keeps a partial display (the user, without name / role / avatar) and the
  // failure is reported — a shell read must not take ~33 pages down. Pages that gate on the ROLE
  // read it themselves and throw.
  if (error) reportQueryError('shell-user profile', error)

  // A freelancer's public page (/freelance/[id]) for the user menu. A failed read hides the item — reported, never a broken link.
  const sellerType = (profile?.seller_type as 'shop_owner' | 'freelancer' | null) ?? null
  let freelancerProfileId: string | null = null
  if (sellerType === 'freelancer') {
    const { data: fp, error: fpError } = await supabase.from('freelancer_profiles').select('id').eq('profile_id', user.id).maybeSingle()
    if (fpError) reportQueryError('shell-user freelancer profile', fpError)
    freelancerProfileId = (fp?.id as string | undefined) ?? null
  }

  return {
    id: user.id,
    topBarUser: {
      id: user.id,
      email: user.email ?? '',
      full_name: profile?.full_name ?? null,
      seller_type: sellerType,
      avatar_url: profile?.avatar_url ?? null,
      freelancer_profile_id: freelancerProfileId,
    },
  }
}
