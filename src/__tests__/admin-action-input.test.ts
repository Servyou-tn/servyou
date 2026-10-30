/**
 * Input validation on the admin moderation actions (audit pass 2 « Logged »: ids, notes and target types arrived
 * unvalidated). A malformed id or target type is refused before a Supabase client is even created; an over-long note
 * or reason is refused after the admin check and before any write. Supabase and checkAdmin are mocked; the actions'
 * happy paths are covered by admin-{disputes,reports,moderation,signalements-suspend}-actions.test.ts.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'

const h = vi.hoisted(() => {
  const from = vi.fn()
  const rpc = vi.fn()
  const createClient = vi.fn(async () => ({ from, rpc }))
  const checkAdmin = vi.fn()
  return { from, rpc, createClient, checkAdmin }
})

vi.mock('@/lib/supabase/server', () => ({ createClient: h.createClient }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/auth/require-admin', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/auth/require-admin')>()),
  checkAdmin: h.checkAdmin,
}))

import { claimDispute, resolveDispute, dismissDispute } from '@/app/admin/litiges/actions'
import {
  claimReport,
  hideContent,
  unhideContent,
  resolveReport,
  dismissReport,
  suspendReportedUser,
  unsuspendReportedUser,
  type ModerationTargetType,
} from '@/app/admin/signalements/actions'
import { ADMIN_TEXT_MAX } from '@/lib/admin/action-input'

const ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaa01'
const GENERIC = { success: false, error: 'common.error_generic' }
const TOO_LONG = { success: false, error: 'admin.note_too_long' }
const LONG_TEXT = 'x'.repeat(ADMIN_TEXT_MAX + 1)

beforeEach(() => {
  vi.clearAllMocks()
  h.checkAdmin.mockResolvedValue({ ok: true, userId: 'admin-1' })
})

describe('a malformed id is refused before any client, query or RPC', () => {
  const BAD = ['r1', '', "1' or '1'='1", '../../admin']
  const calls: [string, (bad: string) => Promise<unknown>][] = [
    ['claimDispute', (bad) => claimDispute(bad)],
    ['resolveDispute', (bad) => resolveDispute(bad, 'compromise', 'Note.')],
    ['dismissDispute', (bad) => dismissDispute(bad, 'Note.')],
    ['claimReport', (bad) => claimReport(bad)],
    ['resolveReport', (bad) => resolveReport(bad, 'Note.')],
    ['dismissReport', (bad) => dismissReport(bad, 'Note.')],
    ['hideContent (target id)', (bad) => hideContent('product', bad, 'Raison.', ID)],
    ['hideContent (report id)', (bad) => hideContent('product', ID, 'Raison.', bad)],
    ['unhideContent (target id)', (bad) => unhideContent('product', bad, ID)],
    ['unhideContent (report id)', (bad) => unhideContent('product', ID, bad)],
    ['suspendReportedUser (report id)', (bad) => suspendReportedUser(ID, 'Raison.', bad)],
    ['unsuspendReportedUser (report id)', (bad) => unsuspendReportedUser(ID, bad)],
  ]
  for (const [name, call] of calls) {
    it(name, async () => {
      for (const bad of BAD) expect(await call(bad)).toEqual(GENERIC)
      expect(h.createClient).not.toHaveBeenCalled()
      expect(h.from).not.toHaveBeenCalled()
      expect(h.rpc).not.toHaveBeenCalled()
    })
  }
})

describe('an unknown moderation target type is refused before any RPC', () => {
  it.each(['user', 'reports', ''])('%s', async (type) => {
    expect(await hideContent(type as ModerationTargetType, ID, 'Raison.', ID)).toEqual(GENERIC)
    expect(await unhideContent(type as ModerationTargetType, ID, ID)).toEqual(GENERIC)
    expect(h.rpc).not.toHaveBeenCalled()
  })
})

describe(`a note or reason over ${ADMIN_TEXT_MAX} characters is refused before any write`, () => {
  const calls: [string, () => Promise<unknown>][] = [
    ['resolveDispute', () => resolveDispute(ID, 'compromise', LONG_TEXT)],
    ['dismissDispute', () => dismissDispute(ID, LONG_TEXT)],
    ['resolveReport', () => resolveReport(ID, LONG_TEXT)],
    ['dismissReport', () => dismissReport(ID, LONG_TEXT)],
    ['hideContent', () => hideContent('product', ID, LONG_TEXT, ID)],
    ['suspendReportedUser', () => suspendReportedUser(ID, LONG_TEXT, ID)],
  ]
  for (const [name, call] of calls) {
    it(name, async () => {
      expect(await call()).toEqual(TOO_LONG)
      expect(h.from).not.toHaveBeenCalled()
      expect(h.rpc).not.toHaveBeenCalled()
    })
  }

  it('exactly the maximum passes the length check (it reaches the database)', async () => {
    h.from.mockImplementation(() => {
      const chain: Record<string, unknown> = {}
      for (const m of ['update', 'eq', 'in']) chain[m] = () => chain
      chain.select = async () => ({ data: [], error: null })
      return chain
    })
    await resolveReport(ID, 'x'.repeat(ADMIN_TEXT_MAX))
    expect(h.from).toHaveBeenCalledWith('reports')
  })
})
