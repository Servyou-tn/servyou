/**
 * CI guard (default unit run, no database): a plain `vitest run` must never write to production.
 *
 * Every live-DB suite creates and deletes real users with the service-role key, and the default run
 * skips only the files listed in INTEGRATION_GLOBS (vitest.config.ts). Until 2026-10-26 nine such
 * suites were missing from that list, so DoD item 4 wrote to production whenever `.env.local` held
 * the key. This file fails the unit run as soon as a test file that reads the service-role key is not
 * excluded from it.
 */

import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { basename, join, relative, resolve } from 'node:path'
import { INTEGRATION_GLOBS } from '../../vitest.config'

const ROOT = resolve(__dirname, '../..')
const SRC = join(ROOT, 'src')
const SELF = resolve(__filename)
const MARKER = 'SUPABASE_SERVICE_ROLE_KEY'
const TEST_FILE = /\.(test|spec)\.tsx?$/

function testFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return name === 'node_modules' ? [] : testFiles(path)
    return TEST_FILE.test(name) ? [path] : []
  })
}

const liveSuites = testFiles(SRC).filter((path) => path !== SELF && readFileSync(path, 'utf8').includes(MARKER))

describe('INTEGRATION_GLOBS keeps every live-DB suite out of the default run', () => {
  it('every entry has the `**/<file>` shape the check below relies on', () => {
    for (const glob of INTEGRATION_GLOBS) expect(glob).toMatch(/^\*\*\/[\w.-]+\.test\.tsx?$/)
  })

  it('the scan finds the known live suites, so it cannot pass vacuously', () => {
    const names = liveSuites.map((path) => basename(path))
    expect(names).toContain('orders-lifecycle-columns.test.ts')
    expect(names).toContain('h6-service-listings-hardening-rls.test.ts')
  })

  it('every test file that reads the service-role key is listed', () => {
    const excluded = new Set(INTEGRATION_GLOBS.map((glob) => glob.slice('**/'.length)))
    const missing = liveSuites.filter((path) => !excluded.has(basename(path))).map((path) => relative(ROOT, path))
    expect(missing).toEqual([])
  })
})
