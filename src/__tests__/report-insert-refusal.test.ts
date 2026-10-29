/**
 * reportInsertRefusalKey (src/lib/reports/insert-refusal.ts) — which `reports` insert errors the three report
 * actions explain to the reporter. Only the two anti-abuse refusals; anything else (another unique violation, a
 * 23514 from a CHECK, a suspended account, an outage) must stay generic. Run by path.
 */

import { describe, it, expect } from 'vitest'
import { reportInsertRefusalKey, REPORTS_DEDUPE_INDEX } from '@/lib/reports/insert-refusal'
import { t } from '@/lib/i18n'

describe('reportInsertRefusalKey', () => {
  it('maps a 23505 on the dedupe index to report.already_reported', () => {
    const message = `duplicate key value violates unique constraint "${REPORTS_DEDUPE_INDEX}"`
    expect(reportInsertRefusalKey({ code: '23505', message })).toBe('report.already_reported')
  })

  it('maps 23514 + hint rate_limited to report.rate_limited', () => {
    expect(reportInsertRefusalKey({ code: '23514', message: 'x', hint: 'rate_limited' })).toBe('report.rate_limited')
  })

  it.each([
    ['a 23505 on another constraint', { code: '23505', message: 'duplicate key value violates unique constraint "reports_pkey"' }],
    ['a 23505 with no message', { code: '23505' }],
    ['a CHECK violation (23514, no hint)', { code: '23514', message: 'violates check constraint "reports_reason_check"' }],
    ['rate_limited hint on the wrong code', { code: 'P0001', hint: 'rate_limited' }],
    ['a suspended reporter', { code: '42501', message: 'Ce compte est suspendu.' }],
    ['a column the client may not write', { code: '42501', message: 'permission denied for table reports' }],
  ])('leaves %s generic (null)', (_label, error) => {
    expect(reportInsertRefusalKey(error)).toBeNull()
  })

  it('both keys exist in FR and AR', () => {
    for (const key of ['report.already_reported', 'report.rate_limited']) {
      expect(t(key, 'fr')).not.toBe(key)
      expect(t(key, 'ar')).not.toBe(key)
    }
  })
})
