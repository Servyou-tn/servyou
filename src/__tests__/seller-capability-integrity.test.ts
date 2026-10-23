/**
 * Live-DB proof for db/migrations/20261023182532_seller_capability_integrity.sql.
 *
 * Part 1 — enforce_seller_capability() on shops / freelancer_profiles (BEFORE INSERT OR UPDATE OF
 *          owner_id / profile_id): for a signed-in non-admin caller the row's owner must hold the
 *          matching profiles.seller_type ('shop_owner' / 'freelancer', itself 18+-gated) and must
 *          not already own the other capability's row — both 42501. UPDATE returns early unless the
 *          owner actually changes.
 * Part 2 — enforce_seller_capability_switch() on profiles (BEFORE UPDATE OF seller_type): when
 *          seller_type actually changes, the new value must match every capability row the account
 *          owns (42501).
 *
 * Every write under test goes through a signed-in user's own session (the REST path the guards
 * exist for); the service role seeds fixtures, reads ground truth and runs the bypass control.
 * Every rejection is followed by a service-role read proving nothing changed.
 *
 * The "à la fois" conjunct of Part 1 is unreachable through a user session once Part 2 is live
 * (that is the point of Part 2), so its two cases seed the mixed state with the service role.
 *
 * Fixtures (all `sel-cap-`): a consumer, a minor, a freelancer, a shop owner, an "orphan" (a
 * freelancer profile on a seller_type-NULL account — the shape of the one such row in prod), two
 * mixed accounts, two onboarding users (G2, H2), a service-role bypass target and an admin.
 * shops.name is unique case-insensitively across prod, so every fixture shop carries this run's id.
 *
 * Pattern A (live-DB). Service role for fixtures, ground truth and teardown only.
 *
 * Run: npx vitest run --config vitest.integration.config.ts src/__tests__/seller-capability-integrity.test.ts
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { randomUUID } from 'node:crypto'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const hasCreds = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.SUPABASE_SERVICE_ROLE_KEY &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
)

const PREFIX = 'sel-cap-'
const EMAIL_SUFFIX = '@rls-smoke.servyou.invalid'
const email = (local: string) => `${PREFIX}${local}${EMAIL_SUFFIX}`
const PASSWORD = 'Seller-Capability-Test-4q9!' // ephemeral test users only; never a real account
const TITLE = 'Seller capability test'
const RUN = randomUUID().slice(0, 8)

// The guards' error shapes, pinned by text so a rejection from some OTHER trigger, policy or
// constraint can't pass for the rule under test.
const NOT_SHOP_OWNER = 'Seul un compte boutique peut posséder une boutique.'
const NOT_FREELANCER = 'Seul un compte freelance peut posséder un profil freelance.'
const BOTH = 'Un compte ne peut pas être à la fois boutique et freelance.'
const SWITCH = 'Le type de vendeur ne peut pas changer tant que le compte possède une boutique ou un profil freelance.'
const UNDER_18 = 'You must be 18 or older to become a seller' // enforce_seller_type_age_gate, unchanged

const admin: SupabaseClient = hasCreds
  ? createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })
  : (undefined as unknown as SupabaseClient)

async function signIn(local: string): Promise<SupabaseClient> {
  const client = createClient(url, anonKey, { auth: { autoRefreshToken: false, persistSession: false } })
  const { error } = await client.auth.signInWithPassword({ email: email(local), password: PASSWORD })
  if (error) throw new Error(`signIn failed for ${local}: ${error.message}`)
  return client
}

async function createUser(local: string, dateOfBirth = '1990-01-01'): Promise<string> {
  const { data, error } = await admin.auth.admin.createUser({
    email: email(local),
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: 'Seller Capability Test', date_of_birth: dateOfBirth, city: 'Tunis', language: 'fr' },
  })
  if (error || !data.user) throw new Error(`createUser failed for ${local}: ${error?.message}`)
  return data.user.id
}

const shopName = (label: string) => `${TITLE} ${RUN} — ${label}`

// Service-role seeding: auth.uid() is NULL, so both guards are bypassed — which is what lets the
// mixed and orphan states below exist at all.
async function seedSellerType(id: string, type: 'shop_owner' | 'freelancer'): Promise<void> {
  const { error } = await admin.from('profiles').update({ seller_type: type }).eq('id', id)
  if (error) throw new Error(`seller_type seed failed: ${error.message}`)
}

async function seedShop(ownerId: string, label: string): Promise<string> {
  const { data, error } = await admin.from('shops').insert({ owner_id: ownerId, name: shopName(label) }).select('id').single()
  if (error || !data) throw new Error(`shop seed failed (${label}): ${error?.message}`)
  return data.id
}

async function seedFreelancerProfile(profileId: string): Promise<string> {
  const { data, error } = await admin.from('freelancer_profiles').insert({ profile_id: profileId }).select('id').single()
  if (error || !data) throw new Error(`freelancer_profiles seed failed: ${error?.message}`)
  return data.id
}

async function shopCount(ownerId: string): Promise<number> {
  const { count, error } = await admin.from('shops').select('id', { count: 'exact', head: true }).eq('owner_id', ownerId)
  if (error) throw new Error(`shop count failed: ${error.message}`)
  return count ?? 0
}

async function fpCount(profileId: string): Promise<number> {
  const { count, error } = await admin
    .from('freelancer_profiles')
    .select('id', { count: 'exact', head: true })
    .eq('profile_id', profileId)
  if (error) throw new Error(`freelancer_profiles count failed: ${error.message}`)
  return count ?? 0
}

async function sellerTypeOf(id: string): Promise<string | null> {
  const { data, error } = await admin.from('profiles').select('seller_type').eq('id', id).single()
  if (error) throw new Error(`seller_type read failed: ${error.message}`)
  return data.seller_type as string | null
}

// Idempotent and surgical to this file's prefix; runs first (recovers a crashed prior run) and last.
// Deleting the auth user cascades profiles -> shops / freelancer_profiles. No orders or audit rows
// are ever created here.
async function teardown(): Promise<void> {
  const { data, error } = await admin.from('profiles').select('id').like('email', `${PREFIX}%${EMAIL_SUFFIX}`)
  if (error) throw new Error(`teardown lookup failed: ${error.message}`)
  for (const row of data ?? []) {
    const { error: delErr } = await admin.auth.admin.deleteUser(row.id as string)
    if (delErr) throw new Error(`deleteUser failed for ${row.id}: ${delErr.message}`)
  }
}

let consumerId: string
let minorId: string
let freelancerId: string
let shopOwnerId: string
let orphanId: string
let mixedShopOwnerId: string
let mixedFreelancerId: string
let g2Id: string
let h2Id: string
let bypassId: string
let adminId: string

let freelancerFpId: string
let shopOwnerShopId: string
let orphanFpId: string

let consumerClient: SupabaseClient
let minorClient: SupabaseClient
let freelancerClient: SupabaseClient
let shopOwnerClient: SupabaseClient
let orphanClient: SupabaseClient
let mixedShopOwnerClient: SupabaseClient
let mixedFreelancerClient: SupabaseClient
let g2Client: SupabaseClient
let h2Client: SupabaseClient
let adminClient: SupabaseClient

beforeAll(async () => {
  if (!hasCreds) return
  await teardown()

  consumerId = await createUser('consumer')
  minorId = await createUser('minor', '2010-01-01')
  freelancerId = await createUser('free')
  shopOwnerId = await createUser('shop')
  orphanId = await createUser('orphan')
  mixedShopOwnerId = await createUser('mixed-shop')
  mixedFreelancerId = await createUser('mixed-free')
  g2Id = await createUser('g2')
  h2Id = await createUser('h2')
  bypassId = await createUser('bypass')
  adminId = await createUser('admin')

  const { error: promoteErr } = await admin.from('profiles').update({ is_admin: true }).eq('id', adminId)
  if (promoteErr) throw new Error(`admin promotion failed: ${promoteErr.message}`)

  await seedSellerType(freelancerId, 'freelancer')
  freelancerFpId = await seedFreelancerProfile(freelancerId)

  await seedSellerType(shopOwnerId, 'shop_owner')
  shopOwnerShopId = await seedShop(shopOwnerId, 'shop owner')

  orphanFpId = await seedFreelancerProfile(orphanId) // seller_type stays NULL

  await seedSellerType(mixedShopOwnerId, 'shop_owner')
  await seedFreelancerProfile(mixedShopOwnerId)

  await seedSellerType(mixedFreelancerId, 'freelancer')
  await seedShop(mixedFreelancerId, 'mixed freelancer')

  consumerClient = await signIn('consumer')
  minorClient = await signIn('minor')
  freelancerClient = await signIn('free')
  shopOwnerClient = await signIn('shop')
  orphanClient = await signIn('orphan')
  mixedShopOwnerClient = await signIn('mixed-shop')
  mixedFreelancerClient = await signIn('mixed-free')
  g2Client = await signIn('g2')
  h2Client = await signIn('h2')
  adminClient = await signIn('admin')
}, 120000)

afterAll(async () => {
  if (!hasCreds) return
  await teardown()
  const { count, error } = await admin
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .like('email', `${PREFIX}%${EMAIL_SUFFIX}`)
  if (error) throw new Error(`teardown verification failed: ${error.message}`)
  if (count !== 0) throw new Error(`teardown left ${count} ${PREFIX} profile(s) behind`)
}, 120000)

describe.skipIf(!hasCreds)('ground truth for every case below', () => {
  it('the seeded accounts hold exactly the states under test', async () => {
    expect(await sellerTypeOf(consumerId)).toBeNull()
    expect(await sellerTypeOf(minorId)).toBeNull()

    expect(await sellerTypeOf(freelancerId)).toBe('freelancer')
    expect(await fpCount(freelancerId)).toBe(1)
    expect(await shopCount(freelancerId)).toBe(0)

    expect(await sellerTypeOf(shopOwnerId)).toBe('shop_owner')
    expect(await shopCount(shopOwnerId)).toBe(1)
    expect(await fpCount(shopOwnerId)).toBe(0)

    expect(await sellerTypeOf(orphanId)).toBeNull()
    expect(await fpCount(orphanId)).toBe(1)

    expect(await sellerTypeOf(mixedShopOwnerId)).toBe('shop_owner')
    expect(await fpCount(mixedShopOwnerId)).toBe(1)
    expect(await shopCount(mixedShopOwnerId)).toBe(0)

    expect(await sellerTypeOf(mixedFreelancerId)).toBe('freelancer')
    expect(await shopCount(mixedFreelancerId)).toBe(1)
    expect(await fpCount(mixedFreelancerId)).toBe(0)

    const { data: minor, error } = await admin.from('profiles').select('date_of_birth').eq('id', minorId).single()
    expect(error).toBeNull()
    expect(minor?.date_of_birth).toBe('2010-01-01')
  })
})

describe.skipIf(!hasCreds)('controls — onboarding in the app order (flip seller_type, then insert) still works', () => {
  it('G2 Créer ma boutique: consumer -> shop_owner, then the shop insert succeeds', async () => {
    const { error: roleErr } = await g2Client.from('profiles').update({ seller_type: 'shop_owner' }).eq('id', g2Id)
    expect(roleErr).toBeNull()

    const { data, error } = await g2Client
      .from('shops')
      .insert({ owner_id: g2Id, name: shopName('G2'), city: 'Tunis', description: 'Boutique de test G2.' })
      .select('id')
      .single()
    expect(error).toBeNull()
    expect(data?.id).toBeTruthy()
    expect(await sellerTypeOf(g2Id)).toBe('shop_owner')
    expect(await shopCount(g2Id)).toBe(1)
  })

  it('H2 Créer mon profil freelance: consumer -> freelancer, insert, then the "Retour" revisit', async () => {
    const { error: roleErr } = await h2Client
      .from('profiles')
      .update({ seller_type: 'freelancer', full_name: 'H2 Test' })
      .eq('id', h2Id)
    expect(roleErr).toBeNull()

    const { data: fp, error } = await h2Client
      .from('freelancer_profiles')
      .insert({ profile_id: h2Id, headline: 'Développeur web', bio: 'Bio de test H2.', city: 'Tunis' })
      .select('id')
      .single()
    expect(error).toBeNull()
    expect(await fpCount(h2Id)).toBe(1)

    // Revisit: the action re-sends seller_type unchanged alongside full_name, then UPDATEs the row.
    const { error: revisitRoleErr } = await h2Client
      .from('profiles')
      .update({ seller_type: 'freelancer', full_name: 'H2 Test bis' })
      .eq('id', h2Id)
    expect(revisitRoleErr).toBeNull()
    const { error: updErr } = await h2Client
      .from('freelancer_profiles')
      .update({ headline: 'Développeur web senior', bio: 'Bio de test H2, revue.', city: 'Sfax' })
      .eq('id', fp!.id)
    expect(updErr).toBeNull()

    const { data: after } = await admin.from('freelancer_profiles').select('headline, city').eq('id', fp!.id).single()
    expect(after).toEqual({ headline: 'Développeur web senior', city: 'Sfax' })
    expect(await sellerTypeOf(h2Id)).toBe('freelancer')
  })
})

describe.skipIf(!hasCreds)('Part 1 — an INSERT needs the matching seller_type (42501)', () => {
  it('a consumer cannot create a shop', async () => {
    const { error } = await consumerClient.from('shops').insert({ owner_id: consumerId, name: shopName('consumer') })
    expect(error?.code).toBe('42501')
    expect(error?.message).toBe(NOT_SHOP_OWNER)
    expect(await shopCount(consumerId)).toBe(0)
  })

  it('a consumer cannot create a freelancer profile', async () => {
    const { error } = await consumerClient.from('freelancer_profiles').insert({ profile_id: consumerId })
    expect(error?.code).toBe('42501')
    expect(error?.message).toBe(NOT_FREELANCER)
    expect(await fpCount(consumerId)).toBe(0)
  })

  it('a minor cannot create either, and still cannot become a seller (age gate, unchanged)', async () => {
    const { error: shopErr } = await minorClient.from('shops').insert({ owner_id: minorId, name: shopName('minor') })
    expect(shopErr?.code).toBe('42501')
    expect(shopErr?.message).toBe(NOT_SHOP_OWNER)

    const { error: fpErr } = await minorClient.from('freelancer_profiles').insert({ profile_id: minorId })
    expect(fpErr?.code).toBe('42501')
    expect(fpErr?.message).toBe(NOT_FREELANCER)

    const { error: roleErr } = await minorClient.from('profiles').update({ seller_type: 'shop_owner' }).eq('id', minorId)
    expect(roleErr?.code).toBe('23514')
    expect(roleErr?.message).toBe(UNDER_18)

    expect(await shopCount(minorId)).toBe(0)
    expect(await fpCount(minorId)).toBe(0)
    expect(await sellerTypeOf(minorId)).toBeNull()
  })

  it('a freelancer cannot create a shop', async () => {
    const { error } = await freelancerClient.from('shops').insert({ owner_id: freelancerId, name: shopName('freelancer') })
    expect(error?.code).toBe('42501')
    expect(error?.message).toBe(NOT_SHOP_OWNER)
    expect(await shopCount(freelancerId)).toBe(0)
  })

  it('a shop owner cannot create a freelancer profile', async () => {
    const { error } = await shopOwnerClient.from('freelancer_profiles').insert({ profile_id: shopOwnerId })
    expect(error?.code).toBe('42501')
    expect(error?.message).toBe(NOT_FREELANCER)
    expect(await fpCount(shopOwnerId)).toBe(0)
  })
})

describe.skipIf(!hasCreds)('Part 1 — an INSERT cannot add a second capability (42501)', () => {
  it('a shop_owner who already owns a freelancer profile cannot create a shop', async () => {
    const { error } = await mixedShopOwnerClient
      .from('shops')
      .insert({ owner_id: mixedShopOwnerId, name: shopName('mixed shop owner') })
    expect(error?.code).toBe('42501')
    expect(error?.message).toBe(BOTH)
    expect(await shopCount(mixedShopOwnerId)).toBe(0)
  })

  it('a freelancer who already owns a shop cannot create a freelancer profile', async () => {
    const { error } = await mixedFreelancerClient.from('freelancer_profiles').insert({ profile_id: mixedFreelancerId })
    expect(error?.code).toBe('42501')
    expect(error?.message).toBe(BOTH)
    expect(await fpCount(mixedFreelancerId)).toBe(0)
  })
})

describe.skipIf(!hasCreds)('Part 1 — owner changes', () => {
  // RLS (USING / WITH CHECK owner = auth.uid()) already refuses these; which error surfaces first
  // depends on the target's seller_type, so only the outcome is pinned.
  it('a shop owner cannot hand their shop to another account', async () => {
    const { error } = await shopOwnerClient.from('shops').update({ owner_id: consumerId }).eq('id', shopOwnerShopId)
    expect(error).not.toBeNull()
    const { data } = await admin.from('shops').select('owner_id').eq('id', shopOwnerShopId).single()
    expect(data?.owner_id).toBe(shopOwnerId)
  })

  it('a freelancer cannot hand their profile to another account', async () => {
    const { error } = await freelancerClient
      .from('freelancer_profiles')
      .update({ profile_id: consumerId })
      .eq('id', freelancerFpId)
    expect(error).not.toBeNull()
    const { data } = await admin.from('freelancer_profiles').select('profile_id').eq('id', freelancerFpId).single()
    expect(data?.profile_id).toBe(freelancerId)
  })

  it('an unchanged owner in the SET list is not re-checked (UPDATE OF fires anyway)', async () => {
    // The orphan's seller_type is NULL, so the full Part 1 check WOULD reject this row — only the
    // IS DISTINCT FROM early return lets the edit through.
    const { error } = await orphanClient
      .from('freelancer_profiles')
      .update({ profile_id: orphanId, headline: 'Orphan edit' })
      .eq('id', orphanFpId)
    expect(error).toBeNull()
    const { data } = await admin.from('freelancer_profiles').select('headline').eq('id', orphanFpId).single()
    expect(data?.headline).toBe('Orphan edit')
  })
})

describe.skipIf(!hasCreds)('Part 2 — seller_type cannot move away from an owned capability (42501)', () => {
  it('a freelancer with a profile cannot become shop_owner or consumer', async () => {
    for (const next of ['shop_owner', null] as const) {
      const { error } = await freelancerClient.from('profiles').update({ seller_type: next }).eq('id', freelancerId)
      expect(error?.code).toBe('42501')
      expect(error?.message).toBe(SWITCH)
    }
    expect(await sellerTypeOf(freelancerId)).toBe('freelancer')
  })

  it('a shop owner with a shop cannot become freelancer or consumer', async () => {
    for (const next of ['freelancer', null] as const) {
      const { error } = await shopOwnerClient.from('profiles').update({ seller_type: next }).eq('id', shopOwnerId)
      expect(error?.code).toBe('42501')
      expect(error?.message).toBe(SWITCH)
    }
    expect(await sellerTypeOf(shopOwnerId)).toBe('shop_owner')
  })

  it('re-sending the same seller_type is allowed', async () => {
    const { error: shopErr } = await shopOwnerClient.from('profiles').update({ seller_type: 'shop_owner' }).eq('id', shopOwnerId)
    expect(shopErr).toBeNull()
    const { error: freeErr } = await freelancerClient
      .from('profiles')
      .update({ seller_type: 'freelancer', full_name: 'Freelance Test' })
      .eq('id', freelancerId)
    expect(freeErr).toBeNull()
  })

  it('an orphan profile owner can still edit their account, cannot become shop_owner, can repair to freelancer', async () => {
    const { error: nameErr } = await orphanClient.from('profiles').update({ full_name: 'Orphan Test' }).eq('id', orphanId)
    expect(nameErr).toBeNull()

    const { error: shopErr } = await orphanClient.from('profiles').update({ seller_type: 'shop_owner' }).eq('id', orphanId)
    expect(shopErr?.code).toBe('42501')
    expect(shopErr?.message).toBe(SWITCH)
    expect(await sellerTypeOf(orphanId)).toBeNull()

    const { error: repairErr } = await orphanClient.from('profiles').update({ seller_type: 'freelancer' }).eq('id', orphanId)
    expect(repairErr).toBeNull()
    expect(await sellerTypeOf(orphanId)).toBe('freelancer')
  })
})

describe.skipIf(!hasCreds)('bypasses — consistent with the other guard triggers', () => {
  it('the service role (auth.uid() NULL) can seed a shop for a consumer — the fixtures depend on it', async () => {
    const { error } = await admin.from('shops').insert({ owner_id: bypassId, name: shopName('bypass') })
    expect(error).toBeNull()
    expect(await sellerTypeOf(bypassId)).toBeNull()
    expect(await shopCount(bypassId)).toBe(1)
  })

  it('an admin is not gated', async () => {
    const { error } = await adminClient.from('shops').insert({ owner_id: adminId, name: shopName('admin') })
    expect(error).toBeNull()
    expect(await shopCount(adminId)).toBe(1)
  })

  it('anon skips the trigger (auth.uid() NULL) but the RLS WITH CHECK still refuses it', async () => {
    const anon = createClient(url, anonKey, { auth: { autoRefreshToken: false, persistSession: false } })
    const { error: shopErr } = await anon.from('shops').insert({ owner_id: consumerId, name: shopName('anon') })
    expect(shopErr).not.toBeNull()
    const { error: fpErr } = await anon.from('freelancer_profiles').insert({ profile_id: consumerId })
    expect(fpErr).not.toBeNull()
    expect(await shopCount(consumerId)).toBe(0)
    expect(await fpCount(consumerId)).toBe(0)
  })
})
