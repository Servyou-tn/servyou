import { describe, it, expect, vi, beforeEach } from 'vitest'

// saveNotificationPrefsAction — mocked Supabase only (the live table is covered by notification-prefs-favorites.test.ts).
const state = {
  user: null as { id: string } | null,
  upserts: [] as { row: Record<string, unknown>; opts: unknown }[],
  error: null as { message: string; code?: string; details?: string } | null,
}

vi.mock('@/lib/i18n/server', () => ({ getLang: async () => 'fr' }))
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: state.user } }) },
    from: (table: string) => ({
      upsert: async (row: Record<string, unknown>, opts: unknown) => {
        expect(table).toBe('notification_preferences')
        state.upserts.push({ row, opts })
        return { error: state.error }
      },
    }),
  }),
}))

beforeEach(() => {
  state.user = { id: 'user-1' }
  state.upserts = []
  state.error = null
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

async function run(input: unknown) {
  const { saveNotificationPrefsAction } = await import('@/app/parametres/actions')
  return saveNotificationPrefsAction(input)
}

describe('saveNotificationPrefsAction', () => {
  it('upserts the changed toggles under the SESSION user, conflict-keyed on profile_id', async () => {
    const res = await run({ email_newsletter: true, email_new_orders: false })
    expect(res).toEqual({ ok: true })
    expect(state.upserts).toHaveLength(1)
    expect(state.upserts[0].row).toEqual({ profile_id: 'user-1', email_newsletter: true, email_new_orders: false })
    expect(state.upserts[0].opts).toEqual({ onConflict: 'profile_id' })
  })

  it('never takes the row key from the client', async () => {
    const res = await run({ profile_id: 'someone-else', email_newsletter: true })
    expect(res.ok).toBe(false)
    expect(state.upserts).toEqual([])
  })

  it('refuses an empty or malformed payload before any DB work', async () => {
    expect((await run({})).ok).toBe(false)
    expect((await run({ email_reviews: 'yes' })).ok).toBe(false)
    expect((await run(null)).ok).toBe(false)
    expect(state.upserts).toEqual([])
  })

  it('refuses without a session', async () => {
    state.user = null
    expect((await run({ email_newsletter: true })).ok).toBe(false)
    expect(state.upserts).toEqual([])
  })

  it('a DB failure is a friendly message — never the raw error — and is logged as message/code/details', async () => {
    state.error = { message: 'boom: secret detail', code: '42501', details: 'd' }
    const res = await run({ email_newsletter: true })
    expect(res.ok).toBe(false)
    expect(res).toMatchObject({ error: expect.not.stringContaining('secret') })
    expect(console.error).toHaveBeenCalledWith(expect.any(String), 'boom: secret detail', '42501', 'd')
  })
})
