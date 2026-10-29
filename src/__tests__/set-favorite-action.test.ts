import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SetFavoriteInput, favoriteReturnPath, signInHref } from '@/lib/favorites/targets'

// setFavoriteAction — mocked Supabase only (the live favorites table is covered by notification-prefs-favorites.test.ts).
const state = {
  user: null as { id: string } | null,
  inserts: [] as Record<string, unknown>[],
  deletes: [] as [string, unknown][],
  insertError: null as { message: string; code?: string; details?: string } | null,
  deleteError: null as { message: string; code?: string; details?: string } | null,
}

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/i18n/server', () => ({ getLang: async () => 'fr' }))
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: state.user } }) },
    from: (table: string) => {
      expect(table).toBe('favorites')
      return {
        insert: async (row: Record<string, unknown>) => {
          state.inserts.push(row)
          return { error: state.insertError }
        },
        delete: () => {
          const chain = {
            eq: (col: string, val: unknown) => {
              state.deletes.push([col, val])
              // the 3rd .eq resolves the chain
              return state.deletes.length % 3 === 0 ? Promise.resolve({ error: state.deleteError }) : chain
            },
          }
          return chain
        },
      }
    },
  }),
}))

const SHOP = '11111111-1111-4111-8111-111111111111'
const FREELANCER = '22222222-2222-4222-8222-222222222222'

beforeEach(() => {
  state.user = { id: 'user-1' }
  state.inserts = []
  state.deletes = []
  state.insertError = null
  state.deleteError = null
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

async function run(input: unknown) {
  const { setFavoriteAction } = await import('@/app/actions/favorites')
  return setFavoriteAction(input)
}

describe('setFavoriteAction', () => {
  it('favorites a shop under the SESSION user, writing only shop_id', async () => {
    expect(await run({ kind: 'shop', targetId: SHOP, favorited: true })).toEqual({ ok: true })
    expect(state.inserts).toEqual([{ user_id: 'user-1', item_type: 'shop', shop_id: SHOP }])
  })

  it('favorites a freelancer, writing only freelancer_profile_id', async () => {
    expect(await run({ kind: 'freelancer', targetId: FREELANCER, favorited: true })).toEqual({ ok: true })
    expect(state.inserts).toEqual([{ user_id: 'user-1', item_type: 'freelancer', freelancer_profile_id: FREELANCER }])
  })

  it('removes by (user, type, target) — scoped to the session user', async () => {
    expect(await run({ kind: 'shop', targetId: SHOP, favorited: false })).toEqual({ ok: true })
    expect(state.deletes).toEqual([
      ['user_id', 'user-1'],
      ['item_type', 'shop'],
      ['shop_id', SHOP],
    ])
    expect(state.inserts).toEqual([])
  })

  it('is IDEMPOTENT: an already-favorited duplicate (23505) is success, not an error', async () => {
    state.insertError = { message: 'duplicate key', code: '23505' }
    expect(await run({ kind: 'shop', targetId: SHOP, favorited: true })).toEqual({ ok: true })
  })

  it('refuses a guest with a sign-in message and writes nothing', async () => {
    state.user = null
    const res = await run({ kind: 'shop', targetId: SHOP, favorited: true })
    expect(res.ok).toBe(false)
    expect(state.inserts).toEqual([])
  })

  it('refuses malformed input before any DB work (bad kind, non-uuid, missing flag, a smuggled user_id)', async () => {
    for (const bad of [
      { kind: 'product', targetId: SHOP, favorited: true },
      { kind: 'shop', targetId: 'nope', favorited: true },
      { kind: 'shop', targetId: SHOP },
      null,
    ]) {
      expect((await run(bad)).ok).toBe(false)
    }
    expect(state.inserts).toEqual([])
    // extra keys (user_id) are not read: the row key can only come from the session
    await run({ kind: 'shop', targetId: SHOP, favorited: true, user_id: 'someone-else' })
    expect(state.inserts[0]).toMatchObject({ user_id: 'user-1' })
  })

  it('an RLS refusal (e.g. the shop was hidden meanwhile) is a generic message, logged as message/code/details', async () => {
    state.insertError = { message: 'new row violates row-level security policy', code: '42501', details: 'd' }
    const res = await run({ kind: 'shop', targetId: SHOP, favorited: true })
    expect(res.ok).toBe(false)
    expect(res).toMatchObject({ error: expect.not.stringContaining('row-level') })
    expect(console.error).toHaveBeenCalledWith(expect.any(String), 'new row violates row-level security policy', '42501', 'd')
  })
})

describe('favorites targets helpers', () => {
  it('SetFavoriteInput accepts exactly kind + uuid + boolean', () => {
    expect(SetFavoriteInput.safeParse({ kind: 'freelancer', targetId: FREELANCER, favorited: false }).success).toBe(true)
    expect(SetFavoriteInput.safeParse({ kind: 'shop', targetId: SHOP, favorited: 'yes' }).success).toBe(false)
  })
  it('a guest returns to the target’s public page after signing in', () => {
    expect(favoriteReturnPath('shop', SHOP)).toBe(`/boutique/${SHOP}`)
    expect(favoriteReturnPath('freelancer', FREELANCER)).toBe(`/freelance/${FREELANCER}`)
    expect(signInHref('/boutique/a b')).toBe('/connexion?next=%2Fboutique%2Fa%20b')
  })
})
