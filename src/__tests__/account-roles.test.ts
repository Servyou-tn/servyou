import { describe, it, expect } from 'vitest'
import { accountRoles, accountRoleI18nKey, parseAccountRole, ACCOUNT_ROLES } from '@/lib/roles'
import { t } from '@/lib/i18n'

describe('accountRoles — every role of an account (admin users list)', () => {
  it('an admin who owns a shop is Administrateur AND Boutique', () => {
    expect(accountRoles({ is_admin: true, seller_type: 'shop_owner' })).toEqual(['admin', 'shop_owner'])
  })

  it('an admin freelancer is Administrateur AND Freelance', () => {
    expect(accountRoles({ is_admin: true, seller_type: 'freelancer' })).toEqual(['admin', 'freelancer'])
  })

  it('an admin with no seller role is Administrateur only (not Consommateur)', () => {
    expect(accountRoles({ is_admin: true, seller_type: null })).toEqual(['admin'])
  })

  it('a seller is just their seller role', () => {
    expect(accountRoles({ is_admin: false, seller_type: 'shop_owner' })).toEqual(['shop_owner'])
    expect(accountRoles({ is_admin: false, seller_type: 'freelancer' })).toEqual(['freelancer'])
  })

  it('no role at all (or an unknown seller_type) is Consommateur', () => {
    expect(accountRoles({ is_admin: false, seller_type: null })).toEqual(['consumer'])
    expect(accountRoles({ seller_type: 'something-else' })).toEqual(['consumer'])
    expect(accountRoles({})).toEqual(['consumer'])
  })
})

describe('parseAccountRole — the ?role= filter', () => {
  it('accepts the four roles', () => {
    for (const role of ACCOUNT_ROLES) expect(parseAccountRole(role)).toBe(role)
  })

  it('anything else means « all »', () => {
    expect(parseAccountRole(undefined)).toBeNull()
    expect(parseAccountRole('')).toBeNull()
    expect(parseAccountRole('ADMIN')).toBeNull()
    expect(parseAccountRole('superadmin')).toBeNull()
    expect(parseAccountRole(['admin', 'consumer'])).toBeNull()
  })
})

describe('accountRoleI18nKey', () => {
  it('every role has an FR and an AR label', () => {
    for (const role of ACCOUNT_ROLES) {
      const key = accountRoleI18nKey(role)
      expect(t(key, 'fr')).not.toBe(key)
      expect(t(key, 'ar')).not.toBe(key)
    }
  })
})
