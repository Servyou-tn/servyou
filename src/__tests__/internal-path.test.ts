import { describe, it, expect } from 'vitest'
import { isValidInternalPath, resolvePostLoginDestination } from '@/lib/internal-path'

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

// Regression guard for the bug where every server-side guard emitted `?next=` but SigninForm
// read `?redirect=` — every guarded sign-in silently landed on `/` instead of the intended page.
// This is the exact param-name-in / destination-out contract; a future rename back to `redirect`
// (or any other key) should fail these, not slip through unnoticed.
describe('resolvePostLoginDestination — post-login redirect target', () => {
  it('reads a valid ?next= path', () => {
    expect(resolvePostLoginDestination('?next=%2Fma-boutique%2Fcreer%2Fconfiguration')).toBe('/ma-boutique/creer/configuration')
  })
  it('reads a ?next= path carrying its own query string', () => {
    expect(resolvePostLoginDestination('?next=' + encodeURIComponent('/mes-commandes/abc123?tab=details'))).toBe('/mes-commandes/abc123?tab=details')
  })
  it('does NOT read the old ?redirect= key', () => {
    expect(resolvePostLoginDestination('?redirect=%2Fmon-compte')).toBe('/')
  })
  it('falls back to "/" when no ?next= is present', () => {
    expect(resolvePostLoginDestination('')).toBe('/')
  })
  it('rejects a protocol-relative ?next= and falls back', () => {
    expect(resolvePostLoginDestination('?next=' + encodeURIComponent('//evil.example.com'))).toBe('/')
  })
  it('rejects a full-URL ?next= and falls back', () => {
    expect(resolvePostLoginDestination('?next=' + encodeURIComponent('https://evil.example.com'))).toBe('/')
  })
  it('honours a custom fallback', () => {
    expect(resolvePostLoginDestination('', '/tableau-de-bord-vendeur')).toBe('/tableau-de-bord-vendeur')
  })
})
