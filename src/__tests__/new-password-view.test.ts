import { describe, it, expect } from 'vitest'
import { newPasswordInitialView } from '@/lib/auth/new-password-view'

const HASH = `pkce_${'b'.repeat(56)}`

describe('newPasswordInitialView — /nouveau-mot-de-passe first state', () => {
  it.each([
    ['expired link (forwarded from /)', { error: 'access_denied', error_code: 'otp_expired' }, 'expired', undefined],
    ['other GoTrue error', { error: 'access_denied', error_code: 'bad_code_verifier' }, 'invalid', undefined],
    ['error wins over a token_hash', { error: 'access_denied', error_code: 'otp_expired', token_hash: HASH, type: 'recovery' }, 'expired', undefined],
    ['any ?error wins over a token_hash', { error: 'server_error', token_hash: HASH, type: 'recovery' }, 'invalid', undefined],
    ['token_hash recovery link', { token_hash: HASH, type: 'recovery' }, 'confirm', HASH],
    ['token_hash of another type', { token_hash: HASH, type: 'signup' }, 'checking', undefined],
    ['PKCE ?code= link', { code: 'abc' }, 'checking', undefined],
    ['bare visit / reload', {}, 'checking', undefined],
  ] as const)('%s', (_label, sp, initialView, tokenHash) => {
    expect(newPasswordInitialView(sp)).toEqual({ initialView, tokenHash })
  })
})
