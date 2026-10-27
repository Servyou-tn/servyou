// Pre-launch cleanup — deletes leftover test accounts and orphan storage files from PRODUCTION.
//
// ⚑ DRY RUN BY DEFAULT. Nothing is written unless `--apply` is passed, and `--apply` refuses to start
//   while the plan has a single refusal, or while its size differs from the approved dry run.
// ⚑ EXACT TARGETS ONLY. Accounts and files come from a local, untracked JSON file (the repo is public;
//   emails never land in git). No pattern ever selects a target: a typo matches nothing, it never
//   matches more. A blank or malformed entry aborts the run.
// ⚑ NEVER rls-smoke. This is not that script and does not share its domain sweep.
//
// Usage (from the repo root, with .env.local holding NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY):
//   node scripts/prelaunch-cleanup.mjs                                  # dry run, default targets file
//   node scripts/prelaunch-cleanup.mjs --targets <file>.local.json      # dry run, another file
//   node scripts/prelaunch-cleanup.mjs --apply --expect-accounts N --expect-files M
//       act (only after the go): N / M must equal the plan, so nothing changed since the approved dry run
//
// Targets file (default scripts/cleanup/targets.local.json — gitignored; any name must end .local.json):
//   {
//     "deleteUsers":   ["exact@email", ...],
//     "orphanObjects": [{ "bucket": "avatars", "path": "<uid>/<file>.webp" }, ...],
//     "keep":          ["exact@email", ...]          // safety net: a delete target listed here is refused
//   }
//
// Per account, the plan REFUSES when the account is an admin, is on the keep list, or owns anything a
// real flow points at: orders (as buyer or seller), job posts, job responses, service listings, shops,
// products, admin audit rows (ON DELETE RESTRICT). Otherwise it lists the account's storage files (each
// bucket's `<uid>/` folder plus its uploaded_objects provenance paths). On --apply each account is
// deleted with auth.admin.deleteUser (cascades profiles and every owned row) and only then are its files
// removed through the Storage API — storage.objects has no FK to auth.users, so they would otherwise stay.
// Each orphan file is re-checked before removal: it must exist, have no provenance row, and be referenced
// by none of IMAGE_COLUMNS. Storage URLs live in exactly those five columns (live scan of every public
// text / jsonb column, 2026-10-27); add any new image column there before the next run.
// Before acting, the target profiles and file lists are dumped to scripts/cleanup/backup-<ts>.local.json
// (gitignored). After acting, every target is re-read: users gone, profiles gone, files gone.

import fs from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { loadEnv } from './gate/session.mjs'

const PROJECT_HOST = 'xggomcitqrkaylqezjjz.supabase.co'
const IMAGE_COLUMNS = [
  ['profiles', 'avatar_url'],
  ['shops', 'logo_url'],
  ['shops', 'banner_url'],
  ['product_images', 'image_url'],
  ['freelancer_portfolio_items', 'image_url'],
]

const args = process.argv.slice(2)
const APPLY = args.includes('--apply')
const argValue = (flag) => {
  const i = args.indexOf(flag)
  return i >= 0 ? args[i + 1] : undefined
}
const TARGETS_FILE = argValue('--targets') ?? 'scripts/cleanup/targets.local.json'
const EXPECT_ACCOUNTS = argValue('--expect-accounts')
const EXPECT_FILES = argValue('--expect-files')
// Only *.local.json is gitignored: any other name could be committed with real emails in it.
if (!TARGETS_FILE.endsWith('.local.json')) throw new Error('the targets file name must end in .local.json (gitignored)')

const env = { ...loadEnv(), ...process.env }
const url = env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !serviceKey) throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required (.env.local)')
if (new URL(url).host !== PROJECT_HOST) throw new Error(`refusing: ${new URL(url).host} is not ${PROJECT_HOST}`)

const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })

const targetsPath = path.resolve(process.cwd(), TARGETS_FILE)
if (!fs.existsSync(targetsPath)) throw new Error(`missing targets file ${TARGETS_FILE}`)
const targets = JSON.parse(fs.readFileSync(targetsPath, 'utf8'))

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/
function emails(list, label) {
  const out = (list ?? []).map((e) => String(e).trim().toLowerCase())
  for (const e of out) if (!EMAIL.test(e)) throw new Error(`${label}: not an exact email: ${JSON.stringify(e)}`)
  return [...new Set(out)]
}
const deleteUsers = emails(targets.deleteUsers, 'deleteUsers')
const keep = new Set(emails(targets.keep, 'keep'))
const orphanObjects = [
  ...new Map(
    (targets.orphanObjects ?? []).map((o) => {
      if (!o?.bucket || !o?.path || o.path.startsWith('/') || o.path.includes('..')) {
        throw new Error(`orphanObjects: invalid entry ${JSON.stringify(o)}`)
      }
      return [`${o.bucket}\n${o.path}`, { bucket: o.bucket, path: o.path }]
    }),
  ).values(),
]

// ─── helpers ────────────────────────────────────────────────────────────────────────────────────

function fail(what, error) {
  throw new Error(`${what}: ${error.message}${error.code ? ` (${error.code})` : ''}`)
}

// Every page until an empty one: never trust a page size the server may cap.
async function allAuthUsers() {
  const users = []
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) fail('listUsers', error)
    if (data.users.length === 0) return users
    users.push(...data.users)
  }
}

async function count(table, apply) {
  const { count: n, error } = await apply(admin.from(table).select('*', { count: 'exact', head: true }))
  if (error) fail(`count ${table}`, error)
  if (n === null || n === undefined) throw new Error(`count ${table}: no count returned`)
  return n
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

// Every file under `<bucket>/<folder>/`, recursively (folders are entries with a null id). A uid folder
// name is a fixed-length uuid, so it can never match another user's folder.
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

// `search` is a prefix match, so the result is filtered to the exact name of a real file.
async function fileExists(bucket, p) {
  const dir = p.includes('/') ? p.slice(0, p.lastIndexOf('/')) : ''
  const name = p.slice(p.lastIndexOf('/') + 1)
  const { data, error } = await admin.storage.from(bucket).list(dir, { limit: 1000, search: name })
  if (error) fail(`list ${bucket}/${dir}`, error)
  return data.some((e) => e.name === name && e.id !== null)
}

// Is `<bucket>/<path>` referenced by any image column? A CONTAINS match (a query string, a token or a
// prefix cannot hide it), on the raw and the percent-encoded path. LIKE wildcards in a path can only
// widen the match — a false « referenced », which refuses: fail-safe.
async function fileReferences(bucket, p) {
  const needles = [...new Set([`${bucket}/${p}`, `${bucket}/${encodeURI(p)}`])]
  let refs = 0
  for (const needle of needles) {
    for (const [table, column] of IMAGE_COLUMNS) refs += await count(table, (q) => q.like(column, `%${needle}%`))
  }
  const provenance = await count('uploaded_objects', (q) => q.eq('bucket', bucket).eq('path', p))
  return { refs, provenance }
}

// ─── plan ───────────────────────────────────────────────────────────────────────────────────────

const log = (...a) => console.log(...a)
const refusals = []
const skips = []

log(`prelaunch-cleanup — ${APPLY ? 'APPLY' : 'DRY RUN (nothing is written)'}`)
log(`project ${new URL(url).host}, targets ${TARGETS_FILE}`)

const users = await allAuthUsers()
const byEmail = new Map(users.filter((u) => u.email).map((u) => [u.email.toLowerCase(), u]))
log(`auth.users before: ${users.length}`)

const userPlan = []
log(`\n── accounts (${deleteUsers.length} listed) ──`)
for (const email of deleteUsers) {
  const user = byEmail.get(email)
  if (!user) {
    log(`  SKIP     ${email} — not found`)
    skips.push(email)
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
  if (!(await fileExists(bucket, p))) {
    log(`  SKIP     ${bucket}/${p} — not found`)
    skips.push(`${bucket}/${p}`)
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
log(`\nplan: delete ${userPlan.length} account(s), remove ${fileCount} file(s); ${refusals.length} refusal(s), ${skips.length} skipped (not found)`)

if (!APPLY) {
  log(
    refusals.length
      ? 'dry run — nothing written. The plan has refusals: --apply would refuse.'
      : `dry run — nothing written. After the go: --apply --expect-accounts ${userPlan.length} --expect-files ${fileCount}`,
  )
  process.exit(refusals.length ? 2 : 0)
}
if (refusals.length) {
  console.error('REFUSING to apply: the plan has refusals. Fix the targets file and dry-run again.')
  process.exit(2)
}
if (String(userPlan.length) !== EXPECT_ACCOUNTS || String(fileCount) !== EXPECT_FILES) {
  console.error(
    `REFUSING to apply: the plan is ${userPlan.length} account(s) / ${fileCount} file(s), but --expect-accounts ` +
      `${EXPECT_ACCOUNTS ?? '(missing)'} / --expect-files ${EXPECT_FILES ?? '(missing)'} were given. Dry-run again and pass the approved numbers.`,
  )
  process.exit(2)
}

// ─── apply ──────────────────────────────────────────────────────────────────────────────────────

// A local, gitignored record of what is about to go (cascaded rows are not recoverable).
const stamp = new Date().toISOString().replace(/[:.]/g, '-')
const backupPath = path.resolve(process.cwd(), `scripts/cleanup/backup-${stamp}.local.json`)
const backup = { at: new Date().toISOString(), accounts: [], orphanFiles: filePlan }
for (const u of userPlan) {
  const { data: prof, error } = await admin.from('profiles').select('*').eq('id', u.id).maybeSingle()
  if (error) fail('backup profiles', error)
  backup.accounts.push({ email: u.email, id: u.id, profile: prof, files: u.files })
}
fs.mkdirSync(path.dirname(backupPath), { recursive: true })
fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2))
log(`\nbackup written: ${path.relative(process.cwd(), backupPath)}`)

async function removeFiles(list) {
  const byBucket = new Map()
  for (const f of list) byBucket.set(f.bucket, [...(byBucket.get(f.bucket) ?? []), f.path])
  for (const [bucket, paths] of byBucket) {
    const { error } = await admin.storage.from(bucket).remove(paths)
    if (error) fail(`remove ${bucket}`, error)
    log(`  removed ${paths.length} file(s) from ${bucket}`)
  }
}

// Each account: the user first (if that fails, its files stay untouched), then its files. Every step is
// caught, so one failure never skips the verification below.
log('\n── applying ──')
const stepFailures = []
for (const u of userPlan) {
  try {
    const { error } = await admin.auth.admin.deleteUser(u.id)
    if (error) fail(`deleteUser ${u.email}`, error)
    log(`  deleted ${u.email}`)
  } catch (e) {
    stepFailures.push(e.message)
    console.error(`  FAILED ${e.message} — its files are left in place`)
    continue
  }
  try {
    if (u.files.length) await removeFiles(u.files)
  } catch (e) {
    stepFailures.push(e.message)
    console.error(`  FAILED ${e.message}`)
  }
}
try {
  if (filePlan.length) await removeFiles(filePlan)
} catch (e) {
  stepFailures.push(e.message)
  console.error(`  FAILED ${e.message}`)
}

// ─── verify ─────────────────────────────────────────────────────────────────────────────────────

log('\n── verify ──')
let problems = 0
for (const u of userPlan) {
  const { data, error } = await admin.auth.admin.getUserById(u.id)
  // Gone means the Auth API said « not found » — any other error proves nothing.
  const gone = !data?.user && (error?.status === 404 || error?.code === 'user_not_found')
  const profiles = await count('profiles', (q) => q.eq('id', u.id))
  const ok = gone && profiles === 0
  if (!ok) problems++
  const state = data?.user ? 'still present' : gone ? 'gone' : `unknown (${error?.message ?? 'no error'})`
  log(`  ${ok ? 'ok  ' : 'FAIL'} ${u.email} — auth user ${state}, profiles ${profiles}`)
}
for (const f of [...userPlan.flatMap((u) => u.files), ...filePlan]) {
  const still = await fileExists(f.bucket, f.path)
  if (still) problems++
  log(`  ${still ? 'FAIL' : 'ok  '} ${f.bucket}/${f.path} — ${still ? 'still present' : 'gone'}`)
}
log(`auth.users after: ${(await allAuthUsers()).length}`)
if (problems || stepFailures.length) {
  console.error(`${stepFailures.length} failed step(s), ${problems} verification problem(s)`)
  process.exit(1)
}
log(`done — every planned target verified gone${skips.length ? `; ${skips.length} listed target(s) were not found and skipped` : ''}.`)
