/**
 * createListingReportAction (src/app/actions/listing-reports.ts) — mocked Supabase + Sentry.
 *
 * The security-sensitive slice of « Signaler ce produit / ce service »:
 *   • Zod runs FIRST — a malformed request never touches the database;
 *   • the reporter is the SESSION user: a client-supplied reporter id is ignored;
 *   • the target must exist and be visible to the reporter (reports.target_id has no FK), otherwise nothing is filed;
 *   • the row inserted is exactly { reporter_id, target_type, target_id, reason, description };
 *   • every failure answers the generic error, never a raw message.
 * Run by path — never a bare `vitest run`.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

type Result = { data: unknown; error: unknown }
const h = vi.hoisted(() => ({
  user: { id: 'user-1' } as { id: string } | null,
  lookup: { data: { id: 'x' }, error: null } as { data: unknown; error: unknown },
  insertResult: { error: null } as { error: unknown },
  calls: [] as string[],
  // Every touch of the client in order: auth, select, eq — so a test can prove WHAT was filtered and that nothing ran early.
  trace: [] as string[],
  inserted: [] as unknown[],
  captureException: vi.fn(),
}))

vi.mock('@sentry/nextjs', () => ({ captureException: h.captureException }))
vi.mock('@/lib/i18n/server', () => ({ getLang: async () => 'fr' }))
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: {
      getUser: async () => {
        h.trace.push('auth:getUser')
        return { data: { user: h.user }, error: null }
      },
    },
    from: (table: string) => {
      h.calls.push(`from:${table}`)
      h.trace.push(`from:${table}`)
      const builder = {
        select: (cols: string) => {
          h.trace.push(`select:${cols}`)
          return builder
        },
        eq: (col: string, val: unknown) => {
          h.trace.push(`eq:${col}=${String(val)}`)
          return builder
        },
        maybeSingle: async (): Promise<Result> => h.lookup,
        insert: async (row: unknown) => {
          h.inserted.push(row)
          return h.insertResult
        },
      }
      return builder
    },
  }),
}))

import { t } from '@/lib/i18n'
import { createListingReportAction } from '@/app/actions/listing-reports'

const GENERIC = { ok: false, error: t('common.error_generic', 'fr') }
const PRODUCT_ID = '11111111-1111-4111-8111-111111111111'
const SERVICE_ID = '22222222-2222-4222-8222-222222222222'
const valid = { kind: 'product', targetId: PRODUCT_ID, reason: 'fake_scam', description: 'Faux produit' }

let log: ReturnType<typeof vi.spyOn>
let warn: ReturnType<typeof vi.spyOn>
beforeEach(() => {
  h.user = { id: 'user-1' }
  h.lookup = { data: { id: PRODUCT_ID }, error: null }
  h.insertResult = { error: null }
  h.calls = []
  h.trace = []
  h.inserted = []
  h.captureException.mockReset()
  log = vi.spyOn(console, 'error').mockImplementation(() => {})
  warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
})
afterEach(() => {
  log.mockRestore()
  warn.mockRestore()
})

describe('input validation — runs before any database access', () => {
  it.each([
    ['a non-uuid target', { ...valid, targetId: 'not-a-uuid' }],
    ['an unknown reason', { ...valid, reason: 'spam' }],
    ['a kind this action does not handle (shop)', { ...valid, kind: 'shop' }],
    ['a description over 500 characters', { ...valid, description: 'x'.repeat(501) }],
    ['a missing reason', { kind: 'product', targetId: PRODUCT_ID }],
    ['a non-object', 'nope'],
  ])('rejects %s with the generic error and touches nothing', async (_label, input) => {
    expect(await createListingReportAction(input)).toEqual(GENERIC)
    // Not even the auth call: Zod runs BEFORE any client access, so a malformed request costs no round trip.
    expect(h.trace).toEqual([])
    expect(h.calls).toEqual([])
    expect(h.inserted).toEqual([])
  })
})

describe('what gets filed', () => {
  it('a product report: target_type "product", the session user as reporter, description kept', async () => {
    expect(await createListingReportAction(valid)).toEqual({ ok: true })
    expect(h.calls).toEqual(['from:products', 'from:reports'])
    // The existence check filters on THIS id (a dropped or wrong filter would pass every other assertion).
    expect(h.trace).toEqual(['auth:getUser', 'from:products', 'select:id', `eq:id=${PRODUCT_ID}`, 'from:reports'])
    expect(h.inserted).toEqual([
      { reporter_id: 'user-1', target_type: 'product', target_id: PRODUCT_ID, reason: 'fake_scam', description: 'Faux produit' },
    ])
  })

  it('a service report: looks the target up in service_listings and files target_type "service"', async () => {
    h.lookup = { data: { id: SERVICE_ID }, error: null }
    expect(await createListingReportAction({ kind: 'service', targetId: SERVICE_ID, reason: 'wrong_category' })).toEqual({ ok: true })
    expect(h.calls).toEqual(['from:service_listings', 'from:reports'])
    expect(h.trace).toContain(`eq:id=${SERVICE_ID}`)
    expect(h.inserted).toEqual([
      { reporter_id: 'user-1', target_type: 'service', target_id: SERVICE_ID, reason: 'wrong_category', description: null },
    ])
  })

  it('accepts all four reasons of the reports.reason CHECK, including wrong_category', async () => {
    for (const reason of ['fake_scam', 'offensive', 'wrong_category', 'other']) {
      h.inserted = []
      expect(await createListingReportAction({ ...valid, reason })).toEqual({ ok: true })
      expect(h.inserted[0]).toMatchObject({ reason })
    }
  })

  it('trims the description and files a blank one as null', async () => {
    await createListingReportAction({ ...valid, description: '  trop cher  ' })
    expect(h.inserted[0]).toMatchObject({ description: 'trop cher' })
    await createListingReportAction({ ...valid, description: '   ' })
    expect(h.inserted[1]).toMatchObject({ description: null })
  })

  it('ignores a reporter id (or any extra field) supplied by the client', async () => {
    await createListingReportAction({ ...valid, reporter_id: 'someone-else', reporterId: 'someone-else', status: 'resolved' })
    expect(h.inserted).toEqual([
      { reporter_id: 'user-1', target_type: 'product', target_id: PRODUCT_ID, reason: 'fake_scam', description: 'Faux produit' },
    ])
  })
})

describe('refusals — nothing is filed, the answer is generic', () => {
  it('a logged-out caller (direct call bypassing the UI)', async () => {
    h.user = null
    expect(await createListingReportAction(valid)).toEqual(GENERIC)
    expect(h.inserted).toEqual([])
  })

  it('a target that does not exist or is not visible to the reporter (hidden / moderated listing)', async () => {
    h.lookup = { data: null, error: null }
    expect(await createListingReportAction(valid)).toEqual(GENERIC)
    expect(h.inserted).toEqual([])
    expect(h.captureException).not.toHaveBeenCalled() // « not found » is not an outage
  })

  it('a failed target lookup: generic error, reported once, nothing filed', async () => {
    h.lookup = { data: null, error: { message: 'timeout', code: '57014', details: 'secret row' } }
    expect(await createListingReportAction(valid)).toEqual(GENERIC)
    expect(h.inserted).toEqual([])
    expect(h.captureException).toHaveBeenCalledTimes(1)
    expect(JSON.stringify(h.captureException.mock.calls)).not.toContain('secret row')
  })

  it('a failed insert (e.g. a suspended reporter): the generic error, never the raw DB message', async () => {
    h.insertResult = { error: { message: 'Account suspended', code: 'P0001', details: null } }
    const res = await createListingReportAction(valid)
    expect(res).toEqual(GENERIC)
    expect(JSON.stringify(res)).not.toContain('suspended')
  })
})
