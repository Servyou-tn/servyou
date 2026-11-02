import { describe, it, expect } from 'vitest'
import { expiredLinkRedirect, isExpiredLinkError } from '@/lib/auth/expired-link'

describe('expiredLinkRedirect — GoTrue otp_expired on the home page', () => {
  it('forwards an expired / used email link to /nouveau-mot-de-passe with the error kept', () => {
    expect(
      expiredLinkRedirect({
        error: 'access_denied',
        error_code: 'otp_expired',
        error_description: 'Email link is invalid or has expired',
      }),
    ).toBe('/nouveau-mot-de-passe?error=access_denied&error_code=otp_expired')
  })

  it('leaves a plain home-page visit alone', () => {
    expect(expiredLinkRedirect({})).toBeNull()
    expect(expiredLinkRedirect({ q: 'otp_expired' })).toBeNull()
  })

  it('does not catch other auth errors', () => {
    expect(expiredLinkRedirect({ error: 'access_denied' })).toBeNull()
    expect(expiredLinkRedirect({ error: 'server_error', error_code: 'unexpected_failure' })).toBeNull()
  })
})

describe('isExpiredLinkError', () => {
  it('is true only for error_code=otp_expired', () => {
    expect(isExpiredLinkError({ error: 'access_denied', error_code: 'otp_expired' })).toBe(true)
    expect(isExpiredLinkError({ error: 'access_denied', error_code: 'bad_code_verifier' })).toBe(false)
    expect(isExpiredLinkError({ error_code: ['otp_expired', 'otp_expired'] })).toBe(false)
  })
})
