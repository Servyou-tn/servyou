/**
 * Live proof for db/migrations/20261103190052_seller_phone_and_product_checks.sql (journey walk 2026-11-02 #17, #31):
 *   * enforce_seller_contact_phone — a phone-less seller's OWN client cannot make a service become 'active'
 *     (draft → active, hidden → active) nor INSERT a shop: 23514, hint seller_phone_required. Pausing, editing an
 *     active row and inserting a draft never need a phone. With a phone, both pass. An admin's client and the service
 *     role skip the rule (moderation's un-hide). A consumer still hears « Seul un compte boutique… » first.
 *   * products_price_positive / products_title_not_blank — price 0 / a blank title are refused (23514 naming the
 *     constraint) for the owner, on INSERT and UPDATE, and for the service role too.
 *
 * Fixtures (`phone-gate-`, passwords random per run), all written by the service role: a freelancer without a phone
 * (3 complete listings: draft / hidden / active), a second phone-less freelancer (1 hidden listing, never signed in),
 * a shop owner without a phone or a shop, a consumer, an admin. Deleting the users cascades everything.
 * 4 fixture sign-ins (the live sign-in budget).
 *
 * Run: npx vitest run --config vitest.integration.config.ts --no-file-parallelism src/__tests__/seller-phone-gate-live.test.ts
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'
import { refuseTeardownOnForeignOrders } from './live-teardown-guard'
import { fixtureSignIn } from './fixture-session'
import { revokeTestAdmins, assertNoTestAdmin } from './fixture-admin'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const hasCreds = Boolean(url && serviceKey && anonKey)

const PREFIX = 'phone-gate-'
const EMAIL_SUFFIX = '@rls-smoke.servyou.invalid'
const RUN = randomUUID().slice(0, 8)
const email = (local: string) => `${PREFIX}${local}${EMAIL_SUFFIX}`
const PHONE_HINT = 'seller_phone_required'

const opts = { auth: { autoRefreshToken: false, persistSession: false } }
const admin: SupabaseClient = hasCreds ? createClient(url, serviceKey, opts) : (undefined as unknown as SupabaseClient)

const ids = { freelancer: '', freelancer2: '', shopOwner: '', consumer: '', admin: '' }
const listing = { draft: '', hidden: '', active: '', other: '' }
let productCategoryId = ''
// Signed in on first use, so a filtered run (-t) spends only the sign-ins it needs.
const clients = new Map<string, Promise<SupabaseClient>>()
const client = (local: string) => {
  if (!clients.has(local)) clients.set(local, signIn(local))
  return clients.get(local)!
}

async function teardown(): Promise<void> {
  const { data, error } = await admin.from('profiles').select('id').like('email', `${PREFIX}%${EMAIL_SUFFIX}`)
  if (error) throw new Error(`teardown lookup failed: ${error.message}`)
  const found = (data ?? []).map((row) => row.id as string)
  if (found.length === 0) return
  await revokeTestAdmins(found) // audit H6: admin rights go first, before anything that can throw
  await refuseTeardownOnForeignOrders(admin as never, found, PREFIX)
  // admin_unhide_content logs to admin_audit_log, whose admin_id is ON DELETE RESTRICT — clear our admin's rows first.
  const { error: auditErr } = await admin.from('admin_audit_log').delete().in('admin_id', found)
  if (auditErr) throw new Error(`admin_audit_log cleanup failed: ${auditErr.message}`)
  for (const id of found) {
    const { error: delErr } = await admin.auth.admin.deleteUser(id)
    if (delErr) throw new Error(`deleteUser failed for ${id}: ${delErr.message}`)
  }
}

async function createUser(local: string, patch: Record<string, unknown> = {}): Promise<string> {
  const { data, error } = await admin.auth.admin.createUser({
    email: email(local),
    password: `Pg-${randomUUID()}-Aa1!`,
    email_confirm: true,
    user_metadata: { full_name: `Phone Gate ${local}`, date_of_birth: '1990-01-01', city: 'Tunis', language: 'fr' },
  })
  if (error || !data.user) throw new Error(`createUser failed for ${local}: ${error?.message}`)
  if (Object.keys(patch).length > 0) {
    const { error: pErr } = await admin.from('profiles').update(patch).eq('id', data.user.id)
    if (pErr) throw new Error(`profile seed failed for ${local}: ${pErr.message}`)
  }
  return data.user.id
}

async function signIn(local: string): Promise<SupabaseClient> {
  const client = createClient(url, anonKey, opts)
  const { error } = await fixtureSignIn(client, email(local))
  if (error) throw new Error(`signIn failed for ${local}: ${error.message}`)
  return client
}

async function setPhone(id: string, phone: string | null): Promise<void> {
  const { error } = await admin.from('profiles').update({ phone }).eq('id', id)
  if (error) throw new Error(`phone update failed: ${error.message}`)
}

// A listing that passes every G4 publish rule (trg_service_publish_requirements), so only the phone can refuse it.
function completeListing(fpId: string, sectorId: string, subId: string, status: string, n: number) {
  return {
    freelancer_profile_id: fpId,
    status,
    title: `Phone gate service ${RUN} #${n}`,
    category_id: sectorId,
    subcategory_id: subId,
    tags: ['testing'],
    short_description: 'Un service de test pour le contrôle du téléphone',
    description: 'd'.repeat(120),
    starting_price_tnd: 100,
    price_unit: 'month',
    deliverables: ['Livrable un', 'Livrable deux', 'Livrable trois'],
    delivery_mode: 'remote',
  }
}

const expectPhoneRefusal = (error: { code?: string; hint?: string } | null) => {
  expect(error?.code).toBe('23514')
  expect(error?.hint).toBe(PHONE_HINT)
}

beforeAll(async () => {
  if (!hasCreds) return
  await teardown()

  const { data: sub, error: subErr } = await admin
    .from('categories').select('id, parent_id').eq('kind', 'service').not('parent_id', 'is', null).limit(1).single()
  if (subErr || !sub) throw new Error(`service subcategory lookup failed: ${subErr?.message}`)
  const { data: prodCat, error: pcErr } = await admin
    .from('categories').select('id').eq('kind', 'product').is('parent_id', null).limit(1).single()
  if (pcErr || !prodCat) throw new Error(`product category lookup failed: ${pcErr?.message}`)
  productCategoryId = prodCat.id as string

  ids.freelancer = await createUser('freelancer', { seller_type: 'freelancer' })
  ids.freelancer2 = await createUser('freelancer2', { seller_type: 'freelancer' })
  ids.shopOwner = await createUser('shopowner', { seller_type: 'shop_owner' })
  ids.consumer = await createUser('consumer')
  ids.admin = await createUser('admin', { is_admin: true })

  const fps: string[] = []
  for (const owner of [ids.freelancer, ids.freelancer2]) {
    const { data: fp, error } = await admin.from('freelancer_profiles').insert({ profile_id: owner }).select('id').single()
    if (error || !fp) throw new Error(`freelancer_profiles seed failed: ${error?.message}`)
    fps.push(fp.id as string)
  }
  const rows = [
    completeListing(fps[0], sub.parent_id as string, sub.id as string, 'draft', 1),
    completeListing(fps[0], sub.parent_id as string, sub.id as string, 'hidden', 2),
    completeListing(fps[0], sub.parent_id as string, sub.id as string, 'active', 3),
    completeListing(fps[1], sub.parent_id as string, sub.id as string, 'hidden', 4),
  ]
  const { data: inserted, error: lErr } = await admin.from('service_listings').insert(rows).select('id, title')
  if (lErr || !inserted) throw new Error(`listings seed failed: ${lErr?.message}`)
  const byN = (n: number) => inserted.find((r) => (r.title as string).endsWith(`#${n}`))!.id as string
  listing.draft = byN(1)
  listing.hidden = byN(2)
  listing.active = byN(3)
  listing.other = byN(4)

}, 180000)

afterAll(async () => {
  if (!hasCreds) return
  await teardown()
  const { count, error } = await admin.from('profiles').select('id', { count: 'exact', head: true }).like('email', `${PREFIX}%${EMAIL_SUFFIX}`)
  if (error) throw new Error(`cleanup check failed: ${error.message}`)
  if ((count ?? 0) !== 0) throw new Error(`teardown left ${count} ${PREFIX} profiles`)
  await assertNoTestAdmin() // audit H6: no test-domain account may still be an admin
}, 120000)

const status = (client: SupabaseClient, id: string, next: string) =>
  client.from('service_listings').update({ status: next }).eq('id', id).select('id')

describe.skipIf(!hasCreds)('service_listings — a phone-less freelancer (own client)', () => {
  it('draft → active is refused (23514, seller_phone_required)', async () => {
    expectPhoneRefusal((await status(await client('freelancer'), listing.draft, 'active')).error)
  })

  it('hidden → active (« Activer ») is refused', async () => {
    expectPhoneRefusal((await status(await client('freelancer'), listing.hidden, 'active')).error)
  })

  it('editing an ACTIVE row (title) is fine — the rule fires only on becoming active', async () => {
    const { data, error } = await (await client('freelancer'))
      .from('service_listings').update({ title: `Phone gate service ${RUN} #3 edited` }).eq('id', listing.active).select('id')
    expect(error).toBeNull()
    expect(data).toHaveLength(1)
  })

  it('inserting a draft is fine', async () => {
    const { error } = await (await client('freelancer'))
      .from('service_listings')
      .insert({ freelancer_profile_id: (await fpId(ids.freelancer)), title: `Phone gate draft ${RUN}`, status: 'draft' })
    expect(error).toBeNull()
  })

  it('active → hidden (pause) is fine', async () => {
    const { data, error } = await status(await client('freelancer'), listing.active, 'hidden')
    expect(error).toBeNull()
    expect(data).toHaveLength(1)
  })
})

describe.skipIf(!hasCreds)('service_listings — the same freelancer once a phone is set', () => {
  it('draft → active and hidden → active both pass', async () => {
    await setPhone(ids.freelancer, '+21620000000')
    const publish = await status(await client('freelancer'), listing.draft, 'active')
    expect(publish.error).toBeNull()
    expect(publish.data).toHaveLength(1)
    const reactivate = await status(await client('freelancer'), listing.hidden, 'active')
    expect(reactivate.error).toBeNull()
    expect(reactivate.data).toHaveLength(1)
  })
})

describe.skipIf(!hasCreds)('service_listings — who skips the rule', () => {
  it('an admin hides then un-hides a phone-less freelancer’s listing (admin_unhide_content → status active)', async () => {
    // Only an admin may set the moderation marker (enforce_admin_moderation_lock binds the service role too).
    const adminClient = await client('admin')
    const { error: hideErr } = await adminClient.rpc('admin_hide_content', {
      target_type: 'service', target_id: listing.other, reason: 'phone gate test',
    })
    expect(hideErr?.message ?? null).toBeNull()
    const { error } = await adminClient.rpc('admin_unhide_content', { target_type: 'service', target_id: listing.other })
    expect(error?.message ?? null).toBeNull()
    const { data } = await admin.from('service_listings').select('status, admin_hidden_at').eq('id', listing.other).single()
    expect(data).toEqual({ status: 'active', admin_hidden_at: null })
  })

  it('the service role sets it back to active after a pause, phone-less', async () => {
    await admin.from('service_listings').update({ status: 'hidden' }).eq('id', listing.other)
    const { error } = await admin.from('service_listings').update({ status: 'active' }).eq('id', listing.other)
    expect(error).toBeNull()
  })
})

describe.skipIf(!hasCreds)('shops — INSERT needs the owner’s phone', () => {
  it('a phone-less shop owner’s own client is refused (23514, seller_phone_required)', async () => {
    const { error } = await (await client('shopowner'))
      .from('shops').insert({ owner_id: ids.shopOwner, name: `Phone gate shop ${RUN}`, city: 'Tunis', description: 'Boutique de test.' })
    expectPhoneRefusal(error)
  })

  it('a consumer still hears the capability rule first', async () => {
    const { error } = await (await client('consumer'))
      .from('shops').insert({ owner_id: ids.consumer, name: `Phone gate consumer ${RUN}`, city: 'Tunis', description: 'Boutique de test.' })
    expect(error?.code).toBe('42501')
    expect(error?.hint).not.toBe(PHONE_HINT)
  })

  it('with a phone, the same insert passes', async () => {
    await setPhone(ids.shopOwner, '+21620000001')
    const { data, error } = await (await client('shopowner'))
      .from('shops').insert({ owner_id: ids.shopOwner, name: `Phone gate shop ${RUN}`, city: 'Tunis', description: 'Boutique de test.' })
      .select('id').single()
    expect(error).toBeNull()
    expect(data?.id).toBeTruthy()
  })
})

describe.skipIf(!hasCreds)('products — price > 0 and a title (products_price_positive / products_title_not_blank)', () => {
  const shopIdOf = async () => {
    const { data, error } = await admin.from('shops').select('id').eq('owner_id', ids.shopOwner).single()
    if (error || !data) throw new Error(`shop lookup failed: ${error?.message}`)
    return data.id as string
  }
  const row = (shopId: string, over: Record<string, unknown>) => ({
    shop_id: shopId, category_id: productCategoryId, title: `Phone gate product ${RUN}`, price_tnd: 10,
    delivery_fee_tnd: 7, status: 'hidden', tracks_stock: false, ...over,
  })

  it.each([
    ['price 0', { price_tnd: 0 }, 'products_price_positive'],
    ['a blank title', { title: '   ' }, 'products_title_not_blank'],
  ])('the owner cannot INSERT %s', async (_label, over, constraint) => {
    const { error } = await (await client('shopowner')).from('products').insert(row(await shopIdOf(), over))
    expect(error?.code).toBe('23514')
    expect(error?.message).toContain(constraint)
  })

  it('the owner cannot UPDATE a valid product to price 0, and the service role is bound too', async () => {
    const shopId = await shopIdOf()
    const { data: p, error } = await (await client('shopowner')).from('products').insert(row(shopId, {})).select('id').single()
    expect(error).toBeNull()
    const upd = await (await client('shopowner')).from('products').update({ price_tnd: 0 }).eq('id', p!.id)
    expect(upd.error?.code).toBe('23514')
    expect(upd.error?.message).toContain('products_price_positive')
    const svc = await admin.from('products').update({ title: '' }).eq('id', p!.id)
    expect(svc.error?.code).toBe('23514')
    expect(svc.error?.message).toContain('products_title_not_blank')
  })
})

async function fpId(profileId: string): Promise<string> {
  const { data, error } = await admin.from('freelancer_profiles').select('id').eq('profile_id', profileId).single()
  if (error || !data) throw new Error(`freelancer profile lookup failed: ${error?.message}`)
  return data.id as string
}
