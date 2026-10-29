import { createClient } from '@/lib/supabase/server'
import { failQuery, reportQueryError } from '@/lib/supabase/query-error'

// Data for the FREELANCER CARD (Figma « Freelancer Card », 720:62688): avatar, name, headline, city, up to four skill chips + « +N »,
// « N services offerts » and « Voir le profil ». Batch-shaped like getShopCards. The profile row is the MAIN query (failure throws);
// identity (name / avatar), skills and the service count are secondary — a failure is reported and the card renders without that part.
//
// Names and avatars come from `public_profiles` (the owner-only `profiles` table is never joined for cross-user reads).

export type FreelancerCardData = {
  /** freelancer_profiles.id — the public profile route is /freelance/[id]. */
  id: string
  name: string
  headline: string | null
  city: string | null
  avatarUrl: string | null
  skills: string[]
  /** Active, visible services. null = could not be counted (the footer hides the figure). */
  serviceCount: number | null
}

/** Returns the visible freelancers among `ids`, in the order of `ids`. */
export async function getFreelancerCards(ids: string[]): Promise<FreelancerCardData[]> {
  if (ids.length === 0) return []
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('freelancer_profiles')
    .select('id, profile_id, headline, city')
    .in('id', ids)
    .is('admin_hidden_at', null)
  if (error) failQuery('freelancer-cards profiles', error)
  const profiles = data ?? []
  if (profiles.length === 0) return []

  const profileIds = profiles.map((p) => p.profile_id)
  const visibleIds = profiles.map((p) => p.id)

  const [identityRes, skillsRes, servicesRes] = await Promise.all([
    supabase.from('public_profiles').select('id, full_name, avatar_url').in('id', profileIds),
    supabase.from('freelancer_skills').select('freelancer_profile_id, skill').in('freelancer_profile_id', visibleIds),
    supabase
      .from('service_listings')
      .select('freelancer_profile_id')
      .in('freelancer_profile_id', visibleIds)
      .eq('status', 'active')
      .is('admin_hidden_at', null),
  ])
  if (identityRes.error) reportQueryError('freelancer-cards public_profiles', identityRes.error)
  if (skillsRes.error) reportQueryError('freelancer-cards skills', skillsRes.error)
  if (servicesRes.error) reportQueryError('freelancer-cards services', servicesRes.error)

  const identity = new Map((identityRes.data ?? []).map((p) => [p.id, p]))
  const skills = new Map<string, string[]>()
  for (const r of skillsRes.data ?? []) {
    const list = skills.get(r.freelancer_profile_id) ?? []
    list.push(r.skill)
    skills.set(r.freelancer_profile_id, list)
  }
  const services = new Map<string, number>()
  for (const r of servicesRes.data ?? []) {
    services.set(r.freelancer_profile_id, (services.get(r.freelancer_profile_id) ?? 0) + 1)
  }

  const byId = new Map<string, FreelancerCardData>(
    profiles.map((p) => [
      p.id,
      {
        id: p.id,
        name: identity.get(p.profile_id)?.full_name ?? '',
        headline: p.headline,
        city: p.city,
        avatarUrl: identity.get(p.profile_id)?.avatar_url ?? null,
        skills: skills.get(p.id) ?? [],
        serviceCount: servicesRes.error ? null : (services.get(p.id) ?? 0),
      },
    ]),
  )
  return ids.flatMap((id) => {
    const card = byId.get(id)
    return card ? [card] : []
  })
}
