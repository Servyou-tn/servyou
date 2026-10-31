import { createClient } from '@/lib/supabase/server'
import { failQuery, reportQueryError } from '@/lib/supabase/query-error'
import { skillLabelPair, type SkillLabelPair } from '@/lib/freelance/service-draft'

// Data for the FREELANCER CARD (Figma « Freelancer Card », 662:53894): avatar, name, headline, city, up to four skill chips + « +N »,
// « N services offerts » and « Voir le profil ». Batch-shaped like getShopCards.
//
// SKILL CHIPS: the freelancer's profile skills first, then — so a profile whose skills were never filled in still shows what it offers — the
// DISTINCT tags of their own ACTIVE, non-moderated services (the same services the count uses), newest service first. De-duplicated
// case-insensitively on the stored value AND on its French label (a taxonomy id and its label are one chip). Empty only when both are. The profile row is the MAIN query (failure throws);
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
  /** Profile skills first, then the tags of the freelancer's own visible active services — each as its FR / AR label (see `mergeCardSkills`). */
  skills: SkillLabelPair[]
  /** Active, visible services. null = could not be counted (the footer hides the figure). */
  serviceCount: number | null
}

/**
 * Profile skills first, then service tags (already ordered newest service first), each resolved to its FR / AR label. A value is a duplicate when
 * its stored text OR its French label matches an earlier chip, case-insensitively. Blank values are dropped. Pure.
 */
export function mergeCardSkills(profileSkills: readonly string[], serviceTags: readonly string[]): SkillLabelPair[] {
  const seen = new Set<string>()
  const out: SkillLabelPair[] = []
  for (const raw of [...profileSkills, ...serviceTags]) {
    const value = raw.trim()
    if (!value) continue
    const pair = skillLabelPair(value)
    const keys = [value.toLowerCase(), pair.fr.trim().toLowerCase()]
    if (keys.some((k) => seen.has(k))) continue
    keys.forEach((k) => seen.add(k))
    out.push(pair)
  }
  return out
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
      .select('id, freelancer_profile_id, tags, created_at')
      .in('freelancer_profile_id', visibleIds)
      .eq('status', 'active')
      .is('admin_hidden_at', null)
      // newest service first, id as the stable tiebreak: the chips never reshuffle between two requests
      .order('created_at', { ascending: false })
      .order('id', { ascending: true }),
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
  const tags = new Map<string, string[]>()
  for (const r of servicesRes.data ?? []) {
    services.set(r.freelancer_profile_id, (services.get(r.freelancer_profile_id) ?? 0) + 1)
    tags.set(r.freelancer_profile_id, [...(tags.get(r.freelancer_profile_id) ?? []), ...(r.tags ?? [])])
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
        skills: mergeCardSkills(skills.get(p.id) ?? [], tags.get(p.id) ?? []),
        serviceCount: servicesRes.error ? null : (services.get(p.id) ?? 0),
      },
    ]),
  )
  return ids.flatMap((id) => {
    const card = byId.get(id)
    return card ? [card] : []
  })
}
