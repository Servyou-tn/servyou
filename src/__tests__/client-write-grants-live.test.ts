/**
 * The live half of the client-write allow-list check (architect's ruling, 2026-10-30): the REAL catalog's client write
 * privileges, read through the service-role-only RPC client_write_grants() (db/migrations/PENDING_client_write_grants_rpc.sql),
 * must equal db/client-write-allowlist.json in both directions —
 *   * a privilege the catalog has and the file does not: a grant made outside a reviewed migration (dashboard, a
 *     platform-created object — supabase_admin's defaults are not fail-closed) or a migration whose allow-list entry
 *     was forgotten;
 *   * an entry the file has and the catalog does not: the file is stale (a revoke without its allow-list edit).
 * And the RPC itself is not callable by anon or a signed-in user (it maps the attack surface).
 *
 * ⚠ Red until that migration is applied: before it, the RPC does not exist.
 *
 * 1 fixture sign-in (`cwg-`, the live sign-in budget). Run after every applied migration that touches grants:
 *   npx vitest run --config vitest.integration.config.ts src/__tests__/client-write-grants-live.test.ts
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'
import allowlistJson from '../../db/client-write-allowlist.json'
import { expandAllowlist, grantKey, type ClientWriteAllowlist, type ClientWriteGrant } from '@/lib/db/client-write-grants'
import { fixtureSignIn } from './fixture-session'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const hasCreds = Boolean(url && serviceKey && anonKey)

const PREFIX = 'cwg-'
const EMAIL = `${PREFIX}user@rls-smoke.servyou.invalid`
const opts = { auth: { autoRefreshToken: false, persistSession: false } }
const admin = hasCreds ? createClient(url, serviceKey, opts) : null

type Row = { relation: string; grantee: ClientWriteGrant['grantee']; privilege: ClientWriteGrant['privilege']; column_name: string | null }

async function teardown(): Promise<void> {
  const { data, error } = await admin!.from('profiles').select('id').like('email', `${PREFIX}%`)
  if (error) throw new Error(`teardown lookup failed: ${error.message}`)
  for (const { id } of data ?? []) {
    const { error: delErr } = await admin!.auth.admin.deleteUser(id)
    if (delErr) throw new Error(`deleteUser failed for ${id}: ${delErr.message}`)
  }
}

beforeAll(async () => {
  if (!hasCreds) return
  await teardown()
}, 60000)

afterAll(async () => {
  if (!hasCreds) return
  await teardown()
  const { count, error } = await admin!.from('profiles').select('id', { count: 'exact', head: true }).like('email', `${PREFIX}%`)
  if (error) throw new Error(`cleanup check failed: ${error.message}`)
  if ((count ?? 0) !== 0) throw new Error(`teardown left ${count} ${PREFIX} profiles`)
}, 60000)

describe.skipIf(!hasCreds)('the live catalog equals db/client-write-allowlist.json', () => {
  it('no client write privilege outside the allow-list, and no stale allow-list entry', async () => {
    const { data, error } = await admin!.rpc('client_write_grants' as never)
    expect(error).toBeNull()
    const live = new Set((data as unknown as Row[]).map((r) => grantKey({ ...r, column: r.column_name })))
    const listed = new Set(expandAllowlist(allowlistJson as unknown as ClientWriteAllowlist).map(grantKey))

    const notListed = [...live].filter((k) => !listed.has(k)).sort()
    const stale = [...listed].filter((k) => !live.has(k)).sort()
    expect({ notListed, stale }).toEqual({ notListed: [], stale: [] })
    expect(live.size).toBeGreaterThan(0)
  })
})

describe.skipIf(!hasCreds)('the RPC is service_role only', () => {
  it('anon is refused', async () => {
    const { error } = await createClient(url, anonKey, opts).rpc('client_write_grants' as never)
    expect(error?.code).toBe('42501')
  })

  it('a signed-in user is refused', async () => {
    const { error: createErr } = await admin!.auth.admin.createUser({
      email: EMAIL,
      password: `Cw-${randomUUID()}-Aa1!`,
      email_confirm: true,
      user_metadata: { full_name: 'Grant Check Test', date_of_birth: '1990-01-01', city: 'Tunis', language: 'fr' },
    })
    if (createErr) throw new Error(`createUser failed: ${createErr.message}`)
    const user = createClient(url, anonKey, opts)
    const { error: signErr } = await fixtureSignIn(user, EMAIL)
    if (signErr) throw new Error(`signIn failed: ${signErr.message}`)

    const { error } = await user.rpc('client_write_grants' as never)
    expect(error?.code).toBe('42501')
  })
})
