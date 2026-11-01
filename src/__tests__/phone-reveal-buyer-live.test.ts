/**
 * Phone reveal rule (db/migrations/PENDING_phone_reveal_rule.sql), as the BUYER / mission owner — signed in once:
 *   * buyer → seller: hidden while pending; visible from « accepted » on; kept after a cancellation that followed an
 *     acceptance; hidden after a cancellation while pending (and for a pre-events cancelled order, no history);
 *   * mission owner → a freelancer who sent a proposal: visible;
 *   * own phone: visible; anonymous caller: NULL.
 * Fixtures: phone-reveal-fixtures.ts (`ph-buy-`). 1 fixture sign-in.
 *
 * ⚠ Red until that migration is applied.
 *
 * Run: npx vitest run --config vitest.integration.config.ts src/__tests__/phone-reveal-buyer-live.test.ts
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { fixtureSignIn } from './fixture-session'
import { anonKey, email, hasCreds, opts, PHONES, remaining, SCENARIOS, setup, stage, teardown, url, type Fixture } from './phone-reveal-fixtures'

const PREFIX = 'ph-buy-'
let fx: Fixture
let buyer: SupabaseClient

const phoneOf = async (client: SupabaseClient, target: string) => {
  const { data, error } = await client.rpc('get_contact_phone', { target })
  expect(error).toBeNull()
  return data as string | null
}

beforeAll(async () => {
  if (!hasCreds) return
  fx = await setup(PREFIX)
  buyer = createClient(url, anonKey, opts)
  const { error } = await fixtureSignIn(buyer, email(PREFIX, 'buyer'))
  if (error) throw new Error(`signIn failed: ${error.message}`)
}, 120000)

afterAll(async () => {
  if (!hasCreds) return
  await teardown(PREFIX)
  expect(await remaining(PREFIX)).toBe(0)
}, 120000)

// Buyer → seller, per scenario: visible once the seller has accepted.
const BUYER_SEES_SELLER: Record<string, boolean> = {
  pending: false,
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

describe.skipIf(!hasCreds)("buyer → seller's phone", () => {
  it.each(SCENARIOS.map((s) => [s.label, s] as const))('%s', async (_label, sc) => {
    await stage(fx, sc)
    expect(await phoneOf(buyer, fx.sellerId)).toBe(BUYER_SEES_SELLER[sc.label] ? PHONES.seller : null)
  })
})

describe.skipIf(!hasCreds)('missions, self, anonymous', () => {
  it("the mission owner sees the phone of a freelancer who sent a proposal", async () => {
    expect(await phoneOf(buyer, fx.freelancerId)).toBe(PHONES.freelancer)
  })

  it('own phone is visible', async () => {
    expect(await phoneOf(buyer, fx.buyerId)).toBe(PHONES.buyer)
  })

  it('an anonymous caller gets NULL', async () => {
    expect(await phoneOf(createClient(url, anonKey, opts), fx.sellerId)).toBeNull()
  })
})
