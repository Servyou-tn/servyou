import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// /auth/confirm: a template link is NOT spent on the GET (mail scanners): it goes to the « Continuer » page, whose
// same-origin POST verifies it on the server. `next` is validated (open-redirect guard), a bad link never reaches Auth,
// a cross-origin POST is refused (login CSRF), and an incomplete account is sent to step 2.

const h = vi.hoisted(() => ({
  verifyOtp: vi.fn(),
  exchangeCodeForSession: vi.fn(),
  maybeSingle: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: { verifyOtp: h.verifyOtp, exchangeCodeForSession: h.exchangeCodeForSession },
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: h.maybeSingle }) }) }),
  })),
}))

import { GET, POST } from './route'

const ORIGIN = 'https://servyou.tn'
const get = (query: string) => GET(new NextRequest(`${ORIGIN}/auth/confirm?${query}`))
const post = (fields: Record<string, string>, origin: string | null = ORIGIN) =>
  POST(
    new NextRequest(`${ORIGIN}/auth/confirm`, {
      method: 'POST',
      body: new URLSearchParams(fields),
      headers: { 'content-type': 'application/x-www-form-urlencoded', ...(origin ? { origin } : {}) },
    }),
  )
const location = (res: Response) => {
  const url = new URL(res.headers.get('location')!)
  return url.origin === ORIGIN ? url.pathname + url.search : url.href
}
const signedIn = { data: { user: { id: 'u1' }, session: {} }, error: null }
const TOKEN = { token_hash: 'abc123def456', type: 'email' }

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => {})
  h.verifyOtp.mockResolvedValue(signedIn)
  h.exchangeCodeForSession.mockResolvedValue(signedIn)
  h.maybeSingle.mockResolvedValue({ data: { completed_at: null }, error: null })
})

describe('GET /auth/confirm', () => {
  it('does NOT spend a template link: it goes to the « Continuer » page (303), next kept', async () => {
    const res = await get('next=%2Fdevenir-vendeur%2Fboutique&token_hash=abc123def456&type=email')
    expect(res.status).toBe(303)
    expect(location(res)).toBe('/inscription/confirmer?token_hash=abc123def456&type=email&next=%2Fdevenir-vendeur%2Fboutique')
    expect(h.verifyOtp).not.toHaveBeenCalled()
  })

  it('drops an unsafe next on the way', async () => {
    expect(location(await get('next=https%3A%2F%2Fevil.example&token_hash=abc123def456&type=email'))).toBe(
      '/inscription/confirmer?token_hash=abc123def456&type=email',
    )
  })

  it("exchanges GoTrue's default-template ?code= at once (it needs this browser's verifier: nothing for a scanner)", async () => {
    const res = await get('next=%2F&code=5f2b9c1e-1111-4222-8333-944455556666')
    expect(h.exchangeCodeForSession).toHaveBeenCalledWith('5f2b9c1e-1111-4222-8333-944455556666')
    expect(location(res)).toBe('/finaliser-mon-compte')
  })

  it('a malformed link never reaches Auth', async () => {
    expect(location(await get('token_hash=%3Cscript%3E&type=email'))).toBe('/inscription/nouveau-lien?raison=invalide')
    expect(location(await get('token_hash=abc123def456&type=recovery'))).toBe('/inscription/nouveau-lien?raison=invalide')
    expect(location(await get(''))).toBe('/inscription/nouveau-lien?raison=invalide')
    expect(h.verifyOtp).not.toHaveBeenCalled()
    expect(h.exchangeCodeForSession).not.toHaveBeenCalled()
  })

  it("GoTrue's failure redirect → « Recevoir un nouveau lien » with the reason", async () => {
    expect(location(await get('error=access_denied&error_code=otp_expired&next=%2Fmes-commandes'))).toBe(
      '/inscription/nouveau-lien?raison=expire&next=%2Fmes-commandes',
    )
  })
})

describe('POST /auth/confirm (the « Continuer » button)', () => {
  it('verifies the link on the server and sends an incomplete account to step 2', async () => {
    const res = await post({ ...TOKEN, next: '/devenir-vendeur/boutique' })
    expect(res.status).toBe(303)
    expect(h.verifyOtp).toHaveBeenCalledWith({ type: 'email', token_hash: 'abc123def456' })
    expect(location(res)).toBe('/finaliser-mon-compte?next=%2Fdevenir-vendeur%2Fboutique')
  })

  it('a complete account goes straight to next; an unsafe next to home', async () => {
    h.maybeSingle.mockResolvedValue({ data: { completed_at: '2026-11-01T00:00:00Z' }, error: null })
    expect(location(await post({ ...TOKEN, next: '/mes-commandes' }))).toBe('/mes-commandes')
    expect(location(await post({ ...TOKEN, next: '//evil.example' }))).toBe('/')
  })

  it('refuses a POST from another site, or with no Origin (login CSRF), before any Auth call', async () => {
    expect(location(await post(TOKEN, 'https://evil.example'))).toBe('/inscription/nouveau-lien?raison=invalide')
    expect(location(await post(TOKEN, null))).toBe('/inscription/nouveau-lien?raison=invalide')
    expect(h.verifyOtp).not.toHaveBeenCalled()
  })

  it('a refused or junk hash → « Recevoir un nouveau lien »', async () => {
    expect(location(await post({ token_hash: '<x>', type: 'email' }))).toBe('/inscription/nouveau-lien?raison=invalide')
    h.verifyOtp.mockResolvedValue({ data: { user: null, session: null }, error: { message: 'Token has expired or is invalid', code: 'otp_expired', status: 403 } })
    expect(location(await post(TOKEN))).toBe('/inscription/nouveau-lien?raison=expire')
  })

  it('an unreadable profile goes to step 2, which reads it again', async () => {
    h.maybeSingle.mockResolvedValue({ data: null, error: { message: 'timeout', code: '57014', details: null } })
    expect(location(await post({ ...TOKEN, next: '/mes-commandes' }))).toBe('/finaliser-mon-compte?next=%2Fmes-commandes')
  })
})
