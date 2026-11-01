/**
 * Phone reveal rule (db/migrations/PENDING_phone_reveal_rule.sql), as the FREELANCER — signed in once:
 *   * freelancer → mission owner: NEVER through the mission path (the client WhatsApps the freelancer they choose);
 *   * the seller of an unrelated order is not reachable either.
 * Fixtures: phone-reveal-fixtures.ts (`ph-mis-`). 1 fixture sign-in.
 *
 * ⚠ Red until that migration is applied: today a proposal unlocks the client's phone.
 *
 * Run: npx vitest run --config vitest.integration.config.ts src/__tests__/phone-reveal-mission-live.test.ts
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { fixtureSignIn } from './fixture-session'
import { anonKey, email, hasCreds, opts, PHONES, remaining, setup, teardown, url, type Fixture } from './phone-reveal-fixtures'

const PREFIX = 'ph-mis-'
let fx: Fixture
let freelancer: SupabaseClient

const phoneOf = async (target: string) => {
  const { data, error } = await freelancer.rpc('get_contact_phone', { target })
  expect(error).toBeNull()
  return data as string | null
}

beforeAll(async () => {
  if (!hasCreds) return
  fx = await setup(PREFIX)
  freelancer = createClient(url, anonKey, opts)
  const { error } = await fixtureSignIn(freelancer, email(PREFIX, 'freelancer'))
  if (error) throw new Error(`signIn failed: ${error.message}`)
}, 120000)

afterAll(async () => {
  if (!hasCreds) return
  await teardown(PREFIX)
  expect(await remaining(PREFIX)).toBe(0)
}, 120000)

describe.skipIf(!hasCreds)("freelancer → client's phone", () => {
  it('a sent proposal does NOT reveal the mission owner’s phone', async () => {
    expect(await phoneOf(fx.buyerId)).toBeNull()
  })

  it('an unrelated seller is not reachable', async () => {
    expect(await phoneOf(fx.sellerId)).toBeNull()
  })

  it('own phone is visible', async () => {
    expect(await phoneOf(fx.freelancerId)).toBe(PHONES.freelancer)
  })
})
