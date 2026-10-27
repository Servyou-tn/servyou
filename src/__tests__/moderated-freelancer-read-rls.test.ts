/**
 * Live-DB proof for db/migrations/PENDING_moderated_freelancer_read_rls.sql — a moderated freelancer
 * stops being REST-readable (follow-up from PR #192's discovery; same shape as migration 65).
 *
 * admin_hide_content('freelancer_profile') stamps only freelancer_profiles.admin_hidden_at. is_published
 * is derived from ACTIVE LISTINGS, so it stays true, and the listings stay active. Until this migration
 * the profile, its listings and its 7 child tables stayed readable through the REST API.
 *
 *   freelancer_profiles — live (published, not moderated), own, admin, or a buyer who ordered a service
 *                         from the owner (orders.seller_id, order_type 'service');
 *   service_listings    — the public branch also requires the profile not to be moderated;
 *   the 7 children      — public only while the profile is live; own; admin. Deliberately NOT extended to
 *                         buyers: they keep the profile row and the listing, not its education / skills.
 *
 * Every negative read is paired with a service-role read proving the row exists in the state under test,
 * so an empty result is the policy working, not an empty fixture. Moderation goes through the real
 * admin_hide_content RPC. The buyer's order is inserted while the profile is live (migration 54 refuses an
 * order on a non-live listing; the service role writes it here, as h6-service-listings-hardening does).
 *
 * Fixtures (all `mf-read-`, password random per run: the repo is public and this suite promotes an admin
 * in production): freelancer M (moderated after the order), freelancer L (live), a buyer, an unrelated
 * signed-in outsider and an admin. Each freelancer has one listing and one row in each of the 7 children.
 *
 * Deliberately no global count: another suite writing freelancers in the same run would make it flaky.
 * Every read is scoped to this file's fixture ids.
 *
 * Pattern A (live-DB). Service role for fixtures, ground truth and teardown only.
 *
 * Run: npx vitest run --config vitest.integration.config.ts src/__tests__/moderated-freelancer-read-rls.test.ts
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'
import type { Database } from '@/lib/supabase/database.types'
import { refuseTeardownOnForeignOrders } from './live-teardown-guard'

type Client = SupabaseClient<Database>
type Embed<T> = T | T[] | null

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const hasCreds = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.SUPABASE_SERVICE_ROLE_KEY &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
)

const PREFIX = 'mf-read-'
const EMAIL_SUFFIX = '@rls-smoke.servyou.invalid'
const email = (local: string) => `${PREFIX}${local}${EMAIL_SUFFIX}`
const RUN = randomUUID().slice(0, 8)
const PASSWORD = `Mf-${randomUUID()}-Aa1!`
const TITLE = `Moderated freelancer read ${RUN}`

const noSession = { auth: { autoRefreshToken: false, persistSession: false } }
const admin: Client = hasCreds
  ? createClient<Database>(url, serviceKey, noSession)
  : (undefined as unknown as Client)
const anon: Client = hasCreds
  ? createClient<Database>(url, anonKey, noSession)
  : (undefined as unknown as Client)

function one<T>(embed: Embed<T> | undefined): T | null {
  if (Array.isArray(embed)) return embed[0] ?? null
  return embed ?? null
}

async function signIn(local: string): Promise<Client> {
  const client = createClient<Database>(url, anonKey, noSession)
  const { error } = await client.auth.signInWithPassword({ email: email(local), password: PASSWORD })
  if (error) throw new Error(`signIn failed for ${local}: ${error.message}`)
  return client
}

async function createUser(local: string): Promise<string> {
  const { data, error } = await admin.auth.admin.createUser({
    email: email(local),
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: 'Moderated Freelancer Test', date_of_birth: '1990-01-01', city: 'Tunis', language: 'fr' },
  })
  if (error || !data.user) throw new Error(`createUser failed for ${local}: ${error?.message}`)
  return data.user.id
}

// Idempotent and surgical to this file's prefix; runs first (recovers a crashed prior run) and last.
//   0. the guard — a fixture listing is live on production while this runs, so a real customer could
//      order it; refuseTeardownOnForeignOrders refuses instead of silently cascading that order away;
//   1. orders, by BUYER and by SELLER (all fixture orders are ours once the guard passed);
//   2. admin_audit_log — admin_id is ON DELETE RESTRICT;
//   3. users — cascades profiles -> freelancer_profiles -> service_listings and the 7 children.
async function teardown(): Promise<void> {
  const { data, error } = await admin.from('profiles').select('id').like('email', `${PREFIX}%${EMAIL_SUFFIX}`)
  if (error) throw new Error(`teardown lookup failed: ${error.message}`)
  const ids = (data ?? []).map((row) => row.id as string)
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

type Freelancer = {
  profile: string
  listing: string
  skill: string
  tool: string
  education: string
  certification: string
  language: string
  link: string
  portfolio: string
}

// One live listing and one row in each of the 7 children. The service role writes the listing (no JWT:
// the publish gate is skipped), and the insert trigger flips is_published on its own.
async function makeFreelancer(ownerId: string, label: string): Promise<Freelancer> {
  const insertOne = async (table: keyof Database['public']['Tables'], row: Record<string, unknown>): Promise<string> => {
    const { data, error } = await (admin.from(table) as unknown as {
      insert: (r: Record<string, unknown>) => { select: (c: string) => { single: () => Promise<{ data: { id: string } | null; error: { message: string } | null }> } }
    })
      .insert(row)
      .select('id')
      .single()
    if (error || !data) throw new Error(`${table} insert failed (${label}): ${error?.message}`)
    return data.id
  }

  const profile = await insertOne('freelancer_profiles', { profile_id: ownerId, headline: `${TITLE} — ${label}`, city: 'Tunis' })
  const listing = await insertOne('service_listings', {
    freelancer_profile_id: profile,
    title: `${TITLE} — ${label} service`,
    starting_price_tnd: 50,
    status: 'active',
  })
  const skill = await insertOne('freelancer_skills', { freelancer_profile_id: profile, skill: `${TITLE} ${label}` })
  const tool = await insertOne('freelancer_tools', { freelancer_id: profile, name: `${TITLE} ${label}` })
  const education = await insertOne('freelancer_education', { freelancer_id: profile, institution: `${TITLE} ${label}` })
  const certification = await insertOne('freelancer_certifications', { freelancer_id: profile, name: `${TITLE} ${label}` })
  const language = await insertOne('freelancer_languages', { freelancer_profile_id: profile, language: 'fr', proficiency: 'natif' })
  const link = await insertOne('freelancer_links', {
    freelancer_profile_id: profile,
    label: `${TITLE} ${label}`,
    url: `https://example.test/${RUN}/${label}`,
  })
  // A portfolio row needs a provenance row FIRST (the trigger applies to the service role too).
  const path = `${ownerId}/${randomUUID()}.webp`
  const { error: provErr } = await admin.from('uploaded_objects').insert({ bucket: 'portfolio-media', path, owner_id: ownerId })
  if (provErr) throw new Error(`uploaded_objects seed failed (${label}): ${provErr.message}`)
  const portfolio = await insertOne('freelancer_portfolio_items', {
    freelancer_profile_id: profile,
    image_url: `${url}/storage/v1/object/public/portfolio-media/${path}`,
    title: `${TITLE} ${label}`,
  })
  return { profile, listing, skill, tool, education, certification, language, link, portfolio }
}

// The seven child tables, each with the id column of the fixture row and its parent's key column.
const CHILDREN = [
  { table: 'freelancer_skills', pick: (f: Freelancer) => f.skill },
  { table: 'freelancer_tools', pick: (f: Freelancer) => f.tool },
  { table: 'freelancer_education', pick: (f: Freelancer) => f.education },
  { table: 'freelancer_certifications', pick: (f: Freelancer) => f.certification },
  { table: 'freelancer_languages', pick: (f: Freelancer) => f.language },
  { table: 'freelancer_links', pick: (f: Freelancer) => f.link },
  { table: 'freelancer_portfolio_items', pick: (f: Freelancer) => f.portfolio },
] as const

type ChildTable = (typeof CHILDREN)[number]['table']
type PolicyTable = 'freelancer_profiles' | 'service_listings' | ChildTable

// The ids of `ids` that `client` can read from `table`, sorted. A read error fails the test: an empty
// list must mean "the policy filtered", never "the query broke" (a 42P17 would surface here).
async function readable(client: Client, table: PolicyTable, ids: string[]): Promise<string[]> {
  const { data, error } = await client.from(table).select('id').in('id', ids)
  expect(error).toBeNull()
  return ((data ?? []) as { id: string }[]).map((row) => row.id).sort()
}

const sorted = (...ids: string[]): string[] => [...ids].sort()

let M: Freelancer // moderated after the buyer ordered
let L: Freelancer // live throughout
let buyerId: string
let outsiderId: string
let orderId: string

let adminClient: Client
let ownerMClient: Client
let buyerClient: Client
let outsiderClient: Client

const bothProfiles = () => [M.profile, L.profile]
const bothListings = () => [M.listing, L.listing]
const childIds = (table: ChildTable, ...fs: Freelancer[]): string[] =>
  fs.map((f) => CHILDREN.find((c) => c.table === table)!.pick(f))

beforeAll(async () => {
  if (!hasCreds) return
  await teardown()

  const ownerMId = await createUser('owner-m')
  const ownerLId = await createUser('owner-l')
  buyerId = await createUser('buyer')
  outsiderId = await createUser('outsider')
  const adminId = await createUser('admin')
  const { error: promoteErr } = await admin.from('profiles').update({ is_admin: true }).eq('id', adminId)
  if (promoteErr) throw new Error(`admin promotion failed: ${promoteErr.message}`)

  M = await makeFreelancer(ownerMId, 'M')
  L = await makeFreelancer(ownerLId, 'L')

  adminClient = await signIn('admin')
  ownerMClient = await signIn('owner-m')
  buyerClient = await signIn('buyer')
  outsiderClient = await signIn('outsider')

  // The buyer orders from M while M is live. seller_id is the freelancer's profiles.id.
  const { data: order, error: orderErr } = await admin
    .from('orders')
    .insert({ buyer_id: buyerId, seller_id: ownerMId, order_type: 'service', service_listing_id: M.listing, status: 'pending' })
    .select('id')
    .single()
  if (orderErr || !order) throw new Error(`orders insert failed: ${orderErr?.message}`)
  orderId = order.id

  const { error: hideErr } = await adminClient.rpc('admin_hide_content', {
    target_type: 'freelancer_profile',
    target_id: M.profile,
    reason: `${TITLE} moderation`,
  })
  if (hideErr) throw new Error(`admin_hide_content(freelancer_profile) failed: ${hideErr.message}`)
}, 180000)

afterAll(async () => {
  if (!hasCreds) return
  await teardown()
  // Cleanup verified by a read, not assumed.
  const { count: profiles, error: pErr } = await admin
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .like('email', `${PREFIX}%${EMAIL_SUFFIX}`)
  if (pErr) throw new Error(`cleanup check (profiles) failed: ${pErr.message}`)
  if ((profiles ?? 0) !== 0) throw new Error(`teardown left ${profiles} ${PREFIX} profiles`)
  const { count: fps, error: fErr } = await admin
    .from('freelancer_profiles')
    .select('id', { count: 'exact', head: true })
    .like('headline', `${TITLE}%`)
  if (fErr) throw new Error(`cleanup check (freelancer_profiles) failed: ${fErr.message}`)
  if ((fps ?? 0) !== 0) throw new Error(`teardown left ${fps} fixture freelancer profiles`)
}, 120000)

describe.skipIf(!hasCreds)('ground truth for every negative read below', () => {
  it('M is published AND moderated (the bug state); L is published and live', async () => {
    const { data, error } = await admin
      .from('freelancer_profiles')
      .select('id, is_published, admin_hidden_at')
      .in('id', bothProfiles())
    expect(error).toBeNull()
    const rows = new Map((data ?? []).map((row) => [row.id, row]))
    expect(rows.get(M.profile)?.is_published).toBe(true) // the derivation does not know about moderation
    expect(rows.get(M.profile)?.admin_hidden_at).not.toBeNull()
    expect(rows.get(L.profile)).toMatchObject({ is_published: true, admin_hidden_at: null })
  })

  it("M's listing is still active and unmoderated (admin_hide_content only stamps the profile)", async () => {
    const { data, error } = await admin.from('service_listings').select('id, status, admin_hidden_at').in('id', bothListings())
    expect(error).toBeNull()
    const rows = new Map((data ?? []).map((row) => [row.id, row]))
    expect(rows.get(M.listing)).toMatchObject({ status: 'active', admin_hidden_at: null })
    expect(rows.get(L.listing)).toMatchObject({ status: 'active', admin_hidden_at: null })
  })

  it('every child row exists, for both freelancers', async () => {
    for (const { table, pick } of CHILDREN) {
      expect(await readable(admin, table, [pick(M), pick(L)])).toHaveLength(2)
    }
  })

  it("the buyer's order on M's listing exists", async () => {
    const { data, error } = await admin.from('orders').select('buyer_id, seller_id, order_type, service_listing_id').eq('id', orderId)
    expect(error).toBeNull()
    expect(data).toHaveLength(1)
    expect(data?.[0]).toMatchObject({ buyer_id: buyerId, order_type: 'service', service_listing_id: M.listing })
  })
})

const publicViewers: Array<[string, () => Client]> = [
  ['anon', () => anon],
  ['an unrelated signed-in user', () => outsiderClient],
]

for (const [who, viewer] of publicViewers) {
  describe.skipIf(!hasCreds)(`public — ${who} reads live freelancers only`, () => {
    it('freelancer_profiles: only L (the moderated profile is gone)', async () => {
      expect(await readable(viewer(), 'freelancer_profiles', bothProfiles())).toEqual([L.profile])
    })

    it('service_listings: only L’s (M’s listing is active and unmoderated, its profile is not)', async () => {
      expect(await readable(viewer(), 'service_listings', bothListings())).toEqual([L.listing])
    })

    for (const { table, pick } of CHILDREN) {
      it(`${table}: only L's`, async () => {
        expect(await readable(viewer(), table, [pick(M), pick(L)])).toEqual([pick(L)])
      })
    }
  })
}

describe.skipIf(!hasCreds)('owner — a moderated freelancer keeps reading their own rows', () => {
  it('the profile, the listing and all 7 children of M, plus L’s public rows', async () => {
    expect(await readable(ownerMClient, 'freelancer_profiles', bothProfiles())).toEqual(sorted(M.profile, L.profile))
    expect(await readable(ownerMClient, 'service_listings', bothListings())).toEqual(sorted(M.listing, L.listing))
    for (const { table, pick } of CHILDREN) {
      expect(await readable(ownerMClient, table, [pick(M), pick(L)])).toEqual(sorted(pick(M), pick(L)))
    }
  })
})

describe.skipIf(!hasCreds)('admin — everything', () => {
  it('reads every fixture row in every table', async () => {
    expect(await readable(adminClient, 'freelancer_profiles', bothProfiles())).toEqual(sorted(...bothProfiles()))
    expect(await readable(adminClient, 'service_listings', bothListings())).toEqual(sorted(...bothListings()))
    for (const { table, pick } of CHILDREN) {
      expect(await readable(adminClient, table, [pick(M), pick(L)])).toEqual(sorted(pick(M), pick(L)))
    }
  })
})

type OrderRecapRow = {
  id: string
  service_listings: Embed<{
    id: string
    title: string
    freelancer_profiles: Embed<{ id: string; city: string | null; headline: string | null }>
  }>
}

describe.skipIf(!hasCreds)('buyer — keeps what they ordered, nothing more', () => {
  it('freelancer_profiles: M (they bought from it) and L (live) — the profile row only', async () => {
    expect(await readable(buyerClient, 'freelancer_profiles', bothProfiles())).toEqual(sorted(M.profile, L.profile))
  })

  it("service_listings: M's through the order (migration 52 D1) and L's", async () => {
    expect(await readable(buyerClient, 'service_listings', bothListings())).toEqual(sorted(M.listing, L.listing))
  })

  for (const { table, pick } of CHILDREN) {
    it(`${table}: only L's — the buyer branch is not extended to the children`, async () => {
      expect(await readable(buyerClient, table, [pick(M), pick(L)])).toEqual([pick(L)])
    })
  }

  it('the order recap embed (order-detail.ts / my-orders.ts shape) keeps the listing and the freelancer', async () => {
    const { data, error } = await buyerClient
      .from('orders')
      .select('id, service_listings ( id, title, freelancer_profiles ( id, city, headline ) )')
      .eq('id', orderId)
    expect(error).toBeNull()
    const row = ((data ?? []) as unknown as OrderRecapRow[])[0]
    const listing = one(row?.service_listings)
    expect(listing?.id).toBe(M.listing)
    const fp = one(listing?.freelancer_profiles)
    expect(fp?.id).toBe(M.profile)
    expect(fp?.headline).toContain(TITLE)
  })

  it('cannot mint the branch: an order on the moderated profile’s still-active listing is refused (migration 54)', async () => {
    // seller_id is derived by trg_enforce_order_insert_integrity; the generated Insert type still requires it.
    const payload = { buyer_id: outsiderId, order_type: 'service', service_listing_id: M.listing, status: 'pending' }
    const { error } = await outsiderClient.from('orders').insert(payload as unknown as Database['public']['Tables']['orders']['Insert'])
    expect(error?.message).toBe("Cet article n'est plus disponible.")
    const { count, error: countErr } = await admin
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('buyer_id', outsiderId)
    expect(countErr).toBeNull()
    expect(count).toBe(0)
  })

  it('the branch needs an order: a signed-in user without one reads no M row', async () => {
    expect(await readable(outsiderClient, 'freelancer_profiles', [M.profile])).toEqual([])
  })
})

const embedViewers: Array<[string, () => Client]> = [
  ['anon', () => anon],
  ['outsider', () => outsiderClient],
  ['buyer', () => buyerClient],
  ['owner', () => ownerMClient],
  ['admin', () => adminClient],
]

describe.skipIf(!hasCreds)('the policy graph is acyclic — nested embeds through every new policy return no error', () => {
  for (const [who, viewer] of embedViewers) {
    it(`${who}: listings → profile → children, children → profile, profile → listings`, async () => {
      const listings = await viewer()
        .from('service_listings')
        .select('id, freelancer_profiles ( id, freelancer_skills ( id ), freelancer_languages ( id ) )')
        .in('id', bothListings())
      expect(listings.error).toBeNull()
      const skills = await viewer().from('freelancer_skills').select('id, freelancer_profiles ( id )').in('id', childIds('freelancer_skills', M, L))
      expect(skills.error).toBeNull()
      const profiles = await viewer().from('freelancer_profiles').select('id, service_listings ( id )').in('id', bothProfiles())
      expect(profiles.error).toBeNull()
    })
  }
})

// Last on purpose: it mutates the moderation state every block above depends on.
describe.skipIf(!hasCreds)('un-moderating restores the public read (control)', () => {
  it('after admin_unhide_content, anon reads M’s profile, listing and children again', async () => {
    const { error } = await adminClient.rpc('admin_unhide_content', { target_type: 'freelancer_profile', target_id: M.profile })
    expect(error).toBeNull()
    expect(await readable(anon, 'freelancer_profiles', bothProfiles())).toEqual(sorted(M.profile, L.profile))
    expect(await readable(anon, 'service_listings', bothListings())).toEqual(sorted(M.listing, L.listing))
    for (const { table, pick } of CHILDREN) {
      expect(await readable(anon, table, [pick(M), pick(L)])).toEqual(sorted(pick(M), pick(L)))
    }
  })
})
