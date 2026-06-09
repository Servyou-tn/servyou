/**
 * RLS boundary tests for the freelancer configurable-workspace child tables
 * (freelancer_tools, freelancer_education, freelancer_certifications) shipped by PR-F.
 *
 * Like the shop child tables, these are low-sensitivity public-read surfaces — a
 * freelancer's tools/education/certifications are part of the trust signal buyers
 * use to vet them. The boundary worth regression-guarding is the owner-manage gate:
 * anyone reads, only the owning freelancer writes (checked via a join through
 * freelancer_profiles.profile_id = auth.uid()).
 *
 * Pattern A (live-DB), mirroring profiles-rls.test.ts. Service role for fixtures
 * and teardown only; anon + signed-in clients make every assertion.
 *
 * Run: npx vitest run src/__tests__/freelancer-config-rls.test.ts
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!url || !serviceKey || !anonKey) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or NEXT_PUBLIC_SUPABASE_ANON_KEY')
}

const EMAIL_SUFFIX = '@rls-smoke.servyou.invalid'
const EMAIL_PREFIX = 'frl-cfg-'
const OWNER_EMAIL = `${EMAIL_PREFIX}owner${EMAIL_SUFFIX}`
const OTHER_EMAIL = `${EMAIL_PREFIX}other${EMAIL_SUFFIX}`
const PASSWORD = 'Rls-Config-Test-7k2!' // ephemeral test users only; never a real account

const admin: SupabaseClient = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})
const anon: SupabaseClient = createClient(url, anonKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function signIn(email: string): Promise<SupabaseClient> {
  const client = createClient(url, anonKey, { auth: { autoRefreshToken: false, persistSession: false } })
  const { error } = await client.auth.signInWithPassword({ email, password: PASSWORD })
  if (error) throw new Error(`signIn failed for ${email}: ${error.message}`)
  return client
}

async function createUser(email: string): Promise<string> {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: 'Freelancer Config Test', date_of_birth: '1990-01-01', city: 'Tunis', language: 'fr' },
  })
  if (error || !data.user) throw new Error(`createUser failed for ${email}: ${error?.message}`)
  return data.user.id
}

// Idempotent teardown, surgical to this file's prefix. Deleting the user cascades
// profiles -> freelancer_profiles -> tools/education/certifications (ON DELETE CASCADE).
async function teardown() {
  const { data, error } = await admin
    .from('profiles').select('id').like('email', `${EMAIL_PREFIX}%${EMAIL_SUFFIX}`)
  if (error) throw new Error(`teardown lookup failed: ${error.message}`)
  for (const row of data ?? []) {
    const { error: delErr } = await admin.auth.admin.deleteUser(row.id)
    if (delErr) throw new Error(`deleteUser failed for ${row.id}: ${delErr.message}`)
  }
}

let ownerId: string
let otherId: string
let profileId: string
let ownerClient: SupabaseClient
let otherClient: SupabaseClient

beforeAll(async () => {
  await teardown() // teardown-first: recover from any crashed prior run

  ownerId = await createUser(OWNER_EMAIL)
  otherId = await createUser(OTHER_EMAIL)

  // The freelancer profile owned by ownerId (service role bypasses RLS for setup).
  const { data: profile, error: profErr } = await admin
    .from('freelancer_profiles').insert({ profile_id: ownerId }).select('id').single()
  if (profErr || !profile) throw new Error(`freelancer_profile insert failed: ${profErr?.message}`)
  profileId = profile.id

  // Seed one row in each child table so the anon-read controls have a row to find.
  const seeds = [
    admin.from('freelancer_tools').insert({ freelancer_id: profileId, name: 'Figma' }),
    admin.from('freelancer_education').insert({ freelancer_id: profileId, institution: 'Université de Tunis' }),
    admin.from('freelancer_certifications').insert({ freelancer_id: profileId, name: 'PMP' }),
  ]
  for (const p of seeds) {
    const { error } = await p
    if (error) throw new Error(`seed failed: ${error.message}`)
  }

  ownerClient = await signIn(OWNER_EMAIL)
  otherClient = await signIn(OTHER_EMAIL)
}, 60000)

afterAll(async () => {
  await teardown()
}, 60000)

// ─── freelancer_tools: public read, owner-only write ──────────────────────────

describe('freelancer_tools RLS', () => {
  it('anon CAN read freelancer_tools (public read)', async () => {
    const { data, error } = await anon
      .from('freelancer_tools').select('id, name').eq('freelancer_id', profileId).eq('name', 'Figma')
    expect(error).toBeNull()
    expect(data).toHaveLength(1)
  })

  it('non-owner CANNOT insert a tool on another freelancer', async () => {
    const { error } = await otherClient
      .from('freelancer_tools').insert({ freelancer_id: profileId, name: 'Photoshop' })
    expect(error).not.toBeNull()
  })

  it('owner CAN insert a tool on own profile (control)', async () => {
    const { error } = await ownerClient
      .from('freelancer_tools').insert({ freelancer_id: profileId, name: 'Illustrator' })
    expect(error).toBeNull()
  })
})

// ─── freelancer_education: public read, owner-only write ───────────────────────

describe('freelancer_education RLS', () => {
  it('anon CAN read freelancer_education (public read)', async () => {
    const { data, error } = await anon
      .from('freelancer_education').select('id, institution')
      .eq('freelancer_id', profileId).eq('institution', 'Université de Tunis')
    expect(error).toBeNull()
    expect(data).toHaveLength(1)
  })

  it('non-owner CANNOT insert an education entry on another freelancer', async () => {
    const { error } = await otherClient
      .from('freelancer_education').insert({ freelancer_id: profileId, institution: 'ESPRIT' })
    expect(error).not.toBeNull()
  })

  it('owner CAN insert an education entry on own profile (control)', async () => {
    const { error } = await ownerClient
      .from('freelancer_education').insert({ freelancer_id: profileId, institution: 'INSAT' })
    expect(error).toBeNull()
  })
})

// ─── freelancer_certifications: public read, owner-only write ──────────────────

describe('freelancer_certifications RLS', () => {
  it('anon CAN read freelancer_certifications (public read)', async () => {
    const { data, error } = await anon
      .from('freelancer_certifications').select('id, name').eq('freelancer_id', profileId).eq('name', 'PMP')
    expect(error).toBeNull()
    expect(data).toHaveLength(1)
  })

  it('non-owner CANNOT insert a certification on another freelancer', async () => {
    const { error } = await otherClient
      .from('freelancer_certifications').insert({ freelancer_id: profileId, name: 'AWS SAA' })
    expect(error).not.toBeNull()
  })

  it('owner CAN insert a certification on own profile (control)', async () => {
    const { error } = await ownerClient
      .from('freelancer_certifications').insert({ freelancer_id: profileId, name: 'Scrum Master' })
    expect(error).toBeNull()
  })
})
