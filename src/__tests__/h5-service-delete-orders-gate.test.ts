/**
 * Live-DB proof for ruling 4/9's delete gate: a service_listings row with ANY existing order
 * (any status) cannot be hard-deleted by its owner. This DISPROVES H7's own measured delete-modal
 * copy ("Vos engagements en cours sur ce service ne sont pas affectés") — found while building this
 * PR, not assumed. `enforce_order_identity_lock` raises on the `orders.service_listing_id` column
 * changing via the `ON DELETE SET NULL` cascade, the exact same failure mode deleteProductAction's
 * own comment documents for products ("verified live, §7") — this file is that same proof for
 * services, run through the real owner session (not service_role, which would skip the
 * `auth.uid() is null` short-circuit in enforce_order_identity_lock and produce a false pass).
 *
 * Pattern A (live-DB), mirroring d4-completed-project-count.test.ts.
 *
 * Run: npx vitest run src/__tests__/h5-service-delete-orders-gate.test.ts
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

const admin: SupabaseClient = hasCreds
  ? createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })
  : (undefined as unknown as SupabaseClient)

const EMAIL_SUFFIX = '@rls-smoke.servyou.invalid'
const EMAIL_PREFIX = 'h5-del-gate-'
const OWNER_EMAIL = `${EMAIL_PREFIX}owner${EMAIL_SUFFIX}`
const BUYER_EMAIL = `${EMAIL_PREFIX}buyer${EMAIL_SUFFIX}`
const PASSWORD = 'H5-Del-Gate-Test-8w1!'

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
    user_metadata: { full_name: 'H5 Delete Gate Test', date_of_birth: '1990-01-01', city: 'Tunis', language: 'fr' },
  })
  if (error || !data.user) throw new Error(`createUser failed for ${email}: ${error?.message}`)
  return data.user.id
}

async function teardown(): Promise<void> {
  const { data, error } = await admin.from('profiles').select('id').like('email', `${EMAIL_PREFIX}%${EMAIL_SUFFIX}`)
  if (error) throw new Error(`teardown lookup failed: ${error.message}`)
  const ids = (data ?? []).map((row) => row.id)
  if (ids.length === 0) return
  await admin.from('orders').delete().in('seller_id', ids)
  await admin.from('orders').delete().in('buyer_id', ids)
  for (const id of ids) await admin.auth.admin.deleteUser(id)
}

let ownerId: string
let buyerId: string
let freelancerProfileId: string
let ownerClient: SupabaseClient

beforeAll(async () => {
  if (!hasCreds) return
  await teardown()

  ownerId = await createUser(OWNER_EMAIL)
  buyerId = await createUser(BUYER_EMAIL)

  const { data: profile, error: profileErr } = await admin
    .from('freelancer_profiles')
    .insert({ profile_id: ownerId })
    .select('id')
    .single()
  if (profileErr || !profile) throw new Error(`freelancer_profiles insert failed: ${profileErr?.message}`)
  freelancerProfileId = profile.id

  ownerClient = await signIn(OWNER_EMAIL)
}, 60000)

afterAll(async () => {
  if (!hasCreds) return
  await teardown()
}, 60000)

describe.skipIf(!hasCreds)('a service_listings row with an existing order cannot be deleted', () => {
  it('the owner\'s own DELETE is rejected (42501), not silently cascaded', async () => {
    const { data: listing, error: listingErr } = await admin
      .from('service_listings')
      .insert({ freelancer_profile_id: freelancerProfileId, title: 'H5 delete-gate test — WITH order', starting_price_tnd: 50 })
      .select('id')
      .single()
    if (listingErr || !listing) throw new Error(listingErr?.message)

    const { error: orderErr } = await admin.from('orders').insert({
      buyer_id: buyerId,
      seller_id: ownerId,
      order_type: 'service',
      service_listing_id: listing.id,
      // ANY status blocks the delete — pending, not just received — because the trigger fires on
      // the FK cascade touching `service_listing_id`, not on the order's own status.
      status: 'pending',
    })
    if (orderErr) throw new Error(orderErr.message)

    const { data, error } = await ownerClient.from('service_listings').delete().eq('id', listing.id).select('id')
    expect(data).toBeNull()
    expect(error).not.toBeNull()
    expect(error?.code).toBe('42501')
    expect(error?.message).toMatch(/Order identity columns cannot be modified/)

    // The row genuinely survives — not a partial/silent delete.
    const { data: stillThere } = await admin.from('service_listings').select('id').eq('id', listing.id).maybeSingle()
    expect(stillThere?.id).toBe(listing.id)
  })

  it('a zero-order service_listings row deletes cleanly through the same owner session', async () => {
    const { data: listing, error: listingErr } = await admin
      .from('service_listings')
      .insert({ freelancer_profile_id: freelancerProfileId, title: 'H5 delete-gate test — no orders', starting_price_tnd: 50 })
      .select('id')
      .single()
    if (listingErr || !listing) throw new Error(listingErr?.message)

    const { data, error } = await ownerClient.from('service_listings').delete().eq('id', listing.id).select('id')
    expect(error).toBeNull()
    expect(data?.[0]?.id).toBe(listing.id)
  })
})
