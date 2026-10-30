// Plain module, NOT 'use server' (audit pass 2 « Logged »): an export from a 'use server' file is a callable
// endpoint, and this core write takes a Supabase client + an already-validated payload, so it must only ever be
// reached through its server action (saveDetailsAction in ./actions.ts), which authenticates, resolves ownership and parses the input
// first. Kept separate (not inlined) so live suites can drive it against a real client.

import type { SupabaseClient } from '@supabase/supabase-js'
import { reconcile } from '@/lib/shops/reconcile'
import type { DetailsInput } from './schema'

type ApplyResult = { ok: true } | { ok: false; error: string }

// Core write, factored out from the 'use server' wrapper (./actions.ts) so it can be exercised directly
// against a real Supabase client in tests (createClient() needs next/headers' cookies(), which
// only resolves inside a real request — resolveOwnedFreelancerProfileId already set this
// precedent for reads, this is the same split applied to a write). A 'use server' file may only
// export async functions, which is also why the Zod schema lives in ./schema.ts, not here.
//
// WRITE ORDER, deliberately: education, then certifications, then tools, then working_hours
// LAST. All four accordions are optional and any of them may be entirely empty — but
// working_hours is the ONE column this wizard's steps 1/2 never touch, and this action is the
// ONLY code path that writes it (until H3 ships). Writing it last, unconditionally (even ''),
// means `freelancer_profiles.working_hours IS NOT NULL` becomes a true "step 3 was submitted at
// least once" signal, in the same existence-based shape step 2's guard already uses
// (`freelancer_languages` row existence — chosen there for the identical partial-failure-safety
// reason: if an earlier accordion's write fails, this action returns before reaching
// working_hours, and the guard correctly still treats step 3 as unfinished).
//
// 🔴 FUTURE H3 EDITOR: if H3 ever offers a "clear working hours" action, it must write '' there,
// not NULL — writing NULL would flip this signal back to "step 3 never submitted" and re-trigger
// this wizard's guard for a freelancer who already finished it. Flagged here so it doesn't drift
// silently; not resolved, since H3 does not exist yet.
//
// Education and certifications are FULL-SET REPLACEMENTS (delete all, insert the submitted set),
// not a reconcile() diff — unlike skills/tools (freelancer_id, name) or languages
// (freelancer_id, language), a Formation/Certification row has no natural business-key identity
// to diff on (institution/cert names can legitimately repeat). Safe at this scale (cap 5, single
// owner, no concurrent editors) and simpler than inventing one.
export async function applyFreelancerDetailsSave(
  supabase: SupabaseClient,
  freelancerProfileId: string,
  input: DetailsInput,
): Promise<ApplyResult> {
  const { error: eduDelErr } = await supabase
    .from('freelancer_education')
    .delete()
    .eq('freelancer_id', freelancerProfileId)
  if (eduDelErr) {
    console.error('[saveDetails] freelancer_education delete failed:', eduDelErr.message, eduDelErr.code, eduDelErr.details)
    return { ok: false, error: 'freelancer_education delete failed' }
  }
  if (input.education.length > 0) {
    const { error: eduInsErr } = await supabase.from('freelancer_education').insert(
      input.education.map((row) => ({
        freelancer_id: freelancerProfileId,
        institution: row.institution,
        degree: row.degree,
        field: row.field,
        year_start: row.yearStart,
        year_end: row.yearEnd,
      })),
    )
    if (eduInsErr) {
      console.error('[saveDetails] freelancer_education insert failed:', eduInsErr.message, eduInsErr.code, eduInsErr.details)
      return { ok: false, error: 'freelancer_education insert failed' }
    }
  }

  const { error: certDelErr } = await supabase
    .from('freelancer_certifications')
    .delete()
    .eq('freelancer_id', freelancerProfileId)
  if (certDelErr) {
    console.error('[saveDetails] freelancer_certifications delete failed:', certDelErr.message, certDelErr.code, certDelErr.details)
    return { ok: false, error: 'freelancer_certifications delete failed' }
  }
  if (input.certifications.length > 0) {
    const { error: certInsErr } = await supabase.from('freelancer_certifications').insert(
      input.certifications.map((row) => ({
        freelancer_id: freelancerProfileId,
        name: row.name,
        issuing_org: row.issuingOrg,
        year_obtained: row.yearObtained,
        credential_url: row.credentialUrl,
      })),
    )
    if (certInsErr) {
      console.error('[saveDetails] freelancer_certifications insert failed:', certInsErr.message, certInsErr.code, certInsErr.details)
      return { ok: false, error: 'freelancer_certifications insert failed' }
    }
  }

  const { data: existingTools, error: toolsFetchErr } = await supabase
    .from('freelancer_tools')
    .select('name')
    .eq('freelancer_id', freelancerProfileId)
  if (toolsFetchErr) {
    console.error('[saveDetails] freelancer_tools fetch failed:', toolsFetchErr.message, toolsFetchErr.code, toolsFetchErr.details)
    return { ok: false, error: 'freelancer_tools fetch failed' }
  }
  const toolsDiff = reconcile((existingTools ?? []).map((r) => r.name as string), input.tools)
  if (toolsDiff.toDelete.length > 0) {
    const { error: toolsDelErr } = await supabase
      .from('freelancer_tools')
      .delete()
      .eq('freelancer_id', freelancerProfileId)
      .in('name', toolsDiff.toDelete)
    if (toolsDelErr) {
      console.error('[saveDetails] freelancer_tools delete failed:', toolsDelErr.message, toolsDelErr.code, toolsDelErr.details)
      return { ok: false, error: 'freelancer_tools delete failed' }
    }
  }
  if (toolsDiff.toInsert.length > 0) {
    const { error: toolsInsErr } = await supabase
      .from('freelancer_tools')
      .insert(toolsDiff.toInsert.map((name) => ({ freelancer_id: freelancerProfileId, name })))
    if (toolsInsErr) {
      console.error('[saveDetails] freelancer_tools insert failed:', toolsInsErr.message, toolsInsErr.code, toolsInsErr.details)
      return { ok: false, error: 'freelancer_tools insert failed' }
    }
  }

  const { error: hoursErr } = await supabase
    .from('freelancer_profiles')
    .update({ working_hours: input.workingHours })
    .eq('id', freelancerProfileId)
  if (hoursErr) {
    console.error('[saveDetails] working_hours update failed:', hoursErr.message, hoursErr.code, hoursErr.details)
    return { ok: false, error: 'working_hours update failed' }
  }

  return { ok: true }
}
