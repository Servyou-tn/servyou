import { describe, it, expect, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { confirmRedirectUrl, sendEmailLink, sendLinkErrorKey } from './email-link'

describe('confirmRedirectUrl — the e-mail templates append « &token_hash=…&type=email » to it', () => {
  it('is /auth/confirm on the same origin and ALWAYS carries a query', () => {
    expect(confirmRedirectUrl('https://servyou.tn', null)).toBe('https://servyou.tn/auth/confirm?next=%2F')
    expect(confirmRedirectUrl('http://localhost:3000/', '/demander/abc')).toBe('http://localhost:3000/auth/confirm?next=%2Fdemander%2Fabc')
  })

  it('drops an unsafe or funnel next for home (open-redirect guard)', () => {
    expect(confirmRedirectUrl('https://servyou.tn', 'https://evil.example')).toBe('https://servyou.tn/auth/confirm?next=%2F')
    expect(confirmRedirectUrl('https://servyou.tn', '//evil.example')).toBe('https://servyou.tn/auth/confirm?next=%2F')
    expect(confirmRedirectUrl('https://servyou.tn', '/finaliser-mon-compte')).toBe('https://servyou.tn/auth/confirm?next=%2F')
  })
})

describe('sendLinkErrorKey', () => {
  it.each([
    ['captcha_failed', 'common.error_bot_check'],
    ['over_email_send_rate_limit', 'common.rate_limit'],
    ['over_request_rate_limit', 'common.rate_limit'],
    ['email_address_invalid', 'signup.form.errors.emailInvalid'],
    ['signup_disabled', 'signup.form.errors.generic'],
    [undefined, 'signup.form.errors.generic'],
  ])('%s → %s', (code, key) => {
    expect(sendLinkErrorKey(code)).toBe(key)
  })
})

describe('sendEmailLink', () => {
  function client(error: { message: string; code?: string; status?: number } | null) {
    const signInWithOtp = vi.fn(async () => ({ data: {}, error }))
    return { supabase: { auth: { signInWithOtp } } as unknown as SupabaseClient, signInWithOtp }
  }

  it('sends a passwordless link to /auth/confirm, with the captcha token, the name and the interface language', async () => {
    const { supabase, signInWithOtp } = client(null)
    const result = await sendEmailLink(supabase, {
      email: '  Amira@Example.TN ',
      fullName: ' Amira Ben Salah ',
      lang: 'ar',
      next: '/devenir-vendeur/boutique',
      origin: 'https://servyou.tn',
      captchaToken: 'tok',
    })
    expect(result).toBeNull()
    expect(signInWithOtp).toHaveBeenCalledWith({
      email: 'amira@example.tn',
      options: {
        shouldCreateUser: true,
        emailRedirectTo: 'https://servyou.tn/auth/confirm?next=%2Fdevenir-vendeur%2Fboutique',
        captchaToken: 'tok',
        data: { full_name: 'Amira Ben Salah', language: 'ar' },
      },
    })
  })

  it('the new-link page sends no name', async () => {
    const { supabase, signInWithOtp } = client(null)
    await sendEmailLink(supabase, { email: 'a@b.tn', lang: 'fr', next: null, origin: 'https://servyou.tn' })
    expect(signInWithOtp).toHaveBeenCalledWith({
      email: 'a@b.tn',
      options: { shouldCreateUser: true, emailRedirectTo: 'https://servyou.tn/auth/confirm?next=%2F', data: { language: 'fr' } },
    })
  })

  it('returns the i18n key of an error, never the raw message', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const { supabase } = client({ message: 'For security purposes, you can only request this after 42 seconds.', code: 'over_email_send_rate_limit', status: 429 })
    expect(await sendEmailLink(supabase, { email: 'a@b.tn', lang: 'fr', next: null, origin: 'https://servyou.tn' })).toBe('common.rate_limit')
  })
})
