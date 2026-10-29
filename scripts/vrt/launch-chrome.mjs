// Start headless Chrome with a DevTools port and wait for it to answer — shared by capture.mjs and diff.mjs.
//
// Why: on the GitHub runner, Chrome sometimes never answers /json/version (≈1 storybook-vrt run in 3, e.g. runs
// 40764754094 and 40759542120: « FATAL Error: waitFor exhausted » at capture.mjs's launch, nothing captured). The old
// launch waited 10 s once, with Chrome's output discarded, so a slow or crashed start failed the job with no clue.
// Now: up to ATTEMPTS launches (env CHROME_LAUNCH_ATTEMPTS, default 3), each waiting up to 30 s; a Chrome that exits
// or stays silent is killed, its profile wiped, and launched again. Chrome's stderr is kept (last 4 KB) and printed
// when an attempt fails.
//
// Only the START is retried. Once Chrome answers, the caller runs exactly as before: no capture or diff is ever
// repeated, so a real visual diff cannot pass on a second try.
import { spawn } from 'node:child_process'
import http from 'node:http'
import fs from 'node:fs'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function versionOnce(port) {
  return new Promise((resolve, reject) => {
    const req = http.get({ host: '127.0.0.1', port, path: '/json/version' }, (r) => {
      let d = ''
      r.on('data', (c) => (d += c))
      r.on('end', () => { try { resolve(JSON.parse(d)) } catch (e) { reject(e) } })
    })
    req.on('error', reject)
    req.setTimeout(2000, () => req.destroy(new Error('timeout')))
  })
}

async function killAndWait(child) {
  if (child.exitCode !== null || child.signalCode !== null) return
  const exited = new Promise((r) => child.once('exit', r))
  child.kill('SIGKILL')
  await Promise.race([exited, sleep(5000)])
}

/**
 * @param {{ chrome: string, port: number, profile: string, args: string[], waitMs?: number }} o
 *   `args` are the flags besides --remote-debugging-port / --user-data-dir (the caller's existing set).
 * @returns {Promise<{ child: import('node:child_process').ChildProcess, version: { webSocketDebuggerUrl: string } }>}
 */
export async function launchChrome({ chrome, port, profile, args, waitMs = 30000 }) {
  const attempts = Math.max(1, Number(process.env.CHROME_LAUNCH_ATTEMPTS || 3))
  for (let attempt = 1; attempt <= attempts; attempt++) {
    if (attempt > 1) fs.rmSync(profile, { recursive: true, force: true }) // a half-started profile can hold a lock
    const child = spawn(chrome, [`--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, ...args], {
      stdio: ['ignore', 'ignore', 'pipe'],
    })
    let stderr = ''
    child.stderr.on('data', (d) => { stderr = (stderr + String(d)).slice(-4096) })
    let exitInfo = null
    child.once('exit', (code, signal) => { exitInfo = `exited (code ${code}, signal ${signal})` })
    child.once('error', (e) => { exitInfo = `failed to spawn: ${e.message}` })

    const deadline = Date.now() + waitMs
    while (Date.now() < deadline && !exitInfo) {
      try {
        const version = await versionOnce(port)
        if (version && version.webSocketDebuggerUrl) {
          if (attempt > 1) console.error(`chrome: started on attempt ${attempt}/${attempts}`)
          return { child, version }
        }
      } catch { /* not up yet */ }
      await sleep(250)
    }

    const why = exitInfo || `no /json/version answer within ${waitMs / 1000}s`
    console.error(`chrome: launch attempt ${attempt}/${attempts} failed — ${why}`)
    if (stderr.trim()) console.error(`chrome stderr (tail):\n${stderr.trim()}`)
    await killAndWait(child)
  }
  throw new Error(`Chrome did not start after ${attempts} attempts (port ${port})`)
}
