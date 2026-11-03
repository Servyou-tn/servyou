/**
 * Walk 2026-11-02 #17 follow-up — sellerPhoneClearBlocked (src/lib/seller/contact-phone.ts): a stored phone may not go
 * empty for a shop owner, or for a freelancer with at least one ACTIVE service; anyone else (a consumer, a freelancer
 * whose services are all paused/drafts, an account with no phone yet) may save an empty phone. A failed read fails
 * closed ({ ok: false }). Supabase mocked per table; the action wiring is in src/app/mon-compte/actions.test.ts.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { sellerPhoneClearBlocked } from '@/lib/seller/contact-phone'

const h = vi.hoisted(() => ({
  profile: { data: null as unknown, error: null as unknown },
  fp: { data: null as unknown, error: null as unknown },
  active: { count: 0 as number | null, error: null as unknown },
  filters: [] as unknown[][],
}))

function client() {
  return {
    from: (table: string) => {
      const q: Record<string, unknown> = {}
      q.select = () => q
      q.eq = (...a: unknown[]) => {
        if (table === 'service_listings') h.filters.push(a)
        return q
      }
      q.maybeSingle = async () => (table === 'profiles' ? h.profile : h.fp)
      q.then = (resolve: (v: unknown) => void) => resolve(h.active)
      return q
    },
  } as never
}

beforeEach(() => {
  h.profile = { data: null, error: null }
  h.fp = { data: null, error: null }
  h.active = { count: 0, error: null }
  h.filters = []
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('sellerPhoneClearBlocked', () => {
  it('no stored phone → nothing to clear, never blocked (even for a shop owner)', async () => {
    h.profile = { data: { phone: null, seller_type: 'shop_owner' }, error: null }
    expect(await sellerPhoneClearBlocked(client(), 'u1')).toEqual({ ok: true, blocked: false })
  })

  it('a shop owner with a phone is blocked', async () => {
    h.profile = { data: { phone: '+21620000000', seller_type: 'shop_owner' }, error: null }
    expect(await sellerPhoneClearBlocked(client(), 'u1')).toEqual({ ok: true, blocked: true })
  })

  it('a consumer with a phone may clear it', async () => {
    h.profile = { data: { phone: '+21620000000', seller_type: null }, error: null }
    expect(await sellerPhoneClearBlocked(client(), 'u1')).toEqual({ ok: true, blocked: false })
  })

  it('a freelancer is blocked only with at least one ACTIVE service', async () => {
    h.profile = { data: { phone: '+21620000000', seller_type: 'freelancer' }, error: null }
    h.fp = { data: { id: 'fp-1' }, error: null }
    h.active = { count: 0, error: null }
    expect(await sellerPhoneClearBlocked(client(), 'u1')).toEqual({ ok: true, blocked: false })
    h.active = { count: 2, error: null }
    expect(await sellerPhoneClearBlocked(client(), 'u1')).toEqual({ ok: true, blocked: true })
    expect(h.filters).toContainEqual(['freelancer_profile_id', 'fp-1'])
    expect(h.filters).toContainEqual(['status', 'active'])
  })

  it('a freelancer without a freelancer profile is not blocked', async () => {
    h.profile = { data: { phone: '+21620000000', seller_type: 'freelancer' }, error: null }
    expect(await sellerPhoneClearBlocked(client(), 'u1')).toEqual({ ok: true, blocked: false })
  })

  it.each([
    ['the profile read', () => { h.profile = { data: null, error: { message: 'boom' } } }],
    ['the freelancer profile read', () => {
      h.profile = { data: { phone: '+21620000000', seller_type: 'freelancer' }, error: null }
      h.fp = { data: null, error: { message: 'boom' } }
    }],
    ['the active-services count', () => {
      h.profile = { data: { phone: '+21620000000', seller_type: 'freelancer' }, error: null }
      h.fp = { data: { id: 'fp-1' }, error: null }
      h.active = { count: null, error: { message: 'boom' } }
    }],
  ])('a failed %s fails closed', async (_label, setup) => {
    setup()
    expect(await sellerPhoneClearBlocked(client(), 'u1')).toEqual({ ok: false })
  })
})
