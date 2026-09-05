import type { SupabaseClient } from '@supabase/supabase-js'

// H3 "Modifier mon profil" (Figma 404:11909) data layer. Read-only fetch + pure validation logic;
// writes live in the route's own actions.ts (a 'use server' module may only export async
// functions). Full field-by-field provenance is in the PR description.

export const HEADLINE_MAX = 100
export const BIO_MAX = 2000
export const BIO_MIN_FOR_PUBLISH = 100
export const SKILLS_MIN_FOR_PUBLISH = 3
export const SKILLS_MAX = 15
export const LINKS_CAP = 3
export const PORTFOLIO_CAP = 6
export const EDUCATION_CAP = 5
export const CERTIFICATIONS_CAP = 5
export const TOOLS_CAP = 15
export const YEARS_MAX = 80
export const WORKING_HOURS_MAX = 500
export const WORKPLACE_LOCATION_MAX = 200

export type LinkRow = { id: string; label: string; url: string }
export type PortfolioRow = { id: string; imageUrl: string; title: string | null; url: string | null; description: string | null }
export type EducationRow = { id: string; institution: string; degree: string | null; yearStart: number | null; yearEnd: number | null }
export type CertificationRow = {
  id: string
  name: string
  issuingOrg: string | null
  yearObtained: number | null
  credentialUrl: string | null
}
export type LanguageRow = { language: string; proficiency: string }

export type FreelancerProfileEditData = {
  freelancerProfileId: string
  headline: string
  bio: string
  yearsExperience: number
  workingHours: string
  workplaceLocation: string
  portfolioLink: string
  isPublished: boolean
  skills: string[]
  languages: LanguageRow[]
  tools: string[]
  links: LinkRow[]
  portfolioItems: PortfolioRow[]
  education: EducationRow[]
  certifications: CertificationRow[]
  identity: { fullName: string | null; city: string | null; avatarUrl: string | null }
}

/**
 * One freelancer's full edit-page snapshot. Eight reads, all scoped to `freelancerProfileId` /
 * `userId` — RLS is defence in depth here (see freelancer_profiles' own owner clause), the real
 * scoping is these explicit `.eq()`s, same posture as every other read in this codebase.
 *
 * Deliberately does NOT carry a "does this freelancer have an active listing" flag. That's a
 * `service_listings` read gated by `admin_hidden_at` in this codebase's moderated-table convention
 * (moderation-read-paths.test.ts's own source guard), and this function has no legitimate reason
 * to duplicate `freelancer_has_active_listing()` (the DB function is_published is actually derived
 * from) just to show a stale-by-the-time-you-click-Publier hint. `publishProfileAction`
 * (actions.ts) answers that question fresh, from `freelancer_profiles.is_published` itself,
 * post-save — never from this snapshot.
 */
export async function getFreelancerProfileForEdit(
  supabase: SupabaseClient,
  freelancerProfileId: string,
  userId: string,
): Promise<FreelancerProfileEditData | null> {
  const { data: profile, error: profileErr } = await supabase
    .from('freelancer_profiles')
    .select('id, headline, bio, years_experience, working_hours, workplace_location, portfolio_link, is_published')
    .eq('id', freelancerProfileId)
    .maybeSingle()
  if (profileErr) {
    console.error('[getFreelancerProfileForEdit] freelancer_profiles fetch failed:', profileErr.message, profileErr.code, profileErr.details)
    throw new Error('freelancer_profiles fetch failed')
  }
  if (!profile) return null

  const { data: identity, error: identityErr } = await supabase
    .from('profiles')
    .select('full_name, city, avatar_url')
    .eq('id', userId)
    .maybeSingle()
  if (identityErr) {
    console.error('[getFreelancerProfileForEdit] profiles fetch failed:', identityErr.message, identityErr.code, identityErr.details)
    throw new Error('profiles fetch failed')
  }

  const [skillsRes, langRes, toolsRes, linksRes, portfolioRes, eduRes, certRes] = await Promise.all([
    supabase.from('freelancer_skills').select('skill').eq('freelancer_profile_id', freelancerProfileId),
    supabase.from('freelancer_languages').select('language, proficiency').eq('freelancer_profile_id', freelancerProfileId),
    supabase.from('freelancer_tools').select('name').eq('freelancer_id', freelancerProfileId),
    supabase.from('freelancer_links').select('id, label, url').eq('freelancer_profile_id', freelancerProfileId).order('display_order'),
    supabase
      .from('freelancer_portfolio_items')
      .select('id, image_url, title, url, description')
      .eq('freelancer_profile_id', freelancerProfileId)
      .order('display_order'),
    supabase
      .from('freelancer_education')
      .select('id, institution, degree, year_start, year_end')
      .eq('freelancer_id', freelancerProfileId),
    supabase
      .from('freelancer_certifications')
      .select('id, name, issuing_org, year_obtained, credential_url')
      .eq('freelancer_id', freelancerProfileId),
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
    if (res.error) {
      console.error(`[getFreelancerProfileForEdit] ${label} fetch failed:`, res.error.message, res.error.code, res.error.details)
      throw new Error(`${label} fetch failed`)
    }
  }

  return {
    freelancerProfileId,
    headline: profile.headline ?? '',
    bio: profile.bio ?? '',
    yearsExperience: profile.years_experience ?? 0,
    workingHours: profile.working_hours ?? '',
    workplaceLocation: profile.workplace_location ?? '',
    portfolioLink: profile.portfolio_link ?? '',
    isPublished: profile.is_published,
    skills: (skillsRes.data ?? []).map((r) => r.skill as string),
    languages: (langRes.data ?? []) as LanguageRow[],
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
    identity: {
      fullName: (identity?.full_name as string | undefined) ?? null,
      city: (identity?.city as string | undefined) ?? null,
      avatarUrl: (identity?.avatar_url as string | undefined) ?? null,
    },
  }
}

export type PublishValidation =
  | { ok: true }
  | { ok: false; missing: ('headline' | 'bio' | 'skills')[] }

/**
 * The publish gate — Option A (founder ruling). Pure so it's testable without a live DB: three
 * measured requirements (404:12236's asterisk on Titre professionnel / 404:12845's asterisk +
 * "Minimum 100 caractères pour publier votre profil" on À propos / 404:12878's asterisk +
 * "Minimum 3, maximum 15" on Compétences), nothing else. This function does NOT touch
 * is_published — that stays trigger-derived from service_listings (sync_freelancer_is_published,
 * PR #164). A caller that passes this validation but finds `freelancer_profiles.is_published`
 * still false (publishProfileAction re-reads it fresh, post-save) must explain that the profile
 * goes live once a service is published, not attempt to flip anything here.
 */
export function validateForPublish(input: { headline: string; bio: string; skillsCount: number }): PublishValidation {
  const missing: ('headline' | 'bio' | 'skills')[] = []
  if (input.headline.trim().length === 0) missing.push('headline')
  if (input.bio.trim().length < BIO_MIN_FOR_PUBLISH) missing.push('bio')
  if (input.skillsCount < SKILLS_MIN_FOR_PUBLISH || input.skillsCount > SKILLS_MAX) missing.push('skills')
  return missing.length > 0 ? { ok: false, missing } : { ok: true }
}
