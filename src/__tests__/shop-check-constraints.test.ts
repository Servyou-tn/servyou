/**
 * CHECK-constraint tests for the shop configurable-workspace enums shipped by
 * PR-E / PR-F (the flouci addition). These are the data-integrity guards that
 * keep shop_type, delivery_setup, and the payment-method list to their allowed
 * value sets at the database layer — app-code validation is convenience; the
 * CHECK is the real guard.
 *
 * Pattern B (live-DB), mirroring job-limits.test.ts: the SERVICE-ROLE client
 * bypasses RLS, so a rejected INSERT here can only be the CHECK constraint
 * firing (not a row-level policy). A bad value must come back as a check
 * violation (SQLSTATE 23514) naming the constraint.
 *
 * Run: npx vitest run src/__tests__/shop-check-constraints.test.ts
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Creds injected via loadEnv/.env.local. Absent in CI / credential-less runs by design —
// describe.skipIf(!hasCreds) skips the suite and the hooks no-op instead of throwing.
const hasCreds = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)

const EMAIL_SUFFIX = '@rls-smoke.servyou.invalid'
const EMAIL_PREFIX = 'shop-chk-'
const OWNER_EMAIL = `${EMAIL_PREFIX}owner${EMAIL_SUFFIX}`
const PASSWORD = 'Rls-Config-Test-7k2!' // ephemeral test user only; never a real account

const admin: SupabaseClient = hasCreds
  ? createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })
  : (undefined as unknown as SupabaseClient)

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
let shopId: string

beforeAll(async () => {
  if (!hasCreds) return
  await teardown() // teardown-first: recover from any crashed prior run

  const { data: user, error: userErr } = await admin.auth.admin.createUser({
    email: OWNER_EMAIL,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: 'Shop Check Test', date_of_birth: '1990-01-01', city: 'Tunis', language: 'fr' },
  })
  if (userErr || !user.user) throw new Error(`createUser failed: ${userErr?.message}`)
  ownerId = user.user.id

  // A valid shop the payment-method CHECK test can attach to.
  const { data: shop, error: shopErr } = await admin
    .from('shops').insert({ owner_id: ownerId, name: 'RLS Check Shop' }).select('id').single()
  if (shopErr || !shop) throw new Error(`shop insert failed: ${shopErr?.message}`)
  shopId = shop.id
}, 60000)

afterAll(async () => {
  if (!hasCreds) return
  await teardown()
}, 60000)

describe.skipIf(!hasCreds)('shops CHECK constraints', () => {
  it('rejects an out-of-set shop_type', async () => {
    const { error } = await admin
      .from('shops').insert({ owner_id: ownerId, name: 'Bad Type Shop', shop_type: 'invalid_value' })
    expect(error).not.toBeNull()
    expect(error?.message).toContain('shops_shop_type_check')
  })

  it('rejects an out-of-set delivery_setup', async () => {
    const { error } = await admin
      .from('shops').insert({ owner_id: ownerId, name: 'Bad Delivery Shop', delivery_setup: 'invalid_value' })
    expect(error).not.toBeNull()
    expect(error?.message).toContain('shops_delivery_setup_check')
  })
})

describe.skipIf(!hasCreds)('shop_payment_methods CHECK constraint', () => {
  it('rejects an out-of-set payment method (paypal)', async () => {
    const { error } = await admin
      .from('shop_payment_methods').insert({ shop_id: shopId, method: 'paypal' })
    expect(error).not.toBeNull()
    expect(error?.message).toContain('shop_payment_methods_method_check')
  })
})
