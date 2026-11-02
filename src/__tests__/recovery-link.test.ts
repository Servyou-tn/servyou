import { describe, it, expect } from 'vitest'
import { recoveryTokenHash } from '@/lib/auth/recovery-link'

const HEX = 'a'.repeat(56)

describe('recoveryTokenHash — cross-device reset link', () => {
  it('returns the hash of a recovery link (plain hex or pkce_-prefixed)', () => {
    expect(recoveryTokenHash({ token_hash: HEX, type: 'recovery' })).toBe(HEX)
    expect(recoveryTokenHash({ token_hash: `pkce_${HEX}`, type: 'recovery' })).toBe(`pkce_${HEX}`)
  })

  it('only accepts type=recovery', () => {
    expect(recoveryTokenHash({ token_hash: HEX })).toBeNull()
    expect(recoveryTokenHash({ token_hash: HEX, type: 'signup' })).toBeNull()
    expect(recoveryTokenHash({ token_hash: HEX, type: 'magiclink' })).toBeNull()
  })

  it('ignores a missing, repeated or malformed hash', () => {
    expect(recoveryTokenHash({ type: 'recovery' })).toBeNull()
    expect(recoveryTokenHash({ token_hash: [HEX, HEX], type: 'recovery' })).toBeNull()
    expect(recoveryTokenHash({ token_hash: 'short', type: 'recovery' })).toBeNull()
    expect(recoveryTokenHash({ token_hash: `${HEX}<script>`, type: 'recovery' })).toBeNull()
    expect(recoveryTokenHash({ token_hash: 'a'.repeat(129), type: 'recovery' })).toBeNull()
  })
})
