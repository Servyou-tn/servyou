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

/**
 * One pass over the SQL, the way Postgres lexes it: line and block comments dropped, '…' strings blanked to '' (a
 * comment marker or a dollar sign inside a string is just text), "…" identifiers kept, and $tag$ … $tag$ bodies
 * (functions, DO blocks) taken out into `bodies`. Doing these in one pass is what stops a `$$` in a comment, or a `--`
 * in a string, from swallowing a real statement.
 */
export function tokenizeSql(sql: string): { code: string; bodies: string[] } {
  let code = ''
  const bodies: string[] = []
  let i = 0
  while (i < sql.length) {
    if (sql.startsWith('--', i)) {
      const end = sql.indexOf('\n', i)
      i = end === -1 ? sql.length : end
      code += ' '
    } else if (sql.startsWith('/*', i)) {
      const end = sql.indexOf('*/', i + 2)
      i = end === -1 ? sql.length : end + 2
      code += ' '
    } else if (sql[i] === "'") {
      let j = i + 1
      while (j < sql.length && !(sql[j] === "'" && sql[j + 1] !== "'")) j += sql[j] === "'" ? 2 : 1
      i = j + 1
      code += "''"
    } else if (sql[i] === '"') {
      const end = sql.indexOf('"', i + 1)
      const stop = end === -1 ? sql.length : end + 1
      code += sql.slice(i, stop)
      i = stop
    } else {
      const tag = sql.slice(i).match(/^\$([A-Za-z_][A-Za-z0-9_]*)?\$/)?.[0]
      if (tag) {
        const end = sql.indexOf(tag, i + tag.length)
        bodies.push(sql.slice(i + tag.length, end === -1 ? sql.length : end))
        i = end === -1 ? sql.length : end + tag.length
        code += ' '
      } else {
        code += sql[i]
        i++
      }
    }
  }
  return { code, bodies }
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

// Postgres identifier folding: "Quoted" keeps its case, an unquoted name is lower-cased.
const ident = (name: string) => {
  const t = name.trim()
  return /^".*"$/.test(t) ? t.slice(1, -1) : t.toLowerCase()
}

// GRANT targets that are not relations (a relation is TABLE x, or a bare name).
const NON_RELATION_TARGET =
  /^(functions?|procedures?|routines?|schema|sequences?|types?|domain|database|foreign|language|large object|tablespace|parameter|all functions|all procedures|all routines|all sequences)\b/i

// A client write GRANT inside a function / DO body: invisible to the statement parse, so it cannot be allow-listed.
const GRANT_IN_BODY = /\bgrant\s[^;]*?\b(insert|update|delete|all)\b[^;]*?\bto\b[^;]*?\b(anon|authenticated|public)\b/i

/**
 * Every client write privilege the GRANT statements in `sql` hand out, plus statements that cannot be allow-listed at
 * all: a grant on ALL TABLES, ALTER DEFAULT PRIVILEGES … GRANT a table write to a client (either would undo 107), or
 * a client write GRANT inside a function / DO body (dynamic SQL the static parse cannot pin to a relation).
 */
export function parseClientWriteGrants(sql: string): { grants: ClientWriteGrant[]; forbidden: string[] } {
  const grants: ClientWriteGrant[] = []
  const forbidden: string[] = []
  const { code, bodies } = tokenizeSql(sql)
  for (const body of bodies) {
    const hit = body.match(GRANT_IN_BODY)
    if (hit) forbidden.push(`inside a function / DO body: ${hit[0].replace(/\s+/g, ' ').trim()}`)
  }
  for (const raw of code.split(';')) {
    const stmt = raw.replace(/\s+/g, ' ').trim()
    const isDefault = /^alter default privileges\b/i.test(stmt)
    const grantPart = (isDefault ? stmt.replace(/^alter default privileges\b.*?\b(grant\b)/i, '$1') : stmt)
      .replace(/ granted by \S+$/i, '')
      .replace(/ with grant option$/i, '')
    const m = grantPart.match(/^grant (.+?) on (.+?) to (.+)$/i)
    if (!m) continue
    const [, privList, target, granteeList] = m
    const grantees = granteeList
      .split(',')
      .map((g) => ident(g.trim().replace(/^group /i, '')))
      .map((g) => (g === 'public' ? 'PUBLIC' : g))
      .filter((g): g is ClientGrantee => CLIENT_GRANTEES.includes(g as ClientGrantee))
    if (!grantees.length) continue

    const privileges: { privilege: WritePrivilege; columns: string[] | null }[] = []
    for (const p of splitTopLevel(privList)) {
      const pm = p.match(/^(\w+)(?: privileges)?\s*(?:\((.*)\))?$/i)
      if (!pm) continue
      const word = pm[1].toUpperCase()
      const columns = pm[2] ? pm[2].split(',').map(ident) : null
      // ALL (cols) is column-level, and Postgres has no column DELETE: it means INSERT + UPDATE on those columns.
      if (word === 'ALL') {
        const all: readonly WritePrivilege[] = columns ? ['INSERT', 'UPDATE'] : WRITE_PRIVILEGES
        all.forEach((privilege) => privileges.push({ privilege, columns }))
      } else if (WRITE_PRIVILEGES.includes(word as WritePrivilege)) privileges.push({ privilege: word as WritePrivilege, columns })
    }
    if (!privileges.length) continue

    if (isDefault) {
      if (/^tables$/i.test(target.trim())) forbidden.push(stmt)
      continue
    }
    if (/^all tables in schema\b/i.test(target)) {
      forbidden.push(stmt)
      continue
    }
    const tableTarget = target.replace(/^table /i, '')
    if (NON_RELATION_TARGET.test(tableTarget)) continue
    for (const name of tableTarget.split(',')) {
      const parts = name.split('.').map(ident)
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

// A file in db/migrations the check would otherwise skip silently (a 13-digit version, `pending_`, `-` for `_`).
const isRecognizedFileName = (name: string) => name === 'README.md' || /^(\d{14}_|PENDING_).+\.sql$/.test(name)

/** Violations, one line each, for the given migration files. */
export function staticViolations(files: { name: string; sql: string }[], allow: ClientWriteAllowlist): string[] {
  const out: string[] = []
  for (const { name } of files) {
    if (!isRecognizedFileName(name)) out.push(`${name}: not a migration file name (<14-digit version>_name.sql or PENDING_name.sql)`)
  }
  for (const { name, sql } of files.filter((f) => isCheckedMigration(f.name))) {
    const { grants, forbidden } = parseClientWriteGrants(sql)
    for (const stmt of forbidden) out.push(`${name}: cannot be allow-listed (all tables / default privileges / dynamic SQL): ${stmt}`)
    for (const g of grants) if (!isAllowed(g, allow)) out.push(`${name}: ${grantKey(g)} is not in db/client-write-allowlist.json`)
  }
  return out
}
