/**
 * Static guard for live-suite fixtures (audit H6) — reads source files only, touches no database.
 *
 * Live suites create real accounts on the PRODUCTION database and the repo is public, so:
 *   1. no file that creates a real account may carry a fixed password: every password written into such a file is
 *      random per run (`Xx-${randomUUID()}-Aa1!`), so a leftover account from a crashed run cannot be signed into
 *      from the repo. Covers src/ test code and scripts/;
 *   2. every suite that grants is_admin removes it FIRST in its teardown (revokeTestAdmins, before any refusal or
 *      delete) and ends its afterAll with assertNoTestAdmin() — see fixture-admin.ts.
 */

import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'fs'
import { join, relative } from 'path'

const ROOT = process.cwd()

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) return name === 'node_modules' ? [] : walk(full)
    return /\.(ts|tsx|mjs|cjs|js)$/.test(name) ? [full] : []
  })
}

// A file that creates a REAL Supabase account: the service-role admin API, or a sign-up from a test file or script.
const CREATES_ACCOUNT = /auth\.admin\.createUser\(|\.auth\.signUp\(/
const isTestCode = (rel: string) => /^src\/(.*\/)?__tests__\/|^src\/.*\.(test|spec)\.tsx?$/.test(rel)
const isScript = (rel: string) => rel.startsWith('scripts/')

const accountFiles = [...walk(join(ROOT, 'src')), ...walk(join(ROOT, 'scripts'))]
  .map((full) => ({ rel: relative(ROOT, full).replace(/\\/g, '/'), text: readFileSync(full, 'utf8') }))
  .filter(({ rel, text }) => (isTestCode(rel) || isScript(rel)) && CREATES_ACCOUNT.test(text))
const liveSuites = accountFiles.filter(({ rel }) => isTestCode(rel))

// ── Rule 1: passwords ────────────────────────────────────────────────────────────────────────────────────────────
// A password-ish name (password, PASSWORD, fixturePassword, pwd, pw — any case) given a string value. The value must
// carry ${randomUUID()}: a quoted string, a template without it (e.g. `${Date.now()}`), or a string fallback
// (`?? 'x'`, `|| 'x'`) is a fixed or guessable password. A value on the next line is joined first.
const NAME = String.raw`\w*(?:pass|pwd)\w*|\bpw\b`
const STRING_VALUE = new RegExp(String.raw`(?:${NAME})\s*(?::\s*[\w<>[\]| ]+)?\s*[:=]\s*(['"\x60].*)$`, 'i')
const STRING_FALLBACK = new RegExp(String.raw`(?:${NAME}).*(?:\?\?|\|\|)\s*['"\x60]`, 'i')

function passwordOffenders(rel: string, text: string): string[] {
  const joined = text.replace(/([:=])[ \t]*\r?\n[ \t]*/g, '$1 ')
  return joined
    .split(/\r?\n/)
    .filter((line) => !/^\s*(\/\/|\*|\/\*)/.test(line))
    .filter((line) => {
      const value = STRING_VALUE.exec(line)?.[1]
      return (value !== undefined && !value.includes('${randomUUID()}')) || STRING_FALLBACK.test(line)
    })
    .map((line) => `${rel}: ${line.trim()}`)
}

// ── Rule 2: admin rights ─────────────────────────────────────────────────────────────────────────────────────────
const GRANTS_ADMIN = /['"]?is_admin['"]?\s*:\s*true/
const RISKY_STEP = /refuseTeardownOn\w*\(|\.delete\(\)|\.remove\(|auth\.admin\.deleteUser\(/

function adminProblems(rel: string, text: string): string[] {
  const lines = text.split(/\r?\n/)
  const problems: string[] = []

  // The teardown = the function holding the first deleteUser. Its first real revoke line must precede every risky step.
  const firstDelete = lines.findIndex((l) => /auth\.admin\.deleteUser\(/.test(l))
  if (firstDelete === -1) {
    problems.push(`${rel}: grants is_admin but never deletes its users`)
  } else {
    let start = firstDelete
    while (start > 0 && !/^(export\s+)?(async\s+)?function\s/.test(lines[start])) start--
    const body = lines.slice(start, firstDelete + 1)
    const revoke = body.findIndex((l) => /^\s*await revokeTestAdmins\(/.test(l))
    const risky = body.findIndex((l) => RISKY_STEP.test(l))
    if (revoke === -1 || revoke > risky) problems.push(`${rel}: revokeTestAdmins is not the first step of the teardown`)
  }

  // The top-level afterAll must END with the no-test-admin check.
  const aa = lines.findIndex((l) => /^afterAll\(/.test(l))
  let end = aa
  while (aa !== -1 && end < lines.length && !/^\}/.test(lines[end])) end++
  const lastStatement = aa === -1 ? undefined : lines.slice(aa + 1, end).filter((l) => l.trim() !== '').at(-1)
  if (!lastStatement || !/^\s*await assertNoTestAdmin\(\)/.test(lastStatement)) {
    problems.push(`${rel}: afterAll does not end with assertNoTestAdmin()`)
  }
  return problems
}

describe('live-suite fixtures (audit H6)', () => {
  it('the scan really finds the live suites (a broken walk must not pass vacuously)', () => {
    expect(liveSuites.length).toBeGreaterThan(40)
    expect(accountFiles.some(({ rel }) => isScript(rel))).toBe(true)
  })

  it('no file that creates a real account has a fixed password', () => {
    expect(accountFiles.flatMap(({ rel, text }) => passwordOffenders(rel, text))).toEqual([])
  })

  it('every suite that grants is_admin revokes it first in teardown and ends afterAll with the no-test-admin check', () => {
    const adminSuites = liveSuites.filter(({ text }) => GRANTS_ADMIN.test(text))
    expect(adminSuites.length).toBeGreaterThan(20)
    expect(adminSuites.flatMap(({ rel, text }) => adminProblems(rel, text))).toEqual([])
  })

  // The rules themselves, on known shapes — so a loosened regex fails here instead of silently passing every file.
  it.each([
    ["const PASSWORD = 'Rls-Config-Test-7k2!'", true],
    ['  password: `Ab-${Date.now()}-Aa1!`,', true],
    ["const fixturePassword = 'x'", true],
    ["const pw = 'x'", true],
    ["  password: process.env.X ?? 'abc',", true],
    ["  password:\n    'Split-Line-1!',", true],
    ['const PASSWORD = `Xx-${randomUUID()}-Aa1!` // per run', false],
    ['  password: `Ph-${randomUUID()}-Aa1!`,', false],
    ['  password: PASSWORD,', false],
    ['let consumer: { id: string; email: string; password: string }', false],
    ['const passwordProbe = () => createClient(url, serviceKey)', false],
  ])('password rule on %j → offender: %s', (source, offends) => {
    expect(passwordOffenders('x.ts', source).length > 0).toBe(offends)
  })

  it('admin rule: a revoke after a refusal, or an afterAll that does not end with the check, is caught', () => {
    const good = [
      'async function teardown(): Promise<void> {',
      '  const ids = await lookup()',
      '  await revokeTestAdmins(ids)',
      '  await refuseTeardownOnForeignOrders(admin, ids, PREFIX)',
      '  for (const id of ids) await admin.auth.admin.deleteUser(id)',
      '}',
      'afterAll(async () => {',
      '  await teardown()',
      '  await assertNoTestAdmin()',
      '}, 1000)',
    ]
    expect(adminProblems('good.ts', good.join('\n'))).toEqual([])
    const late = [...good]
    ;[late[2], late[3]] = [late[3], late[2]]
    expect(adminProblems('late.ts', late.join('\n'))).toEqual(['late.ts: revokeTestAdmins is not the first step of the teardown'])
    const notLast = [...good]
    ;[notLast[7], notLast[8]] = [notLast[8], notLast[7]]
    expect(adminProblems('notLast.ts', notLast.join('\n'))).toEqual(['notLast.ts: afterAll does not end with assertNoTestAdmin()'])
  })
})
