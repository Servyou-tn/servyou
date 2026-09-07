/**
 * Live-DB proof for H5's "Commandes ce mois" stat (founder ruling 7): the query shape
 * getServiceStats (seller-services-query.ts) uses — seller_id + order_type='service' +
 * status<>'cancelled', bounded by Africa/Tunis calendar-month boundaries — against REAL backdated
 * order rows, not inferred from the arithmetic alone. Covers the specific case the founder named:
 * a negative delta (more orders last month than this month), plus the zero-orders case (every stat
 * reads 0, delta is 0/flat, not an error).
 *
 * The boundary arithmetic itself (Tunis month starts, year rollover) is unit-tested in
 * seller-services-query.test.ts with no DB involved; this file proves the QUERY against real rows
 * using those same (already-verified) boundaries for "now" at run time.
 *
 * Pattern A (live-DB). Service role only, no signed-in session needed — these are plain SELECT
 * counts and orders' SELECT RLS is buyer/seller-scoped, so this uses the fixture's own service-role
 * client for both the writes and the read, mirroring order-delivery-fee-snapshot.test.ts's shape.
 *
 * Run: npx vitest run src/__tests__/h5-service-monthly-stats.test.ts
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { monthBoundaries } from '@/lib/marche/seller-services-query'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const hasCreds = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)

const admin: SupabaseClient = hasCreds
  ? createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })
  : (undefined as unknown as SupabaseClient)

const EMAIL_SUFFIX = '@rls-smoke.servyou.invalid'
const EMAIL_PREFIX = 'h5-stats-'

async function createUser(email: string): Promise<string> {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: 'H5-Stats-Test-2p8!',
    email_confirm: true,
    user_metadata: { full_name: 'H5 Stats Test', date_of_birth: '1990-01-01', city: 'Tunis', language: 'fr' },
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
  for (const id of ids) await admin.auth.admin.deleteUser(id)
}

// The exact query shape getServiceStats uses, restated here rather than imported — that function
// is server-only (createClient() needs next/headers) and can't run in a plain vitest process; this
// proves the shape empirically instead.
async function countServiceOrders(
  sellerId: string,
  opts: { status?: string; excludeCancelled?: boolean; from?: Date; to?: Date },
): Promise<number> {
  let q = admin.from('orders').select('id', { count: 'exact', head: true }).eq('seller_id', sellerId).eq('order_type', 'service')
  if (opts.status) q = q.eq('status', opts.status)
  if (opts.excludeCancelled) q = q.neq('status', 'cancelled')
  if (opts.from) q = q.gte('created_at', opts.from.toISOString())
  if (opts.to) q = q.lt('created_at', opts.to.toISOString())
  const { count, error } = await q
  if (error) throw new Error(`count query failed: ${error.message}`)
  return count ?? 0
}

let sellerA: string // gets a negative month-over-month delta
let sellerB: string // has zero orders at all
let freelancerProfileIdA: string
let listingA: string

beforeAll(async () => {
  if (!hasCreds) return
  await teardown()

  sellerA = await createUser(`${EMAIL_PREFIX}seller-a${EMAIL_SUFFIX}`)
  sellerB = await createUser(`${EMAIL_PREFIX}seller-b${EMAIL_SUFFIX}`)
  const buyer = await createUser(`${EMAIL_PREFIX}buyer${EMAIL_SUFFIX}`)

  const { data: profile, error: profileErr } = await admin
    .from('freelancer_profiles')
    .insert({ profile_id: sellerA })
    .select('id')
    .single()
  if (profileErr || !profile) throw new Error(`freelancer_profiles insert failed: ${profileErr?.message}`)
  freelancerProfileIdA = profile.id

  const { data: listing, error: listingErr } = await admin
    .from('service_listings')
    .insert({ freelancer_profile_id: freelancerProfileIdA, title: 'H5 stats test service', starting_price_tnd: 60 })
    .select('id')
    .single()
  if (listingErr || !listing) throw new Error(`service_listings insert failed: ${listingErr?.message}`)
  listingA = listing.id

  // Two orders LAST month, none this month — a negative delta (0 - 2 = -2). Backdated created_at
  // is accepted on insert: orders has no BEFORE INSERT trigger that overwrites it (verified against
  // the live trigger list before writing this fixture).
  const { lastMonthStart, thisMonthStart } = monthBoundaries(new Date())
  const lastMonthInstant = new Date(lastMonthStart.getTime() + 24 * 60 * 60 * 1000) // 1 day into last month
  void thisMonthStart

  const { error: ordersErr } = await admin.from('orders').insert([
    { buyer_id: buyer, seller_id: sellerA, order_type: 'service', service_listing_id: listingA, status: 'received', created_at: lastMonthInstant.toISOString() },
    { buyer_id: buyer, seller_id: sellerA, order_type: 'service', service_listing_id: listingA, status: 'received', created_at: lastMonthInstant.toISOString() },
    // A cancelled order LAST month too — must be excluded from both the "received" all-time count
    // and the month counts (ruling 7: "Commandes reçues counts non-cancelled service orders").
    { buyer_id: buyer, seller_id: sellerA, order_type: 'service', service_listing_id: listingA, status: 'cancelled', created_at: lastMonthInstant.toISOString() },
  ])
  if (ordersErr) throw new Error(`orders insert failed: ${ordersErr.message}`)
}, 60000)

afterAll(async () => {
  if (!hasCreds) return
  await teardown()
}, 60000)

describe.skipIf(!hasCreds)('"Commandes ce mois" — a real negative delta, not just the formula', () => {
  it('this month is 0, last month is 2 (cancelled excluded) — delta is -2', async () => {
    const { lastMonthStart, thisMonthStart, nextMonthStart } = monthBoundaries(new Date())

    const thisMonth = await countServiceOrders(sellerA, { excludeCancelled: true, from: thisMonthStart, to: nextMonthStart })
    const lastMonth = await countServiceOrders(sellerA, { excludeCancelled: true, from: lastMonthStart, to: thisMonthStart })

    expect(thisMonth).toBe(0)
    expect(lastMonth).toBe(2)
    expect(thisMonth - lastMonth).toBe(-2)
  })

  it('"Commandes reçues" (all-time, non-cancelled) is 2 — the cancelled row is excluded', async () => {
    const receivedAllTime = await countServiceOrders(sellerA, { excludeCancelled: true })
    expect(receivedAllTime).toBe(2)
  })

  it('a raw ALL-status count would wrongly include the cancelled row — proving the filter is load-bearing', async () => {
    const withoutFilter = await countServiceOrders(sellerA, {})
    expect(withoutFilter).toBe(3)
  })
})

describe.skipIf(!hasCreds)('a freelancer with zero orders — every stat is 0, not an error', () => {
  it('pending / received / this-month all read 0, delta is 0 (flat)', async () => {
    const { thisMonthStart, nextMonthStart } = monthBoundaries(new Date())
    const pending = await countServiceOrders(sellerB, { status: 'pending' })
    const received = await countServiceOrders(sellerB, { excludeCancelled: true })
    const thisMonth = await countServiceOrders(sellerB, { excludeCancelled: true, from: thisMonthStart, to: nextMonthStart })

    expect(pending).toBe(0)
    expect(received).toBe(0)
    expect(thisMonth).toBe(0)
    expect(thisMonth - 0).toBe(0)
  })
})
