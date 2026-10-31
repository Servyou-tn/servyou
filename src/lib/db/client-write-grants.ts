// Client write privileges (INSERT / UPDATE / DELETE held by anon, authenticated or PUBLIC on a relation in public)
// against the allow-list in db/client-write-allowlist.json (architect's ruling 2026-10-30, after migration 107 made
// the defaults fail-closed). Two checks read this module:
//   * static, in CI (src/__tests__/client-write-grants-static.test.ts): every GRANT in a migration newer than 107
//     (or a PENDING_ file) must be allow-listed — since 107, a GRANT in a migration is the only way a client write
//     can appear;
//   * live (src/__tests__/client-write-grants-live.test.ts): the real catalog, read through the service-role-only RPC
//     client_write_grants(), must equal the allow-list in both directions — it catches a grant made outside a
//     migration (dashboard, a platform-created object) and an allow-list entry nothing grants any more.
// No server-only dependency: plain data and string parsing, so both a test and a script can use it.

export type ClientGrantee = 'anon' | 'authenticated' | 'PUBLIC'
export type WritePrivilege = 'INSERT' | 'UPDATE' | 'DELETE'

/** One privilege: table-level when `column` is null, else that column only. */
export type ClientWriteGrant = { relation: string; grantee: ClientGrantee; privilege: WritePrivilege; column: string | null }

/** db/client-write-allowlist.json: per table, per grantee, per privilege, "*" (table-level) or the granted columns. */
export type ClientWriteAllowlist = {
  tables: Record<string, Partial<Record<ClientGrantee, Partial<Record<WritePrivilege, '*' | string[]>>>>>
}

/** The first migration version the static check covers: everything after 107 (fail-closed defaults). */
export const STATIC_CHECK_AFTER_VERSION = '20261030231152'

const WRITE_PRIVILEGES: readonly WritePrivilege[] = ['INSERT', 'UPDATE', 'DELETE']
const CLIENT_GRANTEES: readonly ClientGrantee[] = ['anon', 'authenticated', 'PUBLIC']

export const grantKey = (g: ClientWriteGrant) => `${g.relation}|${g.grantee}|${g.privilege}|${g.column ?? '*'}`

/** The allow-list as one ClientWriteGrant per privilege (and per column for a column-level entry). */
export function expandAllowlist(allow: ClientWriteAllowlist): ClientWriteGrant[] {
  const out: ClientWriteGrant[] = []
  for (const [relation, byGrantee] of Object.entries(allow.tables)) {
    for (const [grantee, byPrivilege] of Object.entries(byGrantee ?? {})) {
      for (const [privilege, scope] of Object.entries(byPrivilege ?? {})) {
        const base = { relation, grantee: grantee as ClientGrantee, privilege: privilege as WritePrivilege }
        if (scope === '*') out.push({ ...base, column: null })
        else for (const column of scope ?? []) out.push({ ...base, column })
      }
    }
  }
  return out
}

/** Shape problems in the allow-list file itself (unknown grantee / privilege, empty or unsorted column lists). */
export function allowlistShapeErrors(allow: ClientWriteAllowlist): string[] {
  const errors: string[] = []
  for (const [relation, byGrantee] of Object.entries(allow.tables)) {
    for (const [grantee, byPrivilege] of Object.entries(byGrantee ?? {})) {
      if (!CLIENT_GRANTEES.includes(grantee as ClientGrantee)) errors.push(`${relation}: unknown grantee ${grantee}`)
      for (const [privilege, scope] of Object.entries(byPrivilege ?? {})) {
        if (!WRITE_PRIVILEGES.includes(privilege as WritePrivilege)) errors.push(`${relation}.${grantee}: unknown privilege ${privilege}`)
        if (scope === '*') continue
        if (!Array.isArray(scope) || scope.length === 0) errors.push(`${relation}.${grantee}.${privilege}: "*" or a non-empty column list`)
        else if (scope.join() !== [...new Set(scope)].sort().join()) errors.push(`${relation}.${grantee}.${privilege}: columns not sorted / unique`)
      }
    }
  }
  return errors
}

/** A grant is allowed when its privilege is allow-listed table-level, or column-level for that column. */
export function isAllowed(g: ClientWriteGrant, allow: ClientWriteAllowlist): boolean {
  const scope = allow.tables[g.relation]?.[g.grantee]?.[g.privilege]
  if (scope === '*') return true
  return g.column !== null && Array.isArray(scope) && scope.includes(g.column)
}

// ── Static parsing of migration SQL ─────────────────────────────────────────────────────────────────────────────

/** Comments and dollar-quoted bodies removed: a GRANT inside a function body or a comment is not a statement. */
export function stripSqlNoise(sql: string): string {
  return sql
    .replace(/\$([A-Za-z_]*)\$[\s\S]*?\$\1\$/g, ' ')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/--[^\n]*/g, ' ')
}

// Splits at commas outside parentheses: "insert (a, b), update" → ["insert (a, b)", "update"].
function splitTopLevel(list: string): string[] {
  const parts: string[] = []
  let depth = 0
  let current = ''
  for (const ch of list) {
    if (ch === '(') depth++
    if (ch === ')') depth--
    if (ch === ',' && depth === 0) {
      parts.push(current)
      current = ''
    } else current += ch
  }
  parts.push(current)
  return parts.map((p) => p.trim()).filter(Boolean)
}

const unquote = (name: string) => name.trim().replace(/^"(.*)"$/, '$1')

/**
 * Every client write privilege the GRANT statements in `sql` hand out, plus statements that cannot be allow-listed at
 * all (a grant on ALL TABLES, or ALTER DEFAULT PRIVILEGES … GRANT a write to a client — either would undo 107).
 */
export function parseClientWriteGrants(sql: string): { grants: ClientWriteGrant[]; forbidden: string[] } {
  const grants: ClientWriteGrant[] = []
  const forbidden: string[] = []
  for (const raw of stripSqlNoise(sql).split(';')) {
    const stmt = raw.replace(/\s+/g, ' ').trim()
    const isDefault = /^alter default privileges\b/i.test(stmt)
    const grantPart = isDefault ? stmt.replace(/^alter default privileges\b.*?\b(grant\b)/i, '$1') : stmt
    const m = grantPart.match(/^grant (.+?) on (.+?) to (.+?)(?: with grant option)?$/i)
    if (!m) continue
    const [, privList, target, granteeList] = m
    const grantees = granteeList
      .split(',')
      .map((g) => unquote(g).toLowerCase())
      .map((g) => (g === 'public' ? 'PUBLIC' : g))
      .filter((g): g is ClientGrantee => CLIENT_GRANTEES.includes(g as ClientGrantee))
    if (!grantees.length) continue

    const privileges: { privilege: WritePrivilege; columns: string[] | null }[] = []
    for (const p of splitTopLevel(privList)) {
      const pm = p.match(/^(\w+)(?: privileges)?\s*(?:\((.*)\))?$/i)
      if (!pm) continue
      const word = pm[1].toUpperCase()
      const columns = pm[2] ? pm[2].split(',').map(unquote) : null
      if (word === 'ALL') WRITE_PRIVILEGES.forEach((privilege) => privileges.push({ privilege, columns }))
      else if (WRITE_PRIVILEGES.includes(word as WritePrivilege)) privileges.push({ privilege: word as WritePrivilege, columns })
    }
    if (!privileges.length) continue

    if (isDefault || /^all tables in schema\b/i.test(target)) {
      forbidden.push(stmt)
      continue
    }
    const tableTarget = target.replace(/^table /i, '')
    if (/^(function|procedure|routine|schema|sequence|all )/i.test(tableTarget)) continue
    for (const name of tableTarget.split(',')) {
      const parts = name.split('.').map(unquote)
      if (parts.length === 2 && parts[0] !== 'public') continue
      const relation = parts[parts.length - 1]
      for (const grantee of grantees) {
        for (const { privilege, columns } of privileges) {
          if (columns) columns.forEach((column) => grants.push({ relation, grantee, privilege, column }))
          else grants.push({ relation, grantee, privilege, column: null })
        }
      }
    }
  }
  return { grants, forbidden }
}

/** Migration files the static check covers: versions after 107, and every PENDING_ file. */
export function isCheckedMigration(fileName: string): boolean {
  if (fileName.startsWith('PENDING_')) return fileName.endsWith('.sql')
  const version = fileName.match(/^(\d{14})_.*\.sql$/)?.[1]
  return version !== undefined && version > STATIC_CHECK_AFTER_VERSION
}

/** Violations, one line each, for the given migration files. */
export function staticViolations(files: { name: string; sql: string }[], allow: ClientWriteAllowlist): string[] {
  const out: string[] = []
  for (const { name, sql } of files.filter((f) => isCheckedMigration(f.name))) {
    const { grants, forbidden } = parseClientWriteGrants(sql)
    for (const stmt of forbidden) out.push(`${name}: cannot be allow-listed (all tables / default privileges): ${stmt}`)
    for (const g of grants) if (!isAllowed(g, allow)) out.push(`${name}: ${grantKey(g)} is not in db/client-write-allowlist.json`)
  }
  return out
}
