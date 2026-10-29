/**
 * POST /auth/signout (src/app/auth/signout/route.ts) — pre-launch audit pass 3. The sb-* session cookies are deleted
 * on the response whatever signOut() answers: auth-js returns before removing the session on a GoTrue 5xx / network
 * error, which used to leave a shared device signed in behind « À bientôt ». Other cookies are untouched.
 * Supabase is mocked. Run by path.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'

const h = vi.hoisted(() => ({ signOutResult: { error: null } as { error: unknown } }))
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ auth: { signOut: async () => h.signOutResult } }),
}))

const { POST } = await import('@/app/auth/signout/route')

function request() {
  return new NextRequest('https://servyou.example/auth/signout', {
    method: 'POST',
    headers: { cookie: 'sb-xggo-auth-token=abc; sb-xggo-auth-token.0=def; servyou_lang=ar' },
  })
}

function deletedCookies(res: Response): string[] {
  return res.headers
    .getSetCookie()
    .filter((c) => /expires=thu, 01 jan 1970/i.test(c) || /max-age=0/i.test(c))
    .map((c) => c.split('=')[0])
}

let log: ReturnType<typeof vi.spyOn>
beforeEach(() => {
  h.signOutResult = { error: null }
  log = vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => log.mockRestore())

describe('POST /auth/signout', () => {
  it('303 to /a-bientot and deletes every sb-* cookie (and only those)', async () => {
    const res = await POST(request())
    expect(res.status).toBe(303)
    expect(res.headers.get('location')).toBe('https://servyou.example/a-bientot')
    expect(deletedCookies(res).sort()).toEqual(['sb-xggo-auth-token', 'sb-xggo-auth-token.0'])
  })

  it('still deletes them when GoTrue fails (5xx / network) — the user is never left signed in', async () => {
    h.signOutResult = { error: { message: 'upstream 502', code: 'unexpected_failure', status: 502 } }
    const res = await POST(request())
    expect(res.status).toBe(303)
    expect(deletedCookies(res).sort()).toEqual(['sb-xggo-auth-token', 'sb-xggo-auth-token.0'])
    expect(log).toHaveBeenCalledTimes(1)
  })
})
