// VRT capture harness — deterministic full-page screenshots via headless Chrome + raw CDP (no
// Playwright, no deps). Proven trustworthy in F1 (2026-07-25): noise floor ~0.13% between two
// captures of identical code (image-decode anti-aliasing on image-heavy routes; text/card pages
// are exactly 0%). Set a VRT threshold >= ~0.3% to tolerate it.
//
// Two determinism fixes over a naive capture — both load-bearing, do not remove:
//   1. prefers-reduced-motion:reduce emulation → framer-motion / CSS animations render statically
//      (without this, root-380 varied ~8.5% between identical captures).
//   2. scroll-behavior:auto + poll scrollY===0 before paint → the fixed sidebar/topbar don't wander
//      (globals.css sets scroll-behavior:smooth, so a plain scrollTo(0,0) animates and the shell
//      paints at a scroll-dependent offset — the ~10% "diff" that started this).
//
// Usage:  node scripts/vrt/capture.mjs <outDir> [route1,route2,...]
//   env:  BASE (default http://localhost:3000) · CHROME_PATH · CDP_PORT · WIDTHS (default 1440,380)
//         SHELL_HIDE=1 → neutralize fixed/sticky chrome for a content-only capture
import { spawn } from 'node:child_process'
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'

const REPO = process.cwd()
const CHROME = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const BASE = process.env.BASE || 'http://localhost:3000'
const PORT = Number(process.env.CDP_PORT || 9337)
const PROFILE = process.env.CHROME_PROFILE || path.join(REPO, '.vrt-chrome-profile')
const WIDTHS = (process.env.WIDTHS || '1440,380').split(',').map(Number)
const SHELL_HIDE = process.env.SHELL_HIDE === '1'
const OUT = process.argv[2]
if (!OUT) { console.error('usage: node scripts/vrt/capture.mjs <outDir> [routes]'); process.exit(1) }
const OUTDIR = path.resolve(REPO, OUT)
fs.mkdirSync(OUTDIR, { recursive: true })
const slug = (r) => r.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '') || 'root'
const ROUTES = process.argv[3]
  ? process.argv[3].split(',').map((r) => [r, slug(r)])
  : [['/', 'root'], ['/marche/services', 'marche-services'], ['/categories/electronique', 'categories-electronique'], ['/inscription', 'inscription']]

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
function httpJson(p) { return new Promise((res, rej) => { http.get({ host: '127.0.0.1', port: PORT, path: p }, (r) => { let d = ''; r.on('data', (c) => (d += c)); r.on('end', () => res(JSON.parse(d))) }).on('error', rej) }) }
async function waitFor(fn, tries, gap) { for (let i = 0; i < tries; i++) { try { return await fn() } catch { await sleep(gap) } } throw new Error('waitFor exhausted') }

class CDP {
  constructor(ws) { this.ws = ws; this.id = 0; this.pending = new Map(); this.waiters = []
    ws.addEventListener('message', (ev) => { const m = JSON.parse(typeof ev.data === 'string' ? ev.data : String(ev.data))
      if (m.id && this.pending.has(m.id)) { const { resolve, reject } = this.pending.get(m.id); this.pending.delete(m.id); m.error ? reject(new Error(m.error.message)) : resolve(m.result) }
      else if (m.method) { this.waiters = this.waiters.filter((w) => !w(m)) } })
  }
  send(method, params = {}, s) { const id = ++this.id; return new Promise((resolve, reject) => { this.pending.set(id, { resolve, reject }); this.ws.send(JSON.stringify(s ? { id, method, params, sessionId: s } : { id, method, params })) }) }
  once(method, s, ms = 45000) { return new Promise((resolve, reject) => { const to = setTimeout(() => { this.waiters = this.waiters.filter((x) => x !== w); reject(new Error('timeout ' + method)) }, ms); const w = (m) => { if (m.method === method && (!s || m.sessionId === s)) { clearTimeout(to); resolve(m.params); return true } return false }; this.waiters.push(w) }) }
}

const REVEAL = `(async () => {
  document.documentElement.style.scrollBehavior = 'auto';
  const step = window.innerHeight; const h = document.body.scrollHeight;
  for (let y = 0; y <= h; y += step) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 180)); }
  window.scrollTo(0, h); await new Promise(r => setTimeout(r, 500));
  window.scrollTo(0, 0);
  for (let i = 0; i < 80 && window.scrollY !== 0; i++) { window.scrollTo(0, 0); await new Promise(r => setTimeout(r, 40)); }
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
  return window.scrollY;
})()`
const FREEZE = `(() => { const s = document.createElement('style'); s.textContent = '*,*::before,*::after{animation:none!important} canvas{visibility:hidden!important}'; document.documentElement.appendChild(s); return 1; })()`
const HIDE_SHELL = `(() => { let n=0; for (const el of document.querySelectorAll('body *')) { const p = getComputedStyle(el).position; if (p === 'fixed' || p === 'sticky') { el.style.visibility = 'hidden'; n++; } } return n; })()`

async function main() {
  await waitFor(() => new Promise((res, rej) => { const r = http.get(BASE + '/', (x) => { x.resume(); res(x.statusCode) }); r.on('error', rej); r.setTimeout(4000, () => r.destroy(new Error('t'))) }), 120, 1000)
  const child = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, '--no-first-run', '--no-default-browser-check', '--disable-gpu', '--force-device-scale-factor=1', `--user-data-dir=${PROFILE}`, 'about:blank'], { stdio: 'ignore' })
  const version = await waitFor(() => httpJson('/json/version'), 40, 250)
  const ws = new WebSocket(version.webSocketDebuggerUrl) // Node 20+ global WHATWG WebSocket
  await new Promise((res, rej) => { ws.addEventListener('open', () => res(), { once: true }); ws.addEventListener('error', (e) => rej(e), { once: true }) })
  const cdp = new CDP(ws)
  const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' })
  const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true })
  await cdp.send('Page.enable', {}, sessionId)
  await cdp.send('Runtime.enable', {}, sessionId)
  await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] }, sessionId)

  for (const [route, name] of ROUTES) {
    for (const W of WIDTHS) {
      const label = `${name}-${W}`
      try {
        await cdp.send('Emulation.setDeviceMetricsOverride', { width: W, height: 900, deviceScaleFactor: 1, mobile: W <= 400 }, sessionId)
        const loaded = cdp.once('Page.loadEventFired', sessionId, 45000)
        await cdp.send('Page.navigate', { url: BASE + route }, sessionId)
        await loaded.catch(() => {})
        await sleep(700)
        await cdp.send('Runtime.evaluate', { expression: REVEAL, awaitPromise: true, returnByValue: true }, sessionId)
        await cdp.send('Runtime.evaluate', { expression: FREEZE, returnByValue: true }, sessionId)
        if (SHELL_HIDE) await cdp.send('Runtime.evaluate', { expression: HIDE_SHELL, returnByValue: true }, sessionId)
        await sleep(250)
        const { cssContentSize } = await cdp.send('Page.getLayoutMetrics', {}, sessionId)
        const height = Math.min(Math.ceil(cssContentSize.height), 20000)
        const shot = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { x: 0, y: 0, width: W, height, scale: 1 } }, sessionId)
        fs.writeFileSync(path.join(OUTDIR, `${label}.png`), Buffer.from(shot.data, 'base64'))
        console.log(`OK ${label}  ${W}x${height}`)
      } catch (e) { console.log(`ERR ${label}: ${String((e && e.message) || e)}`) }
    }
  }
  ws.close(); child.kill()
  console.log('DONE ->', OUTDIR)
}
main().catch((e) => { console.error('FATAL', e); process.exit(1) })
