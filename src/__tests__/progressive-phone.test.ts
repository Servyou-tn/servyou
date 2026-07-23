/**
 * Unit tests for phone validation + normalisation (pure — no DB, no network).
 * Covers isValidPhone / normalizePhone across every accepted/rejected Tunisian shape.
 *
 * The live-DB half of the progressive-phone flow (phone-first job-post write,
 * get_contact_phone end-to-end) lives in progressive-phone.integration.test.ts and
 * runs opt-in via `npm run test:integration`.
 */

import { describe, it, expect } from 'vitest'
import { isValidPhone, normalizePhone } from '@/lib/phone'

// ─── Unit: phone validation ───────────────────────────────────────────────────

describe('isValidPhone — accepted formats', () => {
  // Bare 8 digits, first digit 2-9
  it('bare 8-digit, first digit 2', () => expect(isValidPhone('20000000')).toBe(true))
  it('bare 8-digit, first digit 5', () => expect(isValidPhone('56480920')).toBe(true))
  it('bare 8-digit with spaces',    () => expect(isValidPhone('20 000 000')).toBe(true))
  it('bare 8-digit with dots',      () => expect(isValidPhone('20.000.000')).toBe(true))
  it('bare 8-digit with dashes',    () => expect(isValidPhone('20-000-000')).toBe(true))
  it('bare 8-digit with parens',    () => expect(isValidPhone('(20)000000')).toBe(true))

  // Leading 0
  it('leading-0 (056480920)',                 () => expect(isValidPhone('056480920')).toBe(true))
  it('leading-0 with spaces (0 56 480 920)', () => expect(isValidPhone('0 56 480 920')).toBe(true))
  it('leading-0 with dashes (056-480-920)',  () => expect(isValidPhone('056-480-920')).toBe(true))

  // 216 prefix (no +)
  it('216 prefix (21656480920)',              () => expect(isValidPhone('21656480920')).toBe(true))
  it('216 prefix with spaces (216 56480920)', () => expect(isValidPhone('216 56480920')).toBe(true))

  // +216 prefix
  it('+216 prefix (+21656480920)',             () => expect(isValidPhone('+21656480920')).toBe(true))
  it('+216 prefix with spaces (+216 56480920)', () => expect(isValidPhone('+216 56480920')).toBe(true))
  it('+216 prefix with dots (+216.56.480.920)', () => expect(isValidPhone('+216.56.480.920')).toBe(true))

  // 00216 prefix
  it('00216 prefix (0021656480920)',              () => expect(isValidPhone('0021656480920')).toBe(true))
  it('00216 prefix with spaces (00216 56480920)', () => expect(isValidPhone('00216 56480920')).toBe(true))
})

describe('isValidPhone — rejected formats', () => {
  it('rejects empty string',                   () => expect(isValidPhone('')).toBe(false))
  it('rejects 7 digits',                       () => expect(isValidPhone('2000000')).toBe(false))
  it('rejects 9 digits no prefix (956480920)', () => expect(isValidPhone('956480920')).toBe(false))
  it('rejects bare 8-digit first digit 1',     () => expect(isValidPhone('12345678')).toBe(false))
  it('rejects bare 8-digit first digit 0',     () => expect(isValidPhone('02345678')).toBe(false))  // leading-0 case is 0+8=9 digits
  it('rejects foreign +33 number',             () => expect(isValidPhone('+33612345678')).toBe(false))
  it('rejects foreign +1 number',              () => expect(isValidPhone('+12125551234')).toBe(false))
  it('rejects letters',                        () => expect(isValidPhone('2000000a')).toBe(false))
  it('rejects symbols beyond punctuation',     () => expect(isValidPhone('20@000000')).toBe(false))
})

// ─── Unit: phone normalisation ────────────────────────────────────────────────

describe('normalizePhone — all five shapes produce +216XXXXXXXX', () => {
  const EXPECTED = '+21656480920'

  it('bare 8-digit',           () => expect(normalizePhone('56480920')).toBe(EXPECTED))
  it('bare 8-digit with spaces', () => expect(normalizePhone('56 480 920')).toBe(EXPECTED))
  it('leading-0',              () => expect(normalizePhone('056480920')).toBe(EXPECTED))
  it('leading-0 with dashes',  () => expect(normalizePhone('056-480-920')).toBe(EXPECTED))
  it('leading-0 with dots',    () => expect(normalizePhone('0.56.480.920')).toBe(EXPECTED))
  it('216 prefix',             () => expect(normalizePhone('21656480920')).toBe(EXPECTED))
  it('216 prefix with spaces', () => expect(normalizePhone('216 56480920')).toBe(EXPECTED))
  it('+216 prefix',            () => expect(normalizePhone('+21656480920')).toBe(EXPECTED))
  it('+216 prefix with spaces', () => expect(normalizePhone('+216 56 480 920')).toBe(EXPECTED))
  it('00216 prefix',           () => expect(normalizePhone('0021656480920')).toBe(EXPECTED))
  it('00216 prefix with spaces', () => expect(normalizePhone('00216 56480920')).toBe(EXPECTED))
})
