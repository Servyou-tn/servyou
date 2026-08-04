// RLS smoke test — runs against PRODUCTION Supabase (PR-U, MVP coverage).
//
// Why this exists: the server-action unit tests mock the Supabase client, so they
// never exercise real Row-Level Security. This script does — it creates three
// ephemeral users, signs in as each with a real authenticated client (so every
// query goes through that user's RLS), asserts the critical privacy/visibility
// boundaries, and cleans up.
//
// Design:
//   - The SERVICE-ROLE client (bypasses RLS) sets up fixtures and tears them down.
//   - Per-user AUTHENTICATED clients (anon key + signInWithPassword) make the
//     actual RLS assertions.
//   - Every "deny" assertion is paired with a positive control on the SAME row —
//     a bare "0 rows" is equally consistent with a typo, a wrong filter, or the
//     row not existing, so a deny alone can be a false green.
//   - charlie starts NON-admin (covers the non-party / non-admin deny cases),
//     then is promoted to admin (covers the admin-allow controls).
//   - Teardown runs at START and END (idempotent), so a prior crashed run never
//     wedges the next one. Audit-log rows are deleted FIRST: admin_audit_log.admin_id
//     -> profiles is ON DELETE RESTRICT and the table has no DELETE policy, so the
//     service role is the only thing that can remove them, and it must do so before
//     deleting the users. Cleanup is surgical — filtered by the ephemeral test-user
//     ids we created this run, NEVER by action/target pattern (that could delete
//     real forensic history).
//
// Run: `npm run rls-smoke` (loads .env.local via `node --env-file`).
// Pass = all assertions green, exit 0. Fail = first/all failures logged, exit 1.

import { createClient } from '@supabase/supabase-js'

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!URL || !ANON || !SERVICE) {
  console.error('Missing env. Need NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY.')
  console.error('Run via: npm run rls-smoke  (loads .env.local through `node --env-file`).')
  process.exit(1)
}

const EMAIL_SUFFIX = '@rls-smoke.servyou.invalid'
const PASSWORD = 'Rls-Smoke-Test-9f3a!' // ephemeral test users only; never a real account
const USERS = {
  alice: { email: 'alice' + EMAIL_SUFFIX, fullName: 'RLS Smoke Alice', phone: '+21620000001' },
  bob: { email: 'bob' + EMAIL_SUFFIX, fullName: 'RLS Smoke Bob' },
  charlie: { email: 'charlie' + EMAIL_SUFFIX, fullName: 'RLS Smoke Charlie' },
  // dina is a FREELANCER (alice is already shop_owner and one profile cannot be both).
  // She exists only to give the F7 delivery-fee CHECK a real service order to fire on.
  dina: { email: 'dina' + EMAIL_SUFFIX, fullName: 'RLS Smoke Dina' },
}

// Service-role client — bypasses RLS. Used for fixtures + teardown ONLY.
const admin = createClient(URL, SERVICE, { auth: { autoRefreshToken: false, persistSession: false } })

// ---- assertion harness ----------------------------------------------------
let passed = 0
const failures = []
function check(label, ok, detail) {
  if (ok) {
    passed++
    console.log('  PASS  ' + label)
  } else {
    failures.push({ label, detail })
    console.log('  FAIL  ' + label + (detail ? '  — ' + detail : ''))
  }
}
const rowCount = (data) => (Array.isArray(data) ? data.length : data == null ? 'null' : 'not-array')

// ---- helpers --------------------------------------------------------------
async function authedClient(email) {
  const c = createClient(URL, ANON, { auth: { autoRefreshToken: false, persistSession: false } })
  const { error } = await c.auth.signInWithPassword({ email, password: PASSWORD })
  if (error) throw new Error('signIn failed for ' + email + ': ' + error.message)
  return c
}

// Find leftover/just-created test users by their profiles.email (set by the
// handle_new_user trigger). Service role bypasses RLS so it sees all rows.
async function findTestUserIds() {
  const { data, error } = await admin.from('profiles').select('id').like('email', '%' + EMAIL_SUFFIX)
  if (error) throw new Error('findTestUserIds failed: ' + error.message)
  return data.map((r) => r.id)
}

// A real 1x1 WebP. The buckets declare allowed_mime_types = ['image/webp'], and while that check
// reads the CLIENT-DECLARED Content-Type (so arbitrary bytes would pass), sending genuine WebP
// keeps the fixture honest about what a writer actually uploads.
const WEBP_1X1 = Buffer.from('UklGRhoAAABXRUJQVlA4TA0AAAAvAAAAEAcQERGIiP4HAA==', 'base64')
const SMOKE_FOLDER = 'rls-smoke'
const SHOP_BUCKETS = ['product-images', 'shop-assets']

// Recursive listing — objects live at {shop_id}/{product_id}/{uuid}.webp, so a single .list()
// returns FOLDERS (id === null), not files.
async function listAllPaths(bucket, prefix) {
  const out = []
  const { data } = await admin.storage.from(bucket).list(prefix, { limit: 1000 })
  if (!Array.isArray(data)) return out
  for (const e of data) {
    const p = prefix ? prefix + '/' + e.name : e.name
    if (e.id === null) out.push(...(await listAllPaths(bucket, p)))
    else out.push(p)
  }
  return out
}

// Service-role existence check. Used for the second half of every deny assertion: a storage call
// that returns an error is NOT proof nothing landed, and `.remove()` on rows the caller cannot see
// returns success with an empty array rather than an error. The only trustworthy answer comes from
// a client that bypasses RLS.
async function objectExists(bucket, path) {
  const parts = path.split('/')
  const file = parts.pop()
  const { data } = await admin.storage.from(bucket).list(parts.join('/'), { limit: 1000 })
  return Array.isArray(data) && data.some((e) => e.name === file)
}

// Removes every object under the given shop ids, across both shop-scoped buckets.
//
// REQUIRED, not tidiness: profile deletion cascades to `shops` but NOT to `storage.objects` —
// no transaction spans Postgres and the storage API. Without this, every smoke run would leak
// orphans into a PRODUCTION bucket, degrading the thing this gate exists to protect.
async function sweepSmokeStorage(shopIds) {
  for (const bucket of SHOP_BUCKETS) {
    for (const shopId of shopIds) {
      const paths = await listAllPaths(bucket, shopId)
      if (paths.length === 0) continue
      const { error } = await admin.storage.from(bucket).remove(paths)
      if (error) throw new Error('storage sweep failed (' + bucket + '/' + shopId + '): ' + error.message)
    }
  }
}

async function teardown() {
  const ids = await findTestUserIds()
  if (ids.length === 0) return
  // 0) Storage FIRST, while the shop rows still exist to tell us which prefixes are ours.
  //    Deleting the users cascades the shops away, and with them the only record of which
  //    storage prefixes belonged to this run — the objects would survive with nothing pointing
  //    at them. Scoped to shops owned by the ephemeral test users, never a bare bucket wipe.
  const { data: shopRows, error: shopErr } = await admin.from('shops').select('id').in('owner_id', ids)
  if (shopErr) throw new Error('shop lookup for storage sweep failed: ' + shopErr.message)
  await sweepSmokeStorage((shopRows ?? []).map((r) => r.id))
  // 1) Audit-log rows next (RESTRICT FK + no DELETE policy → service role only),
  //    surgically scoped to the ephemeral test-user ids.
  const { error: auditErr } = await admin.from('admin_audit_log').delete().in('admin_id', ids)
  if (auditErr) throw new Error('audit_log cleanup failed: ' + auditErr.message)
  // 2) Then the users — cascades clean profiles → shops/products/orders/disputes/reports.
  for (const id of ids) {
    const { error } = await admin.auth.admin.deleteUser(id)
    if (error) throw new Error('deleteUser failed for ' + id + ': ' + error.message)
  }
}

async function createUser(key) {
  const u = USERS[key]
  const { data, error } = await admin.auth.admin.createUser({
    email: u.email,
    password: PASSWORD,
    email_confirm: true,
    // handle_new_user reads these; date_of_birth is NOT NULL with no default, so it
    // MUST be present or the profile insert (and thus createUser) fails.
    user_metadata: { full_name: u.fullName, date_of_birth: '1990-01-01', city: 'Tunis', language: 'fr' },
  })
  if (error) throw new Error('createUser failed for ' + u.email + ': ' + error.message)
  return data.user.id
}

async function main() {
  console.log('RLS smoke — PRODUCTION (' + URL + ')')

  console.log('\nPhase 0 — teardown-first (idempotent)')
  await teardown()

  console.log('\nPhase 1 — setup fixtures (service role)')
  const aliceId = await createUser('alice')
  const bobId = await createUser('bob')
  const charlieId = await createUser('charlie')

  // alice = shop owner with a phone (powers the get_contact_phone positive control)
  {
    const { error } = await admin.from('profiles').update({ seller_type: 'shop_owner', phone: USERS.alice.phone }).eq('id', aliceId)
    if (error) throw new Error('alice profile setup failed: ' + error.message)
  }
  const { data: shop, error: shopErr } = await admin.from('shops').insert({ owner_id: aliceId, name: 'RLS Smoke Shop' }).select('id').single()
  if (shopErr) throw new Error('shop insert failed: ' + shopErr.message)
  const { data: product, error: prodErr } = await admin.from('products').insert({ shop_id: shop.id, title: 'RLS Smoke Product', price_tnd: 10, status: 'active' }).select('id').single()
  if (prodErr) throw new Error('product insert failed: ' + prodErr.message)

  // A SECOND shop, owned by charlie, so "another shop's path" in Phase 5b is a real foreign shop
  // rather than a made-up uuid. No constraint ties shops.owner_id to seller_type, so charlie can
  // hold a shop while staying a plain consumer (and later an admin) for the other phases.
  const { data: foreignShop, error: fShopErr } = await admin
    .from('shops').insert({ owner_id: charlieId, name: 'RLS Smoke Foreign Shop' }).select('id').single()
  if (fShopErr) throw new Error('foreign shop insert failed: ' + fShopErr.message)
  // order bob(buyer) ↔ alice(seller); non-pending so it is a realistic dispute target
  const { data: order, error: ordErr } = await admin
    .from('orders')
    .insert({ buyer_id: bobId, seller_id: aliceId, order_type: 'product', product_id: product.id, status: 'received' })
    .select('id')
    .single()
  if (ordErr) throw new Error('order insert failed: ' + ordErr.message)
  // dispute on that order (service role bypasses the party/role INSERT policy)
  const { data: dispute, error: dispErr } = await admin
    .from('disputes')
    .insert({ order_id: order.id, created_by_role: 'buyer', reason: 'not_delivered', status: 'open' })
    .select('id')
    .single()
  if (dispErr) throw new Error('dispute insert failed: ' + dispErr.message)

  // dina = freelancer with one service listing, and a SERVICE order from bob. Exists purely so
  // orders_delivery_fee_requires_product (migration 20260801112027) has a row it can reject:
  // the CHECK is unreachable on INSERT because set_order_snapshot nulls the fee first, so the
  // only reachable violation is an UPDATE, and only service_role gets past the identity lock.
  const dinaId = await createUser('dina')
  {
    const { error } = await admin.from('profiles').update({ seller_type: 'freelancer' }).eq('id', dinaId)
    if (error) throw new Error('dina profile setup failed: ' + error.message)
  }
  const { data: fprofile, error: fpErr } = await admin
    .from('freelancer_profiles').insert({ profile_id: dinaId }).select('id').single()
  if (fpErr) throw new Error('freelancer_profile insert failed: ' + fpErr.message)
  const { data: listing, error: listErr } = await admin
    .from('service_listings')
    .insert({ freelancer_profile_id: fprofile.id, title: 'RLS Smoke Service', starting_price_tnd: 150, status: 'active' })
    .select('id')
    .single()
  if (listErr) throw new Error('service_listing insert failed: ' + listErr.message)
  const { data: svcOrder, error: svcErr } = await admin
    .from('orders')
    .insert({ buyer_id: bobId, seller_id: dinaId, order_type: 'service', service_listing_id: listing.id, status: 'pending' })
    .select('id')
    .single()
  if (svcErr) throw new Error('service order insert failed: ' + svcErr.message)

  const a = await authedClient(USERS.alice.email)
  const b = await authedClient(USERS.bob.email)
  const c = await authedClient(USERS.charlie.email) // NON-admin for now

  console.log('\nPhase 2 — assertions (charlie still NON-admin)')

  // A. profiles — column-level privacy (the crown-jewel invariant)
  {
    const { data, error } = await b.from('public_profiles').select('*').eq('id', aliceId).maybeSingle()
    check('A1 public_profiles exposes name+city of another user', !error && !!data && data.full_name === USERS.alice.fullName && !!data.city, error ? error.message : JSON.stringify(data))
    const leaked = data ? ['phone', 'email', 'date_of_birth'].filter((k) => data[k] !== undefined) : ['<no row>']
    check('A2 public_profiles HIDES phone/email/date_of_birth', leaked.length === 0, 'leaked: ' + leaked.join(','))
  }
  {
    const { data } = await b.from('profiles').select('id').eq('id', aliceId)
    check("A3 base profiles row of another user is NOT readable", rowCount(data) === 0, 'rows: ' + rowCount(data))
    const { data: own } = await b.from('profiles').select('id').eq('id', bobId)
    check('A4 own base profiles row IS readable (control)', rowCount(own) === 1, 'rows: ' + rowCount(own))
  }
  {
    const { data: withRel } = await b.rpc('get_contact_phone', { target: aliceId })
    check('A5 get_contact_phone returns phone WITH relationship (order)', withRel === USERS.alice.phone, 'got: ' + JSON.stringify(withRel))
    const { data: noRel } = await b.rpc('get_contact_phone', { target: charlieId })
    check('A6 get_contact_phone returns null WITHOUT relationship', noRel === null, 'got: ' + JSON.stringify(noRel))
  }

  // B. reports — party visibility
  let reportId = null
  {
    const { data, error } = await b.from('reports').insert({ reporter_id: bobId, target_type: 'product', target_id: product.id, reason: 'fake_scam' }).select('id').single()
    check('B1 reporter CAN create own report', !error && !!data && !!data.id, error ? error.message : 'no id')
    reportId = data ? data.id : null
  }
  if (reportId) {
    const { data: own } = await b.from('reports').select('id').eq('id', reportId)
    check('B2 reporter sees own report', rowCount(own) === 1, 'rows: ' + rowCount(own))
    const { data: other } = await a.from('reports').select('id').eq('id', reportId)
    check('B3 non-reporter non-admin CANNOT see the report', rowCount(other) === 0, 'rows: ' + rowCount(other))
  }

  // C. disputes — party visibility (charlie is non-party AND non-admin here)
  const disputeId = dispute.id
  {
    const { data: buyer } = await b.from('disputes').select('id').eq('id', disputeId)
    check('C1 buyer party sees dispute', rowCount(buyer) === 1, 'rows: ' + rowCount(buyer))
    const { data: seller } = await a.from('disputes').select('id').eq('id', disputeId)
    check('C2 seller party sees dispute', rowCount(seller) === 1, 'rows: ' + rowCount(seller))
    const { data: nonParty } = await c.from('disputes').select('id').eq('id', disputeId)
    check('C3 non-party non-admin CANNOT see dispute', rowCount(nonParty) === 0, 'rows: ' + rowCount(nonParty))
  }

  // D. admin_audit_log — non-admin denied (write + read)
  {
    const { error } = await c.rpc('log_admin_action', { p_action: 'rls_smoke_probe', p_target_type: 'report', p_target_id: reportId })
    check('D1a non-admin log_admin_action is REJECTED', !!error, error ? '(errored as expected)' : 'NO error — write was allowed!')
    const { count } = await admin.from('admin_audit_log').select('*', { count: 'exact', head: true }).eq('admin_id', charlieId)
    check('D1b non-admin write left ZERO audit rows', count === 0, 'rows for charlie: ' + count)
    const { data } = await c.from('admin_audit_log').select('id').limit(1)
    check('D3 non-admin CANNOT read audit log', rowCount(data) === 0, 'rows: ' + rowCount(data))
  }

  console.log('\nPhase 3 — promote charlie → admin (is_admin() reads the profiles table, so no re-auth needed)')
  {
    const { error } = await admin.from('profiles').update({ is_admin: true }).eq('id', charlieId)
    if (error) throw new Error('promote charlie failed: ' + error.message)
  }

  console.log('\nPhase 4 — assertions (charlie NOW admin) — positive controls for the denies above')
  if (reportId) {
    const { data } = await c.from('reports').select('id').eq('id', reportId)
    check('B5 admin sees the report (control for B3)', rowCount(data) === 1, 'rows: ' + rowCount(data))
  }
  {
    const { data } = await c.from('disputes').select('id').eq('id', disputeId)
    check('C4 admin sees the dispute (control for C3)', rowCount(data) === 1, 'rows: ' + rowCount(data))
  }
  {
    const { data, error } = await c.rpc('log_admin_action', { p_action: 'rls_smoke_probe', p_target_type: 'report', p_target_id: reportId })
    check('D2a admin CAN write audit log (control for D1a)', !error && !!data, error ? error.message : 'no id returned')
    const { count } = await admin.from('admin_audit_log').select('*', { count: 'exact', head: true }).eq('admin_id', charlieId)
    check('D2b admin write landed a row (control for D1b)', typeof count === 'number' && count >= 1, 'rows for charlie: ' + count)
    const { data: read } = await c.from('admin_audit_log').select('id').eq('admin_id', charlieId)
    check('D4 admin CAN read audit log (control for D3)', rowCount(read) >= 1, 'rows: ' + rowCount(read))
  }

  console.log('\nPhase 5 — moderation')
  {
    // E1 baseline: public sees the active product
    const { data: before } = await b.from('products').select('id').eq('id', product.id)
    check('E1 public sees active product (baseline)', rowCount(before) === 1, 'rows: ' + rowCount(before))
    // E2 admin hides it
    const { error } = await c.rpc('admin_hide_content', { target_type: 'product', target_id: product.id, reason: 'rls smoke moderation' })
    check('E2a admin_hide_content(product) succeeds', !error, error ? error.message : '')
    const { data: row } = await admin.from('products').select('status, admin_hidden_at').eq('id', product.id).single()
    check('E2b product is now status=hidden + admin_hidden_at set', !!row && row.status === 'hidden' && !!row.admin_hidden_at, JSON.stringify(row))
    // E3 the seller (owner, NON-admin) cannot OVERRIDE an admin moderation. The
    // enforce_admin_moderation_lock_products trigger blocks a non-admin from clearing the
    // marker or flipping status away from 'hidden' on admin-moderated content.
    // NB: this is NOT "public can't see the hidden product" — the products SELECT policy is
    // USING(true) (public catalog), so product/shop public-hiding is enforced at the APP
    // layer (PR-N cascade status/admin_hidden_at filtering), not by RLS. The real DB-layer
    // moderation boundary is this override lock (parallel to E4 on shops).
    const { error: overrideErr } = await a.from('products').update({ status: 'active', admin_hidden_at: null, admin_hidden_reason: null }).eq('id', product.id)
    const { data: locked } = await admin.from('products').select('status, admin_hidden_at').eq('id', product.id).single()
    check(
      'E3 non-admin owner CANNOT override admin moderation (enforce_admin_moderation_lock_products)',
      !!locked && locked.status === 'hidden' && !!locked.admin_hidden_at,
      'status=' + (locked ? locked.status : '?') + ' admin_hidden_at=' + (locked ? locked.admin_hidden_at : '?') + (overrideErr ? ' (update errored as expected: ' + overrideErr.message + ')' : ' (no error returned)'),
    )
  }
  {
    // E4 trigger enforcement: alice OWNS the shop (passes the owner-only UPDATE RLS) but
    // is NOT admin, so enforce_admin_marker_lock must block her from setting the marker.
    const { error } = await a.from('shops').update({ admin_hidden_at: new Date('2020-01-01').toISOString(), admin_hidden_reason: 'self-moderation attempt' }).eq('id', shop.id)
    const { data: row } = await admin.from('shops').select('admin_hidden_at').eq('id', shop.id).single()
    check('E4 non-admin owner CANNOT set shops.admin_hidden_at (enforce_admin_marker_lock trigger)', !!row && row.admin_hidden_at === null, 'admin_hidden_at: ' + (row ? row.admin_hidden_at : '?') + (error ? ' (update errored as expected: ' + error.message + ')' : ' (no error returned)'))
  }

  console.log('\nPhase 5b — Section F: privilege-escalation protection (PR-Z, post-audit CRIT-1 + IMP-1)')
  // Each F asserts BOTH that the authenticated probe is REJECTED and that the protected state is
  // UNCHANGED. Rejection may come from the column-level GRANT (plan-time 42501) or the guard
  // trigger (42501/23514) — both are valid, so we assert on the OUTCOME, not the message text.
  {
    // F1 — a non-admin cannot self-grant is_admin (the confirmed CRIT-1 vector).
    const { error } = await a.from('profiles').update({ is_admin: true }).eq('id', aliceId)
    const { data } = await admin.from('profiles').select('is_admin').eq('id', aliceId).single()
    check('F1 non-admin CANNOT self-grant is_admin', !!error && !!data && data.is_admin === false, 'err=' + (error ? 'yes' : 'NONE') + ' is_admin=' + (data ? data.is_admin : '?'))
  }
  {
    // F2 — a suspended user cannot self-clear their suspension. charlie (admin) suspends alice first.
    await c.rpc('admin_suspend_user', { target_user_id: aliceId, reason: 'F2 setup' })
    const { error } = await a.from('profiles').update({ suspended_at: null, suspended_reason: null }).eq('id', aliceId)
    const { data } = await admin.from('profiles').select('suspended_at').eq('id', aliceId).single()
    check('F2 suspended user CANNOT self-unsuspend', !!error && !!data && data.suspended_at !== null, 'err=' + (error ? 'yes' : 'NONE') + ' suspended_at=' + (data ? data.suspended_at : '?'))
    await c.rpc('admin_unsuspend_user', { target_user_id: aliceId }) // cleanup
  }
  {
    // F3 — the 18+ DB age gate. bob (seller_type null) is the clean consumer->seller transition.
    await admin.from('profiles').update({ date_of_birth: '2010-01-01' }).eq('id', bobId) // under 18
    const under = await b.from('profiles').update({ seller_type: 'freelancer' }).eq('id', bobId)
    const { data: afterUnder } = await admin.from('profiles').select('seller_type').eq('id', bobId).single()
    await admin.from('profiles').update({ date_of_birth: '2000-01-01' }).eq('id', bobId) // 18+
    const over = await b.from('profiles').update({ seller_type: 'freelancer' }).eq('id', bobId)
    const { data: afterOver } = await admin.from('profiles').select('seller_type').eq('id', bobId).single()
    check('F3 under-18 BLOCKED from becoming a seller, 18+ ALLOWED (control)',
      !!under.error && !!afterUnder && afterUnder.seller_type === null && !over.error && !!afterOver && afterOver.seller_type === 'freelancer',
      'under: err=' + (under.error ? 'yes' : 'NONE') + ' type=' + (afterUnder ? afterUnder.seller_type : '?') + ' | over: err=' + (over.error ? over.error.message : 'none') + ' type=' + (afterOver ? afterOver.seller_type : '?'))
  }
  {
    // F4 — a buyer cannot reassign their order to a different seller (IMP-1).
    const { error } = await b.from('orders').update({ seller_id: charlieId }).eq('id', order.id)
    const { data } = await admin.from('orders').select('seller_id').eq('id', order.id).single()
    check('F4 buyer CANNOT reassign order seller_id', !!error && !!data && data.seller_id === aliceId, 'err=' + (error ? 'yes' : 'NONE') + ' seller_id==alice? ' + (data ? (data.seller_id === aliceId) : '?'))
  }
  {
    // F5 — a buyer cannot change order quantity post-creation (IMP-1).
    const { error } = await b.from('orders').update({ quantity: 999 }).eq('id', order.id)
    const { data } = await admin.from('orders').select('quantity').eq('id', order.id).single()
    check('F5 buyer CANNOT change order quantity', !!error && !!data && data.quantity !== 999, 'err=' + (error ? 'yes' : 'NONE') + ' quantity=' + (data ? data.quantity : '?'))
  }
  {
    // F6 — regression control: a buyer CAN still cancel a pending order (lifecycle columns stay writable).
    const { data: pend } = await admin.from('orders').insert({ buyer_id: bobId, seller_id: aliceId, order_type: 'product', product_id: product.id, status: 'pending' }).select('id').single()
    const { error } = await b.from('orders').update({ status: 'cancelled', cancelled_by: 'buyer', cancellation_reason: 'F6 regression' }).eq('id', pend.id).eq('status', 'pending')
    const { data } = await admin.from('orders').select('status').eq('id', pend.id).single()
    check('F6 buyer CAN still cancel a pending order (regression control)', !error && !!data && data.status === 'cancelled', 'err=' + (error ? error.message : 'none') + ' status=' + (data ? data.status : '?'))
  }
  {
    // F7 — orders_delivery_fee_requires_product, the negative path. A service order must not
    // be able to carry a carrier fee: a service has no parcel. This is asserted with the
    // SERVICE ROLE deliberately — enforce_order_identity_lock returns early when auth.uid()
    // is null, so service_role is the ONLY caller that reaches the CHECK. If the constraint
    // were missing, this write would land and the failure would be silent.
    const { error } = await admin.from('orders').update({ delivery_fee_tnd: 9 }).eq('id', svcOrder.id)
    const { data } = await admin.from('orders').select('delivery_fee_tnd').eq('id', svcOrder.id).single()
    check('F7 service order CANNOT carry a delivery fee (CHECK)', !!error && !!data && data.delivery_fee_tnd === null, 'err=' + (error ? 'yes' : 'NONE — CHECK missing!') + ' fee=' + (data ? JSON.stringify(data.delivery_fee_tnd) : '?'))
  }
  {
    // F8 — delivery_fee_tnd joined the identity lock's frozen set. A buyer must not be able
    // to rewrite what they were charged. Same shape as F5 (quantity).
    const { error } = await b.from('orders').update({ delivery_fee_tnd: 0 }).eq('id', order.id)
    const { data } = await admin.from('orders').select('delivery_fee_tnd').eq('id', order.id).single()
    check('F8 buyer CANNOT change order delivery fee', !!error && !!data && Number(data.delivery_fee_tnd) !== 0, 'err=' + (error ? 'yes' : 'NONE') + ' fee=' + (data ? data.delivery_fee_tnd : '?'))
  }
  {
    // F9 — control for F8: the fee was actually frozen at insert, so F8 is testing a real
    // value rather than passing vacuously on a NULL column.
    const { data } = await admin.from('orders').select('delivery_fee_tnd').eq('id', order.id).single()
    check('F9 product order HAS a frozen delivery fee (control for F8)', !!data && data.delivery_fee_tnd !== null && Number(data.delivery_fee_tnd) === 7, 'fee=' + (data ? JSON.stringify(data.delivery_fee_tnd) : '?'))
  }

  // ── Phase 5b — STORAGE RLS on the shop-scoped buckets ───────────────────────────────────────
  //
  // These are the assertions whose absence let migration 20260731073614 ship four policies that
  // could never grant. The bug was an alias capture — `(storage.foldername(name))[1]` inside
  // `from shops s` bound to shops.name, not storage.objects.name — and it was invisible to every
  // existing test because NO TEST EVER ATTEMPTED A WRITE. Repaired in 20260804104541.
  //
  // Every deny below is verified TWICE: once by what the authenticated client saw, and once by the
  // service role reporting what actually landed. That pairing is the point — a storage call can
  // fail for a dozen reasons that have nothing to do with RLS, and `.remove()` on invisible rows
  // reports success while deleting nothing.
  console.log('\nPhase 5c — storage RLS (product-images, shop-assets)')
  {
    const a = await authedClient(USERS.alice.email)
    const BUCKET = 'product-images'
    const ownDir = shop.id + '/' + SMOKE_FOLDER
    const foreignDir = foreignShop.id + '/' + SMOKE_FOLDER
    const ownObj = ownDir + '/own.webp'
    const foreignPlanted = foreignDir + '/planted-by-service-role.webp'
    const foreignAttempt = foreignDir + '/alice-should-not-land.webp'
    const rootAttempt = 'alice-should-not-land-at-root.webp'
    const up = { contentType: 'image/webp', upsert: false }

    // Plant an object under CHARLIE's shop with the service role. This is the positive control
    // that makes S5's "alice sees nothing" and S7's "alice deletes nothing" meaningful: without a
    // real object there, both would pass vacuously against an empty folder.
    const { error: plantErr } = await admin.storage.from(BUCKET).upload(foreignPlanted, WEBP_1X1, up)
    if (plantErr) throw new Error('planting foreign object failed: ' + plantErr.message)

    // S1 — the assertion that would have caught the bug.
    {
      const { error } = await a.storage.from(BUCKET).upload(ownObj, WEBP_1X1, up)
      const landed = await objectExists(BUCKET, ownObj)
      check('S1 shop owner CAN upload under their OWN shop path', !error && landed,
        'err=' + (error ? error.message : 'none') + ' landed=' + landed)
    }
    // S2 — foreign shop path, refused, and nothing landed.
    {
      const { error } = await a.storage.from(BUCKET).upload(foreignAttempt, WEBP_1X1, up)
      const landed = await objectExists(BUCKET, foreignAttempt)
      check('S2 shop owner CANNOT upload under ANOTHER shop path', !!error && !landed,
        'err=' + (error ? 'yes' : 'NONE') + ' landed=' + landed)
    }
    // S3 — bucket root has no shop segment, so foldername()[1] is NULL → denied.
    {
      const { error } = await a.storage.from(BUCKET).upload(rootAttempt, WEBP_1X1, up)
      const landed = await objectExists(BUCKET, rootAttempt)
      check('S3 shop owner CANNOT upload at bucket ROOT (no shop folder)', !!error && !landed,
        'err=' + (error ? 'yes' : 'NONE') + ' landed=' + landed)
    }
    // S4 — the new SELECT policy. Also the positive control that S1 landed somewhere ALICE can
    // see, not merely somewhere the service role can see.
    {
      const { data, error } = await a.storage.from(BUCKET).list(ownDir, { limit: 100 })
      const sees = Array.isArray(data) && data.some((e) => e.name === 'own.webp')
      check('S4 shop owner CAN list their own folder (SELECT policy) and sees S1', !error && sees,
        'err=' + (error ? error.message : 'none') + ' rows=' + rowCount(data))
    }
    // S5 — deny, meaningful only because the service role planted a real object there.
    {
      const { data } = await a.storage.from(BUCKET).list(foreignDir, { limit: 100 })
      const plantedReallyExists = await objectExists(BUCKET, foreignPlanted)
      check('S5 shop owner CANNOT list ANOTHER shop folder (control: object IS there)',
        plantedReallyExists && Array.isArray(data) && data.length === 0,
        'control=' + plantedReallyExists + ' aliceSaw=' + rowCount(data))
    }
    // S6 — DELETE on own path, verified by absence rather than by the call's return value.
    {
      const { error } = await a.storage.from(BUCKET).remove([ownObj])
      const stillThere = await objectExists(BUCKET, ownObj)
      check('S6 shop owner CAN delete their own object', !error && !stillThere,
        'err=' + (error ? error.message : 'none') + ' stillThere=' + stillThere)
    }
    // S7 — the trap. `.remove()` on a row the caller cannot see returns SUCCESS with an empty
    // array, so asserting on the error would be a false green. The only real assertion is that
    // the object SURVIVED.
    {
      const { error, data } = await a.storage.from(BUCKET).remove([foreignPlanted])
      const survived = await objectExists(BUCKET, foreignPlanted)
      check('S7 shop owner CANNOT delete ANOTHER shop object (asserts it SURVIVED)', survived,
        'survived=' + survived + ' removeErr=' + (error ? 'yes' : 'none') + ' removedRows=' + rowCount(data))
    }
  }

  console.log('\nPhase 6 — teardown')
  await teardown()
  const remaining = await findTestUserIds()
  check('Z cleanup removed all test users (0 remain)', remaining.length === 0, 'remaining: ' + remaining.length)

  console.log('\n=== RLS smoke summary: ' + passed + ' passed, ' + failures.length + ' failed ===')
  if (failures.length > 0) {
    console.log('Failures:')
    for (const f of failures) console.log('  - ' + f.label + (f.detail ? ' :: ' + f.detail : ''))
    process.exit(1)
  }
  console.log('All assertions green.')
  process.exit(0)
}

main().catch(async (e) => {
  console.error('\nFATAL: ' + (e && e.message ? e.message : e))
  // Best-effort cleanup so a crash mid-run does not wedge the next run.
  try {
    await teardown()
    console.error('(cleanup after fatal succeeded)')
  } catch (ce) {
    console.error('cleanup after fatal ALSO failed — manual SQL cleanup needed (see docs/operations.md): ' + (ce && ce.message ? ce.message : ce))
  }
  process.exit(1)
})
