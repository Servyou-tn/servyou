/**
 * Live-DB proof for db/migrations/20261028221948_notification_preferences.sql and
 * 20261028221956_favorites_shops_freelancers.sql (founder brief 2026-10-28; Figma 558:38878 Paramètres ›
 * Notifications, 720:62084 / 720:62688 Mes favoris Boutiques / Freelances; architect rulings 1–4 of 2026-10-28).
 * Written while both were PENDING: 13 red / 1 green before apply (no table; favorites accepted only products /
 * services, whatever the target's visibility, on insert and on read), all green after.
 *
 *   notification_preferences — owner-only select / insert / update through the app's upsert, Figma defaults on
 *                              the first save (email_low_stock OFF, ruling 1), no delete, updated_at never
 *                              client-written, nothing for anon.
 *   favorites                — 'shop' / 'freelancer' rows with their FK, one per user per target, the type-match
 *                              CHECK, an invisible target cannot be favorited (insert WITH CHECK, ruling 4), a
 *                              moderated / suspended target drops out of the owner's reads (all four types,
 *                              ruling 2) and comes back, and the FK cascade.
 *
 * Fixtures (all `np-fav-`, password random per run: the repo is public and this suite promotes an admin in
 * production): two consumers, a shop owner with a live product, a freelancer with an active service, an admin.
 * The fixture product and service are public (orderable) while this runs, hence the teardown guard.
 *
 * Run: npx vitest run --config vitest.integration.config.ts src/__tests__/notification-prefs-favorites.test.ts
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'
import type { Database } from '@/lib/supabase/database.types'
import { refuseTeardownOnForeignOrders } from './live-teardown-guard'
import { fixtureSignIn } from './fixture-session'

type Client = SupabaseClient<Database>

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const hasCreds = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.SUPABASE_SERVICE_ROLE_KEY &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
)

const PREFIX = 'np-fav-'
const EMAIL_SUFFIX = '@rls-smoke.servyou.invalid'
const email = (local: string) => `${PREFIX}${local}${EMAIL_SUFFIX}`
const RUN = randomUUID().slice(0, 8)
const PASSWORD = `Nf-${randomUUID()}-Aa1!`
const TITLE = `NP fav ${RUN}`
const DENIED = '42501'

const opts = { auth: { autoRefreshToken: false, persistSession: false } }
const admin: Client = hasCreds ? createClient<Database>(url, serviceKey, opts) : (undefined as unknown as Client)
const anon: Client = hasCreds ? createClient<Database>(url, anonKey, opts) : (undefined as unknown as Client)

async function createUser(local: string): Promise<string> {
  const { data, error } = await admin.auth.admin.createUser({
    email: email(local),
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: 'NP Fav Test', date_of_birth: '1990-01-01', city: 'Tunis', language: 'fr' },
  })
  if (error || !data.user) throw new Error(`createUser failed for ${local}: ${error?.message}`)
  return data.user.id
}

async function signIn(local: string): Promise<Client> {
  const client = createClient<Database>(url, anonKey, opts)
  const { error } = await fixtureSignIn(client, email(local))
  if (error) throw new Error(`signIn failed for ${local}: ${error.message}`)
  return client
}

async function updateProfile(id: string, patch: Database['public']['Tables']['profiles']['Update']): Promise<void> {
  const { error } = await admin.from('profiles').update(patch).eq('id', id)
  if (error) throw new Error(`profiles seed failed: ${error.message}`)
}

// Idempotent and surgical to this file's prefix; runs first and last. Orders first (none expected; the guard
// refuses if a real customer ordered a fixture item), then admin_audit_log (admin_id is ON DELETE RESTRICT),
// then users -- cascading profiles -> favorites / notification_preferences / shops / freelancer_profiles.
async function teardown(): Promise<void> {
  const { data, error } = await admin.from('profiles').select('id').like('email', `${PREFIX}%${EMAIL_SUFFIX}`)
  if (error) throw new Error(`teardown lookup failed: ${error.message}`)
  const ids = (data ?? []).map((row) => row.id)
  if (ids.length === 0) return
  await refuseTeardownOnForeignOrders(admin, ids, PREFIX)
  for (const column of ['buyer_id', 'seller_id'] as const) {
    const { error: orderErr } = await admin.from('orders').delete().in(column, ids)
    if (orderErr) throw new Error(`orders cleanup (${column}) failed: ${orderErr.message}`)
  }
  const { error: auditErr } = await admin.from('admin_audit_log').delete().in('admin_id', ids)
  if (auditErr) throw new Error(`admin_audit_log cleanup failed: ${auditErr.message}`)
  for (const id of ids) {
    const { error: delErr } = await admin.auth.admin.deleteUser(id)
    if (delErr) throw new Error(`deleteUser failed for ${id}: ${delErr.message}`)
  }
}

let userAId: string
let userBId: string
let sellerId: string
let freelancerId: string
let adminId: string
let shopId: string
let productId: string
let freelancerProfileId: string
let serviceId: string

let userA: Client
let userB: Client
let adminClient: Client

beforeAll(async () => {
  if (!hasCreds) return
  await teardown()

  userAId = await createUser('user-a')
  userBId = await createUser('user-b')
  sellerId = await createUser('seller')
  freelancerId = await createUser('freelancer')
  adminId = await createUser('admin')

  await updateProfile(sellerId, { seller_type: 'shop_owner' })
  await updateProfile(freelancerId, { seller_type: 'freelancer' })
  await updateProfile(adminId, { is_admin: true })

  const { data: shop, error: shopErr } = await admin.from('shops').insert({ owner_id: sellerId, name: `${TITLE} — shop` }).select('id').single()
  if (shopErr || !shop) throw new Error(`shop insert failed: ${shopErr?.message}`)
  shopId = shop.id
  const { data: product, error: productErr } = await admin
    .from('products')
    .insert({ shop_id: shopId, title: `${TITLE} — product`, price_tnd: 20, status: 'active' })
    .select('id')
    .single()
  if (productErr || !product) throw new Error(`product insert failed: ${productErr?.message}`)
  productId = product.id

  const { data: fp, error: fpErr } = await admin.from('freelancer_profiles').insert({ profile_id: freelancerId }).select('id').single()
  if (fpErr || !fp) throw new Error(`freelancer profile insert failed: ${fpErr?.message}`)
  freelancerProfileId = fp.id
  // An active service publishes the profile (sync_freelancer_is_published), so it is publicly readable.
  const { data: svc, error: svcErr } = await admin
    .from('service_listings')
    .insert({ freelancer_profile_id: fp.id, title: `${TITLE} — service`, starting_price_tnd: 50, status: 'active' })
    .select('id')
    .single()
  if (svcErr || !svc) throw new Error(`service insert failed: ${svcErr?.message}`)
  serviceId = svc.id

  userA = await signIn('user-a')
  userB = await signIn('user-b')
  adminClient = await signIn('admin')
}, 180000)

afterAll(async () => {
  if (!hasCreds) return
  await teardown()
  const { count, error } = await admin.from('profiles').select('id', { count: 'exact', head: true }).like('email', `${PREFIX}%${EMAIL_SUFFIX}`)
  if (error) throw new Error(`cleanup check (profiles) failed: ${error.message}`)
  if ((count ?? 0) !== 0) throw new Error(`teardown left ${count} ${PREFIX} profiles`)
  const { count: shops, error: shopErr } = await admin.from('shops').select('id', { count: 'exact', head: true }).like('name', `${TITLE}%`)
  if (shopErr) throw new Error(`cleanup check (shops) failed: ${shopErr.message}`)
  if ((shops ?? 0) !== 0) throw new Error(`teardown left ${shops} fixture shops`)
}, 120000)

// ─── PENDING_notification_preferences ───────────────────────────────────────────────────────────────────────

describe.skipIf(!hasCreds)('notification_preferences — owner-only, defaults on first save, no delete', () => {
  it('first save (the app upsert) creates the row with the brief defaults for every flag not sent', async () => {
    const { data, error } = await userA
      .from('notification_preferences')
      .upsert({ profile_id: userAId, email_newsletter: true }, { onConflict: 'profile_id' })
      .select('profile_id, email_new_orders, email_proposals, email_reviews, email_low_stock, email_newsletter')
      .single()
    expect(error).toBeNull()
    expect(data).toEqual({
      profile_id: userAId,
      email_new_orders: true,
      email_proposals: true,
      email_reviews: true,
      email_low_stock: false, // OFF by default per Figma 558:38878 (architect ruling 1)
      email_newsletter: true,
    })
  })

  it('a second save goes through the upsert UPDATE path and moves updated_at', async () => {
    const { data: before } = await admin.from('notification_preferences').select('updated_at').eq('profile_id', userAId).single()
    const { data, error } = await userA
      .from('notification_preferences')
      .upsert({ profile_id: userAId, email_low_stock: true, email_newsletter: false }, { onConflict: 'profile_id' })
      .select('email_low_stock, email_newsletter, updated_at')
      .single()
    expect(error).toBeNull()
    expect(data).toMatchObject({ email_low_stock: true, email_newsletter: false })
    expect(Date.parse(data!.updated_at)).toBeGreaterThan(Date.parse(before!.updated_at))
  })

  it('another user can neither read, create, nor change the owner’s row', async () => {
    const { data: read, error: readErr } = await userB.from('notification_preferences').select('profile_id').eq('profile_id', userAId)
    expect(readErr).toBeNull()
    expect(read).toEqual([])
    const { error: insErr } = await userB.from('notification_preferences').insert({ profile_id: userAId, email_newsletter: true })
    expect(insErr?.code).toBe(DENIED)
    const { data: upd, error: updErr } = await userB.from('notification_preferences').update({ email_newsletter: true }).eq('profile_id', userAId).select('profile_id')
    expect(updErr).toBeNull()
    expect(upd).toEqual([])
    const { data: row } = await admin.from('notification_preferences').select('email_newsletter').eq('profile_id', userAId).single()
    expect(row!.email_newsletter).toBe(false)
  })

  it('no delete, no client-written updated_at, nothing for anon', async () => {
    const { error: delErr } = await userA.from('notification_preferences').delete().eq('profile_id', userAId)
    expect(delErr?.code).toBe(DENIED)
    expect(delErr?.message).toBe('permission denied for table notification_preferences')
    const { error: tsErr } = await userA.from('notification_preferences').update({ updated_at: '2000-01-01T00:00:00Z' }).eq('profile_id', userAId)
    expect(tsErr?.code).toBe(DENIED)
    const { error: anonErr } = await anon.from('notification_preferences').select('profile_id').limit(1)
    expect(anonErr?.code).toBe(DENIED)
  })

  it('a user who never saved has no row (the app reads it as all defaults)', async () => {
    const { data, error } = await userB.from('notification_preferences').select('profile_id').eq('profile_id', userBId)
    expect(error).toBeNull()
    expect(data).toEqual([])
  })
})

// ─── PENDING_favorites_shops_freelancers ────────────────────────────────────────────────────────────────────

describe.skipIf(!hasCreds)('favorites — shops and freelancers, target visibility on reads', () => {
  async function ownFavorites(): Promise<string[]> {
    const { data, error } = await userA.from('favorites').select('item_type')
    expect(error).toBeNull()
    return ((data ?? []) as { item_type: string }[]).map((r) => r.item_type).sort()
  }

  async function hide(targetType: string, targetId: string): Promise<void> {
    const { error } = await adminClient.rpc('admin_hide_content', { target_type: targetType, target_id: targetId, reason: `${TITLE} moderation` })
    if (error) throw new Error(`admin_hide_content(${targetType}) failed: ${error.message}`)
  }
  async function unhide(targetType: string, targetId: string): Promise<void> {
    const { error } = await adminClient.rpc('admin_unhide_content', { target_type: targetType, target_id: targetId })
    if (error) throw new Error(`admin_unhide_content(${targetType}) failed: ${error.message}`)
  }

  it('control (today’s types): a product and a service favorite insert and read back', async () => {
    const { error: pErr } = await userA.from('favorites').insert({ user_id: userAId, item_type: 'product', product_id: productId })
    expect(pErr).toBeNull()
    const { error: sErr } = await userA.from('favorites').insert({ user_id: userAId, item_type: 'service', service_listing_id: serviceId })
    expect(sErr).toBeNull()
    expect(await ownFavorites()).toEqual(['product', 'service'])
  })

  it('a shop and a freelancer can be favorited', async () => {
    const { error: shopErr } = await userA.from('favorites').insert({ user_id: userAId, item_type: 'shop', shop_id: shopId })
    expect(shopErr).toBeNull()
    const { error: flErr } = await userA.from('favorites').insert({ user_id: userAId, item_type: 'freelancer', freelancer_profile_id: freelancerProfileId })
    expect(flErr).toBeNull()
    expect(await ownFavorites()).toEqual(['freelancer', 'product', 'service', 'shop'])
  })

  it('one favorite per user per shop / freelancer (23505)', async () => {
    const { error: dupShop } = await userA.from('favorites').insert({ user_id: userAId, item_type: 'shop', shop_id: shopId })
    expect(dupShop?.code).toBe('23505')
    const { error: dupFl } = await userA.from('favorites').insert({ user_id: userAId, item_type: 'freelancer', freelancer_profile_id: freelancerProfileId })
    expect(dupFl?.code).toBe('23505')
  })

  it('the type must match exactly one target (favorite_target_matches_type)', async () => {
    // Each payload names a VISIBLE target of its item_type, so the insert's WITH CHECK (which runs before table
    // constraints) passes and the CHECK is what refuses the extra FK.
    const { error: shopPlusProduct } = await userB.from('favorites').insert({ user_id: userBId, item_type: 'shop', shop_id: shopId, product_id: productId })
    expect(shopPlusProduct?.code).toBe('23514')
    expect(shopPlusProduct?.message).toContain('favorite_target_matches_type')
    const { error: freelancerPlusShop } = await userB
      .from('favorites')
      .insert({ user_id: userBId, item_type: 'freelancer', freelancer_profile_id: freelancerProfileId, shop_id: shopId })
    expect(freelancerPlusShop?.code).toBe('23514')
    expect(freelancerPlusShop?.message).toContain('favorite_target_matches_type')
  })

  it('a target the caller cannot see cannot be favorited (insert WITH CHECK, ruling 4), on every type', async () => {
    async function userBFavorites(): Promise<number> {
      const { count, error } = await admin.from('favorites').select('id', { count: 'exact', head: true }).eq('user_id', userBId)
      if (error) throw new Error(`favorites read failed: ${error.message}`)
      return count ?? 0
    }
    const before = await userBFavorites()
    await hide('service', serviceId)
    try {
      const { error } = await userB.from('favorites').insert({ user_id: userBId, item_type: 'service', service_listing_id: serviceId })
      expect(error?.code).toBe(DENIED)
      expect(error?.message).toBe('new row violates row-level security policy for table "favorites"')
    } finally {
      await unhide('service', serviceId)
    }
    await hide('shop', shopId)
    try {
      const { error } = await userB.from('favorites').insert({ user_id: userBId, item_type: 'shop', shop_id: shopId })
      expect(error?.code).toBe(DENIED)
    } finally {
      await unhide('shop', shopId)
    }
    // A type pointing at no target at all is refused the same way (nothing to see).
    const { error: noTarget } = await userB.from('favorites').insert({ user_id: userBId, item_type: 'shop', freelancer_profile_id: freelancerProfileId })
    expect(noTarget?.code).toBe(DENIED)
    expect(await userBFavorites()).toBe(before)
  })

  it('a moderated shop drops out of the owner’s favorites (with its product), and comes back when unhidden', async () => {
    await hide('shop', shopId)
    try {
      expect(await ownFavorites()).toEqual(['freelancer', 'service'])
    } finally {
      await unhide('shop', shopId)
    }
    expect(await ownFavorites()).toEqual(['freelancer', 'product', 'service', 'shop'])
  })

  it('a moderated service drops out (all four types follow their target), and comes back', async () => {
    await hide('service', serviceId)
    try {
      const types = await ownFavorites()
      expect(types).not.toContain('service')
    } finally {
      await unhide('service', serviceId)
    }
    expect(await ownFavorites()).toContain('service')
  })

  it('a suspended freelancer drops out (migration 95’s visibility), and comes back when lifted', async () => {
    await updateProfile(freelancerId, { suspended_at: new Date().toISOString(), suspended_reason: `${TITLE} test` })
    try {
      const types = await ownFavorites()
      expect(types).not.toContain('freelancer')
      expect(types).not.toContain('service')
    } finally {
      await updateProfile(freelancerId, { suspended_at: null, suspended_reason: null })
    }
    expect(await ownFavorites()).toEqual(['freelancer', 'product', 'service', 'shop'])
  })

  it('deleting the shop takes its favorites with it (ON DELETE CASCADE)', async () => {
    const { error } = await admin.from('shops').delete().eq('id', shopId)
    if (error) throw new Error(`shop delete failed: ${error.message}`)
    expect(await ownFavorites()).toEqual(['freelancer', 'service'])
    const { count } = await admin.from('favorites').select('id', { count: 'exact', head: true }).eq('user_id', userAId)
    expect(count).toBe(2)
  })
})
