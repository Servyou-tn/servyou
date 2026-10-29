import { describe, it, expect } from 'vitest'
import { formatPhoneDisplay, normalizePhone } from './phone'

describe('formatPhoneDisplay', () => {
  it('groups a canonical stored number: +216 NN NNN NNN', () => {
    expect(formatPhoneDisplay('+21671555210')).toBe('+216 71 555 210')
  })

  it('round-trips whatever normalizePhone produces', () => {
    for (const raw of ['71555210', '071 555 210', '216 71 555 210', '00216 71 555 210']) {
      expect(formatPhoneDisplay(normalizePhone(raw))).toBe('+216 71 555 210')
    }
  })

  it('groups a legacy row stored without the +', () => {
    expect(formatPhoneDisplay('21620123456')).toBe('+216 20 123 456')
  })

  it('is idempotent on an already-formatted number', () => {
    expect(formatPhoneDisplay('+216 71 555 210')).toBe('+216 71 555 210')
  })

  it('returns anything else unchanged — never mangles, never drops', () => {
    expect(formatPhoneDisplay('0033612345678')).toBe('0033612345678')
    expect(formatPhoneDisplay('')).toBe('')
  })
})
