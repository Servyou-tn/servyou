/**
 * Live-DB proof for db/migrations/20261023153918_harden_service_listings_h6.sql (H6 PR-1 —
 * rulings G1–G3, discovery decisions D1/D2, founder + architect 2026-10-23).
 *
 * G1 — service_listings SELECT went from `using (true)` to: live rows for everyone
 *      (status='active' AND admin_hidden_at IS NULL), every own row for the owner, every row for
 *      an admin (is_admin()), and — D1 — any listing the caller has an order on, so a buyer's own
 *      order history keeps its title/price after the seller pauses the service.
 * G2 — starting_price_tnd is nullable, but only a draft may lack it
 *      (service_listings_price_required_unless_draft).
 * G3 — subcategory_id must be a kind='service' child of the row's own category_id
 *      (trg_enforce_service_subcategory_parent, on INSERT and on UPDATE OF either column); its FK
 *      is ON DELETE SET NULL; and — D2 — deleting a sector whose services carry one of its
 *      subcategories is blocked by that same trigger firing on the cascaded category_id SET NULL.
 *
 * Every negative read runs against a row the service role proves exists in the expected state, so
 * an empty result is the policy working, not an empty fixture. M (admin-hidden) is produced by the
 * real admin_hide_content RPC, which sets status='hidden' in the same statement as admin_hidden_at
 * — so M's negative read is ALSO satisfied by the status conjunct alone. The admin_hidden_at
 * conjunct is defense-in-depth that no API path can isolate (enforce_admin_moderation_lock rejects
 * a non-admin marker write, and admin_hide_content always flips status too); this file does not
 * claim to prove it separately.
 *
 * Fixtures (all `h6-hard-`): four ephemeral users, the owner's listings (written through the
 * owner's own session — the real write path), one order, and a temporary sector with two children.
 * The temporary sector exists because D2's test has to delete a sector; no real category row is
 * ever written. G3's rows are drafts, so nothing in that block is publicly visible.
 *
 * H6 PR-4 — the publish gate (migration 20261024215730, trg_service_publish_requirements) refuses a
 * non-draft row written through a JWT unless it meets the G4 publish rules. The owner-written live,
 * paused and moderated fixtures are therefore COMPLETE rows (completeRow(), pointing at a real service
 * sector + subcategory that are only read, never written), and the G2 price cases accept either the
 * price CHECK or the gate as the 23514 — the gate fires first (BEFORE trigger) once applied. So this
 * file passes with and without the gate, whatever order it is applied and merged in.
 *
 * Pattern A (live-DB), mirroring freelancer-publish-gate-rls.test.ts and
 * d4-freelancer-services-visibility.test.ts. Service role for fixtures, ground truth and teardown
 * only.
 *
 * Run: npx vitest run src/__tests__/h6-service-listings-hardening-rls.test.ts
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

const PREFIX = 'h6-hard-'
const EMAIL_SUFFIX = '@rls-smoke.servyou.invalid'
const OWNER_EMAIL = `${PREFIX}owner${EMAIL_SUFFIX}`
const OTHER_EMAIL = `${PREFIX}other${EMAIL_SUFFIX}`
const BUYER_EMAIL = `${PREFIX}buyer${EMAIL_SUFFIX}`
const ADMIN_EMAIL = `${PREFIX}admin${EMAIL_SUFFIX}`
const PASSWORD = 'H6-Hardening-Test-4q8!' // ephemeral test users only; never a real account
const TITLE = 'H6 hardening test'

// The two error shapes this migration introduces, pinned by text so a rejection from some OTHER
// constraint or trigger can't pass for the one under test.
const PRICE_CHECK = 'service_listings_price_required_unless_draft'
const SUBCATEGORY_ERROR = 'Sous-catégorie invalide'
// H6 PR-4's publish gate — on a non-draft write without a price it reports before the CHECK does.
const PUBLISH_GATE = 'Service incomplet'
const PRICE_REFUSAL = new RegExp(`${PRICE_CHECK}|${PUBLISH_GATE}`)

const admin: SupabaseClient = hasCreds
  ? createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })
  : (undefined as unknown as SupabaseClient)
const anon: SupabaseClient = hasCreds
  ? createClient(url, anonKey, { auth: { autoRefreshToken: false, persistSession: false } })
  : (undefined as unknown as SupabaseClient)

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
    user_metadata: { full_name: 'H6 Hardening Test', date_of_birth: '1990-01-01', city: 'Tunis', language: 'fr' },
  })
  if (error || !data.user) throw new Error(`createUser failed for ${email}: ${error?.message}`)
  return data.user.id
}

async function insertCategory(row: { slug: string; kind: 'service' | 'product'; parent_id: string | null }): Promise<string> {
  const { data, error } = await admin
    .from('categories')
    .insert({ ...row, name_fr: `${TITLE} — ${row.slug}`, name_ar: `اختبار ${row.slug}` })
    .select('id')
    .single()
  if (error || !data) throw new Error(`categories insert failed for ${row.slug}: ${error?.message}`)
  return data.id
}

function one<T>(embed: T | T[] | null | undefined): T | null {
  if (Array.isArray(embed)) return embed[0] ?? null
  return embed ?? null
}

// Idempotent and surgical to this file's prefix; runs first (recovers a crashed prior run) and last.
// The order matters:
//   1. orders — enforce_order_identity_lock guards the orders.service_listing_id SET NULL a listing
//      delete would cascade into (h5-service-delete-orders-gate.test.ts);
//   2. admin_audit_log — admin_id is ON DELETE RESTRICT (d4-freelancer-services-visibility.test.ts);
//   3. users — cascades profiles -> freelancer_profiles -> service_listings;
//   4. categories, LAST — a surviving listing that still carries a temporary subcategory would block
//      its sector's delete (D2, the very rule under test). Children before the sector.
async function teardown(): Promise<void> {
  const { data, error } = await admin.from('profiles').select('id').like('email', `${PREFIX}%${EMAIL_SUFFIX}`)
  if (error) throw new Error(`teardown lookup failed: ${error.message}`)
  const ids = (data ?? []).map((row) => row.id as string)

  if (ids.length > 0) {
    for (const column of ['seller_id', 'buyer_id']) {
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

  for (const pattern of [`${PREFIX}sub-%`, `${PREFIX}sector-%`]) {
    const { error: catErr } = await admin.from('categories').delete().like('slug', pattern)
    if (catErr) throw new Error(`categories cleanup (${pattern}) failed: ${catErr.message}`)
  }
}

let ownerId: string
let buyerId: string
let freelancerProfileId: string
let ownerClient: SupabaseClient
let otherClient: SupabaseClient
let buyerClient: SupabaseClient
let adminClient: SupabaseClient

// G1 fixtures: A = live, H = paused by its owner after the buyer ordered it, M = admin-moderated,
// D = a draft with no price.
let activeId: string
let pausedId: string
let moderatedId: string
let draftId: string
let pauseReturnedId: string | null = null

// G3 fixtures: a temporary sector + a service child + a product-kind child, and one REAL sector
// that is only ever pointed at, never written.
let sectorId: string
let subId: string
let productKindSubId: string
let realSectorId: string
// A real service sector + one of its subcategories, read once: what completeRow() points at.
let realPairSectorId: string
let realPairSubId: string

/** Everything the publish gate requires besides title / price / status (G4 rules, H6 PR-4). */
function completeRow(): Record<string, unknown> {
  return {
    category_id: realPairSectorId,
    subcategory_id: realPairSubId,
    tags: [`${PREFIX}skill`],
    short_description: `${TITLE} — résumé`,
    description: `${TITLE} — description détaillée. `.repeat(4),
    price_unit: 'fixed',
    deliverables: ['Premier livrable du test', 'Deuxième livrable du test', 'Troisième livrable du test'],
    delivery_mode: 'remote',
  }
}

async function ownerInsert(row: Record<string, unknown>): Promise<string> {
  const { data, error } = await ownerClient
    .from('service_listings')
    .insert({ freelancer_profile_id: freelancerProfileId, ...row })
    .select('id')
    .single()
  if (error || !data) throw new Error(`owner service_listings insert failed: ${error?.message}`)
  return data.id
}

beforeAll(async () => {
  if (!hasCreds) return
  await teardown()

  ownerId = await createUser(OWNER_EMAIL)
  await createUser(OTHER_EMAIL)
  buyerId = await createUser(BUYER_EMAIL)
  const adminId = await createUser(ADMIN_EMAIL)

  const { data: profile, error: profileErr } = await admin
    .from('freelancer_profiles')
    .insert({ profile_id: ownerId })
    .select('id')
    .single()
  if (profileErr || !profile) throw new Error(`freelancer_profiles insert failed: ${profileErr?.message}`)
  freelancerProfileId = profile.id

  ownerClient = await signIn(OWNER_EMAIL)
  otherClient = await signIn(OTHER_EMAIL)
  buyerClient = await signIn(BUYER_EMAIL)
  adminClient = await signIn(ADMIN_EMAIL)
  const { error: promoteErr } = await admin.from('profiles').update({ is_admin: true }).eq('id', adminId)
  if (promoteErr) throw new Error(`admin promotion failed: ${promoteErr.message}`)
  // is_admin() reads profiles per call (not cached at sign-in), so adminClient needs no re-auth.

  const { data: pair, error: pairErr } = await admin
    .from('categories')
    .select('id, parent_id')
    .eq('kind', 'service')
    .not('parent_id', 'is', null)
    .not('slug', 'like', `${PREFIX}%`)
    .order('slug')
    .limit(1)
    .single()
  if (pairErr || !pair) throw new Error(`real subcategory lookup failed: ${pairErr?.message}`)
  realPairSubId = pair.id
  realPairSectorId = pair.parent_id

  activeId = await ownerInsert({ title: `${TITLE} — A active`, starting_price_tnd: 50, status: 'active', ...completeRow() })

  // H: ordered while live, THEN paused by its owner — the D1 scenario.
  pausedId = await ownerInsert({ title: `${TITLE} — H paused`, starting_price_tnd: 60, status: 'active', ...completeRow() })
  const { error: orderErr } = await admin.from('orders').insert({
    buyer_id: buyerId,
    seller_id: ownerId,
    order_type: 'service',
    service_listing_id: pausedId,
    status: 'pending',
  })
  if (orderErr) throw new Error(`orders insert failed: ${orderErr.message}`)
  // H5's toggle shape: UPDATE ... RETURNING through the owner's session. RETURNING needs the
  // paused row to stay SELECT-visible to its owner — the owner branch, asserted below.
  const { data: paused, error: pauseErr } = await ownerClient
    .from('service_listings')
    .update({ status: 'hidden' })
    .eq('id', pausedId)
    .select('id')
    .maybeSingle()
  if (pauseErr) throw new Error(`owner pause failed: ${pauseErr.message}`)
  pauseReturnedId = paused?.id ?? null

  // M: inserted already paused (never live), then moderated through the real admin RPC.
  moderatedId = await ownerInsert({ title: `${TITLE} — M moderated`, starting_price_tnd: 70, status: 'hidden', ...completeRow() })
  const { error: hideErr } = await adminClient.rpc('admin_hide_content', {
    target_type: 'service',
    target_id: moderatedId,
    reason: `${TITLE} moderation`,
  })
  if (hideErr) throw new Error(`admin_hide_content failed: ${hideErr.message}`)

  draftId = await ownerInsert({ title: `${TITLE} — D draft`, status: 'draft' })

  sectorId = await insertCategory({ slug: `${PREFIX}sector-1`, kind: 'service', parent_id: null })
  subId = await insertCategory({ slug: `${PREFIX}sub-1a`, kind: 'service', parent_id: sectorId })
  productKindSubId = await insertCategory({ slug: `${PREFIX}sub-1p`, kind: 'product', parent_id: sectorId })
  const { data: real, error: realErr } = await admin
    .from('categories')
    .select('id')
    .eq('kind', 'service')
    .is('parent_id', null)
    .not('slug', 'like', `${PREFIX}%`)
    .order('slug')
    .limit(1)
    .single()
  if (realErr || !real) throw new Error(`real sector lookup failed: ${realErr?.message}`)
  realSectorId = real.id
}, 90000)

afterAll(async () => {
  if (!hasCreds) return
  await teardown()
}, 90000)

// ─── G1: who reads what ───────────────────────────────────────────────────────────────

describe.skipIf(!hasCreds)('G1 — ground truth for every negative read below', () => {
  it('the draft, the owner-paused and the admin-moderated listings all exist, in exactly those states', async () => {
    const { data, error } = await admin
      .from('service_listings')
      .select('id, status, admin_hidden_at')
      .in('id', [draftId, pausedId, moderatedId])
    expect(error).toBeNull()
    const byId = new Map((data ?? []).map((row) => [row.id as string, row]))
    expect(byId.get(draftId)?.status).toBe('draft')
    expect(byId.get(pausedId)?.status).toBe('hidden')
    expect(byId.get(pausedId)?.admin_hidden_at).toBeNull()
    expect(byId.get(moderatedId)?.status).toBe('hidden')
    expect(byId.get(moderatedId)?.admin_hidden_at).not.toBeNull()
  })
})

describe.skipIf(!hasCreds)('G1 — anon', () => {
  it('CAN read the live listing (control)', async () => {
    const { data, error } = await anon.from('service_listings').select('id').eq('id', activeId)
    expect(error).toBeNull()
    expect(data).toHaveLength(1)
  })

  it('CANNOT read the draft, the owner-paused or the admin-moderated listing', async () => {
    const { data, error } = await anon.from('service_listings').select('id').in('id', [draftId, pausedId, moderatedId])
    expect(error).toBeNull()
    expect(data).toEqual([])
  })
})

describe.skipIf(!hasCreds)('G1 — a signed-in but unrelated, non-admin user', () => {
  it('CAN read the live listing (control)', async () => {
    const { data, error } = await otherClient.from('service_listings').select('id').eq('id', activeId)
    expect(error).toBeNull()
    expect(data).toHaveLength(1)
  })

  it('CANNOT read the draft, the paused or the moderated listing — the buyer\'s order on H grants nothing to anyone else', async () => {
    const { data, error } = await otherClient.from('service_listings').select('id').in('id', [draftId, pausedId, moderatedId])
    expect(error).toBeNull()
    expect(data).toEqual([])
  })
})

describe.skipIf(!hasCreds)('G1 — owner branch', () => {
  it('reads every own row: live, draft, paused and moderated', async () => {
    const ids = [activeId, draftId, pausedId, moderatedId]
    const { data, error } = await ownerClient.from('service_listings').select('id').in('id', ids)
    expect(error).toBeNull()
    expect((data ?? []).map((row) => row.id).sort()).toEqual([...ids].sort())
  })

  it("the owner's pause RETURNING still returned the now-hidden row (H5's toggle path)", () => {
    expect(pauseReturnedId).toBe(pausedId)
  })
})

describe.skipIf(!hasCreds)('G1 — admin branch (is_admin())', () => {
  it("reads the draft, the paused and the moderated listing — /admin/signalements/[id]'s unhide UI keeps its row", async () => {
    const ids = [draftId, pausedId, moderatedId]
    const { data, error } = await adminClient.from('service_listings').select('id').in('id', ids)
    expect(error).toBeNull()
    expect((data ?? []).map((row) => row.id).sort()).toEqual([...ids].sort())
  })
})

describe.skipIf(!hasCreds)('G1 / D1 — buyer branch', () => {
  it('reads the paused listing they ordered', async () => {
    const { data, error } = await buyerClient.from('service_listings').select('id').eq('id', pausedId)
    expect(error).toBeNull()
    expect(data).toHaveLength(1)
  })

  it("keeps the service's title and price on their own order row — the /mes-commandes embed shape", async () => {
    const { data, error } = await buyerClient
      .from('orders')
      .select('id, service_listings ( title, starting_price_tnd )')
      .eq('buyer_id', buyerId)
      .eq('order_type', 'service')
    expect(error).toBeNull()
    expect(data).toHaveLength(1)
    type ListingEmbed = { title: string; starting_price_tnd: number | string | null }
    const listing = one(data?.[0]?.service_listings as unknown as ListingEmbed | ListingEmbed[] | null)
    expect(listing?.title).toBe(`${TITLE} — H paused`)
    expect(Number(listing?.starting_price_tnd)).toBe(60)
  })

  it('CANNOT read listings they have no order on, even from the same seller', async () => {
    const { data, error } = await buyerClient.from('service_listings').select('id').in('id', [draftId, moderatedId])
    expect(error).toBeNull()
    expect(data).toEqual([])
  })
})

// ─── G2: only a draft may lack a price ────────────────────────────────────────────────

describe.skipIf(!hasCreds)('G2 — starting_price_tnd is optional for drafts only', () => {
  it("a draft inserts without a price, and the owner's RETURNING sees it (H6's insert().select() shape)", async () => {
    const { data, error } = await ownerClient
      .from('service_listings')
      .insert({ freelancer_profile_id: freelancerProfileId, title: `${TITLE} — G2 draft`, status: 'draft' })
      .select('id, status, starting_price_tnd')
      .single()
    expect(error).toBeNull()
    expect(data?.status).toBe('draft')
    expect(data?.starting_price_tnd).toBeNull()
  })

  // Complete except the price, so the only refusal either check can give is the missing price.
  it('an active listing without a price is rejected (23514: the price CHECK, or the publish gate first)', async () => {
    const { error } = await ownerClient
      .from('service_listings')
      .insert({ freelancer_profile_id: freelancerProfileId, title: `${TITLE} — G2 active, no price`, status: 'active', ...completeRow() })
    expect(error?.code).toBe('23514')
    expect(error?.message).toMatch(PRICE_REFUSAL)
  })

  it("the column default status ('active') without a price is rejected too", async () => {
    const { error } = await ownerClient
      .from('service_listings')
      .insert({ freelancer_profile_id: freelancerProfileId, title: `${TITLE} — G2 default status, no price`, ...completeRow() })
    expect(error?.code).toBe('23514')
    expect(error?.message).toMatch(PRICE_REFUSAL)
  })

  it('a price-less draft can be neither published nor paused, and publishes once priced', async () => {
    const id = await ownerInsert({ title: `${TITLE} — G2 publish`, status: 'draft', ...completeRow() })

    for (const status of ['active', 'hidden']) {
      const { error } = await ownerClient.from('service_listings').update({ status }).eq('id', id)
      expect(error?.code).toBe('23514')
      expect(error?.message).toMatch(PRICE_REFUSAL)
    }
    const { data: still, error: stillErr } = await admin.from('service_listings').select('status').eq('id', id).single()
    expect(stillErr).toBeNull()
    expect(still?.status).toBe('draft')

    const { error: priceErr } = await ownerClient.from('service_listings').update({ starting_price_tnd: 80 }).eq('id', id)
    expect(priceErr).toBeNull()
    const { data: published, error: publishErr } = await ownerClient
      .from('service_listings')
      .update({ status: 'active' })
      .eq('id', id)
      .select('status')
      .single()
    expect(publishErr).toBeNull()
    expect(published?.status).toBe('active')
  })
})

// ─── G3 + D2: the sector/subcategory pair ─────────────────────────────────────────────

describe.skipIf(!hasCreds)('G3 — subcategory must be a service child of the row\'s own sector', () => {
  let pairedId: string

  it('accepts a service subcategory of the same sector', async () => {
    pairedId = await ownerInsert({ title: `${TITLE} — G3 paired`, status: 'draft', category_id: sectorId, subcategory_id: subId })
    const { data, error } = await admin.from('service_listings').select('category_id, subcategory_id').eq('id', pairedId).single()
    expect(error).toBeNull()
    expect(data).toEqual({ category_id: sectorId, subcategory_id: subId })
  })

  it('rejects a subcategory that belongs to another sector', async () => {
    const { error } = await ownerClient.from('service_listings').insert({
      freelancer_profile_id: freelancerProfileId,
      title: `${TITLE} — G3 wrong sector`,
      status: 'draft',
      category_id: realSectorId,
      subcategory_id: subId,
    })
    expect(error?.code).toBe('23514')
    expect(error?.message).toContain(SUBCATEGORY_ERROR)
  })

  it('rejects moving the row to another sector while its subcategory stays (UPDATE OF category_id)', async () => {
    const { error } = await ownerClient.from('service_listings').update({ category_id: realSectorId }).eq('id', pairedId)
    expect(error?.code).toBe('23514')
    expect(error?.message).toContain(SUBCATEGORY_ERROR)
    const { data } = await admin.from('service_listings').select('category_id, subcategory_id').eq('id', pairedId).single()
    expect(data).toEqual({ category_id: sectorId, subcategory_id: subId })
  })

  it("rejects a same-sector child that is not kind='service' (the kind clause, via UPDATE OF subcategory_id)", async () => {
    const { error } = await ownerClient.from('service_listings').update({ subcategory_id: productKindSubId }).eq('id', pairedId)
    expect(error?.code).toBe('23514')
    expect(error?.message).toContain(SUBCATEGORY_ERROR)
    const { data } = await admin.from('service_listings').select('subcategory_id').eq('id', pairedId).single()
    expect(data?.subcategory_id).toBe(subId)
  })

  it('rejects a subcategory with no sector at all', async () => {
    const { error } = await ownerClient.from('service_listings').insert({
      freelancer_profile_id: freelancerProfileId,
      title: `${TITLE} — G3 no sector`,
      status: 'draft',
      category_id: null,
      subcategory_id: subId,
    })
    expect(error?.code).toBe('23514')
    expect(error?.message).toContain(SUBCATEGORY_ERROR)
  })

  it('D2 — deleting the sector is BLOCKED while a service carries one of its subcategories, and nothing moves', async () => {
    const { error } = await admin.from('categories').delete().eq('id', sectorId)
    expect(error?.code).toBe('23514')
    expect(error?.message).toContain(SUBCATEGORY_ERROR)

    // The whole statement rolled back: the sector, its child's parent link and the listing are untouched.
    const { data: sector } = await admin.from('categories').select('id').eq('id', sectorId)
    expect(sector).toHaveLength(1)
    const { data: child } = await admin.from('categories').select('parent_id').eq('id', subId).single()
    expect(child?.parent_id).toBe(sectorId)
    const { data: listing } = await admin.from('service_listings').select('category_id, subcategory_id').eq('id', pairedId).single()
    expect(listing).toEqual({ category_id: sectorId, subcategory_id: subId })
  })

  it('deleting the subcategory clears the pointer (ON DELETE SET NULL) and keeps the listing in its sector', async () => {
    const { error } = await admin.from('categories').delete().eq('id', subId)
    expect(error).toBeNull()
    const { data, error: readErr } = await admin.from('service_listings').select('category_id, subcategory_id').eq('id', pairedId).single()
    expect(readErr).toBeNull()
    expect(data).toEqual({ category_id: sectorId, subcategory_id: null })
  })
})
