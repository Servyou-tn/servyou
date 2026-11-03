import { describe, it, expect } from 'vitest'
import { formatLocalPhoneInput, formatPhoneDisplay, isValidPhone, normalizePhone } from './phone'

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

describe('formatLocalPhoneInput — the E1 field shows « 55 123 456 » (display only)', () => {
  it('groups the local digits as they are typed', () => {
    expect(formatLocalPhoneInput('55123456')).toBe('55 123 456')
    expect(formatLocalPhoneInput('551')).toBe('55 1')
    expect(formatLocalPhoneInput('55 12')).toBe('55 12')
    expect(formatLocalPhoneInput('')).toBe('')
  })

  it('leaves anything that is not a plain local number as typed', () => {
    expect(formatLocalPhoneInput('+21655123456')).toBe('+21655123456')
    expect(formatLocalPhoneInput('551234567')).toBe('551234567')
  })

  it('the grouped value still validates and normalises to the same canonical number', () => {
    expect(isValidPhone('55 123 456')).toBe(true)
    expect(normalizePhone('55 123 456')).toBe(normalizePhone('55123456'))
  })
})
