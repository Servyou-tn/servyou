/**
 * Live proof that src/middleware.ts persists a session refresh (docs/follow-ups/suspension-enforcement.md « server-side
 * getUser() refreshes near expiry and throws the rotated tokens away »). The real middleware runs against the real
 * Auth server with a real @supabase/ssr session cookie whose `expires_at` is moved into the past, so getUser()
 * refreshes:
 *
 *   * the response carries the rotated session (a NEW refresh token, a future expiry) as Set-Cookie;
 *   * the same session is forwarded on the request (x-middleware-request-cookie) for this request's Server Components;
 *   * the next request, with the persisted cookie, passes through with NO refresh — the loop the follow-up describes
 *     (every request re-refreshing the same, already-rotated token) is gone.
 *
 * Fixture (`sess-ref-`, password random per run): one user, signed in once through an @supabase/ssr client so the
 * cookie is exactly the format the app writes. 1 fixture sign-in + 1 refresh (the live sign-in budget). Deleting the
 * user removes it.
 *
 * Run: npx vitest run --config vitest.integration.config.ts src/__tests__/session-refresh-live.test.ts
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { randomUUID } from 'crypto'
import { middleware } from '@/middleware'
import { fixtureSignIn } from './fixture-session'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const hasCreds = Boolean(url && serviceKey && anonKey)

const PREFIX = 'sess-ref-'
const EMAIL = `${PREFIX}user@rls-smoke.servyou.invalid`
const PASSWORD = `Sr-${randomUUID()}-Aa1!`
const COOKIE = hasCreds ? `sb-${new URL(url).hostname.split('.')[0]}-auth-token` : ''

const admin = hasCreds ? createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } }) : null

type Session = { access_token: string; refresh_token: string; expires_at: number; [k: string]: unknown }
const encode = (s: Session) => `base64-${Buffer.from(JSON.stringify(s)).toString('base64url')}`
const decode = (v: string): Session => JSON.parse(Buffer.from(v.replace(/^base64-/, ''), 'base64url').toString('utf8'))

// The session cookie as @supabase/ssr stores it: one cookie, or chunks .0, .1 … joined in order.
function sessionFrom(jar: Map<string, string>): Session {
  const single = jar.get(COOKIE)
  if (single) return decode(single)
  const chunks: string[] = []
  for (let i = 0; jar.has(`${COOKIE}.${i}`); i++) chunks.push(jar.get(`${COOKIE}.${i}`)!)
  if (!chunks.length) throw new Error('no session cookie')
  return decode(chunks.join(''))
}

// Set-Cookie headers of a middleware response → name → value (removals dropped).
function jarFromResponse(res: Response): Map<string, string> {
  const jar = new Map<string, string>()
  for (const line of res.headers.getSetCookie()) {
    const [pair] = line.split(';')
    const i = pair.indexOf('=')
    const name = pair.slice(0, i)
    const value = decodeURIComponent(pair.slice(i + 1))
    if (value) jar.set(name, value)
  }
  return jar
}

const navigation = (cookie: string) =>
  new NextRequest('http://localhost/mes-commandes', { headers: { cookie, accept: 'text/html' } })

async function teardown(): Promise<void> {
  const { data, error } = await admin!.from('profiles').select('id').like('email', `${PREFIX}%`)
  if (error) throw new Error(`teardown lookup failed: ${error.message}`)
  for (const { id } of data ?? []) {
    const { error: delErr } = await admin!.auth.admin.deleteUser(id)
    if (delErr) throw new Error(`deleteUser failed for ${id}: ${delErr.message}`)
  }
}

let signedIn: Session

beforeAll(async () => {
  if (!hasCreds) return
  await teardown()
  const { error } = await admin!.auth.admin.createUser({
    email: EMAIL,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { full_name: 'Session Refresh Test', date_of_birth: '1990-01-01', city: 'Tunis', language: 'fr' },
  })
  if (error) throw new Error(`createUser failed: ${error.message}`)

  // Sign in through @supabase/ssr itself, capturing the cookies it writes.
  const jar = new Map<string, string>()
  const ssr = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => [...jar].map(([name, value]) => ({ name, value })),
      setAll: (cookies) => cookies.forEach(({ name, value }) => (value ? jar.set(name, value) : jar.delete(name))),
    },
  })
  const { error: signErr } = await fixtureSignIn(ssr, EMAIL)
  if (signErr) throw new Error(`signIn failed: ${signErr.message}`)
  signedIn = sessionFrom(jar)
}, 120000)

afterAll(async () => {
  if (!hasCreds) return
  await teardown()
  const { count, error } = await admin!.from('profiles').select('id', { count: 'exact', head: true }).like('email', `${PREFIX}%`)
  if (error) throw new Error(`cleanup check failed: ${error.message}`)
  if ((count ?? 0) !== 0) throw new Error(`teardown left ${count} ${PREFIX} profiles`)
}, 120000)

describe.skipIf(!hasCreds)('middleware persists a real session refresh', () => {
  let rotated: Session
  let rotatedJar: Map<string, string>

  it('an expiring session is refreshed, and the rotated session comes back as Set-Cookie', async () => {
    const expiring = { ...signedIn, expires_at: Math.floor(Date.now() / 1000) - 60 }
    const res = await middleware(navigation(`${COOKIE}=${encode(expiring)}`))

    expect(res.headers.get('x-middleware-next')).toBe('1')
    rotatedJar = jarFromResponse(res)
    rotated = sessionFrom(rotatedJar)
    expect(rotated.refresh_token).not.toBe(signedIn.refresh_token)
    expect(rotated.access_token).not.toBe(signedIn.access_token)
    expect(rotated.expires_at).toBeGreaterThan(Math.floor(Date.now() / 1000) + 600)
    expect(res.headers.get('cache-control') ?? '').toContain('no-store')

    // The same rotated session is forwarded to this request's Server Components (no second refresh there).
    const forwarded = decodeURIComponent(res.headers.get('x-middleware-request-cookie') ?? '')
    for (const value of rotatedJar.values()) expect(forwarded).toContain(value)
  })

  it('the next request with the persisted cookie passes through with NO further refresh', async () => {
    // Not vacuous: the persisted cookie must exist and carry a token the Auth server accepts for this user.
    expect(rotatedJar?.size ?? 0).toBeGreaterThan(0)
    const { data: who, error: whoErr } = await admin!.auth.getUser(rotated.access_token)
    expect(whoErr).toBeNull()
    expect(who.user?.email).toBe(EMAIL)
    const cookie = [...rotatedJar].map(([n, v]) => `${n}=${v}`).join('; ')
    const res = await middleware(navigation(cookie))
    expect(res.headers.get('x-middleware-next')).toBe('1')
    expect(res.headers.getSetCookie()).toEqual([])
    expect(res.headers.get('location')).toBeNull()
  })
})
