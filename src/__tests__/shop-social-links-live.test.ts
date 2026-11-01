/**
 * Live proof for db/migrations/*_shop_social_links.sql — shops.facebook_url / instagram_url / tiktok_url:
 *   * the owner's direct REST update of a refused value is refused 23514 naming the column's CHECK; accepted values and
 *     NULL pass (UPDATE comes from the table-level grant — the migration adds none);
 *   * the service role is bound too;
 *   * anon reads the three columns (column SELECT grant — migration 96 made shops SELECT column-level);
 *   * the owner cannot INSERT a shop naming them (INSERT stays column-granted without them).
 * The patterns themselves are covered value by value in src/lib/shops/social-links.test.ts.
 *
 * Fixtures (`shop-soc-`, password random per run): one shop owner with one shop, written by the service role.
 * Deleting the user cascades the shop. 1 fixture sign-in (the live sign-in budget).
 *
 * Run: npx vitest run --config vitest.integration.config.ts src/__tests__/shop-social-links-live.test.ts
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'
import { refuseTeardownOnForeignOrders } from './live-teardown-guard'
import { fixtureSignIn } from './fixture-session'
import { SHOP_SOCIAL_COLUMNS, SHOP_SOCIAL_PLATFORMS, type ShopSocialPlatform } from '@/lib/shops/social-links'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const hasCreds = Boolean(url && serviceKey && anonKey)

const PREFIX = 'shop-soc-'
const EMAIL_SUFFIX = '@rls-smoke.servyou.invalid'
const EMAIL = `${PREFIX}owner${EMAIL_SUFFIX}`

const opts = { auth: { autoRefreshToken: false, persistSession: false } }
// Untyped until the generated types carry the new columns (regenerated after the apply).
const admin: SupabaseClient = hasCreds ? createClient(url, serviceKey, opts) : (undefined as unknown as SupabaseClient)

const GOOD: Record<ShopSocialPlatform, string[]> = {
  facebook: ['https://facebook.com/servyou', 'https://m.facebook.com/profile.php?id=1', 'HTTPS://WWW.FB.COM/x', 'https://web.facebook.com/x', 'https://fb.me/x'],
  instagram: ['https://instagram.com/servyou', 'https://www.instagram.com/servyou/', 'https://instagr.am/x'],
  tiktok: ['https://tiktok.com/@servyou', 'https://www.tiktok.com/@servyou/video/1', 'https://vm.tiktok.com/ZM1/', 'https://m.tiktok.com/@servyou'],
}
const BAD: Record<ShopSocialPlatform, string[]> = {
  facebook: ['http://facebook.com/x', 'https://facebook.com@evil.io', 'https://facebook.com.evil.io/x', 'javascript:alert(1)', ''],
  instagram: ['https://www.instagr.am/x', 'https://user@instagram.com/x', 'https://instagram.com:443/x', 'https://instagram.com/x y'],
  tiktok: ['https://vt.tiktok.com/ZM1/', 'https://tiktok.com\\@evil.io', `https://tiktok.com/${'a'.repeat(300)}`],
}

let shopId: string
let owner: SupabaseClient

async function teardown(): Promise<void> {
  const { data, error } = await admin.from('profiles').select('id').like('email', `${PREFIX}%${EMAIL_SUFFIX}`)
  if (error) throw new Error(`teardown lookup failed: ${error.message}`)
  const ids = (data ?? []).map((row) => row.id as string)
  await refuseTeardownOnForeignOrders(admin as never, ids, PREFIX)
  for (const id of ids) {
    const { error: delErr } = await admin.auth.admin.deleteUser(id)
    if (delErr) throw new Error(`deleteUser failed for ${id}: ${delErr.message}`)
  }
}

beforeAll(async () => {
  if (!hasCreds) return
  await teardown()
  const { data, error } = await admin.auth.admin.createUser({
    email: EMAIL,
    password: `Ss-${randomUUID()}-Aa1!`,
    email_confirm: true,
    user_metadata: { full_name: 'Shop Social Test', date_of_birth: '1990-01-01', city: 'Tunis', language: 'fr' },
  })
  if (error || !data.user) throw new Error(`createUser failed: ${error?.message}`)
  const ownerId = data.user.id
  const { error: sErr } = await admin.from('profiles').update({ seller_type: 'shop_owner' }).eq('id', ownerId)
  if (sErr) throw new Error(`seller upgrade failed: ${sErr.message}`)
  const { data: shop, error: shopErr } = await admin
    .from('shops').insert({ owner_id: ownerId, name: `Shop Social ${randomUUID().slice(0, 8)}` }).select('id').single()
  if (shopErr || !shop) throw new Error(`shop insert failed: ${shopErr?.message}`)
  shopId = shop.id as string

  owner = createClient(url, anonKey, opts)
  const { error: signErr } = await fixtureSignIn(owner, EMAIL)
  if (signErr) throw new Error(`signIn failed: ${signErr.message}`)
}, 120000)

afterAll(async () => {
  if (!hasCreds) return
  await teardown()
  const { count, error } = await admin.from('profiles').select('id', { count: 'exact', head: true }).like('email', `${PREFIX}%${EMAIL_SUFFIX}`)
  if (error) throw new Error(`cleanup check failed: ${error.message}`)
  if ((count ?? 0) !== 0) throw new Error(`teardown left ${count} ${PREFIX} profiles`)
}, 120000)

describe.skipIf(!hasCreds).each(SHOP_SOCIAL_PLATFORMS)('shops.%s', (platform) => {
  const column = SHOP_SOCIAL_COLUMNS[platform]
  const constraint = `shops_${column}_valid`
  const set = (client: SupabaseClient, v: string | null) => client.from('shops').update({ [column]: v }).eq('id', shopId).select('id')

  it.each(BAD[platform])('the owner cannot set %j', async (v) => {
    const { error } = await set(owner, v)
    expect(error?.code).toBe('23514')
    expect(error?.message).toContain(constraint)
  })

  it.each([...GOOD[platform], null])('the owner can set %j', async (v) => {
    const { data, error } = await set(owner, v)
    expect(error).toBeNull()
    expect(data).toHaveLength(1)
  })

  it('the service role is bound too', async () => {
    const { error } = await set(admin, BAD[platform][0])
    expect(error?.code).toBe('23514')
  })
})

describe.skipIf(!hasCreds)('grants', () => {
  it('anon reads the three columns', async () => {
    const { error: upErr } = await admin.from('shops').update({ instagram_url: 'https://instagram.com/servyou' }).eq('id', shopId)
    expect(upErr).toBeNull()
    const { data, error } = await createClient(url, anonKey, opts)
      .from('shops').select('facebook_url, instagram_url, tiktok_url').eq('id', shopId).maybeSingle()
    expect(error).toBeNull()
    expect(data?.instagram_url).toBe('https://instagram.com/servyou')
  })

  it('the owner cannot INSERT a shop naming them (no INSERT grant)', async () => {
    const { error } = await owner.from('shops').insert({ name: `Shop Social ${randomUUID().slice(0, 8)}`, facebook_url: 'https://facebook.com/x' })
    expect(error?.code).toBe('42501')
  })
})
