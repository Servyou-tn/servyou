/**
 * CI guard (default unit run, no database): a plain `vitest run` must never write to production.
 *
 * Every live-DB suite creates and deletes real users with the service-role key, and the default run
 * skips only the files listed in INTEGRATION_GLOBS (vitest.config.ts). Until 2026-10-26 nine such
 * suites were missing from that list, so DoD item 4 wrote to production whenever `.env.local` held
 * the key. This file fails the unit run as soon as a test file that reads the service-role key is not
 * excluded from it, or the list names a file that no longer exists.
 *
 * The convention it enforces: a live suite names SUPABASE_SERVICE_ROLE_KEY itself (every one does). It
 * cannot see a test that reaches the key only through an unmocked import (e.g. a real
 * `@/lib/supabase/admin`): unit tests mock those clients, and a new live suite must follow the
 * convention. The scan uses vitest's default include pattern over the whole repository, minus
 * node_modules, build output and dot-directories.
 */

import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { basename, join, relative, resolve } from 'node:path'
import { INTEGRATION_GLOBS } from '../../vitest.config'

const ROOT = resolve(__dirname, '../..')
const SELF = resolve(__filename)
const MARKER = 'SUPABASE_SERVICE_ROLE_KEY'
// vitest's default include: **/*.{test,spec}.?(c|m)[jt]s?(x)
const TEST_FILE = /\.(test|spec)\.[cm]?[jt]sx?$/
const SKIP_DIRS = new Set(['node_modules', 'storybook-static', 'coverage', 'dist'])

function testFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return name.startsWith('.') || SKIP_DIRS.has(name) ? [] : testFiles(path)
    return TEST_FILE.test(name) ? [path] : []
  })
}

const allTests = testFiles(ROOT)
const liveSuites = allTests.filter((path) => path !== SELF && readFileSync(path, 'utf8').includes(MARKER))
const listed = INTEGRATION_GLOBS.map((glob) => glob.slice('**/'.length))

describe('INTEGRATION_GLOBS keeps every live-DB suite out of the default run', () => {
  it('every entry has the `**/<file>` shape the checks below rely on', () => {
    for (const glob of INTEGRATION_GLOBS) expect(glob).toMatch(/^\*\*\/[\w.-]+\.(test|spec)\.[cm]?[jt]sx?$/)
  })

  it('the scan finds the known live suites, so it cannot pass vacuously', () => {
    const names = liveSuites.map((path) => basename(path))
    expect(names).toContain('orders-lifecycle-columns.test.ts')
    expect(names).toContain('h6-service-listings-hardening-rls.test.ts')
  })

  it('every test file that reads the service-role key is listed', () => {
    const missing = liveSuites.filter((path) => !listed.includes(basename(path))).map((path) => relative(ROOT, path))
    expect(missing).toEqual([])
  })

  it('every listed file still exists (a stale entry hides nothing, but rots the list)', () => {
    const names = new Set(allTests.map((path) => basename(path)))
    expect(listed.filter((name) => !names.has(name))).toEqual([])
  })
})
