/**
 * Phone reveal rule (db/migrations/PENDING_phone_reveal_rule.sql), as the SELLER — signed in once:
 *   * seller → buyer: visible from « pending » on (the WhatsApp confirmation before accepting); hidden after a
 *     cancellation while pending (and for a pre-events cancelled order); kept after a cancellation that followed an
 *     acceptance;
 *   * no order at all → NULL; either party suspended → NULL (ruling 6, unchanged).
 * Fixtures: phone-reveal-fixtures.ts (`ph-sel-`). 1 fixture sign-in.
 *
 * ⚠ Red until that migration is applied.
 *
 * Run: npx vitest run --config vitest.integration.config.ts src/__tests__/phone-reveal-seller-live.test.ts
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { fixtureSignIn } from './fixture-session'
import { admin, anonKey, clearOrders, email, hasCreds, opts, PHONES, remaining, SCENARIOS, setup, stage, teardown, url, type Fixture } from './phone-reveal-fixtures'

const PREFIX = 'ph-sel-'
let fx: Fixture
let seller: SupabaseClient

const phoneOf = async (target: string) => {
  const { data, error } = await seller.rpc('get_contact_phone', { target })
  expect(error).toBeNull()
  return data as string | null
}

beforeAll(async () => {
  if (!hasCreds) return
  fx = await setup(PREFIX)
  seller = createClient(url, anonKey, opts)
  const { error } = await fixtureSignIn(seller, email(PREFIX, 'seller'))
  if (error) throw new Error(`signIn failed: ${error.message}`)
}, 120000)

afterAll(async () => {
  if (!hasCreds) return
  await teardown(PREFIX)
  expect(await remaining(PREFIX)).toBe(0)
}, 120000)

// Seller → buyer, per scenario: visible from pending on, except a cancellation before acceptance.
const SELLER_SEES_BUYER: Record<string, boolean> = {
  pending: true,
  accepted: true,
  prepared: true,
  dispatched: true,
  in_delivery: true,
  arrived: true,
  received: true,
  'cancelled while pending': false,
  'cancelled after acceptance': true,
  'cancelled after dispatch': true,
  'cancelled, pre-events order (no history)': false,
}

describe.skipIf(!hasCreds)("seller → buyer's phone", () => {
  it.each(SCENARIOS.map((s) => [s.label, s] as const))('%s', async (_label, sc) => {
    await stage(fx, sc)
    expect(await phoneOf(fx.buyerId)).toBe(SELLER_SEES_BUYER[sc.label] ? PHONES.buyer : null)
  })

  it('no order between them → NULL', async () => {
    await clearOrders(fx)
    expect(await phoneOf(fx.buyerId)).toBeNull()
  })

  it('a suspended buyer → NULL, even on an accepted order (ruling 6, unchanged)', async () => {
    await stage(fx, SCENARIOS.find((s) => s.status === 'accepted')!)
    const { error } = await admin.from('profiles').update({ suspended_at: new Date().toISOString(), suspended_reason: 'test' }).eq('id', fx.buyerId)
    expect(error).toBeNull()
    expect(await phoneOf(fx.buyerId)).toBeNull()
  })
})
