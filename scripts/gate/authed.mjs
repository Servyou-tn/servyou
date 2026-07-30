// Authenticated CDP runner — drive a real logged-in browser at a real viewport against localhost.
//
// The companion to session.mjs: that mints the cookies, this injects them and does something with
// the page. Together they close the gate-coverage hole recorded in docs/follow-ups.md ("12 of the
// 20 v2-shell routes cannot be gated without an authenticated session"), so the shop_owner and
// freelancer shells — and every seller page — become reachable by the visual gate and by
// measurement passes.
//
// Usage:
//   node scripts/gate/authed.mjs --email a@b.c --route /commandes-recues
//   node scripts/gate/authed.mjs --email a@b.c --route /x --width 1440 --eval probe.js --json
//   node scripts/gate/authed.mjs --email a@b.c --route /x --shot out.png
//   node scripts/gate/authed.mjs --email a@b.c --route /a,/b,/c          (auth check across routes)
//
// env: BASE (default http://localhost:3000) · CHROME_PATH · CDP_PORT (default 9338)
//
// ⚑ RUN THIS FROM POWERSHELL ON WINDOWS, NOT GIT BASH. MSYS rewrites any argument that starts with
// a slash into a Windows path, so `--route /commandes-recues` arrives as
// `C:/Program Files/Git/commandes-recues` and Page.navigate fails with "Cannot navigate to invalid
// URL". Either use PowerShell or set MSYS2_ARG_CONV_EXCL='*'.
//
// ⚑ AUTH FAILURE IS LOUD, NOT SILENT. The whole point of this script is that a page rendered
// anonymously looks almost identical to one rendered as the owner — an empty list, a 307 already
// followed, a shell with the consumer sidebar. So every run asserts the final URL is still the
// requested route and exits non-zero if the guard bounced it. A measurement taken against
// /connexion is worse than no measurement, because it gets written down.
//
// ⚑ The Chrome profile is a throwaway under .gate-chrome-profile (gitignored alongside the other
// .*-profile dirs). Cookies are injected per-run and never written to the repo.

import { spawn } from 'node:child_process'
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { mintGateCookies } from './session.mjs'

const REPO = process.cwd()
const CHROME = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const BASE = process.env.BASE || 'http://localhost:3000'
const PORT = Number(process.env.CDP_PORT || 9338)
const PROFILE = path.join(REPO, '.gate-chrome-profile')

function arg(name, fallback = null) {
  const i = process.argv.indexOf(`--${name}`)
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback
}
const flag = (name) => process.argv.includes(`--${name}`)

const email = arg('email')
const routes = (arg('route') || '/').split(',')
const width = Number(arg('width', '1440'))
const height = Number(arg('height', '900'))
const evalFile = arg('eval')
const shot = arg('shot')
const asJson = flag('json')
if (!email) {
  console.error('usage: node scripts/gate/authed.mjs --email <email> --route <path[,path]> [--width N] [--eval file.js] [--shot out.png] [--json]')
  process.exit(1)
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
function httpJson(p) {
  return new Promise((res, rej) => {
    http.get({ host: '127.0.0.1', port: PORT, path: p }, (r) => {
      let d = ''
      r.on('data', (c) => (d += c))
      r.on('end', () => res(JSON.parse(d)))
    }).on('error', rej)
  })
}
async function waitFor(fn, tries, gap) {
  let last
  for (let i = 0; i < tries; i++) {
    try { return await fn() } catch (e) { last = e; await sleep(gap) }
  }
  throw new Error(`waitFor exhausted: ${last?.message ?? '?'}`)
}

class CDP {
  constructor(ws) {
    this.ws = ws; this.id = 0; this.pending = new Map(); this.waiters = []
    ws.addEventListener('message', (ev) => {
      const m = JSON.parse(typeof ev.data === 'string' ? ev.data : String(ev.data))
      if (m.id && this.pending.has(m.id)) {
        const { resolve, reject } = this.pending.get(m.id)
        this.pending.delete(m.id)
        m.error ? reject(new Error(m.error.message)) : resolve(m.result)
      } else if (m.method) {
        this.waiters = this.waiters.filter((w) => !w(m))
      }
    })
  }
  send(method, params = {}, s) {
    const id = ++this.id
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject })
      this.ws.send(JSON.stringify(s ? { id, method, params, sessionId: s } : { id, method, params }))
    })
  }
}

async function main() {
  // Fail before launching a browser if the dev server is not up — a connection refused here is a
  // far clearer message than a blank screenshot.
  await waitFor(
    () => new Promise((res, rej) => {
      const r = http.get(BASE + '/', (x) => { x.resume(); res(x.statusCode) })
      r.on('error', rej)
      r.setTimeout(4000, () => r.destroy(new Error('timeout')))
    }),
    30, 1000,
  )

  const { cookies, userId } = await mintGateCookies(email)
  if (!asJson) console.error(`· session minted for ${email} (${userId})`)

  fs.mkdirSync(PROFILE, { recursive: true })
  const child = spawn(CHROME, [
    '--headless=new',
    `--remote-debugging-port=${PORT}`,
    '--no-first-run', '--no-default-browser-check', '--disable-gpu',
    '--force-device-scale-factor=1',
    `--user-data-dir=${PROFILE}`,
    'about:blank',
  ], { stdio: ['ignore', 'ignore', 'pipe'] })
  // Keep Chrome's own stderr — a launch failure is otherwise indistinguishable from a slow start
  // (the exact diagnosability gap logged for scripts/vrt/capture.mjs in docs/follow-ups.md).
  let chromeErr = ''
  child.stderr?.on('data', (c) => (chromeErr += c))

  let ws
  try {
    const version = await waitFor(() => httpJson('/json/version'), 60, 250)
    ws = new WebSocket(version.webSocketDebuggerUrl) // Node 20+ global WHATWG WebSocket
    await new Promise((res, rej) => {
      ws.addEventListener('open', () => res(), { once: true })
      ws.addEventListener('error', (e) => rej(e), { once: true })
    })
  } catch (e) {
    child.kill()
    throw new Error(`Chrome never exposed a CDP endpoint: ${e.message}\nchrome stderr: ${chromeErr.trim() || '(none)'}`)
  }

  const cdp = new CDP(ws)
  const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' })
  const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true })
  await cdp.send('Page.enable', {}, sessionId)
  await cdp.send('Runtime.enable', {}, sessionId)
  await cdp.send('Network.enable', {}, sessionId)
  await cdp.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false }, sessionId)
  // Static render: the same two determinism fixes capture.mjs relies on.
  await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] }, sessionId)

  const { host: baseHost } = new URL(BASE)
  for (const c of cookies) {
    await cdp.send('Network.setCookie', {
      name: c.name,
      value: c.value,
      domain: baseHost.split(':')[0],
      path: '/',
      httpOnly: false,
      secure: false,
      sameSite: 'Lax',
    }, sessionId)
  }

  const results = []
  for (const route of routes) {
    const url = BASE + route
    await cdp.send('Page.navigate', { url }, sessionId)
    // Settle: DOM ready + a beat for the server components to stream in.
    await waitFor(async () => {
      const r = await cdp.send('Runtime.evaluate', { expression: 'document.readyState', returnByValue: true }, sessionId)
      if (r.result.value !== 'complete') throw new Error('not complete')
      return true
    }, 120, 250)
    await sleep(600)

    const finalUrl = (await cdp.send('Runtime.evaluate', { expression: 'location.pathname + location.search', returnByValue: true }, sessionId)).result.value
    const authed = finalUrl === route
    results.push({ route, finalUrl, authed })
    if (!authed) {
      console.error(`✗ AUTH FAILED on ${route} → ${finalUrl}  (the guard bounced this run; any measurement here would be of the wrong page)`)
      continue
    }
    if (!asJson) console.error(`✓ ${route} rendered authenticated at ${width}×${height}`)

    if (evalFile) {
      const expression = fs.readFileSync(path.resolve(REPO, evalFile), 'utf8')
      const r = await cdp.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }, sessionId)
      if (r.exceptionDetails) throw new Error(`eval threw: ${r.exceptionDetails.text} ${r.exceptionDetails.exception?.description ?? ''}`)
      results[results.length - 1].data = r.result.value
    }
    if (shot) {
      const full = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true }, sessionId)
      const out = routes.length > 1 ? shot.replace(/\.png$/, `-${route.replace(/[^a-z0-9]+/gi, '-')}.png`) : shot
      fs.writeFileSync(path.resolve(REPO, out), Buffer.from(full.data, 'base64'))
      if (!asJson) console.error(`  → ${out}`)
    }
  }

  ws.close()
  child.kill()

  if (asJson) console.log(JSON.stringify(results, null, 2))
  // Non-zero if ANY route failed to authenticate — silence must not read as success.
  if (results.some((r) => !r.authed)) process.exit(2)
}

main().catch((e) => {
  console.error(`✗ ${e.message}`)
  process.exit(1)
})
