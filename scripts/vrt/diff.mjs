// VRT diff — compare two capture dirs (produced by capture.mjs) pixel-by-pixel via a headless-Chrome
// canvas (no deps). Per image it prints: % pixels changed, height-mismatch flag, and a 16-band
// vertical profile — a layout reflow spikes a band toward 100%, whereas radius/shadow shows low-%
// edge bands. Heights differing at all means something reflowed (radius/shadow cannot change height).
//
// THRESH is the per-pixel RGB-sum difference that counts as "changed" (default 12). Sub-pixel
// anti-aliasing lands ~12-50; a real element recolor is 100s — so re-running at THRESH=60 tells you
// whether a sub-percent diff is AA noise (collapses to ~0) or a real change (persists). The harness
// noise floor is ~0.13% (see capture.mjs); set a gate threshold above it.
//
// Usage: node scripts/vrt/diff.mjs <dirA> <dirB>   env: CHROME_PATH · CDP_PORT · THRESH
import { spawn } from 'node:child_process'
import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'

const REPO = process.cwd()
const CHROME = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const PORT = Number(process.env.CDP_PORT || 9339)
const TH = Number(process.env.THRESH || 12)
const [DIRA, DIRB] = [process.argv[2], process.argv[3]]
if (!DIRA || !DIRB) { console.error('usage: node scripts/vrt/diff.mjs <dirA> <dirB>'); process.exit(1) }
const dirA = path.resolve(REPO, DIRA), dirB = path.resolve(REPO, DIRB)
const pngs = (d) => new Set(fs.readdirSync(d).filter((f) => f.endsWith('.png')))
const setA = pngs(dirA), setB = pngs(dirB)
const PAIRS = [...setA].filter((f) => setB.has(f)).sort()
// dirA is the baseline, dirB the current capture (see stories.mjs). Surface the set mismatch so no
// caller can silently gate on the intersection alone: a current file with no baseline is MISSING (a
// new/renamed story needing a committed baseline), a baseline with no current is ORPHAN (a deleted
// story's stale baseline). diff.mjs stays a reporter — stories.mjs owns the fail.
const MISSING = [...setB].filter((f) => !setA.has(f)).sort()
const ORPHAN = [...setA].filter((f) => !setB.has(f)).sort()

function httpJson(p) { return new Promise((res, rej) => { http.get({ host: '127.0.0.1', port: PORT, path: p }, (r) => { let d = ''; r.on('data', (c) => (d += c)); r.on('end', () => res(JSON.parse(d))) }).on('error', rej) }) }
async function waitFor(fn, n, g) { for (let i = 0; i < n; i++) { try { return await fn() } catch { await new Promise((r) => setTimeout(r, g)) } } throw new Error('timeout') }
class CDP {
  constructor(ws) { this.ws = ws; this.id = 0; this.p = new Map(); this.w = []
    ws.addEventListener('message', (e) => { const m = JSON.parse(typeof e.data === 'string' ? e.data : String(e.data)); if (m.id && this.p.has(m.id)) { const { resolve, reject } = this.p.get(m.id); this.p.delete(m.id); m.error ? reject(new Error(m.error.message)) : resolve(m.result) } else if (m.method) this.w = this.w.filter((f) => !f(m)) }) }
  send(method, params = {}, s) { const id = ++this.id; return new Promise((resolve, reject) => { this.p.set(id, { resolve, reject }); this.ws.send(JSON.stringify(s ? { id, method, params, sessionId: s } : { id, method, params })) }) }
}
const DIFF_FN = (ba, bb, th) => `(async()=>{
  const load=(b64)=>new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=rej;i.src="data:image/png;base64,"+b64;});
  const A=await load(${JSON.stringify(ba)}), B=await load(${JSON.stringify(bb)});
  const w=Math.min(A.width,B.width), h=Math.min(A.height,B.height);
  const mk=(img)=>{const c=new OffscreenCanvas(w,h);const x=c.getContext("2d");x.drawImage(img,0,0);return x.getImageData(0,0,w,h).data;};
  const d1=mk(A), d2=mk(B); const N=16, bc=new Array(N).fill(0), bt=new Array(N).fill(0); let ch=0;
  for(let y=0;y<h;y++){const b=Math.min(N-1,Math.floor(y/h*N));for(let x=0;x<w;x++){const i=(y*w+x)*4;const df=Math.abs(d1[i]-d2[i])+Math.abs(d1[i+1]-d2[i+1])+Math.abs(d1[i+2]-d2[i+2]);bt[b]++;if(df>${th}){ch++;bc[b]++;}}}
  const bands=bc.map((c,i)=>bt[i]?Math.round(1000*c/bt[i])/10:0);
  return JSON.stringify({ah:A.height,bh:B.height,pct:Math.round(100000*ch/(w*h))/1000,bands});
})()`

async function main() {
  const child = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, '--no-first-run', '--disable-gpu', `--user-data-dir=${path.join(REPO, '.vrt-diff-profile')}`, 'about:blank'], { stdio: 'ignore' })
  const ver = await waitFor(() => httpJson('/json/version'), 40, 250)
  const ws = new WebSocket(ver.webSocketDebuggerUrl)
  await new Promise((res, rej) => { ws.addEventListener('open', () => res(), { once: true }); ws.addEventListener('error', rej, { once: true }) })
  const cdp = new CDP(ws)
  const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' })
  const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true })
  await cdp.send('Runtime.enable', {}, sessionId)
  console.log(`THRESH=${TH}`, 'image'.padEnd(28), 'base_h', 'after_h', 'pct%', ' 16-band vertical profile')
  let maxPct = 0
  for (const f of PAIRS) {
    const ba = fs.readFileSync(path.join(dirA, f)).toString('base64'), bb = fs.readFileSync(path.join(dirB, f)).toString('base64')
    try {
      const { result } = await cdp.send('Runtime.evaluate', { expression: DIFF_FN(ba, bb, TH), awaitPromise: true, returnByValue: true }, sessionId)
      const r = JSON.parse(result.value); maxPct = Math.max(maxPct, r.pct)
      console.log('  ', f.replace('.png', '').padEnd(28), String(r.ah).padStart(6), String(r.bh).padStart(7), String(r.pct).padStart(6), ' [' + r.bands.join(',') + ']', r.ah !== r.bh ? '  <-- HEIGHT CHANGED (reflow!)' : '')
    } catch (e) { console.log('  ', f.padEnd(28), 'ERR', String((e && e.message) || e)) }
  }
  console.log(`max ${maxPct}%`)
  console.log(`sets: ${PAIRS.length} compared / ${MISSING.length} missing / ${ORPHAN.length} orphan`)
  if (MISSING.length) console.log(`MISSING baseline:\n  ${MISSING.join('\n  ')}`)
  if (ORPHAN.length) console.log(`ORPHAN baseline:\n  ${ORPHAN.join('\n  ')}`)
  ws.close(); child.kill()
}
main().catch((e) => { console.error('FATAL', e); process.exit(1) })
