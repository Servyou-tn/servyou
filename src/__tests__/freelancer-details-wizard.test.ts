/**
 * H2 step 3 "Détails" — schema boundary tests (pure, no DB) + live-DB behavioural tests for
 * applyFreelancerDetailsSave and the guard's underlying data signals.
 *
 * Field shapes are a founder ruling off the schema (not a Figma measurement — see
 * details/actions.ts's header comment); this suite verifies the ruling was built correctly, not
 * that it matches a design frame.
 *
 * TWO KINDS OF TEST:
 *   1. Schema tests (always run, no creds needed) — SaveDetailsInput is a plain Zod object with
 *      no DB dependency, so cap boundaries / anchor enforcement / empty-is-valid are provable
 *      without a live request context. `saveDetailsAction` itself is NOT called directly here —
 *      it needs next/headers' cookies(), which only resolves inside a real Next.js request; that
 *      path is covered by the browser smoke instead.
 *   2. Live-DB tests (Pattern A, mirroring freelancer-publish-gate-rls.test.ts) — call
 *      applyFreelancerDetailsSave directly against a real Supabase client (the core write,
 *      factored out of the 'use server' wrapper for exactly this reason). Proves: each accordion
 *      filled/saved/read-back, all four empty is a valid submit, the repeater cap boundary at 0/1/
 *      cap rows, the step-2→step-3 and step-3-without-step-2 guard DATA CONDITIONS (not the actual
 *      HTTP redirect — that's a Next.js Server Component, not directly callable outside a
 *      request; the browser smoke proves the redirect itself), and that is_published never flips
 *      from this wizard (no service_listings row is ever touched).
 *
 * Run: npx vitest run src/__tests__/freelancer-details-wizard.test.ts
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import {
  SaveDetailsInput,
  EDUCATION_CAP,
  CERTIFICATIONS_CAP,
  TOOLS_CAP,
} from '@/app/mon-profil-freelance/creer/details/schema'
import { applyFreelancerDetailsSave } from '@/app/mon-profil-freelance/creer/details/actions'

// ─── 1. Schema — pure, no DB, no creds required ────────────────────────────────────────────

const emptyPayload = { education: [], certifications: [], tools: [], workingHours: '' }
const educationRow = (n: number) => ({ institution: `Institution ${n}`, degree: '', field: '', yearStart: null, yearEnd: null })
const certificationRow = (n: number) => ({ name: `Cert ${n}`, issuingOrg: '', yearObtained: null, credentialUrl: '' })

describe('SaveDetailsInput schema', () => {
  it('all four accordions empty is a VALID submit — nothing gates on them', () => {
    const res = SaveDetailsInput.safeParse(emptyPayload)
    expect(res.success).toBe(true)
  })

  it('accepts exactly EDUCATION_CAP (5) education rows', () => {
    const res = SaveDetailsInput.safeParse({
      ...emptyPayload,
      education: Array.from({ length: EDUCATION_CAP }, (_, i) => educationRow(i)),
    })
    expect(res.success).toBe(true)
  })

  it('rejects EDUCATION_CAP + 1 education rows', () => {
    const res = SaveDetailsInput.safeParse({
      ...emptyPayload,
      education: Array.from({ length: EDUCATION_CAP + 1 }, (_, i) => educationRow(i)),
    })
    expect(res.success).toBe(false)
  })

  it('rejects an education row with a blank institution (anchor required, defense in depth)', () => {
    const res = SaveDetailsInput.safeParse({ ...emptyPayload, education: [{ ...educationRow(1), institution: '' }] })
    expect(res.success).toBe(false)
  })

  it('accepts exactly CERTIFICATIONS_CAP (5) certification rows', () => {
    const res = SaveDetailsInput.safeParse({
      ...emptyPayload,
      certifications: Array.from({ length: CERTIFICATIONS_CAP }, (_, i) => certificationRow(i)),
    })
    expect(res.success).toBe(true)
  })

  it('rejects CERTIFICATIONS_CAP + 1 certification rows', () => {
    const res = SaveDetailsInput.safeParse({
      ...emptyPayload,
      certifications: Array.from({ length: CERTIFICATIONS_CAP + 1 }, (_, i) => certificationRow(i)),
    })
    expect(res.success).toBe(false)
  })

  it('rejects a certification row with a blank name (anchor required, defense in depth)', () => {
    const res = SaveDetailsInput.safeParse({ ...emptyPayload, certifications: [{ ...certificationRow(1), name: '' }] })
    expect(res.success).toBe(false)
  })

  it('accepts a valid credential_url', () => {
    const res = SaveDetailsInput.safeParse({
      ...emptyPayload,
      certifications: [{ ...certificationRow(1), credentialUrl: 'https://example.com/cert' }],
    })
    expect(res.success).toBe(true)
  })

  it('rejects a malformed credential_url', () => {
    const res = SaveDetailsInput.safeParse({
      ...emptyPayload,
      certifications: [{ ...certificationRow(1), credentialUrl: 'not-a-url' }],
    })
    expect(res.success).toBe(false)
  })

  it('accepts exactly TOOLS_CAP (15) tools', () => {
    const res = SaveDetailsInput.safeParse({
      ...emptyPayload,
      tools: Array.from({ length: TOOLS_CAP }, (_, i) => `Tool ${i}`),
    })
    expect(res.success).toBe(true)
  })

  it('rejects TOOLS_CAP + 1 tools', () => {
    const res = SaveDetailsInput.safeParse({
      ...emptyPayload,
      tools: Array.from({ length: TOOLS_CAP + 1 }, (_, i) => `Tool ${i}`),
    })
    expect(res.success).toBe(false)
  })

  it('accepts an empty workingHours string (untouched Textarea submits "")', () => {
    const res = SaveDetailsInput.safeParse(emptyPayload)
    expect(res.success).toBe(true)
    if (res.success) expect(res.data.workingHours).toBe('')
  })

  it('rejects a year outside the plausible range', () => {
    const res = SaveDetailsInput.safeParse({ ...emptyPayload, education: [{ ...educationRow(1), yearStart: 1800 }] })
    expect(res.success).toBe(false)
  })
})

// ─── 2. Live-DB — Pattern A, mirroring freelancer-publish-gate-rls.test.ts ─────────────────

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const hasCreds = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)

const EMAIL_SUFFIX = '@rls-smoke.servyou.invalid'
const EMAIL_PREFIX = 'frl-det-'
const WIZARD_EMAIL = `${EMAIL_PREFIX}wizard${EMAIL_SUFFIX}`

const admin: SupabaseClient = hasCreds
  ? createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })
  : (undefined as unknown as SupabaseClient)

async function createUser(email: string): Promise<string> {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: 'Rls-Details-Test-4q8!',
    email_confirm: true,
    user_metadata: { full_name: 'Details Wizard Test', date_of_birth: '1990-01-01', city: 'Tunis', language: 'fr' },
  })
  if (error || !data.user) throw new Error(`createUser failed for ${email}: ${error?.message}`)
  return data.user.id
}

async function teardown(): Promise<void> {
  const { data, error } = await admin.from('profiles').select('id').like('email', `${EMAIL_PREFIX}%${EMAIL_SUFFIX}`)
  if (error) throw new Error(`teardown lookup failed: ${error.message}`)
  for (const row of data ?? []) {
    const { error: delErr } = await admin.auth.admin.deleteUser(row.id)
    if (delErr) throw new Error(`deleteUser failed for ${row.id}: ${delErr.message}`)
  }
}

let freelancerProfileId: string

beforeAll(async () => {
  if (!hasCreds) return
  await teardown()
  const ownerId = await createUser(WIZARD_EMAIL)
  const { data: profile, error } = await admin
    .from('freelancer_profiles').insert({ profile_id: ownerId }).select('id').single()
  if (error || !profile) throw new Error(`freelancer_profile insert failed: ${error?.message}`)
  freelancerProfileId = profile.id
}, 60000)

afterAll(async () => {
  if (!hasCreds) return
  await teardown()
}, 60000)

describe.skipIf(!hasCreds)('applyFreelancerDetailsSave — filled, read back', () => {
  it('writes one row to each of the five targets and reads them back correctly', async () => {
    const res = await applyFreelancerDetailsSave(admin, freelancerProfileId, {
      education: [{ institution: 'Université de Tunis', degree: 'Licence', field: 'Informatique', yearStart: 2018, yearEnd: 2021 }],
      certifications: [{ name: 'AWS SAA', issuingOrg: 'Amazon', yearObtained: 2022, credentialUrl: 'https://aws.amazon.com/verify' }],
      tools: ['Figma', 'VS Code'],
      workingHours: 'Lundi-Vendredi, 9h-18h',
    })
    expect(res.ok).toBe(true)

    const [edu, cert, tools, profile] = await Promise.all([
      admin.from('freelancer_education').select('institution, degree, field, year_start, year_end').eq('freelancer_id', freelancerProfileId),
      admin.from('freelancer_certifications').select('name, issuing_org, year_obtained, credential_url').eq('freelancer_id', freelancerProfileId),
      admin.from('freelancer_tools').select('name').eq('freelancer_id', freelancerProfileId),
      admin.from('freelancer_profiles').select('working_hours, is_published').eq('id', freelancerProfileId).single(),
    ])

    expect(edu.data).toEqual([{ institution: 'Université de Tunis', degree: 'Licence', field: 'Informatique', year_start: 2018, year_end: 2021 }])
    expect(cert.data).toEqual([{ name: 'AWS SAA', issuing_org: 'Amazon', year_obtained: 2022, credential_url: 'https://aws.amazon.com/verify' }])
    expect(tools.data?.map((r) => r.name).sort()).toEqual(['Figma', 'VS Code'])
    expect(profile.data?.working_hours).toBe('Lundi-Vendredi, 9h-18h')

    // is_published is derived from active service_listings ONLY — this wizard never touches that
    // table, so completing all three steps must not flip it.
    expect(profile.data?.is_published).toBe(false)
  })

  it('the step-2→step-3 guard signal flips: working_hours goes from NULL to NOT NULL', async () => {
    // Cross-references creer/page.tsx's guard: languages exist (step 2 done) + working_hours IS
    // NULL is exactly the state that redirects to /mon-profil-freelance/creer/details. Proven
    // here at the data level — the actual HTTP redirect is a Next.js Server Component guard, not
    // directly callable outside a request; the browser smoke proves the redirect itself.
    const { error: langErr } = await admin
      .from('freelancer_languages')
      .insert({ freelancer_profile_id: freelancerProfileId, language: 'fr', proficiency: 'natif' })
    expect(langErr).toBeNull()

    // Already set to a non-null string by the previous test — reset to prove the NULL ("step 3
    // never submitted") state too, before proving the write flips it.
    const { error: resetErr } = await admin.from('freelancer_profiles').update({ working_hours: null }).eq('id', freelancerProfileId)
    expect(resetErr).toBeNull()
    const before = await admin.from('freelancer_profiles').select('working_hours').eq('id', freelancerProfileId).single()
    expect(before.data?.working_hours).toBeNull()

    const res = await applyFreelancerDetailsSave(admin, freelancerProfileId, {
      education: [], certifications: [], tools: [], workingHours: '',
    })
    expect(res.ok).toBe(true)

    const after = await admin.from('freelancer_profiles').select('working_hours').eq('id', freelancerProfileId).single()
    // '' is NOT NULL — the signal the guard reads, even though every accordion was left empty.
    expect(after.data?.working_hours).toBe('')
  })

  it('step 3 reached directly without step 2 done: a freelancer with no freelancer_languages row has none', async () => {
    const noLangOwner = await createUser(`${EMAIL_PREFIX}nolang${EMAIL_SUFFIX}`)
    const { data: profile, error } = await admin
      .from('freelancer_profiles').insert({ profile_id: noLangOwner }).select('id').single()
    expect(error).toBeNull()

    const { data: langRow } = await admin
      .from('freelancer_languages').select('id').eq('freelancer_profile_id', profile!.id).maybeSingle()
    // Exactly the precondition details/page.tsx's own guard checks before bouncing to step 1.
    expect(langRow).toBeNull()
  })
})

describe.skipIf(!hasCreds)('applyFreelancerDetailsSave — empty is valid, full-replace, cap', () => {
  it('all four accordions empty overwrites prior content (full replace, not merge)', async () => {
    const res = await applyFreelancerDetailsSave(admin, freelancerProfileId, {
      education: [], certifications: [], tools: [], workingHours: '',
    })
    expect(res.ok).toBe(true)

    const [edu, cert, tools] = await Promise.all([
      admin.from('freelancer_education').select('id').eq('freelancer_id', freelancerProfileId),
      admin.from('freelancer_certifications').select('id').eq('freelancer_id', freelancerProfileId),
      admin.from('freelancer_tools').select('id').eq('freelancer_id', freelancerProfileId),
    ])
    expect(edu.data).toEqual([])
    expect(cert.data).toEqual([])
    expect(tools.data).toEqual([])
  })

  it('writes exactly EDUCATION_CAP and CERTIFICATIONS_CAP rows and TOOLS_CAP tools', async () => {
    const res = await applyFreelancerDetailsSave(admin, freelancerProfileId, {
      education: Array.from({ length: EDUCATION_CAP }, (_, i) => ({
        institution: `Institution ${i}`, degree: null, field: null, yearStart: null, yearEnd: null,
      })),
      certifications: Array.from({ length: CERTIFICATIONS_CAP }, (_, i) => ({
        name: `Cert ${i}`, issuingOrg: null, yearObtained: null, credentialUrl: null,
      })),
      tools: Array.from({ length: TOOLS_CAP }, (_, i) => `Tool ${i}`),
      workingHours: '',
    })
    expect(res.ok).toBe(true)

    const [edu, cert, tools] = await Promise.all([
      admin.from('freelancer_education').select('id', { count: 'exact', head: true }).eq('freelancer_id', freelancerProfileId),
      admin.from('freelancer_certifications').select('id', { count: 'exact', head: true }).eq('freelancer_id', freelancerProfileId),
      admin.from('freelancer_tools').select('id', { count: 'exact', head: true }).eq('freelancer_id', freelancerProfileId),
    ])
    expect(edu.count).toBe(EDUCATION_CAP)
    expect(cert.count).toBe(CERTIFICATIONS_CAP)
    expect(tools.count).toBe(TOOLS_CAP)
  })

  it('is_published is still false after a full three-step-equivalent completion with real content', async () => {
    const { data: profile, error } = await admin
      .from('freelancer_profiles').select('is_published').eq('id', freelancerProfileId).single()
    expect(error).toBeNull()
    expect(profile?.is_published).toBe(false)
  })
})

// ─── The unified scenario: a genuinely fresh freelancer, never touched, submits
//     step 3 completely empty. The three describe blocks above each prove one piece of
//     this (schema accepts it / full-replace leaves zero rows / the guard signal flips)
//     against `freelancerProfileId`, which by this point in the file has been filled,
//     emptied, and filled again — "empty" there means "emptied", not "never had rows".
//     This test uses its OWN fresh profile so "never had any child rows" is actually
//     true, not inferred from a full-replace being order-independent. All four facts
//     asserted together, in the one place, because is_published is the one that matters
//     most here: the wizard has every reason to feel like it should publish a profile on
//     its terminal "Créer mon profil" submit, and it must not — publication is derived
//     from active service_listings alone, never from completing this wizard. ───────────

describe.skipIf(!hasCreds)('fresh freelancer — step 3 submitted completely untouched', () => {
  it('accepted, zero rows in all three child tables, working_hours flips to the guard signal, is_published stays false', async () => {
    const freshOwner = await createUser(`${EMAIL_PREFIX}fresh${EMAIL_SUFFIX}`)
    const { data: freshProfile, error: freshErr } = await admin
      .from('freelancer_profiles').insert({ profile_id: freshOwner }).select('id').single()
    expect(freshErr).toBeNull()
    const freshId = freshProfile!.id

    // Step 2 done (the precondition for reaching step 3 at all) — and nothing else. This
    // profile has never had a row in any of the four step-3 targets.
    const { error: langErr } = await admin
      .from('freelancer_languages')
      .insert({ freelancer_profile_id: freshId, language: 'fr', proficiency: 'natif' })
    expect(langErr).toBeNull()

    const before = await admin.from('freelancer_profiles').select('working_hours, is_published').eq('id', freshId).single()
    expect(before.data?.working_hours).toBeNull()
    expect(before.data?.is_published).toBe(false)

    const res = await applyFreelancerDetailsSave(admin, freshId, {
      education: [], certifications: [], tools: [], workingHours: '',
    })
    expect(res.ok).toBe(true)

    const [edu, cert, tools, after] = await Promise.all([
      admin.from('freelancer_education').select('id').eq('freelancer_id', freshId),
      admin.from('freelancer_certifications').select('id').eq('freelancer_id', freshId),
      admin.from('freelancer_tools').select('id').eq('freelancer_id', freshId),
      admin.from('freelancer_profiles').select('working_hours, is_published').eq('id', freshId).single(),
    ])
    expect(edu.data).toEqual([])
    expect(cert.data).toEqual([])
    expect(tools.data).toEqual([])
    expect(after.data?.working_hours).toBe('') // NOT NULL — the guard signal, flipped by an empty submit too
    expect(after.data?.is_published).toBe(false) // the assertion that matters most: this wizard never publishes
  })
})
