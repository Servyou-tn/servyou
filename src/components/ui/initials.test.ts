import { describe, it, expect } from 'vitest'
import { getInitials } from './initials'

describe('getInitials', () => {
  it('two words → two uppercase letters', () => {
    expect(getInitials('Mohamed Ali')).toBe('MA')
    expect(getInitials('moatez zaier')).toBe('MZ')
  })

  it('one word → one letter', () => {
    expect(getInitials('Sarra')).toBe('S')
  })

  it('three or more words → first + last', () => {
    expect(getInitials('Ahmed Ben Salah')).toBe('AS')
  })

  it('null / empty / whitespace → placeholder', () => {
    expect(getInitials(null)).toBe('?')
    expect(getInitials(undefined)).toBe('?')
    expect(getInitials('')).toBe('?')
    expect(getInitials('   ')).toBe('?')
  })

  it('an email falls back to its local part', () => {
    expect(getInitials('moatez@servyou.tn')).toBe('M')
  })

  // The reported bug: « Acheteur E3 (seed) » rendered « A( » (« A) » in AR).
  it('skips brackets: the first LETTER of a word, not its first character', () => {
    expect(getInitials('Acheteur E3 (seed)')).toBe('AS')
    expect(getInitials('Acheteur E3 (seed)')).not.toMatch(/[()]/)
    expect(getInitials('(seed) Acheteur')).toBe('SA')
  })

  it('drops words with no letter (digits-only, punctuation, brackets)', () => {
    expect(getInitials('Karim 123')).toBe('K')
    expect(getInitials('Karim (3)')).toBe('K')
    expect(getInitials('Karim - Tunis')).toBe('KT')
    expect(getInitials('Karim & Sons')).toBe('KS')
  })

  it('a digit inside a word does not become the initial when a letter exists', () => {
    expect(getInitials('E3 Store')).toBe('ES')
    expect(getInitials('3E Store')).toBe('ES')
  })

  it('emoji are skipped, never rendered as an initial', () => {
    expect(getInitials('🙂 Karim')).toBe('K')
    expect(getInitials('Karim 🙂')).toBe('K')
    expect(getInitials('🙂 Karim Ben Ali 🎉')).toBe('KA')
  })

  it('no letter anywhere → placeholder', () => {
    expect(getInitials('123')).toBe('?')
    expect(getInitials('(3)')).toBe('?')
    expect(getInitials('🙂')).toBe('?')
    expect(getInitials('@')).toBe('?')
  })

  it('a display name containing « @ » is a name, not an address', () => {
    expect(getInitials('Café @ Tunis')).toBe('CT')
    expect(getInitials('Deco @home')).toBe('DH')
    expect(getInitials('@Home Deco')).toBe('HD')
    expect(getInitials('@servyou.tn')).toBe('S')
  })

  it('Arabic names (no case) keep their letters, brackets skipped', () => {
    expect(getInitials('محمد علي')).toBe('مع')
    expect(getInitials('سارة')).toBe('س')
    expect(getInitials('مشتري E3 (تجريبي)')).toBe('مت')
    expect(getInitials('(تجريبي) مشتري')).toBe('تم')
  })

  it('accented and non-Latin letters upper-case; an expanding case-fold stays one glyph', () => {
    expect(getInitials('élodie ünal')).toBe('ÉÜ')
    expect(getInitials('ßa Ali')).toBe('SA')
  })

  it('a leading combining mark is not a letter', () => {
    expect(getInitials('́ Karim')).toBe('K')
  })
})
