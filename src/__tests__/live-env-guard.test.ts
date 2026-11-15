/**
 * The opt-in live run must FAIL, never skip, when the Supabase values are missing (vitest.live-env.ts).
 *
 * Before: `vitest run --config vitest.integration.config.ts <live suite>` without the values skipped every test and
 * exited 0 (« 15 skipped » in a worktree, 2026-11-15). Now the config throws before any file is collected.
 *
 * Runs in the default unit run (CI), never against the database:
 *   - the spawned runs filter on a file name that matches no suite, so nothing can be collected even if the guard
 *     broke; they run in an empty temp directory (no .env files) with the three keys removed from their env;
 *   - the passing case uses fake values (an `.invalid` host) and must reach « No test files found ».
 * The key names come from LIVE_ENV_KEYS, never spelled out: integration-globs-guard.test.ts treats a test file that
 * names the service-role key as a live suite.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { spawn } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { LIVE_ENV_KEYS, assertLiveEnv, missingLiveEnv } from '../../vitest.live-env'

const ROOT = resolve(__dirname, '../..')
const VITEST = join(ROOT, 'node_modules', 'vitest', 'vitest.mjs')
const INTEGRATION_CONFIG = join(ROOT, 'vitest.integration.config.ts')
const NO_SUCH_SUITE = '__live_env_guard_matches_no_file__'
const REFUSED = 'Live suites refused to start'

const [URL_KEY, ANON_KEY, SERVICE_KEY] = LIVE_ENV_KEYS
const FULL: Record<string, string> = { [URL_KEY]: 'https://example.invalid', [ANON_KEY]: 'anon', [SERVICE_KEY]: 'service' }

// An empty working directory: no .env / .env.local for the spawned config's loadEnv to find.
let emptyDir = ''
beforeAll(() => {
  emptyDir = mkdtempSync(join(tmpdir(), 'live-env-guard-'))
})
afterAll(() => {
  // Windows can hold the directory for a few seconds after a spawned run exits (EPERM). An empty temp directory left
  // behind is harmless, so cleanup retries and never fails the run.
  try {
    rmSync(emptyDir, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 })
  } catch {
    // left for the OS temp cleanup
  }
})

// The integration config, run the way an agent runs a live suite, from a directory with no .env files. Asynchronous,
// so the worker's event loop stays free during the nested vitest start-up.
function runIntegrationConfig(liveValues: Record<string, string>): Promise<{ status: number | null; output: string }> {
  const env: NodeJS.ProcessEnv = { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0' }
  for (const key of Object.keys(env)) {
    // Not the live values (the unit run's own env may hold the real ones), nor the parent run's VITEST_* markers.
    if ((LIVE_ENV_KEYS as readonly string[]).includes(key) || key.startsWith('VITEST')) delete env[key]
  }
  Object.assign(env, liveValues)
  return new Promise((done, fail) => {
    const child = spawn(process.execPath, [VITEST, 'run', '--config', INTEGRATION_CONFIG, '--root', ROOT, NO_SUCH_SUITE], {
      cwd: emptyDir,
      env,
      timeout: 90_000,
    })
    let output = ''
    child.stdout.on('data', (chunk: Buffer) => (output += chunk.toString('utf8')))
    child.stderr.on('data', (chunk: Buffer) => (output += chunk.toString('utf8')))
    child.on('error', fail)
    child.on('close', (status) => done({ status, output }))
  })
}

describe('missingLiveEnv', () => {
  it('passes when the three values are set', () => {
    expect(missingLiveEnv(FULL)).toEqual([])
  })

  it('names every missing value, in a stable order', () => {
    expect(missingLiveEnv({})).toEqual([URL_KEY, ANON_KEY, SERVICE_KEY])
    expect(missingLiveEnv({ [URL_KEY]: FULL[URL_KEY] })).toEqual([ANON_KEY, SERVICE_KEY])
  })

  it('counts a blank value as missing (.env.example ships the keys empty)', () => {
    expect(missingLiveEnv({ ...FULL, [ANON_KEY]: '', [SERVICE_KEY]: '  \n' })).toEqual([ANON_KEY, SERVICE_KEY])
  })

  it('assertLiveEnv throws with the missing names and where they are read from', () => {
    expect(() => assertLiveEnv(FULL, '/repo')).not.toThrow()
    expect(() => assertLiveEnv({ ...FULL, [SERVICE_KEY]: undefined }, '/repo')).toThrow(
      `${REFUSED}: ${SERVICE_KEY} is missing or blank.\nThey are read from the shell, or from .env / .env.local in /repo.`,
    )
  })
})

describe('vitest.integration.config.ts refuses to run without the values', () => {
  it('fails before collecting anything when they are missing', { timeout: 120_000 }, async () => {
    const { status, output } = await runIntegrationConfig({})
    expect(status).not.toBe(0)
    expect(output).toContain(`${REFUSED}: ${LIVE_ENV_KEYS.join(', ')} are missing or blank.`)
    expect(output).not.toContain('No test files found')
  })

  it('gets past the check when they are set (fake values, a filter that matches no suite)', { timeout: 120_000 }, async () => {
    const { status, output } = await runIntegrationConfig(FULL)
    expect(output).not.toContain(REFUSED)
    expect(output).toContain('No test files found')
    expect(status).not.toBe(0)
  })
})
