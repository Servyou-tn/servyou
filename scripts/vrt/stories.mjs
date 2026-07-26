// VRT gate over Storybook stories (F2). REUSES scripts/vrt/capture.mjs + diff.mjs VERBATIM (the F1
// harness — noise floor ~0.13%, AA-filter at THRESH=60). This runner only orchestrates:
//   1. reads the story list from a STATIC Storybook build (storybook-static/index.json) — a static
//      build removes the dev-server's on-demand compile, the source of capture-timing flake;
//   2. serves storybook-static/ deterministically on a local port;
//   3. drives capture.mjs over every story's iframe URL at 1440 + 380;
//   4. in `check` mode, drives diff.mjs and OWNS pass/fail (diff.mjs only prints `max %`).
//
// Usage:
//   node scripts/vrt/stories.mjs baseline   → capture → scripts/vrt/__baselines__/  (commit this dir)
//   node scripts/vrt/stories.mjs check      → capture → scripts/vrt/__current__/, diff vs baseline, gate
// env: THRESH   per-pixel RGB-sum diff for diff.mjs (default 60 — the F1 AA-filter level)
//      GATE_PCT max % of changed pixels tolerated before FAIL (default 0.3 — above the ~0.13% floor,
//               matching capture.mjs's own ">= ~0.3%" note; a real recolor is several %)
//      STATIC_DIR (default storybook-static) · PORT (default 6008) · CHROME_PATH
import { spawn } from 'node:child_process'
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const REPO = process.cwd()
const MODE = process.argv[2]
if (MODE !== 'baseline' && MODE !== 'check') {
  console.error('usage: node scripts/vrt/stories.mjs <baseline|check>')
  process.exit(1)
}
const HERE = path.dirname(fileURLToPath(import.meta.url))
const STATIC = path.resolve(REPO, process.env.STATIC_DIR || 'storybook-static')
const PORT = Number(process.env.PORT || 6008)
const GATE_PCT = Number(process.env.GATE_PCT || 0.3)
const THRESH = String(process.env.THRESH || 60)
const BASELINE = path.join(HERE, '__baselines__')
const CURRENT = path.join(HERE, '__current__')
const rel = (d) => path.relative(REPO, d).replace(/\\/g, '/')

if (!fs.existsSync(path.join(STATIC, 'index.json'))) {
  console.error(`No ${rel(STATIC)}/index.json — run "npm run build-storybook" first.`)
  process.exit(1)
}

// Enumerate story ids from the built index (docs entries are skipped — only type==='story').
const index = JSON.parse(fs.readFileSync(path.join(STATIC, 'index.json'), 'utf8'))
const entries = index.entries || index.stories || {}
const ids = Object.values(entries)
  .filter((e) => (e.type ? e.type === 'story' : true))
  .map((e) => e.id)
  .sort()
if (!ids.length) {
  console.error('No stories found in index.json')
  process.exit(1)
}
const routes = ids.map((id) => `/iframe.html?id=${id}&viewMode=story`)
console.log(`${ids.length} stories × 2 widths = ${ids.length * 2} snapshots\n  ${ids.join('\n  ')}`)

// Minimal deterministic static server for the built Storybook (query string ignored for resolution).
const CT = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.map': 'application/json',
  '.ico': 'image/x-icon', '.txt': 'text/plain', '.webp': 'image/webp',
}
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0])
  if (p === '/' || p === '') p = '/index.html'
  const fp = path.join(STATIC, path.normalize(p).replace(/^(\.\.[/\\])+/, ''))
  if (!fp.startsWith(STATIC) || !fs.existsSync(fp) || fs.statSync(fp).isDirectory()) {
    res.writeHead(404); res.end('not found'); return
  }
  res.writeHead(200, { 'content-type': CT[path.extname(fp)] || 'application/octet-stream' })
  fs.createReadStream(fp).pipe(res)
})
await new Promise((r) => server.listen(PORT, r))
console.log(`serving ${rel(STATIC)} → http://localhost:${PORT}`)

function run(script, args, env) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [path.join(HERE, script), ...args], {
      cwd: REPO, env: { ...process.env, ...env }, stdio: ['ignore', 'pipe', 'inherit'],
    })
    let out = ''
    child.stdout.on('data', (d) => { out += String(d); process.stdout.write(d) })
    child.on('exit', (code) => resolve({ code, out }))
  })
}

const outDir = MODE === 'baseline' ? BASELINE : CURRENT
fs.rmSync(outDir, { recursive: true, force: true })
fs.mkdirSync(outDir, { recursive: true })

// capture.mjs VERBATIM: routes are comma-joined (story URLs contain no commas); BASE points at us.
await run('capture.mjs', [rel(outDir), routes.join(',')], {
  BASE: `http://localhost:${PORT}`, WIDTHS: '1440,380', CDP_PORT: '9351',
  CHROME_PROFILE: path.join(REPO, '.vrt-stories-profile'),
})

if (MODE === 'baseline') {
  server.close()
  console.log(`\nBASELINE → ${rel(BASELINE)} (${routes.length * 2} shots). Commit this directory.`)
  process.exit(0)
}

// check: diff current vs committed baseline, then gate on GATE_PCT.
if (!fs.existsSync(BASELINE) || !fs.readdirSync(BASELINE).some((f) => f.endsWith('.png'))) {
  server.close()
  console.error(`No baseline at ${rel(BASELINE)} — run "npm run vrt:stories baseline" and commit it.`)
  process.exit(1)
}
const dif = await run('diff.mjs', [rel(BASELINE), rel(CURRENT)], { THRESH, CDP_PORT: '9353' })
server.close()
const m = dif.out.match(/max\s+([\d.]+)%/)
const maxPct = m ? Number(m[1]) : NaN
if (!Number.isFinite(maxPct)) {
  console.error('could not parse `max %` from diff.mjs output')
  process.exit(1)
}
const pass = maxPct <= GATE_PCT
console.log(`\nVRT gate (THRESH=${THRESH}px): max ${maxPct}%  vs  gate ${GATE_PCT}%  →  ${pass ? 'PASS ✓' : 'FAIL ✗'}`)
process.exit(pass ? 0 : 1)
