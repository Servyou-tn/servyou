import { describe, it, expect } from 'vitest'
import { nextDestinationAfterVerify } from '@/lib/verify-email'

describe('nextDestinationAfterVerify', () => {
  it('uses the sessionStorage role intent when present', () => {
    expect(nextDestinationAfterVerify('consumer', null)).toBe('/')
    expect(nextDestinationAfterVerify('shopOwner', null)).toBe('/devenir-vendeur/boutique')
    expect(nextDestinationAfterVerify('freelancer', null)).toBe('/devenir-vendeur/freelance')
  })
  it('lets the role intent win even if a seller_type somehow exists', () => {
    expect(nextDestinationAfterVerify('shopOwner', 'freelancer')).toBe('/devenir-vendeur/boutique')
  })
  it('falls back to seller_type when there is no role intent (cross-device)', () => {
    // G4: was '/ma-boutique', a route that has never existed — this fallback landed a shop owner
    // verifying email on a second device straight onto a 404. Now the seller dashboard, which does.
    // '/mon-profil-freelance' is still a 404 and stays pinned here until H2/H3 give it a real page.
    expect(nextDestinationAfterVerify(null, 'shop_owner')).toBe('/tableau-de-bord-vendeur')
    expect(nextDestinationAfterVerify(null, 'freelancer')).toBe('/mon-profil-freelance')
  })
  it('falls back to home for a consumer-baseline account', () => {
    expect(nextDestinationAfterVerify(null, null)).toBe('/')
  })
})
