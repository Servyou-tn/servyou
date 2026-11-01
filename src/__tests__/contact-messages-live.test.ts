/**
 * Live proof for db/migrations/20261101164444_contact_messages.sql (#112) and src/lib/contact/save-message.ts — /contact messages
 * are stored, server-side only:
 *   * the real saveContactMessage (service role) stores a message;
 *   * the CHECKs refuse an over-long message and an unknown status, whoever writes;
 *   * anon and a signed-in user can neither read nor write the table (42501).
 *
 * Fixtures: one user (`ct-msg-`, password random per run) and messages tagged with a per-run marker in `name`,
 * deleted by the service role in afterAll (cleanup checked). 1 fixture sign-in.
 *
 * Run: npx vitest run --config vitest.integration.config.ts src/__tests__/contact-messages-live.test.ts
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'
import { saveContactMessage } from '@/lib/contact/save-message'
import { fixtureSignIn } from './fixture-session'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const hasCreds = Boolean(url && serviceKey && anonKey)

const PREFIX = 'ct-msg-'
const EMAIL = `${PREFIX}user@rls-smoke.servyou.invalid`
const MARK = `${PREFIX}${randomUUID().slice(0, 8)}`
const opts = { auth: { autoRefreshToken: false, persistSession: false } }
const admin: SupabaseClient | null = hasCreds ? createClient(url, serviceKey, opts) : null

async function teardown(): Promise<void> {
  const { error: msgErr } = await admin!.from('contact_messages').delete().like('name', `${PREFIX}%`)
  if (msgErr && msgErr.code !== 'PGRST205') throw new Error(`message cleanup failed: ${msgErr.message}`)
  const { data, error } = await admin!.from('profiles').select('id').like('email', `${PREFIX}%`)
  if (error) throw new Error(`teardown lookup failed: ${error.message}`)
  for (const { id } of data ?? []) {
    const { error: delErr } = await admin!.auth.admin.deleteUser(id)
    if (delErr) throw new Error(`deleteUser failed for ${id}: ${delErr.message}`)
  }
}

const row = (over: Record<string, unknown> = {}) => ({
  name: MARK,
  email: 'sender@example.com',
  subject: 'contact.form.subject.general',
  message: 'Bonjour',
  ...over,
})

beforeAll(async () => {
  if (!hasCreds) return
  await teardown()
  const { error } = await admin!.auth.admin.createUser({
    email: EMAIL,
    password: `Ct-${randomUUID()}-Aa1!`,
    email_confirm: true,
    user_metadata: { full_name: 'Contact Messages Test', date_of_birth: '1990-01-01', city: 'Tunis', language: 'fr' },
  })
  if (error) throw new Error(`createUser failed: ${error.message}`)
}, 60000)

afterAll(async () => {
  if (!hasCreds) return
  await teardown()
  const { count, error } = await admin!.from('contact_messages').select('id', { count: 'exact', head: true }).like('name', `${PREFIX}%`)
  if (error) throw new Error(`cleanup check failed: ${error.message}`)
  if ((count ?? 0) !== 0) throw new Error(`teardown left ${count} ${PREFIX} messages`)
}, 60000)

describe.skipIf(!hasCreds)('contact_messages — stored by the server', () => {
  it('saveContactMessage stores the message with status new', async () => {
    expect(await saveContactMessage({ name: MARK, email: 'sender@example.com', subject: null, message: 'Bonjour', userId: null })).toEqual({ ok: true })
    const { data, error } = await admin!.from('contact_messages').select('message, status, user_id').eq('name', MARK).single()
    expect(error).toBeNull()
    expect(data).toEqual({ message: 'Bonjour', status: 'new', user_id: null })
  })

  it('the CHECKs refuse an over-long message and an unknown status, even for the service role', async () => {
    expect((await admin!.from('contact_messages').insert(row({ message: 'm'.repeat(2001) }))).error?.code).toBe('23514')
    expect((await admin!.from('contact_messages').insert(row({ status: 'spam' }))).error?.code).toBe('23514')
  })
})

describe.skipIf(!hasCreds)('contact_messages — no client access', () => {
  it('anon can neither read nor write', async () => {
    const anon = createClient(url, anonKey, opts)
    expect((await anon.from('contact_messages').select('id')).error?.code).toBe('42501')
    expect((await anon.from('contact_messages').insert(row())).error?.code).toBe('42501')
  })

  it('a signed-in user can neither read, write nor delete', async () => {
    const user = createClient(url, anonKey, opts)
    const { error: signErr } = await fixtureSignIn(user, EMAIL)
    if (signErr) throw new Error(`signIn failed: ${signErr.message}`)
    expect((await user.from('contact_messages').select('id')).error?.code).toBe('42501')
    expect((await user.from('contact_messages').insert(row())).error?.code).toBe('42501')
    expect((await user.from('contact_messages').update({ status: 'handled' }).eq('name', MARK)).error?.code).toBe('42501')
    expect((await user.from('contact_messages').delete().eq('name', MARK)).error?.code).toBe('42501')
  })
})
