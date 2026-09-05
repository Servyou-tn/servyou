/**
 * Live-DB proof for a scenario raised during D4's build (src/lib/marche/freelancer-detail.ts,
 * src/app/freelance/[id]/_components/PrimaryCta.tsx) and then DISPROVEN by this very file:
 *
 * freelancer_has_active_listing() (freelancer_profiles_publish_gate.sql) checks ONLY
 * status='active', never admin_hidden_at — read in isolation, that suggested a freelancer whose
 * sole active listing gets admin-hidden could keep is_published=true while D4's own moderated
 * services read (status='active' AND admin_hidden_at IS NULL) returns zero rows: a page that
 * renders with no destination for its primary CTA.
 *
 * That combination turns out to be UNREACHABLE through any real code path. The only two writers of
 * admin_hidden_at on service_listings are admin_hide_content()/admin_unhide_content()
 * (admin/signalements/actions.ts — confirmed the only call sites via grep, not assumed), and
 * admin_hide_content's own body sets status='hidden' in the SAME statement as admin_hidden_at
 * (already documented at src/lib/marche/data.ts's own header comment for products; proven here for
 * services). trg_sync_freelancer_is_published fires on UPDATE OF (status, freelancer_profile_id) —
 * status is exactly what it watches — so the moment the sole listing is admin-hidden, is_published
 * flips to false in the SAME trigger pass and the whole page 404s for anon (D3's own precedent),
 * never reaching a render with an empty-destination CTA. A raw UPDATE that sets admin_hidden_at
 * without touching status would need to bypass enforce_admin_moderation_lock's is_admin() check
 * with a real admin session, then bypass admin_hide_content entirely — not a path anything in this
 * app takes.
 *
 * PrimaryCta.tsx's "omit the CTA" branch is kept as a harmless defensive fallback (a genuinely
 * absent destination is still possible in principle — e.g. a future write path), but this test
 * exists to keep that comment honest: the specific scenario that motivated it doesn't occur today.
 *
 * Pattern A (live-DB), mirroring h3-links-portfolio-rls.test.ts. Service role for fixtures and
 * teardown only.
 *
 * Run: npx vitest run src/__tests__/d4-freelancer-services-visibility.test.ts
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

const EMAIL_SUFFIX = '@rls-smoke.servyou.invalid'
const EMAIL_PREFIX = 'd4-svc-'
const OWNER_EMAIL = `${EMAIL_PREFIX}owner${EMAIL_SUFFIX}`
const ADMIN_EMAIL = `${EMAIL_PREFIX}admin${EMAIL_SUFFIX}`
const PASSWORD = 'D4-Services-Visibility-Test-7z2!' // ephemeral test users only; never a real account

const admin: SupabaseClient = hasCreds
  ? createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })
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
    user_metadata: { full_name: 'D4 Services Visibility Test', date_of_birth: '1990-01-01', city: 'Tunis', language: 'fr' },
  })
  if (error || !data.user) throw new Error(`createUser failed for ${email}: ${error?.message}`)
  return data.user.id
}

async function teardown(): Promise<void> {
  const { data, error } = await admin.from('profiles').select('id').like('email', `${EMAIL_PREFIX}%${EMAIL_SUFFIX}`)
  if (error) throw new Error(`teardown lookup failed: ${error.message}`)
  const ids = (data ?? []).map((row) => row.id)
  if (ids.length === 0) return

  // admin_audit_log.admin_id is ON DELETE RESTRICT (admin actions stay attributable forever, by
  // design) — deleteUser on the admin test fixture fails otherwise. No prior test file in this
  // repo signs in as an admin and then calls an audited RPC (admin_hide_content/admin_unhide_
  // content), so this is the first teardown to need it — confirmed by grepping every other
  // __tests__ file for admin_audit_log before adding this, not assumed.
  const { error: auditErr } = await admin.from('admin_audit_log').delete().in('admin_id', ids)
  if (auditErr) throw new Error(`admin_audit_log cleanup failed: ${auditErr.message}`)

  for (const id of ids) {
    const { error: delErr } = await admin.auth.admin.deleteUser(id)
    if (delErr) throw new Error(`deleteUser failed for ${id}: ${delErr.message}`)
  }
}

let freelancerProfileId: string
let listingId: string
let adminClient: SupabaseClient

beforeAll(async () => {
  if (!hasCreds) return
  await teardown()

  const ownerId = await createUser(OWNER_EMAIL)
  const adminId = await createUser(ADMIN_EMAIL)

  const { data: profile, error: profileErr } = await admin
    .from('freelancer_profiles')
    .insert({ profile_id: ownerId })
    .select('id')
    .single()
  if (profileErr || !profile) throw new Error(`freelancer_profiles insert failed: ${profileErr?.message}`)
  freelancerProfileId = profile.id

  const { data: listing, error: listingErr } = await admin
    .from('service_listings')
    .insert({ freelancer_profile_id: freelancerProfileId, title: 'D4 test service', starting_price_tnd: 50 })
    .select('id')
    .single()
  if (listingErr || !listing) throw new Error(`service_listings insert failed: ${listingErr?.message}`)
  listingId = listing.id

  adminClient = await signIn(ADMIN_EMAIL)
  const { error: promoteErr } = await admin.from('profiles').update({ is_admin: true }).eq('id', adminId)
  if (promoteErr) throw new Error(`admin promotion failed: ${promoteErr.message}`)
}, 60000)

afterAll(async () => {
  if (!hasCreds) return
  await teardown()
}, 60000)

describe.skipIf(!hasCreds)('is_published vs. admin-hiding a sole listing — the CTA-destination question, resolved', () => {
  it('the trigger publishes the freelancer once the listing is active', async () => {
    const { data, error } = await admin.from('freelancer_profiles').select('is_published').eq('id', freelancerProfileId).single()
    expect(error).toBeNull()
    expect(data?.is_published).toBe(true)
  })

  it('admin_hide_content sets status=hidden in the SAME statement as admin_hidden_at (not two independent writes)', async () => {
    const { error: hideErr } = await adminClient.rpc('admin_hide_content', {
      target_type: 'service',
      target_id: listingId,
      reason: 'D4 test moderation',
    })
    expect(hideErr).toBeNull()

    const { data, error } = await admin.from('service_listings').select('status, admin_hidden_at').eq('id', listingId).single()
    expect(error).toBeNull()
    expect(data?.status).toBe('hidden')
    expect(data?.admin_hidden_at).not.toBeNull()
  })

  it('because status flips too, the SAME trigger that watches status also flips is_published to false — the page 404s, it never renders with an empty-destination CTA', async () => {
    const { data, error } = await admin.from('freelancer_profiles').select('is_published').eq('id', freelancerProfileId).single()
    expect(error).toBeNull()
    expect(data?.is_published).toBe(false)
  })

  it('un-hiding (admin_unhide_content) restores both status=active and is_published=true together', async () => {
    const { error: unhideErr } = await adminClient.rpc('admin_unhide_content', { target_type: 'service', target_id: listingId })
    expect(unhideErr).toBeNull()

    const { data: listing, error: listingErr } = await admin.from('service_listings').select('status, admin_hidden_at').eq('id', listingId).single()
    expect(listingErr).toBeNull()
    expect(listing?.status).toBe('active')
    expect(listing?.admin_hidden_at).toBeNull()

    const { data: profile, error: profileErr } = await admin.from('freelancer_profiles').select('is_published').eq('id', freelancerProfileId).single()
    expect(profileErr).toBeNull()
    expect(profile?.is_published).toBe(true)
  })
})
