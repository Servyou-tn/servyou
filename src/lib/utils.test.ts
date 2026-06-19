/**
 * Unit tests for the shared utils. `firstName` powers the consumer-homepage greeting.
 *
 * Run: npx vitest run src/lib/utils.test.ts
 */

import { describe, it, expect } from 'vitest'
import { firstName } from './utils'

describe('firstName', () => {
  it('extracts the first word of a full name', () => {
    expect(firstName('Moatez Sahbeni')).toBe('Moatez')
    expect(firstName('Ali')).toBe('Ali')
    expect(firstName('  Ali  Ben Salah ')).toBe('Ali')
  })
  it('returns empty string for null / empty', () => {
    expect(firstName(null)).toBe('')
    expect(firstName('')).toBe('')
    expect(firstName('   ')).toBe('')
  })
})
