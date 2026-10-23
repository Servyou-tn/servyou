/**
 * Unit tests for the server-side admin guard (src/lib/auth/require-admin.ts) — an auth path, so
 * must-test per CLAUDE.md.
 *
 * checkAdmin (server actions) and requireAdmin (layout + pages) both decide on the caller's own
 * profiles.is_admin. The Supabase client is mocked: these cover the guard's DECISION logic —
 * logged out vs non-admin vs lookup failure vs admin, and that every non-admin outcome fails
 * closed — not RLS. `next/navigation`'s redirect is mocked to throw, as the real one does
 * (it returns `never`), so control flow stops where production's would.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'

const h = vi.hoisted(() => {
  const state: {
    user: { id: string } | null
    profile: { data: unknown; error: { message: string; code: string; details: string } | null }
  } = {
    user: { id: 'admin-1' },
    profile: { data: { is_admin: true }, error: null },
  }
  // profiles: select -> eq -> maybeSingle
  const maybeSingle = vi.fn(() => Promise.resolve(state.profile))
  const eq = vi.fn(() => ({ maybeSingle }))
  const select = vi.fn(() => ({ eq }))
  const from = vi.fn(() => ({ select }))
  const getUser = vi.fn(() => Promise.resolve({ data: { user: state.user } }))
  const client = { auth: { getUser }, from }
  const createClient = vi.fn(async () => client)
  const redirect = vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT ${url}`)
  })
  return { state, from, select, eq, maybeSingle, client, createClient, redirect }
})

vi.mock('@/lib/supabase/server', () => ({ createClient: h.createClient }))
vi.mock('next/navigation', () => ({ redirect: h.redirect }))

import { checkAdmin, requireAdmin, adminRejectionError } from '@/lib/auth/require-admin'

const client = h.client as unknown as SupabaseClient

beforeEach(() => {
  h.state.user = { id: 'admin-1' }
  h.state.profile = { data: { is_admin: true }, error: null }
  vi.clearAllMocks()
})

describe('checkAdmin (server-action guard)', () => {
  it('passes an admin and reads ONLY the caller’s own is_admin', async () => {
    const res = await checkAdmin(client)
    expect(res).toEqual({ ok: true, userId: 'admin-1' })
    expect(h.from).toHaveBeenCalledWith('profiles')
    expect(h.select).toHaveBeenCalledWith('is_admin')
    expect(h.eq).toHaveBeenCalledWith('id', 'admin-1')
  })

  it('rejects a signed-in non-admin as forbidden', async () => {
    h.state.user = { id: 'buyer-1' }
    h.state.profile = { data: { is_admin: false }, error: null }
    expect(await checkAdmin(client)).toEqual({ ok: false, reason: 'forbidden' })
  })

  it('rejects a user with no profiles row as forbidden (never "admin by absence")', async () => {
    h.state.profile = { data: null, error: null }
    expect(await checkAdmin(client)).toEqual({ ok: false, reason: 'forbidden' })
  })

  it('rejects a non-boolean truthy is_admin — only a real `true` passes', async () => {
    h.state.profile = { data: { is_admin: 'true' }, error: null }
    expect(await checkAdmin(client)).toEqual({ ok: false, reason: 'forbidden' })
  })

  it('rejects a logged-out caller without querying profiles', async () => {
    h.state.user = null
    expect(await checkAdmin(client)).toEqual({ ok: false, reason: 'unauthenticated' })
    expect(h.from).not.toHaveBeenCalled()
  })

  it('fails closed on a lookup error and logs its fields, not the raw object', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const error = { message: 'boom', code: 'XX000', details: 'detail' }
    h.state.profile = { data: { is_admin: true }, error }
    expect(await checkAdmin(client)).toEqual({ ok: false, reason: 'query_failed' })
    expect(spy).toHaveBeenCalledWith(expect.any(String), 'boom', 'XX000', 'detail')
    expect(spy.mock.calls.flat()).not.toContain(error)
    spy.mockRestore()
  })
})

describe('adminRejectionError (what an action shows for a rejected check)', () => {
  it('shows a failed lookup as the generic error, never as access denied', () => {
    expect(adminRejectionError('query_failed', 'admin.users.error_forbidden')).toBe('common.error_generic')
  })

  it.each(['forbidden', 'unauthenticated'] as const)('shows %s as the action’s own forbidden key', (reason) => {
    expect(adminRejectionError(reason, 'admin.moderation.error_forbidden')).toBe('admin.moderation.error_forbidden')
  })
})

describe('requireAdmin (layout + page guard)', () => {
  it('returns the admin’s id without redirecting', async () => {
    expect(await requireAdmin('/admin')).toEqual({ userId: 'admin-1' })
    expect(h.redirect).not.toHaveBeenCalled()
  })

  it('sends a non-admin to / (the same target as the old client layout)', async () => {
    h.state.profile = { data: { is_admin: false }, error: null }
    await expect(requireAdmin('/admin/utilisateurs')).rejects.toThrow('NEXT_REDIRECT /')
    expect(h.redirect).toHaveBeenCalledWith('/')
  })

  it('sends a logged-out visitor to /connexion with the page they wanted as ?next=', async () => {
    h.state.user = null
    await expect(requireAdmin('/admin/litiges/abc')).rejects.toThrow('NEXT_REDIRECT')
    expect(h.redirect).toHaveBeenCalledWith('/connexion?next=%2Fadmin%2Flitiges%2Fabc')
  })

  it('throws on a lookup failure instead of rendering or redirecting', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    h.state.profile = { data: null, error: { message: 'boom', code: 'XX000', details: '' } }
    await expect(requireAdmin('/admin')).rejects.toThrow('admin check failed')
    expect(h.redirect).not.toHaveBeenCalled()
    spy.mockRestore()
  })
})
