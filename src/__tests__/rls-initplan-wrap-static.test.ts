/**
 * Static proof for the audit M9 migration 2 (*_rls_initplan_wrap.sql): wrapping auth.uid() / is_admin() in a
 * scalar sub-select changes NOTHING but the wrapping.
 *
 * For each of the 65 policies, the ALTER POLICY expression with (select auth.uid()) → auth.uid() and
 * (select is_admin()) → is_admin() must equal the live definition recorded in the file's « -- old » line, character
 * for character; the commented rollback block must restore exactly those definitions; the apply-time guard must
 * name the same 65 policies. The migration also re-checks all of this against the LIVE catalog when it is applied
 * (its own guard, same transaction) — this test keeps the file honest in CI. Found by suffix, so it survives the
 * PENDING_ → <version>_ rename.
 */
import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

type Old = { table: string; name: string; cmd: string; roles: string[]; using: string | null; check: string | null }
type Alter = { table: string; name: string; using: string | null; check: string | null }

const DIR = join(process.cwd(), 'db', 'migrations')
const files = readdirSync(DIR).filter((f) => f.endsWith('_rls_initplan_wrap.sql'))
const source = files.length === 1 ? readFileSync(join(DIR, files[0]), 'utf8').replace(/\r\n/g, '\n') : ''

const ROLLBACK_MARKER = '-- Rollback:'
const forwardPart = source.slice(0, source.indexOf(ROLLBACK_MARKER))
const rollbackPart = source
  .slice(source.indexOf(ROLLBACK_MARKER))
  .split('\n')
  .filter((l) => l.startsWith('-- '))
  .map((l) => l.slice(3))
  .join('\n')

const olds: Old[] = [...source.matchAll(/^-- old (\{.*\})$/gm)].map((m) => JSON.parse(m[1]) as Old)

/** The text inside the parenthesis opening at `open`, string- and identifier-quote aware. */
function readParens(text: string, open: number): { inner: string; end: number } {
  let depth = 0
  let quote: string | null = null
  for (let j = open; j < text.length; j++) {
    const c = text[j]
    if (quote) {
      if (c === quote) {
        if (text[j + 1] === quote) j++
        else quote = null
      }
      continue
    }
    if (c === "'" || c === '"') quote = c
    else if (c === '(') depth++
    else if (c === ')') {
      depth--
      if (depth === 0) return { inner: text.slice(open + 1, j), end: j + 1 }
    }
  }
  throw new Error(`unbalanced parenthesis at ${open}`)
}

function parseAlters(text: string): Alter[] {
  const out: Alter[] = []
  for (const m of text.matchAll(/^alter policy "([^"]+)" on public\.([a-z_]+)$/gm)) {
    let i = (m.index ?? 0) + m[0].length
    const skip = () => {
      while (/\s/.test(text[i])) i++
    }
    const alter: Alter = { table: m[2], name: m[1], using: null, check: null }
    skip()
    if (text.startsWith('using (', i)) {
      const r = readParens(text, i + 'using '.length)
      alter.using = r.inner
      i = r.end
      skip()
    }
    if (text.startsWith('with check (', i)) {
      const r = readParens(text, i + 'with check '.length)
      alter.check = r.inner
      i = r.end
      skip()
    }
    if (text[i] !== ';') throw new Error(`unexpected text after ${alter.table}/${alter.name}: ${text.slice(i, i + 40)}`)
    out.push(alter)
  }
  return out
}

const unwrap = (s: string | null) => (s === null ? null : s.replaceAll('(select auth.uid())', 'auth.uid()').replaceAll('(select is_admin())', 'is_admin()'))
const BARE_UID = /auth\.uid\(\)/
const BARE_ADMIN = /(?<![.\w])is_admin\(\)/
const hasBare = (s: string | null) => {
  if (s === null) return false
  const rest = s.replaceAll('(select auth.uid())', '').replaceAll('(select is_admin())', '')
  return BARE_UID.test(rest) || BARE_ADMIN.test(rest)
}

const forward = parseAlters(forwardPart)
const rollback = parseAlters(rollbackPart)
const key = (p: { table: string; name: string }) => `${p.table}/${p.name}`

describe('M9 migration 2 — auth.uid() / is_admin() wrapping (audit M9, PR 15a)', () => {
  it('exists exactly once (PENDING_ or recorded name)', () => {
    expect(files).toHaveLength(1)
  })

  it('records 65 old definitions: 56 call auth.uid() bare, 13 call is_admin() bare', () => {
    expect(olds).toHaveLength(65)
    expect(new Set(olds.map(key)).size).toBe(65)
    const both = (o: Old) => `${o.using ?? ''} ${o.check ?? ''}`
    expect(olds.filter((o) => BARE_UID.test(both(o)))).toHaveLength(56)
    expect(olds.filter((o) => BARE_ADMIN.test(both(o)))).toHaveLength(13)
    // 56 + 13 - 4 = 65: every recorded policy has at least one bare call, and 4 have both.
    expect(olds.filter((o) => BARE_UID.test(both(o)) && BARE_ADMIN.test(both(o)))).toHaveLength(4)
    expect(olds.every((o) => BARE_UID.test(both(o)) || BARE_ADMIN.test(both(o)))).toBe(true)
  })

  it('has one ALTER POLICY per recorded policy, in the same order', () => {
    expect(forward.map(key)).toEqual(olds.map(key))
  })

  it('each new expression, unwrapped, equals the old definition exactly — and every policy actually changed', () => {
    forward.forEach((alter, i) => {
      const old = olds[i]
      expect(unwrap(alter.using), `${key(old)} USING`).toBe(old.using)
      expect(unwrap(alter.check), `${key(old)} WITH CHECK`).toBe(old.check)
      expect(`${alter.using} ${alter.check}`).not.toBe(`${old.using} ${old.check}`)
    })
  })

  it('leaves no bare auth.uid() / is_admin() call in any new expression', () => {
    for (const alter of forward) {
      expect(hasBare(alter.using), `${key(alter)} USING`).toBe(false)
      expect(hasBare(alter.check), `${key(alter)} WITH CHECK`).toBe(false)
    }
  })

  it('sets only the clauses each command takes (INSERT: WITH CHECK; SELECT / DELETE: USING; UPDATE / ALL: as before)', () => {
    forward.forEach((alter, i) => {
      const old = olds[i]
      if (old.cmd === 'INSERT') expect(alter.using).toBeNull()
      if (old.cmd === 'SELECT' || old.cmd === 'DELETE') expect(alter.check).toBeNull()
      // UPDATE / ALL: a clause is set exactly when the policy had one, so none is added or dropped.
      expect(alter.using === null, `${key(old)} USING presence`).toBe(old.using === null)
      expect(alter.check === null, `${key(old)} WITH CHECK presence`).toBe(old.check === null)
    })
  })

  it('runs with a lock timeout, so a lock wait aborts instead of queueing the app behind 65 table locks', () => {
    expect(forwardPart).toMatch(/^set local lock_timeout = '5s';$/m)
    expect(forwardPart.indexOf("set local lock_timeout = '5s';")).toBeLessThan(forwardPart.indexOf('alter policy'))
  })

  it('the commented rollback block restores exactly the old definitions', () => {
    expect(rollback.map(key)).toEqual(olds.map(key))
    rollback.forEach((alter, i) => {
      expect(alter.using).toBe(olds[i].using)
      expect(alter.check).toBe(olds[i].check)
    })
  })

  it('the apply-time guard captures the same 65 policies and refuses any difference', () => {
    const capture = forwardPart.slice(forwardPart.indexOf('create temp table m9_policies_before'), forwardPart.indexOf('do $$'))
    const guarded = [...capture.matchAll(/\('([a-z_]+)', '([^']+)'\)/g)].map((m) => `${m[1]}/${m[2]}`)
    expect(guarded).toEqual(olds.map(key))
    expect(forwardPart).toContain("replace(replace(coalesce(a.qual, ''), '( SELECT auth.uid() AS uid)', 'auth.uid()'),")
    expect(forwardPart).toContain("replace(replace(coalesce(a.with_check, ''), '( SELECT auth.uid() AS uid)', 'auth.uid()'),")
    expect(forwardPart.match(/raise exception 'M9 initplan wrap:/g)).toHaveLength(4)
  })

  it('changes nothing else: no policy created or dropped, no grant, no revoke', () => {
    const code = forwardPart
      .split('\n')
      .filter((l) => !l.startsWith('--'))
      .join('\n')
    expect(code).not.toMatch(/\b(create|drop) policy\b/i)
    expect(code).not.toMatch(/^\s*(grant|revoke)\b/im)
    expect(code.match(/^alter policy /gm)).toHaveLength(65)
  })
})
