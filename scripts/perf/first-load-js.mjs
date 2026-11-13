// First-load JavaScript budget for the public pages (speed PR-1, audit M8). Run after `next build`:
//   node scripts/perf/first-load-js.mjs
// CI runs it after the Build step and fails the job when a page goes over its budget.
//
// First-load JS of a page = the root main files every page loads (.next/build-manifest.json `rootMainFiles`) + the files
// its route's client manifest lists for the root layout, the error / not-found boundaries and the page itself
// (`entryJSFiles` in .next/server/app/<route>/page_client-reference-manifest.js), each counted once, gzip level 9. Chunks a
// page loads later (the deferred browser Sentry, dynamic imports) are not first-load JS and are not counted.
//
// The pages are PUBLIC_PAGE_FILES in src/lib/seo/routes.ts, so a new public page cannot slip past the budget: a page with
// no budget fails, and so does a budget for a page that no longer exists. Budgets are in KB (1024 bytes), in
// scripts/perf/first-load-budget.json, set a few KB above the measured size. Raise one only on purpose, in the PR that
// adds the weight, and say why there.
import { readFileSync, existsSync } from 'node:fs'
import { gzipSync } from 'node:zlib'
import { join } from 'node:path'
import vm from 'node:vm'

const ROOT = process.cwd()
const NEXT = join(ROOT, '.next')
// Every public page measured 450–540 KB (2026-11-13) and the root main files alone are ~130 KB. A total below this floor
// means the manifests no longer list what this script expects (a Next.js upgrade renamed them) — fail rather than pass.
const PLAUSIBLE_MIN_KB = 250

const errors = []
const fail = (message) => errors.push(message)

function publicPageFiles() {
  const source = readFileSync(join(ROOT, 'src/lib/seo/routes.ts'), 'utf8')
  const block = /export const PUBLIC_PAGE_FILES = \[([\s\S]*?)\] as const/.exec(source)
  const files = block ? [...block[1].matchAll(/'([^']+)'/g)].map((m) => m[1]) : []
  if (files.length === 0) throw new Error('Could not read PUBLIC_PAGE_FILES from src/lib/seo/routes.ts')
  return files
}

function rootMainFiles() {
  const file = join(NEXT, 'build-manifest.json')
  if (!existsSync(file)) throw new Error('.next/build-manifest.json is missing: run `next build` first')
  const files = JSON.parse(readFileSync(file, 'utf8')).rootMainFiles
  if (!Array.isArray(files) || files.length === 0) throw new Error('build-manifest.json has no rootMainFiles')
  return files
}

/**
 * 'marche/services/page.tsx' → the JS files its client reference manifest lists, or null when the manifest is missing or
 * does not list the page's own entry (an empty `entryJSFiles` would otherwise measure the root files only and pass).
 */
function routeEntryFiles(pageFile) {
  const dir = pageFile.replace(/(^|\/)page\.tsx$/, '')
  const manifestFile = join(NEXT, 'server/app', dir, 'page_client-reference-manifest.js')
  if (!existsSync(manifestFile)) return null
  const context = {}
  vm.createContext(context)
  vm.runInContext(readFileSync(manifestFile, 'utf8'), context)
  const entries = context.__RSC_MANIFEST?.[dir ? `/${dir}/page` : '/page']?.entryJSFiles
  const pageEntry = entries?.[`[project]/src/app/${dir ? `${dir}/` : ''}page`]
  if (!Array.isArray(pageEntry) || pageEntry.length === 0) return null
  return Object.values(entries).flat()
}

const gzipCache = new Map()
function gzipBytes(file) {
  if (!gzipCache.has(file)) {
    const path = join(NEXT, file)
    if (!existsSync(path)) throw new Error(`${file} is listed in a manifest but missing from .next`)
    gzipCache.set(file, gzipSync(readFileSync(path), { level: 9 }).length)
  }
  return gzipCache.get(file)
}

const budgets = JSON.parse(readFileSync(join(ROOT, 'scripts/perf/first-load-budget.json'), 'utf8')).budgetsKb
const pages = publicPageFiles()
const shared = rootMainFiles()
const rows = []

for (const page of pages) {
  const entries = routeEntryFiles(page)
  if (!entries) {
    fail(`${page}: no client reference manifest listing the page's own entry in .next/server/app (was the page built?)`)
    continue
  }
  const files = new Set([...shared, ...entries])
  const kb = [...files].reduce((sum, file) => sum + gzipBytes(file), 0) / 1024
  const budget = budgets[page]
  rows.push({ page, kb, budget, files: files.size })
  if (kb < PLAUSIBLE_MIN_KB) fail(`${page}: ${kb.toFixed(1)} KB is implausibly small — the manifest format probably changed`)
  if (budget === undefined) fail(`${page}: no budget in scripts/perf/first-load-budget.json`)
  else if (kb > budget) fail(`${page}: ${kb.toFixed(1)} KB is over its ${budget} KB budget`)
}
for (const page of Object.keys(budgets)) {
  if (!pages.includes(page)) fail(`${page}: has a budget but is not in PUBLIC_PAGE_FILES — remove the stale budget`)
}

console.log('First-load JS (gzip) per public page')
console.log('page'.padEnd(42) + 'KB'.padStart(8) + 'budget'.padStart(9) + 'headroom'.padStart(10) + 'files'.padStart(7))
for (const { page, kb, budget, files } of rows) {
  const headroom = budget === undefined ? '—' : (budget - kb).toFixed(1)
  console.log(page.padEnd(42) + kb.toFixed(1).padStart(8) + String(budget ?? '—').padStart(9) + headroom.padStart(10) + String(files).padStart(7))
}

if (errors.length > 0) {
  for (const message of errors) console.error(`::error::First-load JS budget: ${message}`)
  process.exit(1)
}
console.log(`OK: ${rows.length} public pages within budget.`)
