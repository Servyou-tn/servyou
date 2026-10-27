// Pre-launch cleanup — deletes leftover test accounts and orphan storage files from PRODUCTION.
//
// ⚑ DRY RUN BY DEFAULT. Nothing is written unless `--apply` is passed, and `--apply` refuses to start
//   while the plan has a single refusal. Run the dry run, read it, get the go, then apply.
// ⚑ EXACT TARGETS ONLY. Accounts and files come from a local, untracked JSON file (the repo is public;
//   emails never land in git). No pattern ever selects a target: a typo matches nothing, it never
//   matches more.
// ⚑ NEVER rls-smoke. This is not that script and does not share its domain sweep.
//
// Usage (from the repo root, with .env.local holding NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY):
//   node scripts/prelaunch-cleanup.mjs                                  # dry run, default targets file
//   node scripts/prelaunch-cleanup.mjs --targets <file>                 # dry run, another file
//   node scripts/prelaunch-cleanup.mjs --apply                          # act (only after the go)
//
// Targets file (default scripts/cleanup/targets.local.json — gitignored):
//   {
//     "deleteUsers":   ["exact@email", ...],
//     "orphanObjects": [{ "bucket": "avatars", "path": "<uid>/<file>.webp" }, ...],
//     "keep":          ["exact@email", ...]          // safety net: a delete target listed here is refused
//   }
//
// Per account, the plan REFUSES when the account is an admin, is on the keep list, or owns anything a
// real flow points at: orders (as buyer or seller), job posts, job responses, service listings, shops,
// products, admin audit rows (ON DELETE RESTRICT). Otherwise it lists the account's storage files (each
// bucket's `<uid>/` folder plus its uploaded_objects provenance paths) and deletes them through the
// Storage API — storage.objects has no FK to auth.users, so deleting the user would orphan them — then
// deletes the user with auth.admin.deleteUser, which cascades profiles and every owned row.
// Each orphan file is re-checked before removal: it must exist, have no provenance row, and be referenced
// by no avatar / shop logo / banner / product image / portfolio image.
// After --apply, every target is re-read: users gone, profiles gone, files gone.

import fs from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { loadEnv } from './gate/session.mjs'

const args = process.argv.slice(2)
const APPLY = args.includes('--apply')
const targetsArg = args.indexOf('--targets')
const TARGETS_FILE = targetsArg >= 0 ? args[targetsArg + 1] : 'scripts/cleanup/targets.local.json'

const env = { ...loadEnv(), ...process.env }
const url = env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !serviceKey) throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required (.env.local)')

const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })

const targetsPath = path.resolve(process.cwd(), TARGETS_FILE)
if (!fs.existsSync(targetsPath)) throw new Error(`missing targets file ${TARGETS_FILE}`)
const targets = JSON.parse(fs.readFileSync(targetsPath, 'utf8'))
const deleteUsers = (targets.deleteUsers ?? []).map((e) => e.trim().toLowerCase())
const keep = new Set((targets.keep ?? []).map((e) => e.trim().toLowerCase()))
const orphanObjects = targets.orphanObjects ?? []

// ─── helpers ────────────────────────────────────────────────────────────────────────────────────

function fail(what, error) {
  throw new Error(`${what}: ${error.message}${error.code ? ` (${error.code})` : ''}`)
}

async function allAuthUsers() {
  const users = []
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) fail('listUsers', error)
    users.push(...data.users)
    if (data.users.length < 1000) return users
  }
}

async function count(table, apply) {
  const { count: n, error } = await apply(admin.from(table).select('*', { count: 'exact', head: true }))
  if (error) fail(`count ${table}`, error)
  return n ?? 0
}

async function ownership(userId) {
  const { data: fps, error: fpErr } = await admin.from('freelancer_profiles').select('id').eq('profile_id', userId)
  if (fpErr) fail('freelancer_profiles', fpErr)
  const { data: shops, error: shopErr } = await admin.from('shops').select('id').eq('owner_id', userId)
  if (shopErr) fail('shops', shopErr)
  const fpIds = (fps ?? []).map((r) => r.id)
  const shopIds = (shops ?? []).map((r) => r.id)
  return {
    orders: await count('orders', (q) => q.or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)),
    job_posts: await count('job_posts', (q) => q.eq('consumer_id', userId)),
    job_responses: await count('job_responses', (q) => q.eq('freelancer_id', userId)),
    listings: fpIds.length ? await count('service_listings', (q) => q.in('freelancer_profile_id', fpIds)) : 0,
    shops: shopIds.length,
    products: shopIds.length ? await count('products', (q) => q.in('shop_id', shopIds)) : 0,
    audit_rows: await count('admin_audit_log', (q) => q.eq('admin_id', userId)),
  }
}

let bucketsCache
async function buckets() {
  if (!bucketsCache) {
    const { data, error } = await admin.storage.listBuckets()
    if (error) fail('listBuckets', error)
    bucketsCache = data.map((b) => b.id)
  }
  return bucketsCache
}

// Every file under `<bucket>/<folder>/`, recursively (folders are entries with a null id).
async function listFolder(bucket, folder) {
  const out = []
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await admin.storage.from(bucket).list(folder, { limit: 1000, offset })
    if (error) fail(`list ${bucket}/${folder}`, error)
    for (const entry of data) {
      const full = `${folder}/${entry.name}`
      if (entry.id === null) out.push(...(await listFolder(bucket, full)))
      else out.push(full)
    }
    if (data.length < 1000) return out
  }
}

async function userFiles(userId) {
  const files = new Map() // `${bucket}\n${path}` -> { bucket, path }
  for (const bucket of await buckets()) {
    for (const p of await listFolder(bucket, userId)) files.set(`${bucket}\n${p}`, { bucket, path: p })
  }
  const { data: prov, error } = await admin.from('uploaded_objects').select('bucket, path').eq('owner_id', userId)
  if (error) fail('uploaded_objects', error)
  for (const row of prov ?? []) files.set(`${row.bucket}\n${row.path}`, { bucket: row.bucket, path: row.path })
  return [...files.values()]
}

async function fileExists(bucket, p) {
  const dir = p.includes('/') ? p.slice(0, p.lastIndexOf('/')) : ''
  const name = p.slice(p.lastIndexOf('/') + 1)
  const { data, error } = await admin.storage.from(bucket).list(dir, { limit: 1000, search: name })
  if (error) fail(`list ${bucket}/${dir}`, error)
  return data.some((e) => e.name === name && e.id !== null)
}

// Is `<bucket>/<path>` referenced by any image column? Matched on the URL suffix.
async function fileReferences(bucket, p) {
  const suffix = `%/${bucket}/${p}`
  const checks = [
    ['profiles', 'avatar_url'],
    ['shops', 'logo_url'],
    ['shops', 'banner_url'],
    ['product_images', 'image_url'],
    ['freelancer_portfolio_items', 'image_url'],
  ]
  let refs = 0
  for (const [table, column] of checks) refs += await count(table, (q) => q.like(column, suffix))
  const { count: prov, error } = await admin
    .from('uploaded_objects')
    .select('*', { count: 'exact', head: true })
    .eq('bucket', bucket)
    .eq('path', p)
  if (error) fail('uploaded_objects', error)
  return { refs, provenance: prov ?? 0 }
}

// ─── plan ───────────────────────────────────────────────────────────────────────────────────────

const log = (...a) => console.log(...a)
const refusals = []

log(`prelaunch-cleanup — ${APPLY ? 'APPLY' : 'DRY RUN (nothing is written)'}`)
log(`project ${new URL(url).host}, targets ${TARGETS_FILE}`)

const users = await allAuthUsers()
const byEmail = new Map(users.map((u) => [(u.email ?? '').toLowerCase(), u]))
log(`auth.users before: ${users.length}`)

const userPlan = []
log(`\n── accounts (${deleteUsers.length} listed) ──`)
for (const email of deleteUsers) {
  const user = byEmail.get(email)
  if (!user) {
    log(`  SKIP     ${email} — not found`)
    continue
  }
  const reasons = []
  if (keep.has(email)) reasons.push('on the keep list')
  const { data: prof, error: profErr } = await admin.from('profiles').select('is_admin').eq('id', user.id).maybeSingle()
  if (profErr) fail('profiles', profErr)
  if (prof?.is_admin) reasons.push('is an admin')
  const owns = await ownership(user.id)
  for (const [k, n] of Object.entries(owns)) if (n > 0) reasons.push(`owns ${n} ${k}`)
  const files = await userFiles(user.id)
  if (reasons.length) {
    refusals.push(`${email}: ${reasons.join(', ')}`)
    log(`  REFUSE   ${email} — ${reasons.join(', ')}`)
  } else {
    log(`  DELETE   ${email} (${user.id}) — owns nothing; ${files.length} storage file(s)`)
    for (const f of files) log(`             file ${f.bucket}/${f.path}`)
    userPlan.push({ email, id: user.id, files })
  }
}

const filePlan = []
log(`\n── orphan files (${orphanObjects.length} listed) ──`)
for (const { bucket, path: p } of orphanObjects) {
  const exists = await fileExists(bucket, p)
  if (!exists) {
    log(`  SKIP     ${bucket}/${p} — not found`)
    continue
  }
  const { refs, provenance } = await fileReferences(bucket, p)
  if (refs > 0 || provenance > 0) {
    refusals.push(`${bucket}/${p}: ${refs} reference(s), ${provenance} provenance row(s)`)
    log(`  REFUSE   ${bucket}/${p} — ${refs} reference(s), ${provenance} provenance row(s)`)
  } else {
    log(`  REMOVE   ${bucket}/${p} — unreferenced, no provenance`)
    filePlan.push({ bucket, path: p })
  }
}

const fileCount = userPlan.reduce((n, u) => n + u.files.length, 0) + filePlan.length
log(`\nplan: delete ${userPlan.length} account(s), remove ${fileCount} file(s); ${refusals.length} refusal(s)`)

if (!APPLY) {
  log('dry run — nothing written. Re-run with --apply only after the go.')
  process.exit(refusals.length ? 2 : 0)
}
if (refusals.length) {
  console.error('REFUSING to apply: the plan has refusals. Fix the targets file and dry-run again.')
  process.exit(2)
}

// ─── apply ──────────────────────────────────────────────────────────────────────────────────────

async function removeFiles(list) {
  const byBucket = new Map()
  for (const f of list) byBucket.set(f.bucket, [...(byBucket.get(f.bucket) ?? []), f.path])
  for (const [bucket, paths] of byBucket) {
    const { error } = await admin.storage.from(bucket).remove(paths)
    if (error) fail(`remove ${bucket}`, error)
    log(`  removed ${paths.length} file(s) from ${bucket}`)
  }
}

log('\n── applying ──')
await removeFiles([...userPlan.flatMap((u) => u.files), ...filePlan])
for (const u of userPlan) {
  const { error } = await admin.auth.admin.deleteUser(u.id)
  if (error) fail(`deleteUser ${u.email}`, error)
  log(`  deleted ${u.email}`)
}

// ─── verify ─────────────────────────────────────────────────────────────────────────────────────

log('\n── verify ──')
let problems = 0
for (const u of userPlan) {
  const { data } = await admin.auth.admin.getUserById(u.id)
  const profiles = await count('profiles', (q) => q.eq('id', u.id))
  const ok = !data?.user && profiles === 0
  if (!ok) problems++
  log(`  ${ok ? 'ok  ' : 'FAIL'} ${u.email} — auth user ${data?.user ? 'still present' : 'gone'}, profiles ${profiles}`)
}
for (const f of [...userPlan.flatMap((u) => u.files), ...filePlan]) {
  const still = await fileExists(f.bucket, f.path)
  if (still) problems++
  log(`  ${still ? 'FAIL' : 'ok  '} ${f.bucket}/${f.path} — ${still ? 'still present' : 'gone'}`)
}
log(`auth.users after: ${(await allAuthUsers()).length}`)
if (problems) {
  console.error(`${problems} verification problem(s)`)
  process.exit(1)
}
log('done — every target verified gone.')
