import { describe, it, expect } from 'vitest'
import { ROLE_CONFIG, roleConfig, roleDestination, asSignupRole } from '@/lib/signup-role'
import { t } from '@/lib/i18n'

describe('roleConfig — age gates and destinations', () => {
  it('consumer is the 16+ gate and lands home', () => {
    expect(roleConfig('consumer').minAge).toBe(16)
    expect(roleConfig('consumer').destination).toBe('/')
  })
  it('shopOwner is the 18+ gate and lands on /devenir-vendeur', () => {
    expect(roleConfig('shopOwner').minAge).toBe(18)
    expect(roleConfig('shopOwner').destination).toBe('/devenir-vendeur')
  })
  it('freelancer is the 18+ gate and lands on /devenir-freelance', () => {
    expect(roleConfig('freelancer').minAge).toBe(18)
    expect(roleConfig('freelancer').destination).toBe('/devenir-freelance')
  })
})

describe('roleConfig — i18n keys resolve (catch a missing/typo key)', () => {
  it('every role title/helper/error key resolves in both fr and ar', () => {
    for (const role of ['consumer', 'shopOwner', 'freelancer'] as const) {
      const c = ROLE_CONFIG[role]
      for (const key of [c.titleKey, c.ageHelperKey, c.ageErrorKey]) {
        // t() returns the raw key when the key is missing — assert it resolved.
        expect(t(key, 'fr')).not.toBe(key)
        expect(t(key, 'ar')).not.toBe(key)
      }
    }
  })
})

describe('roleDestination', () => {
  it('maps each role to its destination', () => {
    expect(roleDestination('consumer')).toBe('/')
    expect(roleDestination('shopOwner')).toBe('/devenir-vendeur')
    expect(roleDestination('freelancer')).toBe('/devenir-freelance')
  })
  it('tolerates null → home', () => {
    expect(roleDestination(null)).toBe('/')
  })
})

describe('asSignupRole', () => {
  it('accepts the three valid roles', () => {
    expect(asSignupRole('consumer')).toBe('consumer')
    expect(asSignupRole('shopOwner')).toBe('shopOwner')
    expect(asSignupRole('freelancer')).toBe('freelancer')
  })
  it('rejects anything else', () => {
    expect(asSignupRole('shop-owner')).toBeNull()
    expect(asSignupRole(null)).toBeNull()
    expect(asSignupRole(undefined)).toBeNull()
    expect(asSignupRole('')).toBeNull()
  })
})
