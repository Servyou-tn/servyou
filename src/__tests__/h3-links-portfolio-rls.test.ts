/**
 * Live-DB proof for H3's two new tables (db/migrations/20260904180529_h3_freelancer_links_
 * portfolio_workplace.sql) and the publish-model reasoning in
 * src/app/mon-profil-freelance/modifier/actions.ts.
 *
 * Three things this file exists to prove against the real database, not a mocked query builder:
 *   1. RLS on freelancer_links / freelancer_portfolio_items matches PR #164's shape exactly —
 *      SELECT gated on the PARENT's is_published, never USING(true) — with rows actually SEEDED
 *      for the unpublished profile (both tables are empty in prod today, so an unseeded assertion
 *      would pass trivially and prove nothing; same posture freelancer-publish-gate-rls.test.ts
 *      already documents for the original five tables).
 *   2. trg_enforce_portfolio_image_provenance rejects a freelancer_portfolio_items row whose
 *      image_url has no matching uploaded_objects row, and accepts one that does — including
 *      against service_role, which has no bypass (same shape uploaded-objects-provenance-rls
 *      .test.ts proved for product_images).
 *   3. applyProfileSave/validateForPublish never touch is_published — a freelancer who passes
 *      every measured requirement but has zero active service_listings stays unpublished after a
 *      full "publish" attempt (save + validate), because that flag is trigger-derived (PR #164)
 *      and this module's whole job is to never duplicate that logic.
 *
 * Pattern A (live-DB), mirroring freelancer-publish-gate-rls.test.ts / uploaded-objects-
 * provenance-rls.test.ts. Service role for fixtures and teardown only.
 *
 * Run: npx vitest run src/__tests__/h3-links-portfolio-rls.test.ts
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { randomUUID } from 'node:crypto'
import { applyProfileSave } from '@/app/mon-profil-freelance/modifier/actions'
import { validateForPublish, BIO_MIN_FOR_PUBLISH } from '@/lib/marche/freelancer-profile-edit'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const hasCreds = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.SUPABASE_SERVICE_ROLE_KEY &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
)

const EMAIL_SUFFIX = '@rls-smoke.servyou.invalid'
const EMAIL_PREFIX = 'h3-lp-'
const PUB_EMAIL = `${EMAIL_PREFIX}published${EMAIL_SUFFIX}`
const UNPUB_EMAIL = `${EMAIL_PREFIX}unpublished${EMAIL_SUFFIX}`
const OTHER_EMAIL = `${EMAIL_PREFIX}other${EMAIL_SUFFIX}`
const ADMIN_EMAIL = `${EMAIL_PREFIX}admin${EMAIL_SUFFIX}`
const PASSWORD = 'H3-Links-Portfolio-Test-4q8!' // ephemeral test users only; never a real account

const admin: SupabaseClient = hasCreds
  ? createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })
  : (undefined as unknown as SupabaseClient)
const anon: SupabaseClient = hasCreds
  ? createClient(url, anonKey, { auth: { autoRefreshToken: false, persistSession: false } })
  : (undefined as unknown as SupabaseClient)

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
    user_metadata: { full_name: 'H3 Links Portfolio Test', date_of_birth: '1990-01-01', city: 'Tunis', language: 'fr' },
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

function publicUrl(bucket: string, path: string): string {
  return `${url}/storage/v1/object/public/${bucket}/${path}`
}

let pubOwnerId: string
let unpubOwnerId: string
let pubProfileId: string
let unpubProfileId: string
let pubClient: SupabaseClient
let unpubClient: SupabaseClient
let otherClient: SupabaseClient
let adminClient: SupabaseClient

beforeAll(async () => {
  if (!hasCreds) return
  await teardown()

  pubOwnerId = await createUser(PUB_EMAIL)
  unpubOwnerId = await createUser(UNPUB_EMAIL)
  await createUser(OTHER_EMAIL)
  const adminId = await createUser(ADMIN_EMAIL)

  const { data: pubProfile, error: pubErr } = await admin.from('freelancer_profiles').insert({ profile_id: pubOwnerId }).select('id').single()
  if (pubErr || !pubProfile) throw new Error(`published freelancer_profile insert failed: ${pubErr?.message}`)
  pubProfileId = pubProfile.id

  const { data: unpubProfile, error: unpubErr } = await admin.from('freelancer_profiles').insert({ profile_id: unpubOwnerId }).select('id').single()
  if (unpubErr || !unpubProfile) throw new Error(`unpublished freelancer_profile insert failed: ${unpubErr?.message}`)
  unpubProfileId = unpubProfile.id

  // pubProfileId becomes published via the trigger firing on this insert — not set directly.
  const { error: listingErr } = await admin
    .from('service_listings')
    .insert({ freelancer_profile_id: pubProfileId, title: 'H3 test service (published)', starting_price_tnd: 50 })
  if (listingErr) throw new Error(`published service_listings insert failed: ${listingErr.message}`)

  // Seed BOTH profiles with a freelancer_links row and a freelancer_portfolio_items row — the
  // unpublished profile's rows are what the negative-read assertions below target. A portfolio
  // row needs a provenance row FIRST (the trigger applies to service_role too, see below).
  for (const [freelancerProfileId, tag] of [[pubProfileId, 'pub'], [unpubProfileId, 'unpub']] as const) {
    const { error: linkErr } = await admin
      .from('freelancer_links')
      .insert({ freelancer_profile_id: freelancerProfileId, label: `Link-${tag}`, url: `https://example.test/${tag}` })
    if (linkErr) throw new Error(`freelancer_links seed (${tag}) failed: ${linkErr.message}`)

    const path = `${tag === 'pub' ? pubOwnerId : unpubOwnerId}/${randomUUID()}.webp`
    const { error: provErr } = await admin
      .from('uploaded_objects')
      .insert({ bucket: 'portfolio-media', path, owner_id: tag === 'pub' ? pubOwnerId : unpubOwnerId })
    if (provErr) throw new Error(`uploaded_objects seed (${tag}) failed: ${provErr.message}`)

    const { error: itemErr } = await admin
      .from('freelancer_portfolio_items')
      .insert({ freelancer_profile_id: freelancerProfileId, image_url: publicUrl('portfolio-media', path), title: `Item-${tag}` })
    if (itemErr) throw new Error(`freelancer_portfolio_items seed (${tag}) failed: ${itemErr.message}`)
  }

  pubClient = await signIn(PUB_EMAIL)
  unpubClient = await signIn(UNPUB_EMAIL)
  otherClient = await signIn(OTHER_EMAIL)
  adminClient = await signIn(ADMIN_EMAIL)
  const { error: promoteErr } = await admin.from('profiles').update({ is_admin: true }).eq('id', adminId)
  if (promoteErr) throw new Error(`admin promotion failed: ${promoteErr.message}`)
}, 60000)

afterAll(async () => {
  if (!hasCreds) return
  await teardown()
}, 60000)

describe.skipIf(!hasCreds)('freelancer_links RLS — same shape as PR #164', () => {
  it('anon CANNOT read links for an UNPUBLISHED profile, even though a row is seeded', async () => {
    const { data, error } = await anon.from('freelancer_links').select('id').eq('freelancer_profile_id', unpubProfileId)
    expect(error).toBeNull()
    expect(data).toEqual([])
  })

  it('anon CAN read links for a PUBLISHED profile', async () => {
    const { data, error } = await anon.from('freelancer_links').select('id').eq('freelancer_profile_id', pubProfileId)
    expect(error).toBeNull()
    expect(data).toHaveLength(1)
  })

  it('the OWNER can read their own unpublished links', async () => {
    const { data, error } = await unpubClient.from('freelancer_links').select('id').eq('freelancer_profile_id', unpubProfileId)
    expect(error).toBeNull()
    expect(data).toHaveLength(1)
  })

  it('the owner of a PUBLISHED profile can also read their own links (the owner clause, not just is_published)', async () => {
    const { data, error } = await pubClient.from('freelancer_links').select('id').eq('freelancer_profile_id', pubProfileId)
    expect(error).toBeNull()
    expect(data).toHaveLength(1)
  })

  it('a non-owner authenticated caller CANNOT read another unpublished profile\'s links', async () => {
    const { data, error } = await otherClient.from('freelancer_links').select('id').eq('freelancer_profile_id', unpubProfileId)
    expect(error).toBeNull()
    expect(data).toEqual([])
  })

  it('ADMIN can read an unpublished profile\'s links', async () => {
    const { data, error } = await adminClient.from('freelancer_links').select('id').eq('freelancer_profile_id', unpubProfileId)
    expect(error).toBeNull()
    expect(data).toHaveLength(1)
  })

  it('the owner can insert/update/delete their own links; a non-owner cannot insert into their row', async () => {
    const { data: inserted, error: insErr } = await unpubClient
      .from('freelancer_links')
      .insert({ freelancer_profile_id: unpubProfileId, label: 'New', url: 'https://example.test/new' })
      .select('id')
      .single()
    expect(insErr).toBeNull()
    expect(inserted?.id).toBeTruthy()

    const { error: otherInsErr } = await otherClient
      .from('freelancer_links')
      .insert({ freelancer_profile_id: unpubProfileId, label: 'Forged', url: 'https://example.test/forged' })
    expect(otherInsErr).not.toBeNull()

    if (inserted) await admin.from('freelancer_links').delete().eq('id', inserted.id)
  })
})

describe.skipIf(!hasCreds)('freelancer_portfolio_items RLS — same shape as PR #164', () => {
  it('anon CANNOT read portfolio items for an UNPUBLISHED profile, even though a row is seeded', async () => {
    const { data, error } = await anon.from('freelancer_portfolio_items').select('id').eq('freelancer_profile_id', unpubProfileId)
    expect(error).toBeNull()
    expect(data).toEqual([])
  })

  it('anon CAN read portfolio items for a PUBLISHED profile', async () => {
    const { data, error } = await anon.from('freelancer_portfolio_items').select('id').eq('freelancer_profile_id', pubProfileId)
    expect(error).toBeNull()
    expect(data).toHaveLength(1)
  })

  it('the OWNER can read their own unpublished portfolio items', async () => {
    const { data, error } = await unpubClient.from('freelancer_portfolio_items').select('id').eq('freelancer_profile_id', unpubProfileId)
    expect(error).toBeNull()
    expect(data).toHaveLength(1)
  })

  it('ADMIN can read an unpublished profile\'s portfolio items', async () => {
    const { data, error } = await adminClient.from('freelancer_portfolio_items').select('id').eq('freelancer_profile_id', unpubProfileId)
    expect(error).toBeNull()
    expect(data).toHaveLength(1)
  })
})

describe.skipIf(!hasCreds)('trg_enforce_portfolio_image_provenance', () => {
  it('REJECTS a row whose image_url has no matching uploaded_objects row', async () => {
    const path = `${unpubOwnerId}/${randomUUID()}.webp`
    const { error } = await unpubClient
      .from('freelancer_portfolio_items')
      .insert({ freelancer_profile_id: unpubProfileId, image_url: publicUrl('portfolio-media', path) })
    expect(error).not.toBeNull()
    expect(error!.message).toContain('provenance check failed')
  })

  it('ACCEPTS a row whose image_url has a matching uploaded_objects row (bucket + path + owner)', async () => {
    const path = `${unpubOwnerId}/${randomUUID()}.webp`
    const { error: provErr } = await admin.from('uploaded_objects').insert({ bucket: 'portfolio-media', path, owner_id: unpubOwnerId })
    expect(provErr).toBeNull()

    const { data, error } = await unpubClient
      .from('freelancer_portfolio_items')
      .insert({ freelancer_profile_id: unpubProfileId, image_url: publicUrl('portfolio-media', path) })
      .select('id')
      .single()
    expect(error).toBeNull()
    expect(data?.id).toBeTruthy()
    if (data) await admin.from('freelancer_portfolio_items').delete().eq('id', data.id)
  })

  it('applies even to service_role — a direct admin insert with no provenance still raises', async () => {
    const path = `${unpubOwnerId}/${randomUUID()}.webp`
    const { error } = await admin
      .from('freelancer_portfolio_items')
      .insert({ freelancer_profile_id: unpubProfileId, image_url: publicUrl('portfolio-media', path) })
    expect(error).not.toBeNull()
    expect(error!.message).toContain('provenance check failed')
  })
})

describe.skipIf(!hasCreds)('publish model option A — is_published is never touched by this module', () => {
  it('a freelancer who passes every measured requirement but has ZERO active listings stays unpublished after a full save+validate "publish" attempt', async () => {
    const payload = {
      headline: 'Développeur web full-stack',
      bio: 'x'.repeat(BIO_MIN_FOR_PUBLISH),
      yearsExperience: 5,
      workingHours: '',
      workplaceLocation: '',
      portfolioLink: null,
      skills: ['React', 'Node', 'TypeScript'],
      languages: [],
      tools: [],
      links: [],
      portfolio: [],
      education: [],
      certifications: [],
    }

    // Confirmed BEFORE the write too — unpubProfileId has never had any service_listings row.
    const { data: before } = await admin.from('freelancer_profiles').select('is_published').eq('id', unpubProfileId).single()
    expect(before?.is_published).toBe(false)

    const saveResult = await applyProfileSave(unpubClient, unpubProfileId, payload)
    expect(saveResult.ok).toBe(true)

    const validation = validateForPublish({ headline: payload.headline, bio: payload.bio, skillsCount: payload.skills.length })
    expect(validation.ok).toBe(true) // every measured requirement passes

    // The whole point of option A: passing validation with zero active listings must NOT flip
    // is_published. It stays exactly what the trigger already computed — false.
    const { data: after, error } = await admin.from('freelancer_profiles').select('is_published').eq('id', unpubProfileId).single()
    expect(error).toBeNull()
    expect(after?.is_published).toBe(false)
  })

  // Deliberately NOT re-proving that inserting a real service_listings row flips is_published —
  // freelancer-publish-gate-rls.test.ts already covers that exhaustively ("Trigger flips observed
  // in both directions plus DELETE", PR #164), and that same file also runs a live, UNSCOPED
  // count of every active service_listings row in the database (its "live marketplace embed
  // paths" describe block) that a transient insert+delete here raced against — confirmed by
  // re-running both files together. The assertion above is sufficient for this module's own claim
  // (it never touches is_published); the trigger's own correctness is out of scope for this file.
})

// D4 build pass: portfolio_link's WRITE side (applyProfileSave) closes the D-H mirror violation —
// D4 read this field from day one, this module never wrote it until now. D4's own read side (the
// column appearing/disappearing on the rendered page) was verified separately by curling a live
// dev server against a real fixture; this proves the write path itself, through the same
// applyProfileSave() every other field in this file is exercised through.
describe.skipIf(!hasCreds)('portfolio_link — applyProfileSave writes and clears it (D4 mirror closer)', () => {
  const basePayload = {
    headline: 'Développeur web full-stack',
    bio: 'x'.repeat(BIO_MIN_FOR_PUBLISH),
    yearsExperience: 5,
    workingHours: '',
    workplaceLocation: '',
    skills: [] as string[],
    languages: [] as { language: string; proficiency: string }[],
    tools: [] as string[],
    links: [] as { label: string; url: string }[],
    portfolio: [] as { imageUrl: string; title: string; url: string; description: string }[],
    education: [] as { institution: string; degree: string; yearStart: number | null; yearEnd: number | null }[],
    certifications: [] as { name: string; issuingOrg: string; yearObtained: number | null; credentialUrl: string }[],
  }

  it('sets portfolio_link on save', async () => {
    const result = await applyProfileSave(pubClient, pubProfileId, { ...basePayload, portfolioLink: 'https://behance.net/moatez' })
    expect(result.ok).toBe(true)

    const { data, error } = await admin.from('freelancer_profiles').select('portfolio_link').eq('id', pubProfileId).single()
    expect(error).toBeNull()
    expect(data?.portfolio_link).toBe('https://behance.net/moatez')
  })

  it('clears portfolio_link back to null on a subsequent save with no value', async () => {
    const result = await applyProfileSave(pubClient, pubProfileId, { ...basePayload, portfolioLink: null })
    expect(result.ok).toBe(true)

    const { data, error } = await admin.from('freelancer_profiles').select('portfolio_link').eq('id', pubProfileId).single()
    expect(error).toBeNull()
    expect(data?.portfolio_link).toBeNull()
  })
})
