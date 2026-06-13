import { describe, it, expect } from 'vitest'
import {
  computeAge,
  isOldEnoughToSignup,
  isValidEmail,
  isValidPassword,
  passwordStrength,
  MIN_SIGNUP_AGE,
} from '@/lib/signup-validation'

// Local-constructed reference "now" so the age boundary tests are timezone-stable.
const NOW = new Date(2026, 5, 13) // 2026-06-13 local

describe('computeAge', () => {
  it('counts whole years before the birthday has occurred this year', () => {
    expect(computeAge('2000-12-31', NOW)).toBe(25)
  })
  it('counts the birthday itself as the new age', () => {
    expect(computeAge('2000-06-13', NOW)).toBe(26)
  })
  it('treats the day before the birthday as the younger age', () => {
    expect(computeAge('2000-06-14', NOW)).toBe(25)
  })
})

describe('isOldEnoughToSignup (16+ gate)', () => {
  it('passes someone who turns 16 today', () => {
    expect(isOldEnoughToSignup('2010-06-13', NOW)).toBe(true)
  })
  it('fails someone one day short of 16', () => {
    expect(isOldEnoughToSignup('2010-06-14', NOW)).toBe(false)
  })
  it('fails someone clearly under 16', () => {
    expect(isOldEnoughToSignup('2015-01-01', NOW)).toBe(false)
  })
  it('fails closed on an invalid or empty date', () => {
    expect(isOldEnoughToSignup('', NOW)).toBe(false)
    expect(isOldEnoughToSignup('not-a-date', NOW)).toBe(false)
  })
  it('uses 16 as the minimum age', () => {
    expect(MIN_SIGNUP_AGE).toBe(16)
  })
})

describe('isValidPassword (≥8, letter + number)', () => {
  it('accepts 8+ chars with a letter and a number', () => {
    expect(isValidPassword('abc12345')).toBe(true)
  })
  it('rejects shorter than 8', () => {
    expect(isValidPassword('ab12')).toBe(false)
  })
  it('rejects letters-only and numbers-only', () => {
    expect(isValidPassword('abcdefgh')).toBe(false)
    expect(isValidPassword('12345678')).toBe(false)
  })
})

describe('passwordStrength', () => {
  it('weak when too short or a single character class', () => {
    expect(passwordStrength('abc')).toBe('weak')
    expect(passwordStrength('abcdefgh')).toBe('weak')
    expect(passwordStrength('12345678')).toBe('weak')
  })
  it('medium at 8+ with letters and numbers', () => {
    expect(passwordStrength('abcd1234')).toBe('medium')
  })
  it('strong at 10+ with letters, numbers and a special character', () => {
    expect(passwordStrength('abcd1234!@')).toBe('strong')
  })
})

describe('isValidEmail', () => {
  it('accepts a normal address', () => {
    expect(isValidEmail('vous@exemple.com')).toBe(true)
  })
  it('rejects malformed addresses', () => {
    expect(isValidEmail('nope')).toBe(false)
    expect(isValidEmail('a@b')).toBe(false)
    expect(isValidEmail('a b@c.com')).toBe(false)
  })
})
