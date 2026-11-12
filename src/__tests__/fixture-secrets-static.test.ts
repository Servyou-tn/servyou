/**
 * Static guard for live-suite fixtures (audit H6) — reads source files only, touches no database.
 *
 * Live suites create real accounts on the PRODUCTION database and the repo is public, so:
 *   1. no file that creates a real account may carry a fixed password: every one is random per run
 *      (`Xx-${randomUUID()}-Aa1!`), so a leftover account from a crashed run cannot be signed into from the repo;
 *   2. every suite that grants is_admin removes it FIRST in its teardown (revokeTestAdmins) and ends its afterAll with
 *      assertNoTestAdmin() — see fixture-admin.ts.
 */

import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'fs'
import { join, relative } from 'path'

const SRC = join(process.cwd(), 'src')

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) return name === 'node_modules' ? [] : walk(full)
    return /\.(ts|tsx|mjs|js)$/.test(name) ? [full] : []
  })
}

// A file that creates a REAL Supabase account: the service-role admin API or a sign-up from a test/fixture file.
const CREATES_ACCOUNT = /auth\.admin\.createUser\(|\.auth\.signUp\(/
const isTestCode = (rel: string) => /(^|\/)__tests__\/|\.test\.tsx?$/.test(rel)

const liveFiles = walk(SRC)
  .map((full) => ({ rel: relative(SRC, full).replace(/\\/g, '/'), text: readFileSync(full, 'utf8') }))
  .filter(({ rel, text }) => isTestCode(rel) && CREATES_ACCOUNT.test(text))

// A password written into the source: a quoted string, or a template literal with no ${…} in it.
const FIXED_PASSWORD = /\b\w*(password|PASSWORD)\w*\s*[:=]\s*(['"][^'"]*['"]|`[^`$]*`)/

describe('live-suite fixtures (audit H6)', () => {
  it('the scan really finds the live suites (a broken glob must not pass vacuously)', () => {
    expect(liveFiles.length).toBeGreaterThan(40)
  })

  it('no file that creates a real account has a fixed password', () => {
    const offenders = liveFiles.flatMap(({ rel, text }) =>
      text
        .split(/\r?\n/)
        .map((line, i) => ({ line, i }))
        .filter(({ line }) => FIXED_PASSWORD.test(line))
        .map(({ line, i }) => `${rel}:${i + 1}: ${line.trim()}`),
    )
    expect(offenders).toEqual([])
  })

  it('every suite that grants is_admin revokes it first in teardown and ends with the no-test-admin check', () => {
    const adminSuites = liveFiles.filter(({ text }) => /is_admin:\s*true/.test(text))
    expect(adminSuites.length).toBeGreaterThan(20)
    const missing = adminSuites
      .filter(({ text }) => !/revokeTestAdmins\(/.test(text) || !/assertNoTestAdmin\(\)/.test(text))
      .map(({ rel }) => rel)
    expect(missing).toEqual([])
  })

  it('the revoke runs before the first deleteUser in each of those suites', () => {
    const late = liveFiles
      .filter(({ text }) => /is_admin:\s*true/.test(text))
      .filter(({ text }) => {
        const revoke = text.indexOf('revokeTestAdmins(')
        const firstDelete = text.search(/auth\.admin\.deleteUser\(/)
        return revoke === -1 || (firstDelete !== -1 && revoke > firstDelete)
      })
      .map(({ rel }) => rel)
    expect(late).toEqual([])
  })
})
