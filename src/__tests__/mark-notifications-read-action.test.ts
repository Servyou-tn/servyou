import { describe, it, expect, vi, beforeEach } from 'vitest'

// markNotificationsReadAction — mocked Supabase only (the RPC itself, its owner check and its grants are proven live by
// bell-notifications-live.test.ts, DB-1). The RPC reads a missing / null p_ids as « every unread row », so the one-item
// path must ALWAYS send [id], and nothing malformed may reach it.
const state = {
  user: null as { id: string } | null,
  calls: [] as [string, Record<string, unknown>][],
  result: { data: 1 as number | null, error: null as { message: string; code?: string; details?: string } | null },
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: state.user } }) },
    rpc: async (fn: string, args: Record<string, unknown>) => {
      state.calls.push([fn, args])
      return state.result
    },
  }),
}))

import { markNotificationsReadAction } from '@/app/actions/notifications'

const ID = '33333333-3333-4333-8333-333333333333'

beforeEach(() => {
  state.user = { id: 'user-1' }
  state.calls = []
  state.result = { data: 1, error: null }
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('markNotificationsReadAction', () => {
  it('opening one item sends exactly that id', async () => {
    expect(await markNotificationsReadAction({ scope: 'one', id: ID })).toEqual({ ok: true, marked: 1 })
    expect(state.calls).toEqual([['mark_my_notifications_read', { p_ids: [ID] }]])
  })

  it('« Tout marquer comme lu » sends no ids (the RPC marks every unread row of the caller)', async () => {
    state.result = { data: 7, error: null }
    expect(await markNotificationsReadAction({ scope: 'all' })).toEqual({ ok: true, marked: 7 })
    expect(state.calls).toEqual([['mark_my_notifications_read', {}]])
  })

  it('a malformed or missing id never reaches the RPC — it must not be read as « all »', async () => {
    for (const input of [
      { scope: 'one', id: 'not-a-uuid' },
      { scope: 'one' },
      { scope: 'one', id: null },
      { scope: 'one', ids: [ID] },
      { id: ID },
      { scope: 'everything' },
      null,
      'all',
    ]) {
      expect(await markNotificationsReadAction(input), JSON.stringify(input)).toEqual({ ok: false })
    }
    expect(state.calls).toEqual([])
  })

  it('signed out: refused before the RPC', async () => {
    state.user = null
    expect(await markNotificationsReadAction({ scope: 'all' })).toEqual({ ok: false })
    expect(state.calls).toEqual([])
  })

  it('an RPC error is a failure, logged as message / code / details (never the raw object)', async () => {
    state.result = { data: null, error: { message: 'boom', code: '42501', details: 'd' } }
    expect(await markNotificationsReadAction({ scope: 'one', id: ID })).toEqual({ ok: false })
    expect(console.error).toHaveBeenCalledWith('[markNotificationsRead] rpc error:', 'boom', '42501', 'd')
  })
})
