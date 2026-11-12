/**
 * Admin rights on live-suite fixtures (audit H6). Several live suites promote a fixture to is_admin = true on the
 * PRODUCTION database, and the repo is public. Two rules keep a crashed run from leaving a usable admin behind:
 *
 *   1. revokeTestAdmins(ids) — called FIRST in every admin-granting suite's teardown, before anything that can throw
 *      (foreign-order refusals, audit-log / storage cleanup, deleteUser). A teardown that stops half-way leaves
 *      ordinary accounts, never admins. Teardown also runs in beforeAll, so the next run fixes a crashed one.
 *   2. assertNoTestAdmin() — the LAST step of those suites' afterAll: fails the suite if ANY account on the test
 *      domain (@rls-smoke.servyou.invalid, every suite's fixture domain) still has is_admin = true, whichever suite
 *      left it. Live suites run one at a time (db-guardian rule), so another suite's admin mid-run is not expected.
 *
 * Every fixture password is random per run too (`Xx-${randomUUID()}-Aa1!`, never committed), so even a leftover
 * account cannot be signed into from the repo. fixture-secrets-static.test.ts enforces both rules in CI.
 * Service role, like fixture-session.ts's own client: a test helper, never imported by app code.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export const TEST_EMAIL_DOMAIN = '@rls-smoke.servyou.invalid'

let service: SupabaseClient | null = null

function serviceClient(): SupabaseClient {
  service ??= createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  return service
}

/** Sets is_admin = false on these fixture accounts. Throws on failure: a teardown must not go on with admins left. */
export async function revokeTestAdmins(ids: readonly string[]): Promise<void> {
  if (ids.length === 0) return
  const { error } = await serviceClient().from('profiles').update({ is_admin: false }).in('id', [...ids]).eq('is_admin', true)
  if (error) throw new Error(`revoking fixture admin rights failed: ${error.message} (${error.code})`)
}

/** Fails if any test-domain account still has is_admin = true. Names the accounts (test fixtures, no real data). */
export async function assertNoTestAdmin(): Promise<void> {
  const { data, error } = await serviceClient()
    .from('profiles')
    .select('email')
    .eq('is_admin', true)
    .like('email', `%${TEST_EMAIL_DOMAIN}`)
  if (error) throw new Error(`test-admin check failed: ${error.message} (${error.code})`)
  const left = (data ?? []).map((row) => String(row.email))
  if (left.length > 0) throw new Error(`test admin(s) left on the database: ${left.join(', ')}`)
}
