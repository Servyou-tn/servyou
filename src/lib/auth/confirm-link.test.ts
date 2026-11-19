import { describe, it, expect } from 'vitest'
import { newLinkPath, parseConfirmParams, pathAfterConfirm, reasonForAuthError } from './confirm-link'

const p = (query: string) => parseConfirmParams(new URLSearchParams(query))

describe('parseConfirmParams — what reached /auth/confirm', () => {
  it('a template link: token_hash + type=email', () => {
    expect(p('token_hash=abc123def456&type=email&next=%2F')).toEqual({ kind: 'token', tokenHash: 'abc123def456' })
    expect(p('token_hash=pkce_0f9e8d7c6b5a&type=email')).toEqual({ kind: 'token', tokenHash: 'pkce_0f9e8d7c6b5a' })
  })

  it('a token_hash with any other type, or junk, is invalid (no Auth call)', () => {
    expect(p('token_hash=abc123def456&type=recovery')).toEqual({ kind: 'failed', reason: 'invalide' })
    expect(p('token_hash=abc123def456')).toEqual({ kind: 'failed', reason: 'invalide' })
    expect(p('token_hash=<script>&type=email')).toEqual({ kind: 'failed', reason: 'invalide' })
    expect(p('token_hash=&type=email')).toEqual({ kind: 'failed', reason: 'invalide' })
  })

  it("GoTrue's default template: a PKCE ?code=", () => {
    expect(p('code=5f2b9c1e-1111-4222-8333-944455556666&next=%2F')).toEqual({ kind: 'code', code: '5f2b9c1e-1111-4222-8333-944455556666' })
    expect(p('code=a b')).toEqual({ kind: 'failed', reason: 'invalide' })
  })

  it("GoTrue's own failure redirect", () => {
    expect(p('error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired')).toEqual({ kind: 'failed', reason: 'expire' })
    expect(p('error=access_denied&error_code=flow_state_not_found')).toEqual({ kind: 'failed', reason: 'invalide' })
    expect(p('error=server_error')).toEqual({ kind: 'failed', reason: 'invalide' })
  })

  it('nothing at all is invalid', () => {
    expect(p('next=%2F')).toEqual({ kind: 'failed', reason: 'invalide' })
  })
})

describe('reasonForAuthError', () => {
  it('only otp_expired is « expiré »', () => {
    expect(reasonForAuthError('otp_expired')).toBe('expire')
    expect(reasonForAuthError('flow_state_not_found')).toBe('invalide')
    expect(reasonForAuthError(undefined)).toBe('invalide')
  })
})

describe('newLinkPath / pathAfterConfirm', () => {
  it('the new-link page keeps the reason and a validated next', () => {
    expect(newLinkPath('expire', null)).toBe('/inscription/nouveau-lien?raison=expire')
    expect(newLinkPath('invalide', '/demander/x')).toBe('/inscription/nouveau-lien?raison=invalide&next=%2Fdemander%2Fx')
  })

  it('an incomplete (or unreadable) account goes to step 2, keeping next', () => {
    expect(pathAfterConfirm(false, null)).toBe('/finaliser-mon-compte')
    expect(pathAfterConfirm(false, '/devenir-vendeur/boutique')).toBe('/finaliser-mon-compte?next=%2Fdevenir-vendeur%2Fboutique')
    expect(pathAfterConfirm(null, '/mes-commandes')).toBe('/finaliser-mon-compte?next=%2Fmes-commandes')
    // The default next (home) is not carried.
    expect(pathAfterConfirm(false, '/')).toBe('/finaliser-mon-compte')
  })

  it('a complete account goes to next, or home', () => {
    expect(pathAfterConfirm(true, '/mes-commandes')).toBe('/mes-commandes')
    expect(pathAfterConfirm(true, null)).toBe('/')
  })
})
