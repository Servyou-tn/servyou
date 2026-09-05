/**
 * Live-DB proof for get_completed_service_order_count (get_completed_service_order_count.sql),
 * the SECURITY DEFINER RPC backing D4's "Projets livrés" trust tile
 * (src/lib/marche/freelancer-detail.ts, FreelancerDetail.tsx).
 *
 * orders' own SELECT RLS ("Buyer and seller read their orders") is buyer/seller-scoped, so an
 * anon stranger reading orders directly always gets zero rows — that alone doesn't prove the RPC
 * works, since zero is also what it returns for a freelancer with no history. This suite creates a
 * fixture with an actual 'received' service order and asserts the RPC returns a real non-zero
 * count for an ANON (unauthenticated) caller, then checks a same-seller 'pending' order is
 * correctly excluded (the function's own WHERE clause filters status='received').
 *
 * Pattern A (live-DB), mirroring d4-freelancer-services-visibility.test.ts. Service role for
 * fixtures and teardown only; the assertion itself goes through a fresh anon client with no
 * session, matching how D4's page renders for a first-time visitor.
 *
 * Run: npx vitest run src/__tests__/d4-completed-project-count.test.ts
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const hasCreds = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.SUPABASE_SERVICE_ROLE_KEY &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
)

const EMAIL_SUFFIX = '@rls-smoke.servyou.invalid'
const EMAIL_PREFIX = 'd4-count-'
const SELLER_EMAIL = `${EMAIL_PREFIX}seller${EMAIL_SUFFIX}`
const BUYER_EMAIL = `${EMAIL_PREFIX}buyer${EMAIL_SUFFIX}`
const PASSWORD = 'D4-Completed-Count-Test-9x4!' // ephemeral test users only; never a real account

const admin: SupabaseClient = hasCreds
  ? createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })
  : (undefined as unknown as SupabaseClient)

function freshAnonClient(): SupabaseClient {
  return createClient(url, anonKey, { auth: { autoRefreshToken: false, persistSession: false } })
}

async function createUser(email: string): Promise<string> {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: 'D4 Completed Count Test', date_of_birth: '1990-01-01', city: 'Tunis', language: 'fr' },
  })
  if (error || !data.user) throw new Error(`createUser failed for ${email}: ${error?.message}`)
  return data.user.id
}

async function teardown(): Promise<void> {
  const { data, error } = await admin.from('profiles').select('id').like('email', `${EMAIL_PREFIX}%${EMAIL_SUFFIX}`)
  if (error) throw new Error(`teardown lookup failed: ${error.message}`)
  const ids = (data ?? []).map((row) => row.id)
  if (ids.length === 0) return

  await admin.from('orders').delete().in('buyer_id', ids)
  await admin.from('orders').delete().in('seller_id', ids)
  for (const id of ids) {
    await admin.auth.admin.deleteUser(id)
  }
}

let sellerId: string
let buyerId: string
let freelancerProfileId: string
let listingId: string

beforeAll(async () => {
  if (!hasCreds) return
  await teardown()

  sellerId = await createUser(SELLER_EMAIL)
  buyerId = await createUser(BUYER_EMAIL)

  const { data: profile, error: profileErr } = await admin
    .from('freelancer_profiles')
    .insert({ profile_id: sellerId })
    .select('id')
    .single()
  if (profileErr || !profile) throw new Error(`freelancer_profiles insert failed: ${profileErr?.message}`)
  freelancerProfileId = profile.id

  const { data: listing, error: listingErr } = await admin
    .from('service_listings')
    .insert({ freelancer_profile_id: freelancerProfileId, title: 'D4 completed-count test service', starting_price_tnd: 80 })
    .select('id')
    .single()
  if (listingErr || !listing) throw new Error(`service_listings insert failed: ${listingErr?.message}`)
  listingId = listing.id

  // The one order that SHOULD be counted: a completed (status='received') service order.
  const { error: receivedErr } = await admin.from('orders').insert({
    buyer_id: buyerId,
    seller_id: sellerId,
    order_type: 'service',
    service_listing_id: listingId,
    status: 'received',
  })
  if (receivedErr) throw new Error(`received service order insert failed: ${receivedErr.message}`)

  // A still-pending service order for the same seller — must NOT be counted.
  const { error: pendingErr } = await admin.from('orders').insert({
    buyer_id: buyerId,
    seller_id: sellerId,
    order_type: 'service',
    service_listing_id: listingId,
    status: 'pending',
  })
  if (pendingErr) throw new Error(`pending service order insert failed: ${pendingErr.message}`)
}, 60000)

afterAll(async () => {
  if (!hasCreds) return
  await teardown()
}, 60000)

describe.skipIf(!hasCreds)('get_completed_service_order_count — real fixture, not the zero default', () => {
  it('an anonymous stranger gets a real non-zero count for a seller with a received service order', async () => {
    const anon = freshAnonClient()
    const { data, error } = await anon.rpc('get_completed_service_order_count', { target: sellerId })
    expect(error).toBeNull()
    expect(data).toBe(1)
  })

  it('a pending order for the same seller is excluded — only status=received counts', async () => {
    const anon = freshAnonClient()
    const { data, error } = await anon.rpc('get_completed_service_order_count', { target: sellerId })
    expect(error).toBeNull()
    // Fixture has 1 received + 1 pending service order for this seller; only the received one
    // should ever be reflected.
    expect(data).toBe(1)
  })

  it('a seller with no orders at all still gets 0, not an error', async () => {
    const anon = freshAnonClient()
    const { data, error } = await anon.rpc('get_completed_service_order_count', { target: buyerId })
    expect(error).toBeNull()
    expect(data).toBe(0)
  })
})
