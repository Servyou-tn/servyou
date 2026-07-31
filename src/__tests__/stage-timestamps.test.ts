/**
 * `stageTimestamps` decides which lifecycle stage carries which date on the G9 rail. It is
 * must-test business-rule logic: a wrong mapping tells a seller an order reached a stage on a day
 * it did not, and a date on screen is read as fact.
 *
 * The load-bearing assertions are the ABSENCE cases. All 14 pre-migration orders have zero events,
 * so `{}` is the COMMON path, not an error path — and a stage with no event must be missing from
 * the map rather than present-and-empty, because the rail branches on presence to decide whether
 * to render a line at all.
 */

import { describe, it, expect } from 'vitest'
import { stageTimestamps, shortDate } from '@/lib/orders/order-status'

type E = { toStatus: string | null; createdAt: string }
const ev = (toStatus: string | null, createdAt: string): E => ({ toStatus, createdAt })

describe('stageTimestamps', () => {
  it('returns {} for an order with no events — the pre-migration common case', () => {
    expect(stageTimestamps([])).toEqual({})
  })

  it('keys on to_status, so the `created` event stamps the first stage with no special case', () => {
    // emit_order_event writes `created` with to_status = new.status, which is why one rule covers
    // both event kinds. If this ever regresses, "En attente" silently loses its date.
    const map = stageTimestamps([
      ev('pending', '2026-07-06T09:12:00Z'),
      ev('accepted', '2026-07-07T10:00:00Z'),
    ])
    expect(map).toEqual({
      pending: '2026-07-06T09:12:00Z',
      accepted: '2026-07-07T10:00:00Z',
    })
  })

  it('takes the FIRST occurrence when a status is re-entered, not the latest', () => {
    // "When did this order reach Expédiée" is answered by the first time it did.
    const map = stageTimestamps([
      ev('shipped', '2026-07-01T08:00:00Z'),
      ev('shipped', '2026-07-09T08:00:00Z'),
    ])
    expect(map.shipped).toBe('2026-07-01T08:00:00Z')
  })

  it('ignores events with a null to_status rather than crashing or keying on "null"', () => {
    const map = stageTimestamps([ev(null, '2026-07-02T08:00:00Z'), ev('prepared', '2026-07-03T08:00:00Z')])
    expect(map).toEqual({ prepared: '2026-07-03T08:00:00Z' })
    expect(Object.keys(map)).not.toContain('null')
  })

  it('OMITS unreached stages entirely — presence is what the rail branches on', () => {
    const map = stageTimestamps([ev('pending', '2026-07-06T09:12:00Z')])
    // Not `undefined`-valued, not empty-string: genuinely absent, so `iso ? ... : null` renders
    // the label alone instead of an empty element.
    expect('shipped' in map).toBe(false)
    expect(map.shipped).toBeUndefined()
  })

  it('does not mutate or depend on the caller ordering beyond first-wins', () => {
    const events = [ev('pending', '2026-07-06T09:12:00Z')]
    const copy = [...events]
    stageTimestamps(events)
    expect(events).toEqual(copy)
  })
})

describe('shortDate — the format the rail renders', () => {
  it('produces the abbreviated FR shape "6 juil."', () => {
    // `shortDate` is the EXISTING header formatter (its docstring cites Figma's "24 nov"), reused
    // here rather than adding a second date format to the module.
    //
    // ⚑ Deliberately NOT justified by the stepper's `date` layer. An earlier delta pass recorded a
    // hidden layer reading "6 juil."; direct MCP inspection (2026-07-31) found no such layer. The
    // assertion stands on `shortDate`'s own Figma source, not on the retracted one — pinned because
    // the rail now renders this string and a silent locale/format change would alter it on screen.
    expect(shortDate('2026-07-06T09:12:00Z', 'fr')).toBe('6 juil.')
  })

  it('keeps Latin digits in Arabic, per the bilingual number rule', () => {
    const ar = shortDate('2026-07-06T09:12:00Z', 'ar')
    expect(ar).toMatch(/6/) // Latin 6, not ٦
    expect(ar).not.toMatch(/[٠-٩]/)
  })
})
