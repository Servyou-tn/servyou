import { describe, it, expect } from 'vitest'
import { nextDestinationAfterVerify } from '@/lib/verify-email'

describe('nextDestinationAfterVerify', () => {
  it('uses the sessionStorage role intent when present', () => {
    expect(nextDestinationAfterVerify('consumer', null)).toBe('/')
    expect(nextDestinationAfterVerify('shopOwner', null)).toBe('/devenir-vendeur')
    expect(nextDestinationAfterVerify('freelancer', null)).toBe('/devenir-freelance')
  })
  it('lets the role intent win even if a seller_type somehow exists', () => {
    expect(nextDestinationAfterVerify('shopOwner', 'freelancer')).toBe('/devenir-vendeur')
  })
  it('falls back to seller_type when there is no role intent (cross-device)', () => {
    expect(nextDestinationAfterVerify(null, 'shop_owner')).toBe('/ma-boutique')
    expect(nextDestinationAfterVerify(null, 'freelancer')).toBe('/mon-profil-freelance')
  })
  it('falls back to home for a consumer-baseline account', () => {
    expect(nextDestinationAfterVerify(null, null)).toBe('/')
  })
})
