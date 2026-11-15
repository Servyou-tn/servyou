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

// A live run that passes must have run its tests. Missing credentials can no longer skip anything (the integration
// config refuses to start, vitest.live-env.ts), so a live suite may skip on nothing else: no .skip / .todo / .only /
// .runIf / xit / xdescribe / xtest, and a skipIf only on the credentials gate.
const SILENT_SKIP = /\.(?:skip|todo|only|runIf)\b|\.skipIf\s*\((?!!hasCreds\))|\bx(?:it|describe|test)\s*\(/g
// Comments are left out of the scan (a « .only » in prose is fine). One left-to-right pass, so a `/*` inside a line
// comment or a string never opens a « comment » that would hide the code after it; string literals are kept.
const COMMENT_OR_STRING = /('(?:\\.|[^'\\\n])*'|"(?:\\.|[^"\\\n])*"|`(?:\\.|[^`\\])*`)|\/\*[\s\S]*?\*\/|\/\/[^\n]*/g
const withoutComments = (source: string) => source.replace(COMMENT_OR_STRING, (_match, literal?: string) => literal ?? '')

// Every suite INTEGRATION_GLOBS lists, plus any test file that reads the service-role key (the same set once the check
// above passes; the three phone-reveal suites get their key through a fixture module, so only the list finds them).
const liveRunFiles = [...new Set([...allTests.filter((path) => listed.includes(basename(path))), ...liveSuites])]

describe('a live suite cannot pass without running its tests', () => {
  it('scans every listed suite, including the ones that get their key from a fixture module', () => {
    const names = liveRunFiles.map((path) => basename(path))
    expect(names).toContain('phone-reveal-buyer-live.test.ts')
    expect(names.length).toBe(new Set([...listed, ...liveSuites.map((path) => basename(path))]).size)
  })

  it('skips only on the credentials gate', () => {
    const found = liveRunFiles.flatMap((path) =>
      [...withoutComments(readFileSync(path, 'utf8')).matchAll(SILENT_SKIP)].map((m) => `${relative(ROOT, path)}: ${m[0]}`),
    )
    expect(found).toEqual([])
  })

  it('the pattern catches the forms it forbids, and lets the credentials gate through', () => {
    const hits = (code: string) => [...withoutComments(code).matchAll(SILENT_SKIP)].length
    expect(hits('describe.skipIf(!hasCreds)("x", () => {})')).toBe(0)
    expect(hits('describe.skipIf(!process.env.X)("x", () => {})')).toBe(1)
    expect(hits('it.skip("x", () => {}); test.todo("y"); describe.only("z", () => {}); it.runIf(ok)("w", () => {})')).toBe(4)
    expect(hits('xit("a", f); xdescribe("b", f); xtest("c", f)')).toBe(3)
    expect(hits('// never run a case alone (-t / .only)\n/* it.skip */ const a = 1')).toBe(0)
  })

  it('a comment marker inside a line comment or a string hides no code', () => {
    const hits = (code: string) => [...withoutComments(code).matchAll(SILENT_SKIP)].length
    expect(hits('// see db/migrations/*_x.sql\nit.skip("x", f)\n/** doc */')).toBe(1)
    expect(hits('const url = "https://a.example/*"\nit.skip("x", f) // */')).toBe(1)
    expect(hits("const p = 'a//b'; it.only('x', f)")).toBe(1)
  })
})
