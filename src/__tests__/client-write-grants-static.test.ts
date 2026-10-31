/**
 * The static half of the client-write allow-list check (architect's ruling, 2026-10-30): CI fails a migration newer
 * than 107 (or any PENDING_ file) that GRANTs INSERT / UPDATE / DELETE to anon, authenticated or PUBLIC outside
 * db/client-write-allowlist.json. Since migration 107 made the defaults fail-closed, an explicit GRANT is the only way
 * a client write can appear, so this sees every new one before it ships. The live half
 * (client-write-grants-live.test.ts) compares the real catalog with the same file.
 *
 * No database: reads db/migrations/ and the allow-list from disk.
 */

import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import allowlistJson from '../../db/client-write-allowlist.json'
import {
  allowlistShapeErrors,
  expandAllowlist,
  isCheckedMigration,
  parseClientWriteGrants,
  staticViolations,
  type ClientWriteAllowlist,
} from '@/lib/db/client-write-grants'

const allow = allowlistJson as unknown as ClientWriteAllowlist
const MIGRATIONS = path.resolve(__dirname, '../../db/migrations')

describe('the repository', () => {
  it('no checked migration grants a client write outside the allow-list', () => {
    const files = fs
      .readdirSync(MIGRATIONS, { withFileTypes: true })
      .filter((d) => d.isFile())
      .map(({ name }) => ({ name, sql: fs.readFileSync(path.join(MIGRATIONS, name), 'utf8') }))
    expect(staticViolations(files, allow)).toEqual([])
  })

  it('the allow-list file is well-formed', () => {
    expect(allowlistShapeErrors(allow)).toEqual([])
    expect(expandAllowlist(allow).length).toBeGreaterThan(0)
  })
})

describe('which files are checked', () => {
  it.each([
    ['20261030231153_next.sql', true],
    ['PENDING_new_table.sql', true],
    ['20261030231152_fail_closed_default_privileges.sql', false],
    ['20261026190353_prelaunch_acl_hardening.sql', false],
    ['README.md', false],
  ])('%s → %s', (name, checked) => {
    expect(isCheckedMigration(name)).toBe(checked)
  })
})

describe('parseClientWriteGrants', () => {
  it('table-level, several tables and grantees', () => {
    const { grants } = parseClientWriteGrants('grant insert, delete on public.a, b to anon, authenticated;')
    expect(grants).toHaveLength(8)
    expect(grants).toContainEqual({ relation: 'b', grantee: 'anon', privilege: 'DELETE', column: null })
  })

  it('column-level, TABLE keyword, quoted names', () => {
    const { grants } = parseClientWriteGrants('GRANT UPDATE ("status", carrier), insert (id) ON TABLE public."orders" TO authenticated;')
    expect(grants).toEqual([
      { relation: 'orders', grantee: 'authenticated', privilege: 'UPDATE', column: 'status' },
      { relation: 'orders', grantee: 'authenticated', privilege: 'UPDATE', column: 'carrier' },
      { relation: 'orders', grantee: 'authenticated', privilege: 'INSERT', column: 'id' },
    ])
  })

  it('ALL [PRIVILEGES] counts as the three writes; PUBLIC is a client grantee', () => {
    const { grants } = parseClientWriteGrants('grant all privileges on public.t to public;')
    expect(grants.map((g) => `${g.grantee}:${g.privilege}`)).toEqual(['PUBLIC:INSERT', 'PUBLIC:UPDATE', 'PUBLIC:DELETE'])
  })

  it('ignores SELECT, service_role, functions, other schemas, comments, and function bodies without a GRANT', () => {
    const sql = `
      grant select on public.t to anon, authenticated;
      grant insert on public.t to service_role;
      grant execute on function public.f() to authenticated;
      grant insert on storage.objects to authenticated;
      -- grant insert on public.t to authenticated;
      /* grant delete on public.t to anon; */
      create function public.g() returns void language plpgsql as $$ begin perform 1; end; $$;
    `
    expect(parseClientWriteGrants(sql)).toEqual({ grants: [], forbidden: [] })
  })

  it('a grant on ALL TABLES or through default privileges cannot be allow-listed', () => {
    const { forbidden } = parseClientWriteGrants(`
      grant insert on all tables in schema public to authenticated;
      alter default privileges for role postgres in schema public grant update on tables to authenticated;
      alter default privileges for role postgres in schema public revoke insert on tables from anon;
    `)
    expect(forbidden).toHaveLength(2)
  })
})

// The review's false negatives / positives (PR review, 2026-10-31): each one pinned.
describe('parseClientWriteGrants — lexing and edge forms', () => {
  const parsed = (sql: string) => parseClientWriteGrants(sql)

  it('a $$ inside a comment does not swallow the next statement', () => {
    const sql = `-- note: uses $$
grant insert on public.t to anon;
create function f() returns int language sql as $$ select 1 $$;`
    expect(parsed(sql).grants).toEqual([{ relation: 't', grantee: 'anon', privilege: 'INSERT', column: null }])
  })

  it('a -- or /* inside a string literal is not a comment', () => {
    expect(parsed(`select 'a -- b'; grant insert on public.t to anon;`).grants).toHaveLength(1)
    expect(parsed(`select 'a/*'; grant insert on public.t to anon; select '*/';`).grants).toHaveLength(1)
    expect(parsed(`select 'it''s; grant insert on public.t to anon';`).grants).toEqual([])
  })

  it('a client write GRANT inside a DO block or function body is forbidden', () => {
    expect(parsed(`do $$ begin grant insert on public.t to authenticated; end $$;`).forbidden).toHaveLength(1)
    expect(parsed(`do $x$ begin execute format('grant update on public.%I to anon', 't'); end $x$;`).forbidden).toHaveLength(1)
    expect(parsed(`do $$ begin grant select on public.t to anon; end $$;`).forbidden).toEqual([])
  })

  it('GRANTED BY and TO GROUP do not hide the grantee', () => {
    expect(parsed('grant insert on public.t to authenticated granted by postgres;').grants).toHaveLength(1)
    expect(parsed('grant insert on public.t to anon with grant option granted by postgres;').grants).toHaveLength(1)
    expect(parsed('grant delete on public.t to group authenticated;').grants).toHaveLength(1)
  })

  it('unquoted identifiers fold to lower case; quoted ones keep theirs', () => {
    expect(parsed('grant insert on PUBLIC.Orders to AUTHENTICATED;').grants).toEqual([
      { relation: 'orders', grantee: 'authenticated', privilege: 'INSERT', column: null },
    ])
    expect(parsed('grant insert on public."Orders" to authenticated;').grants[0].relation).toBe('Orders')
  })

  it('ALL (cols) is INSERT + UPDATE on those columns, never a column DELETE', () => {
    expect(parsed('grant all (a) on public.t to authenticated;').grants.map((g) => g.privilege)).toEqual(['INSERT', 'UPDATE'])
  })

  it('default privileges on functions / sequences, and non-relation targets, are not table writes', () => {
    expect(parsed('alter default privileges in schema public grant all on functions to authenticated;')).toEqual({ grants: [], forbidden: [] })
    expect(parsed('alter default privileges in schema public grant usage, update on sequences to authenticated;')).toEqual({ grants: [], forbidden: [] })
    expect(parsed('grant all on database postgres to authenticated; grant all on type public.x to anon;')).toEqual({ grants: [], forbidden: [] })
  })
})

describe('staticViolations', () => {
  const ALLOW: ClientWriteAllowlist = { tables: { t: { authenticated: { INSERT: '*', UPDATE: ['a'] } } } }
  const file = (sql: string) => [{ name: 'PENDING_x.sql', sql }]

  it('allow-listed grants pass, table-level or for a listed column', () => {
    expect(staticViolations(file('grant insert on public.t to authenticated; grant update (a) on public.t to authenticated;'), ALLOW)).toEqual([])
  })

  it('an unlisted privilege, column, grantee or table fails', () => {
    const sql = `
      grant delete on public.t to authenticated;
      grant update (b) on public.t to authenticated;
      grant insert on public.t to anon;
      grant insert on public.u to authenticated;
      grant update on public.t to authenticated;
    `
    expect(staticViolations(file(sql), ALLOW)).toHaveLength(5)
  })

  it('a file name the check would silently skip is itself a violation', () => {
    const files = ['2026103123000_x.sql', 'pending_x.sql', '20261031230000-x.sql'].map((name) => ({ name, sql: '' }))
    expect(staticViolations([...files, { name: 'README.md', sql: '' }], ALLOW)).toHaveLength(3)
  })

  it('migrations up to 107 are not re-checked (history the live test covers)', () => {
    expect(staticViolations([{ name: '20261026190353_x.sql', sql: 'grant delete on public.zz to anon;' }], ALLOW)).toEqual([])
  })
})
