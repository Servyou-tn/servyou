/**
 * Walk 2026-11-02 #17 — a seller's contact phone is required (buyers reach them on WhatsApp through profiles.phone):
 *   • « Créer mon profil freelance » step 1 asks for it, validates it with Mon compte's +216 rules, and writes it in
 *     the same profiles UPDATE as seller_type;
 *   • « Créer ma boutique » requires it when the account has none (written with seller_type, before the shops
 *     INSERT), never overwrites an existing one, and maps the DB trigger's refusal (hint seller_phone_required);
 *   • readOwnContactPhone never turns a failed read into « no phone ».
 * Supabase mocked; t() returns the key. The publish / « Activer » gates live in service-publish-action.test.ts and
 * h5-service-actions.test.ts; the DB triggers (PENDING_seller_phone_and_product_checks.sql) are live-tested after apply.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const h = vi.hoisted(() => ({
  user: { id: 'user-1' } as { id: string } | null,
  profile: { seller_type: null as string | null, phone: null as string | null },
  profileUpdates: [] as Record<string, unknown>[],
  shopInsert: { data: { id: 'shop-1' } as { id: string } | null, error: null as Record<string, unknown> | null },
  profileRead: { data: null as unknown, error: null as unknown },
}))

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/i18n/server', () => ({ getLang: async () => 'fr' }))
vi.mock('@/lib/i18n', () => ({ t: (k: string) => k }))
vi.mock('@/lib/freelancer/owner-profile', () => ({ resolveOwnedFreelancerProfileId: async () => ({ ok: false, reason: 'no_profile' }) }))
vi.mock('@/lib/shops/owner-shop', () => ({ resolveOwnedShopId: async () => ({ ok: false, reason: 'no_shop' }) }))
vi.mock('@/lib/images/normalize', () => ({ normalizeShopLogo: vi.fn(), normalizeShopBanner: vi.fn(), MAX_INPUT_BYTES: 1, MAX_INPUT_MB: 1 }))
vi.mock('@/lib/images/provenance', () => ({ recordUploadProvenance: vi.fn(), deleteUploadProvenance: vi.fn() }))
vi.mock('@/lib/images/upload-guard', () => ({ isCallerActive: vi.fn(), uploadBucket: vi.fn() }))

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: h.user } }) },
    from: (table: string) => {
      const q: Record<string, unknown> = {}
      q.select = () => q
      q.eq = () => q
      q.ilike = () => q
      q.limit = async () => ({ data: [], error: null })
      q.single = async () => (table === 'shops' ? h.shopInsert : { data: h.profile, error: null })
      q.maybeSingle = async () => h.profileRead
      q.update = (payload: Record<string, unknown>) => {
        h.profileUpdates.push(payload)
        return { eq: async () => ({ error: null }) }
      }
      q.insert = () => (table === 'shops' ? q : Promise.resolve({ error: null }))
      return q
    },
  }),
}))

import { createFreelancerProfileAction } from '@/app/mon-profil-freelance/creer/actions'
import { createShopAction } from '@/app/ma-boutique/creer/actions'
import { readOwnContactPhone } from '@/lib/seller/contact-phone'

const BIO = 'x'.repeat(120)
const FREELANCE = { fullName: 'Test', headline: 'Développeur web', bio: BIO, city: 'Tunis' }
const SHOP = { name: 'Ma boutique test', city: 'Tunis', description: 'y'.repeat(60) }

beforeEach(() => {
  h.user = { id: 'user-1' }
  h.profile = { seller_type: null, phone: null }
  h.profileUpdates = []
  h.shopInsert = { data: { id: 'shop-1' }, error: null }
  h.profileRead = { data: null, error: null }
})

describe('createFreelancerProfileAction — phone (step 1)', () => {
  it('a missing phone is a field error, before any write', async () => {
    const res = await createFreelancerProfileAction({ ...FREELANCE, phone: '' })
    expect(res).toEqual({ ok: false, error: 'seller.phone.error.required', field: 'phone' })
    expect(h.profileUpdates).toEqual([])
  })

  it('a malformed phone gets Mon compte’s format message, before any write', async () => {
    const res = await createFreelancerProfileAction({ ...FREELANCE, phone: '1234' })
    expect(res).toEqual({ ok: false, error: 'monCompte.error.phoneFormat', field: 'phone' })
    expect(h.profileUpdates).toEqual([])
  })

  it('a valid phone is normalized and written in the SAME update as seller_type', async () => {
    const res = await createFreelancerProfileAction({ ...FREELANCE, phone: '20 000 001' })
    expect(res).toEqual({ ok: true })
    expect(h.profileUpdates).toEqual([{ seller_type: 'freelancer', full_name: 'Test', phone: '+21620000001' }])
  })
})

describe('createShopAction — phone', () => {
  it('an account with no phone and none sent is refused with a field error, before seller_type flips', async () => {
    const res = await createShopAction(SHOP)
    expect(res).toEqual({ ok: false, error: 'seller.phone.error.required', field: 'phone' })
    expect(h.profileUpdates).toEqual([])
  })

  it('a malformed phone is refused with the format message', async () => {
    const res = await createShopAction({ ...SHOP, phone: '99' })
    expect(res).toEqual({ ok: false, error: 'monCompte.error.phoneFormat', field: 'phone' })
    expect(h.profileUpdates).toEqual([])
  })

  it('a valid phone is written with seller_type, before the shop insert', async () => {
    const res = await createShopAction({ ...SHOP, phone: '0 50 123 456' })
    expect(res).toEqual({ ok: true, shopId: 'shop-1' })
    expect(h.profileUpdates).toEqual([{ seller_type: 'shop_owner', phone: '+21650123456' }])
  })

  it('an account that already has a phone is not asked again, and the phone is never overwritten', async () => {
    h.profile = { seller_type: null, phone: '+21671555210' }
    const res = await createShopAction({ ...SHOP, phone: '20000001' })
    expect(res).toEqual({ ok: true, shopId: 'shop-1' })
    expect(h.profileUpdates).toEqual([{ seller_type: 'shop_owner' }])
  })

  it('the DB trigger refusal on the insert (hint seller_phone_required) is the phone field error', async () => {
    h.profile = { seller_type: null, phone: '+21671555210' }
    h.shopInsert = { data: null, error: { message: 'Numéro requis', code: '23514', hint: 'seller_phone_required' } }
    const res = await createShopAction(SHOP)
    expect(res).toEqual({ ok: false, error: 'seller.phone.error.required', field: 'phone' })
  })
})

describe('readOwnContactPhone', () => {
  const client = async () => (await import('@/lib/supabase/server')).createClient()

  it('a stored phone is returned; blank or null reads as « no phone »', async () => {
    h.profileRead = { data: { phone: '+21620000001' }, error: null }
    expect(await readOwnContactPhone((await client()) as never, 'user-1')).toEqual({ ok: true, phone: '+21620000001' })
    h.profileRead = { data: { phone: '   ' }, error: null }
    expect(await readOwnContactPhone((await client()) as never, 'user-1')).toEqual({ ok: true, phone: null })
    h.profileRead = { data: null, error: null }
    expect(await readOwnContactPhone((await client()) as never, 'user-1')).toEqual({ ok: true, phone: null })
  })

  it('a failed read is { ok: false }, never « no phone »', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    h.profileRead = { data: null, error: { message: 'boom', code: 'XX000', details: null } }
    expect(await readOwnContactPhone((await client()) as never, 'user-1')).toEqual({ ok: false })
  })
})
