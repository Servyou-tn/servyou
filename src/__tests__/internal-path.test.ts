import { describe, it, expect } from 'vitest'
import { isValidInternalPath } from '@/lib/internal-path'

describe('isValidInternalPath — open-redirect guard', () => {
  it('accepts same-origin absolute paths', () => {
    for (const p of ['/', '/ma-boutique', '/mon-profil-freelance', '/mes-demandes?tab=open', '/a/b#c']) {
      expect(isValidInternalPath(p)).toBe(true)
    }
  })
  it('rejects protocol-relative URLs (//host)', () => {
    expect(isValidInternalPath('//evil.com')).toBe(false)
    expect(isValidInternalPath('//evil.com/path')).toBe(false)
  })
  it('rejects absolute URLs carrying a scheme', () => {
    expect(isValidInternalPath('https://evil.com')).toBe(false)
    expect(isValidInternalPath('http://evil.com')).toBe(false)
    expect(isValidInternalPath('javascript:alert(1)')).toBe(false)
  })
  it('rejects backslash tricks', () => {
    expect(isValidInternalPath('/\\evil.com')).toBe(false)
    expect(isValidInternalPath('\\\\evil.com')).toBe(false)
  })
  it('rejects control characters', () => {
    expect(isValidInternalPath('/\tfoo')).toBe(false)
    expect(isValidInternalPath('/\nfoo')).toBe(false)
  })
  it('rejects relative paths, empties and leading whitespace', () => {
    expect(isValidInternalPath('relative')).toBe(false)
    expect(isValidInternalPath('')).toBe(false)
    expect(isValidInternalPath(null)).toBe(false)
    expect(isValidInternalPath(undefined)).toBe(false)
    expect(isValidInternalPath(' /leading-space')).toBe(false)
  })
})
