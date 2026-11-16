import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// /auth/confirm: the link is verified on the server, `next` is validated (open-redirect guard), a bad link never reaches
// Auth, and an incomplete account is sent to step 2.

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

import { GET } from './route'

const get = (query: string) => GET(new NextRequest(`https://servyou.tn/auth/confirm?${query}`))
const location = (res: Response) => {
  const url = new URL(res.headers.get('location')!)
  return url.origin === 'https://servyou.tn' ? url.pathname + url.search : url.href
}
const signedIn = { data: { user: { id: 'u1' }, session: {} }, error: null }

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => {})
  h.verifyOtp.mockResolvedValue(signedIn)
  h.exchangeCodeForSession.mockResolvedValue(signedIn)
  h.maybeSingle.mockResolvedValue({ data: { completed_at: null }, error: null })
})

describe('GET /auth/confirm', () => {
  it('verifies a template link on the server and sends an incomplete account to step 2 (303, same origin)', async () => {
    const res = await get('next=%2Fdevenir-vendeur%2Fboutique&token_hash=abc123def456&type=email')
    expect(res.status).toBe(303)
    expect(h.verifyOtp).toHaveBeenCalledWith({ type: 'email', token_hash: 'abc123def456' })
    expect(location(res)).toBe('/finaliser-mon-compte?next=%2Fdevenir-vendeur%2Fboutique')
  })

  it('a complete account goes straight to next', async () => {
    h.maybeSingle.mockResolvedValue({ data: { completed_at: '2026-11-01T00:00:00Z' }, error: null })
    expect(location(await get('next=%2Fmes-commandes&token_hash=abc123def456&type=email'))).toBe('/mes-commandes')
  })

  it('an unsafe next is dropped (open-redirect guard): home, or step 2 without next', async () => {
    h.maybeSingle.mockResolvedValue({ data: { completed_at: '2026-11-01T00:00:00Z' }, error: null })
    expect(location(await get('next=https%3A%2F%2Fevil.example&token_hash=abc123def456&type=email'))).toBe('/')
    expect(location(await get('next=%2F%2Fevil.example&token_hash=abc123def456&type=email'))).toBe('/')
    h.maybeSingle.mockResolvedValue({ data: { completed_at: null }, error: null })
    expect(location(await get('next=https%3A%2F%2Fevil.example&token_hash=abc123def456&type=email'))).toBe('/finaliser-mon-compte')
  })

  it("exchanges GoTrue's default-template ?code= (same device)", async () => {
    const res = await get('next=%2F&code=5f2b9c1e-1111-4222-8333-944455556666')
    expect(h.exchangeCodeForSession).toHaveBeenCalledWith('5f2b9c1e-1111-4222-8333-944455556666')
    expect(h.verifyOtp).not.toHaveBeenCalled()
    expect(location(res)).toBe('/finaliser-mon-compte')
  })

  it('a malformed link never reaches Auth', async () => {
    expect(location(await get('token_hash=%3Cscript%3E&type=email'))).toBe('/inscription/nouveau-lien?raison=invalide')
    expect(location(await get('token_hash=abc123def456&type=recovery'))).toBe('/inscription/nouveau-lien?raison=invalide')
    expect(location(await get(''))).toBe('/inscription/nouveau-lien?raison=invalide')
    expect(h.verifyOtp).not.toHaveBeenCalled()
    expect(h.exchangeCodeForSession).not.toHaveBeenCalled()
  })

  it("GoTrue's failure redirect and a refused hash → « Recevoir un nouveau lien » with the reason", async () => {
    expect(location(await get('error=access_denied&error_code=otp_expired&next=%2Fmes-commandes'))).toBe(
      '/inscription/nouveau-lien?raison=expire&next=%2Fmes-commandes',
    )
    h.verifyOtp.mockResolvedValue({ data: { user: null, session: null }, error: { message: 'Token has expired or is invalid', code: 'otp_expired', status: 403 } })
    expect(location(await get('token_hash=abc123def456&type=email'))).toBe('/inscription/nouveau-lien?raison=expire')
    h.verifyOtp.mockResolvedValue({ data: { user: null, session: null }, error: { message: 'x', code: 'unexpected_failure', status: 500 } })
    expect(location(await get('token_hash=abc123def456&type=email'))).toBe('/inscription/nouveau-lien?raison=invalide')
  })

  it('an unreadable profile goes to step 2, which reads it again', async () => {
    h.maybeSingle.mockResolvedValue({ data: null, error: { message: 'timeout', code: '57014', details: null } })
    expect(location(await get('next=%2Fmes-commandes&token_hash=abc123def456&type=email'))).toBe('/finaliser-mon-compte?next=%2Fmes-commandes')
  })
})
