import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import type { ServiceListing } from '@/components/listings/ServiceListingCard'

// D4 « Profil freelance public » — /freelance/[id]. Bare freelancer_profiles.id, matching every
// sibling public-detail route (shop-detail.ts, product-detail.ts, service-detail.ts). Visibility
// mirrors D3 EXACTLY (founder ruling): is_published's owner/admin bypass is already baked into
// freelancer_profiles' own RLS policy (freelancer_profiles_publish_gate.sql), so a plain
// .maybeSingle() resolves null for an unpublished target to a stranger and lets the owner/admin
// through. admin_hidden_at is a SEPARATE, RLS-blind gate (same as shops/products/service_listings)
// — filtered here unconditionally, no owner/admin bypass, same as shop-detail.ts's own posture.

function one<T>(embed: T | T[] | null | undefined): T | null {
  if (Array.isArray(embed)) return embed[0] ?? null
  return embed ?? null
}

export type FreelancerLinkRow = { id: string; label: string; url: string }
export type FreelancerPortfolioItem = { id: string; imageUrl: string; title: string | null; url: string | null; description: string | null }
export type FreelancerEducationRow = { id: string; institution: string; degree: string | null; yearStart: number | null; yearEnd: number | null }
export type FreelancerCertificationRow = {
  id: string
  name: string
  issuingOrg: string | null
  yearObtained: number | null
  credentialUrl: string | null
}
export type FreelancerLanguageRow = { language: string; proficiency: string }

export type FreelancerDetailData = {
  id: string
  profileId: string
  fullName: string
  avatarUrl: string | null
  city: string | null
  headline: string | null
  bio: string | null
  yearsExperience: number | null
  workingHours: string | null
  workplaceLocation: string | null
  portfolioLink: string | null
  createdAt: string
  skills: string[]
  languages: FreelancerLanguageRow[]
  tools: string[]
  links: FreelancerLinkRow[]
  portfolioItems: FreelancerPortfolioItem[]
  education: FreelancerEducationRow[]
  certifications: FreelancerCertificationRow[]
}

// Wrapped in cache() so generateMetadata + the page render share one fetch per request, same
// reason as getShopDetail/getServiceDetail. contactPhone/completedProjectCount are deliberately
// NOT part of this object — both are viewer-dependent (auth.uid()-scoped RPCs), not properties of
// the freelancer, and generateMetadata has no use for either.
export const getFreelancerDetail = cache(async (id: string): Promise<FreelancerDetailData | null> => {
  const supabase = await createClient()
  const { data: profile, error: profileErr } = await supabase
    .from('freelancer_profiles')
    .select(
      'id, profile_id, headline, bio, city, portfolio_link, years_experience, working_hours, workplace_location, created_at, admin_hidden_at',
    )
    .eq('id', id)
    .is('admin_hidden_at', null)
    .maybeSingle()
  if (profileErr) {
    console.error('[freelancer-detail] freelancer_profiles fetch failed:', profileErr.message, profileErr.code, profileErr.details)
    return null
  }
  if (!profile) return null

  const { data: identity, error: identityErr } = await supabase
    .from('public_profiles')
    .select('full_name, avatar_url')
    .eq('id', profile.profile_id)
    .maybeSingle()
  if (identityErr) console.error('[freelancer-detail] public_profiles fetch failed:', identityErr.message, identityErr.code, identityErr.details)

  const [skillsRes, langRes, toolsRes, linksRes, portfolioRes, eduRes, certRes] = await Promise.all([
    supabase.from('freelancer_skills').select('skill').eq('freelancer_profile_id', id),
    supabase.from('freelancer_languages').select('language, proficiency').eq('freelancer_profile_id', id),
    supabase.from('freelancer_tools').select('name').eq('freelancer_id', id),
    supabase.from('freelancer_links').select('id, label, url').eq('freelancer_profile_id', id).order('display_order'),
    supabase.from('freelancer_portfolio_items').select('id, image_url, title, url, description').eq('freelancer_profile_id', id).order('display_order'),
    supabase.from('freelancer_education').select('id, institution, degree, year_start, year_end').eq('freelancer_id', id),
    supabase.from('freelancer_certifications').select('id, name, issuing_org, year_obtained, credential_url').eq('freelancer_id', id),
  ])

  for (const [label, res] of [
    ['freelancer_skills', skillsRes],
    ['freelancer_languages', langRes],
    ['freelancer_tools', toolsRes],
    ['freelancer_links', linksRes],
    ['freelancer_portfolio_items', portfolioRes],
    ['freelancer_education', eduRes],
    ['freelancer_certifications', certRes],
  ] as const) {
    if (res.error) console.error(`[freelancer-detail] ${label} fetch failed:`, res.error.message, res.error.code, res.error.details)
  }

  return {
    id: profile.id,
    profileId: profile.profile_id,
    fullName: identity?.full_name ?? '',
    avatarUrl: identity?.avatar_url ?? null,
    city: profile.city ?? null,
    headline: profile.headline ?? null,
    bio: profile.bio ?? null,
    yearsExperience: profile.years_experience ?? null,
    workingHours: profile.working_hours ?? null,
    workplaceLocation: profile.workplace_location ?? null,
    portfolioLink: profile.portfolio_link ?? null,
    createdAt: profile.created_at,
    skills: (skillsRes.data ?? []).map((r) => r.skill as string),
    languages: (langRes.data ?? []) as FreelancerLanguageRow[],
    tools: (toolsRes.data ?? []).map((r) => r.name as string),
    links: (linksRes.data ?? []).map((r) => ({ id: r.id as string, label: r.label as string, url: r.url as string })),
    portfolioItems: (portfolioRes.data ?? []).map((r) => ({
      id: r.id as string,
      imageUrl: r.image_url as string,
      title: r.title as string | null,
      url: r.url as string | null,
      description: r.description as string | null,
    })),
    education: (eduRes.data ?? []).map((r) => ({
      id: r.id as string,
      institution: r.institution as string,
      degree: r.degree as string | null,
      yearStart: r.year_start as number | null,
      yearEnd: r.year_end as number | null,
    })),
    certifications: (certRes.data ?? []).map((r) => ({
      id: r.id as string,
      name: r.name as string,
      issuingOrg: r.issuing_org as string | null,
      yearObtained: r.year_obtained as number | null,
      credentialUrl: r.credential_url as string | null,
    })),
  }
})

type ServiceRow = {
  id: string
  title: string
  description: string | null
  starting_price_tnd: number | string | null
  delivery_time: string | null
  tags: string[] | null
  categories: { name_fr: string; name_ar: string | null } | { name_fr: string; name_ar: string | null }[] | null
}

// ACTIVE, non-admin-hidden listings for this freelancer — same status='active' convention every
// public browse surface uses (service-detail.ts, data.ts), same admin_hidden_at discipline
// (moderation-read-paths.test.ts's source guard: service_listings is a MODERATED_TABLE). The
// freelancer's own admin_hidden_at was already checked by getFreelancerDetail for this exact id,
// so no freelancer_profiles!inner cascade is needed here — unlike service-detail.ts, which reaches
// a service from an UNvalidated id and must check both tables in one query.
export async function getFreelancerServices(
  freelancerProfileId: string,
  freelancerName: string,
  freelancerCity: string | null,
): Promise<ServiceListing[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('service_listings')
    .select('id, title, description, starting_price_tnd, delivery_time, tags, categories ( name_fr, name_ar )')
    .eq('freelancer_profile_id', freelancerProfileId)
    .eq('status', 'active')
    .is('admin_hidden_at', null)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[freelancer-detail] services fetch error:', error.message, error.code, error.details)
    return []
  }

  return ((data ?? []) as unknown as ServiceRow[]).map((row) => {
    const category = one(row.categories)
    return {
      id: row.id,
      title: row.title,
      description: row.description ?? null,
      price_starting: row.starting_price_tnd != null ? Number(row.starting_price_tnd) : null,
      delivery_time: row.delivery_time ?? null,
      tags: row.tags ?? [],
      category: category ? { name_fr: category.name_fr, name_ar: category.name_ar ?? undefined } : null,
      freelancer: { full_name: freelancerName, city: freelancerCity },
    }
  })
}

// "Projets livrés" — public trust-metric aggregate. orders' own SELECT RLS is buyer/seller-scoped
// (orders.sql), so a stranger reads zero rows directly; get_completed_service_order_count is the
// SECURITY DEFINER RPC that bridges that gap with a bare count, no row data (founder-approved
// migration, see PR description). Errors degrade to 0, never thrown — a trust tile is not worth
// failing the whole page render over.
export async function getCompletedProjectCount(profileId: string): Promise<number> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('get_completed_service_order_count', { target: profileId })
  if (error) {
    console.error('[freelancer-detail] get_completed_service_order_count failed:', error.message, error.code, error.details)
    return 0
  }
  return typeof data === 'number' ? data : 0
}

// Resolves whether THIS viewer already has a phone-revealing relationship with the freelancer
// (owns the profile, shares an order, or shares a job_response — get_contact_phone's own rule).
// Server-side so the page can decide WHICH cta to render (WhatsApp vs "Demander un service")
// before paint; the actual digits are re-revealed client-side on click by WhatsAppContactButton,
// never serialised into this page's HTML.
export async function getViewerContactPhone(profileId: string): Promise<string | null> {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('get_contact_phone', { target: profileId })
  if (error) {
    console.error('[freelancer-detail] get_contact_phone failed:', error.message, error.code, error.details)
    return null
  }
  return (data as string | null) ?? null
}
