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
    const files = fs.readdirSync(MIGRATIONS).map((name) => ({ name, sql: fs.readFileSync(path.join(MIGRATIONS, name), 'utf8') }))
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

  it('ignores SELECT, service_role, functions, other schemas, comments and function bodies', () => {
    const sql = `
      grant select on public.t to anon, authenticated;
      grant insert on public.t to service_role;
      grant execute on function public.f() to authenticated;
      grant insert on storage.objects to authenticated;
      -- grant insert on public.t to authenticated;
      /* grant delete on public.t to anon; */
      create function public.g() returns void language plpgsql as $$ begin execute 'grant insert on public.t to anon'; end; $$;
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

  it('migrations up to 107 are not re-checked (history the live test covers)', () => {
    expect(staticViolations([{ name: '20261026190353_x.sql', sql: 'grant delete on public.zz to anon;' }], ALLOW)).toEqual([])
  })
})
