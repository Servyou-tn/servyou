/**
 * createFreelancerReportAction (src/app/freelance/[id]/actions.ts) — mocked Supabase. D4's « Signaler ce profil »,
 * the twin of createShopReportAction (shop-report-action.test.ts), untested until the reports anti-abuse migration:
 *   • Zod runs first; the reporter is the session user; the row is exactly the five client-writable columns
 *     (reports INSERT is column-granted by that migration — any other column would be refused 42501);
 *   • the two anti-abuse refusals answer their own message, everything else the generic error.
 * The database rules themselves are proven live in reports-anti-abuse.test.ts. Run by path.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'

const h = vi.hoisted(() => ({
  user: { id: 'u_buyer' } as { id: string } | null,
  insertResult: { error: null } as { error: unknown },
  inserted: [] as unknown[],
  from: vi.fn(),
  // The target lookup (freelancer_profiles by id, the reporter's session): found by default.
  target: { data: { id: 'profile' }, error: null } as { data: { id: string } | null; error: unknown },
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: async () => ({ data: { user: h.user }, error: null }) },
    from: (table: string) => {
      h.from(table)
      if (table === 'freelancer_profiles') {
        const chain = { select: () => chain, eq: () => chain, maybeSingle: async () => h.target }
        return chain
      }
      return {
        insert: async (row: unknown) => {
          h.inserted.push(row)
          return h.insertResult
        },
      }
    },
  })),
}))
vi.mock('@/lib/i18n/server', () => ({ getLang: vi.fn(async () => 'fr') }))

import { createFreelancerReportAction } from '@/app/freelance/[id]/actions'
import { t } from '@/lib/i18n'

const PROFILE_ID = '33333333-3333-4333-8333-333333333333'
const GENERIC = { ok: false, error: t('common.error_generic', 'fr') }

let log: ReturnType<typeof vi.spyOn>
let warn: ReturnType<typeof vi.spyOn>
beforeEach(() => {
  h.user = { id: 'u_buyer' }
  h.insertResult = { error: null }
  h.inserted = []
  h.target = { data: { id: 'profile' }, error: null }
  h.from.mockReset()
  log = vi.spyOn(console, 'error').mockImplementation(() => {})
  warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
  return () => {
    log.mockRestore()
    warn.mockRestore()
  }
})

describe('createFreelancerReportAction', () => {
  it.each([
    ['a non-uuid profile id', { freelancerProfileId: 'nope', reason: 'other' }],
    ['wrong_category (not offered for a whole profile)', { freelancerProfileId: PROFILE_ID, reason: 'wrong_category' }],
  ])('rejects %s without touching the database', async (_label, input) => {
    expect(await createFreelancerReportAction(input)).toEqual(GENERIC)
    expect(h.from).not.toHaveBeenCalled()
  })

  it('rejects a logged-out caller without inserting', async () => {
    h.user = null
    expect(await createFreelancerReportAction({ freelancerProfileId: PROFILE_ID, reason: 'fake_scam' })).toEqual(GENERIC)
    expect(h.inserted).toEqual([])
  })

  it('files exactly the five client-writable columns, reporter from the session', async () => {
    const res = await createFreelancerReportAction({
      freelancerProfileId: PROFILE_ID,
      reason: 'offensive',
      description: '  Insultes  ',
      reporter_id: 'someone-else',
      status: 'resolved',
    })
    expect(res).toEqual({ ok: true })
    expect(h.from).toHaveBeenCalledWith('reports')
    expect(h.inserted).toEqual([
      { reporter_id: 'u_buyer', target_type: 'freelancer_profile', target_id: PROFILE_ID, reason: 'offensive', description: 'Insultes' },
    ])
  })

  it('a second open report on the same profile: « Vous avez déjà signalé ce contenu »', async () => {
    h.insertResult = {
      error: { code: '23505', message: 'duplicate key value violates unique constraint "reports_one_open_per_reporter_target"' },
    }
    expect(await createFreelancerReportAction({ freelancerProfileId: PROFILE_ID, reason: 'other' })).toEqual({
      ok: false,
      error: t('report.already_reported', 'fr'),
    })
  })

  it('the 11th report in 24 h: the rate-limit message', async () => {
    h.insertResult = { error: { code: '23514', message: 'Vous avez atteint…', hint: 'rate_limited' } }
    expect(await createFreelancerReportAction({ freelancerProfileId: PROFILE_ID, reason: 'other' })).toEqual({
      ok: false,
      error: t('report.rate_limited', 'fr'),
    })
  })

  it('any other insert failure (e.g. a suspended reporter): the generic error, never the raw message', async () => {
    h.insertResult = { error: { code: '42501', message: 'Ce compte est suspendu.' } }
    const res = await createFreelancerReportAction({ freelancerProfileId: PROFILE_ID, reason: 'other' })
    expect(res).toEqual(GENERIC)
  })
})

// Audit pass 2 « Logged »: a made-up profile id must not fill the admin queue with « cible introuvable » rows.
describe('createFreelancerReportAction — the target must exist and be visible to the reporter', () => {
  it('refuses an unknown (or unpublished) profile without inserting a report', async () => {
    h.target = { data: null, error: null }
    expect(await createFreelancerReportAction({ freelancerProfileId: PROFILE_ID, reason: 'other' })).toEqual(GENERIC)
    expect(h.from).toHaveBeenCalledWith('freelancer_profiles')
    expect(h.inserted).toEqual([])
  })

  it('a failed lookup is the generic error, never an insert', async () => {
    h.target = { data: null, error: { message: 'boom', code: 'XX000' } }
    expect(await createFreelancerReportAction({ freelancerProfileId: PROFILE_ID, reason: 'other' })).toEqual(GENERIC)
    expect(h.inserted).toEqual([])
  })
})
