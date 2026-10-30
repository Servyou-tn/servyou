// Plain module, NOT 'use server' (audit pass 2 « Logged »): an export from a 'use server' file is a callable
// endpoint, and this core write takes a Supabase client + an already-validated payload, so it must only ever be
// reached through its server actions (saveProfileAction / publishProfileAction in ./actions.ts), which authenticate,
// resolve ownership and parse the input first. Kept separate (not inlined) so live suites can drive it against a
// real client.

import type { SupabaseClient } from '@supabase/supabase-js'
import { reconcile } from '@/lib/shops/reconcile'
import { diffLanguages } from '@/lib/freelancer/diff-languages'
import type { SaveProfileInputType } from './schema'

/**
 * Core write, factored out so it's exercisable directly against a real Supabase client in tests
 * (same split every other route in this codebase uses for the identical reason — createClient()
 * needs next/headers' cookies()). Full-set replacement for links/portfolio/education/
 * certifications (no natural business key to diff on, same reasoning as applyFreelancerDetailsSave
 * for education/certifications — cap 3-6, single owner, no concurrent editors). Reconcile for
 * skills/tools (scalar identity), diff for languages (composite key) — mirrors saveCompetencesAction
 * exactly, because it is the same three tables.
 */
export async function applyProfileSave(
  supabase: SupabaseClient,
  freelancerProfileId: string,
  input: SaveProfileInputType,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { error: profileErr } = await supabase
    .from('freelancer_profiles')
    .update({
      headline: input.headline || null,
      bio: input.bio || null,
      years_experience: input.yearsExperience,
      working_hours: input.workingHours,
      workplace_location: input.workplaceLocation || null,
      portfolio_link: input.portfolioLink,
    })
    .eq('id', freelancerProfileId)
  if (profileErr) {
    console.error('[saveProfile] freelancer_profiles update failed:', profileErr.message, profileErr.code, profileErr.details)
    return { ok: false, error: 'freelancer_profiles update failed' }
  }

  const { data: existingSkills, error: skillsFetchErr } = await supabase
    .from('freelancer_skills')
    .select('skill')
    .eq('freelancer_profile_id', freelancerProfileId)
  if (skillsFetchErr) {
    console.error('[saveProfile] freelancer_skills fetch failed:', skillsFetchErr.message, skillsFetchErr.code)
    return { ok: false, error: 'freelancer_skills fetch failed' }
  }
  const skillsDiff = reconcile((existingSkills ?? []).map((r) => r.skill as string), input.skills)
  if (skillsDiff.toDelete.length > 0) {
    const { error } = await supabase.from('freelancer_skills').delete().eq('freelancer_profile_id', freelancerProfileId).in('skill', skillsDiff.toDelete)
    if (error) {
      console.error('[saveProfile] freelancer_skills delete failed:', error.message, error.code)
      return { ok: false, error: 'freelancer_skills delete failed' }
    }
  }
  if (skillsDiff.toInsert.length > 0) {
    const { error } = await supabase
      .from('freelancer_skills')
      .insert(skillsDiff.toInsert.map((skill) => ({ freelancer_profile_id: freelancerProfileId, skill })))
    if (error) {
      console.error('[saveProfile] freelancer_skills insert failed:', error.message, error.code)
      return { ok: false, error: 'freelancer_skills insert failed' }
    }
  }

  const { data: existingLanguages, error: langFetchErr } = await supabase
    .from('freelancer_languages')
    .select('language, proficiency')
    .eq('freelancer_profile_id', freelancerProfileId)
  if (langFetchErr) {
    console.error('[saveProfile] freelancer_languages fetch failed:', langFetchErr.message, langFetchErr.code)
    return { ok: false, error: 'freelancer_languages fetch failed' }
  }
  const languagesDiff = diffLanguages((existingLanguages ?? []) as { language: string; proficiency: string }[], input.languages)
  if (languagesDiff.toDelete.length > 0) {
    const { error } = await supabase
      .from('freelancer_languages')
      .delete()
      .eq('freelancer_profile_id', freelancerProfileId)
      .in('language', languagesDiff.toDelete)
    if (error) {
      console.error('[saveProfile] freelancer_languages delete failed:', error.message, error.code)
      return { ok: false, error: 'freelancer_languages delete failed' }
    }
  }
  if (languagesDiff.toInsert.length > 0) {
    const { error } = await supabase.from('freelancer_languages').insert(
      languagesDiff.toInsert.map((row) => ({ freelancer_profile_id: freelancerProfileId, language: row.language, proficiency: row.proficiency })),
    )
    if (error) {
      console.error('[saveProfile] freelancer_languages insert failed:', error.message, error.code)
      return { ok: false, error: 'freelancer_languages insert failed' }
    }
  }

  const { data: existingTools, error: toolsFetchErr } = await supabase
    .from('freelancer_tools')
    .select('name')
    .eq('freelancer_id', freelancerProfileId)
  if (toolsFetchErr) {
    console.error('[saveProfile] freelancer_tools fetch failed:', toolsFetchErr.message, toolsFetchErr.code)
    return { ok: false, error: 'freelancer_tools fetch failed' }
  }
  const toolsDiff = reconcile((existingTools ?? []).map((r) => r.name as string), input.tools)
  if (toolsDiff.toDelete.length > 0) {
    const { error } = await supabase.from('freelancer_tools').delete().eq('freelancer_id', freelancerProfileId).in('name', toolsDiff.toDelete)
    if (error) {
      console.error('[saveProfile] freelancer_tools delete failed:', error.message, error.code)
      return { ok: false, error: 'freelancer_tools delete failed' }
    }
  }
  if (toolsDiff.toInsert.length > 0) {
    const { error } = await supabase.from('freelancer_tools').insert(toolsDiff.toInsert.map((name) => ({ freelancer_id: freelancerProfileId, name })))
    if (error) {
      console.error('[saveProfile] freelancer_tools insert failed:', error.message, error.code)
      return { ok: false, error: 'freelancer_tools insert failed' }
    }
  }

  const { error: linksDelErr } = await supabase.from('freelancer_links').delete().eq('freelancer_profile_id', freelancerProfileId)
  if (linksDelErr) {
    console.error('[saveProfile] freelancer_links delete failed:', linksDelErr.message, linksDelErr.code)
    return { ok: false, error: 'freelancer_links delete failed' }
  }
  if (input.links.length > 0) {
    const { error } = await supabase.from('freelancer_links').insert(
      input.links.map((row, i) => ({ freelancer_profile_id: freelancerProfileId, label: row.label, url: row.url, display_order: i })),
    )
    if (error) {
      console.error('[saveProfile] freelancer_links insert failed:', error.message, error.code)
      return { ok: false, error: 'freelancer_links insert failed' }
    }
  }

  const { error: portfolioDelErr } = await supabase.from('freelancer_portfolio_items').delete().eq('freelancer_profile_id', freelancerProfileId)
  if (portfolioDelErr) {
    console.error('[saveProfile] freelancer_portfolio_items delete failed:', portfolioDelErr.message, portfolioDelErr.code)
    return { ok: false, error: 'freelancer_portfolio_items delete failed' }
  }
  if (input.portfolio.length > 0) {
    const { error } = await supabase.from('freelancer_portfolio_items').insert(
      input.portfolio.map((row, i) => ({
        freelancer_profile_id: freelancerProfileId,
        image_url: row.imageUrl,
        title: row.title,
        url: row.url,
        description: row.description,
        display_order: i,
      })),
    )
    if (error) {
      console.error('[saveProfile] freelancer_portfolio_items insert failed:', error.message, error.code, error.details)
      return { ok: false, error: 'freelancer_portfolio_items insert failed' }
    }
  }

  const { error: eduDelErr } = await supabase.from('freelancer_education').delete().eq('freelancer_id', freelancerProfileId)
  if (eduDelErr) {
    console.error('[saveProfile] freelancer_education delete failed:', eduDelErr.message, eduDelErr.code)
    return { ok: false, error: 'freelancer_education delete failed' }
  }
  if (input.education.length > 0) {
    const { error } = await supabase.from('freelancer_education').insert(
      // field is deliberately never written — the frame draws one input, mapped to degree; see
      // schema.ts's own comment on EducationRowInput.
      input.education.map((row) => ({
        freelancer_id: freelancerProfileId,
        institution: row.institution,
        degree: row.degree,
        year_start: row.yearStart,
        year_end: row.yearEnd,
      })),
    )
    if (error) {
      console.error('[saveProfile] freelancer_education insert failed:', error.message, error.code)
      return { ok: false, error: 'freelancer_education insert failed' }
    }
  }

  const { error: certDelErr } = await supabase.from('freelancer_certifications').delete().eq('freelancer_id', freelancerProfileId)
  if (certDelErr) {
    console.error('[saveProfile] freelancer_certifications delete failed:', certDelErr.message, certDelErr.code)
    return { ok: false, error: 'freelancer_certifications delete failed' }
  }
  if (input.certifications.length > 0) {
    const { error } = await supabase.from('freelancer_certifications').insert(
      input.certifications.map((row) => ({
        freelancer_id: freelancerProfileId,
        name: row.name,
        issuing_org: row.issuingOrg,
        year_obtained: row.yearObtained,
        credential_url: row.credentialUrl,
      })),
    )
    if (error) {
      console.error('[saveProfile] freelancer_certifications insert failed:', error.message, error.code)
      return { ok: false, error: 'freelancer_certifications insert failed' }
    }
  }

  return { ok: true }
}
