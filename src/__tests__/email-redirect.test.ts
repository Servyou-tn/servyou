/**
 * verifyEmailRedirectUrl (src/lib/auth/email-redirect.ts) — the `emailRedirectTo` SignupForm and VerifyEmailFlow pass
 * so the confirmation link lands on /verifier-email of the origin the user signed up from (pre-launch audit pass 3,
 * founder action A1). Run by path.
 */

import { describe, it, expect } from 'vitest'
import { verifyEmailRedirectUrl, VERIFY_EMAIL_PATH } from '@/lib/auth/email-redirect'

describe('verifyEmailRedirectUrl', () => {
  it('is <origin>/verifier-email for production and local dev (the two allow-listed origins)', () => {
    expect(verifyEmailRedirectUrl('https://servyou.vercel.app')).toBe('https://servyou.vercel.app/verifier-email')
    expect(verifyEmailRedirectUrl('http://localhost:3000')).toBe('http://localhost:3000/verifier-email')
  })

  it('never doubles the slash', () => {
    expect(verifyEmailRedirectUrl('https://servyou.vercel.app/')).toBe('https://servyou.vercel.app/verifier-email')
  })

  it('targets the route that exchanges the confirmation code', () => {
    expect(VERIFY_EMAIL_PATH).toBe('/verifier-email')
  })
})
