/**
 * The VRT gate's verdict (scripts/vrt/gate.mjs): a comparison diff.mjs could not make is a FAIL, never 0 %.
 * Before this, an errored pair was printed `ERR` and skipped, so it never raised `max %` — a run where every pair
 * errored read `max 0%` and the Storybook gate passed (docs/follow-ups/vrt-chrome-launch-retry.md §1).
 */

import { describe, it, expect } from 'vitest'
import { diffSummaryLines, allComparisonsErrored, parseDiffSummary, gateVerdict } from '../../scripts/vrt/gate.mjs'

const CLEAN = { missing: 0, orphan: 0, maxPct: 0, gatePct: 0.05, errors: 0 }

describe('gateVerdict', () => {
  it('passes a clean run', () => {
    expect(gateVerdict(CLEAN)).toEqual({ pass: true, reasons: [] })
  })

  it('one errored comparison fails the gate even at max 0 %', () => {
    const v = gateVerdict({ ...CLEAN, errors: 1 })
    expect(v.pass).toBe(false)
    expect(v.reasons).toEqual(['1 comparison(s) errored'])
  })

  it('keeps the existing reasons: missing, orphan, over the threshold', () => {
    expect(gateVerdict({ ...CLEAN, missing: 2 }).pass).toBe(false)
    expect(gateVerdict({ ...CLEAN, orphan: 1 }).pass).toBe(false)
    expect(gateVerdict({ ...CLEAN, maxPct: 0.06 }).pass).toBe(false)
    expect(gateVerdict({ ...CLEAN, maxPct: 0.05 }).pass).toBe(true)
  })
})

describe('diff.mjs summary → stories.mjs parse (round trip)', () => {
  it('a run with errored pairs parses back to its error count', () => {
    const out = ['   button--primary  ERR boom', ...diffSummaryLines({ maxPct: 0, compared: 3, errors: ['a.png', 'b.png'] })].join('\n')
    expect(parseDiffSummary(out)).toEqual({ maxPct: 0, errors: 2, compared: 3 })
    expect(out).toContain('ERRORED comparisons')
  })

  it('a clean run parses to 0 errors', () => {
    expect(parseDiffSummary(diffSummaryLines({ maxPct: 0.013, compared: 4, errors: [] }).join('\n'))).toEqual({
      maxPct: 0.013,
      errors: 0,
      compared: 4,
    })
  })

  it('output without an `errors:` line (an old diff.mjs) is unparseable, so the gate fails', () => {
    expect(parseDiffSummary('max 0%\nsets: 4 compared / 0 missing / 0 orphan')).toBeNull()
  })
})

describe('allComparisonsErrored — diff.mjs exits non-zero (loud) when nothing was compared', () => {
  it('every pair errored', () => {
    expect(allComparisonsErrored({ compared: 3, errors: ['a', 'b', 'c'] })).toBe(true)
  })

  it('some pairs compared, or nothing to compare', () => {
    expect(allComparisonsErrored({ compared: 3, errors: ['a'] })).toBe(false)
    expect(allComparisonsErrored({ compared: 0, errors: [] })).toBe(false)
  })
})
