import { describe, it, expect } from 'vitest'
import { isValidInternalPath, resolvePostLoginDestination, resolveSignInDestination } from '@/lib/internal-path'
import { accountSpaceHref, roleDashboardPath } from '@/lib/roles'

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

// Role-aware landing after sign-in. A safe ?next= beats the role dashboard for EVERY role (a guard
// bounced them from a specific page); the open-redirect guard still applies on top of it.
describe('resolveSignInDestination — role dashboard after sign-in', () => {
  const freelancer = { seller_type: 'freelancer', is_admin: false }
  const shopOwner = { seller_type: 'shop_owner', is_admin: false }
  const consumer = { seller_type: null, is_admin: false }

  it('freelancer → /tableau-de-bord', () => {
    expect(resolveSignInDestination('', freelancer)).toBe('/tableau-de-bord')
  })
  it('shop owner → /tableau-de-bord-vendeur', () => {
    expect(resolveSignInDestination('', shopOwner)).toBe('/tableau-de-bord-vendeur')
  })
  it('consumer keeps "/"', () => {
    expect(resolveSignInDestination('', consumer)).toBe('/')
  })
  it('admin keeps "/", even when also a seller', () => {
    expect(resolveSignInDestination('', { seller_type: null, is_admin: true })).toBe('/')
    expect(resolveSignInDestination('', { seller_type: 'freelancer', is_admin: true })).toBe('/')
    expect(resolveSignInDestination('', { seller_type: 'shop_owner', is_admin: true })).toBe('/')
  })
  it('an unreadable profile (null/undefined) falls back to "/" instead of throwing', () => {
    expect(resolveSignInDestination('', null)).toBe('/')
    expect(resolveSignInDestination('', undefined)).toBe('/')
  })
  it('an unknown seller_type resolves to consumer behaviour', () => {
    expect(resolveSignInDestination('', { seller_type: 'something_else', is_admin: false })).toBe('/')
  })
  it('a safe ?next= wins over the dashboard for every role', () => {
    const search = '?next=' + encodeURIComponent('/mes-engagements')
    expect(resolveSignInDestination(search, freelancer)).toBe('/mes-engagements')
    expect(resolveSignInDestination(search, shopOwner)).toBe('/mes-engagements')
    expect(resolveSignInDestination(search, consumer)).toBe('/mes-engagements')
    expect(resolveSignInDestination(search, { seller_type: null, is_admin: true })).toBe('/mes-engagements')
  })
  it('an UNSAFE ?next= is ignored and the role dashboard applies (open-redirect guard)', () => {
    for (const bad of ['//evil.example.com', 'https://evil.example.com', '/\\evil.com']) {
      const search = '?next=' + encodeURIComponent(bad)
      expect(resolveSignInDestination(search, freelancer)).toBe('/tableau-de-bord')
      expect(resolveSignInDestination(search, shopOwner)).toBe('/tableau-de-bord-vendeur')
      expect(resolveSignInDestination(search, consumer)).toBe('/')
    }
  })
})

describe('roleDashboardPath / accountSpaceHref', () => {
  it('maps each role to its dashboard', () => {
    expect(roleDashboardPath('freelancer')).toBe('/tableau-de-bord')
    expect(roleDashboardPath('shop_owner')).toBe('/tableau-de-bord-vendeur')
    expect(roleDashboardPath(null)).toBe('/')
  })
  it('the header space link: admin wins, then role dashboard, consumers go to the marketplace', () => {
    expect(accountSpaceHref('freelancer', false)).toBe('/tableau-de-bord')
    expect(accountSpaceHref('shop_owner', false)).toBe('/tableau-de-bord-vendeur')
    expect(accountSpaceHref(null, false)).toBe('/marche/produits')
    expect(accountSpaceHref(null, true)).toBe('/admin')
    expect(accountSpaceHref('freelancer', true)).toBe('/admin')
  })
})
