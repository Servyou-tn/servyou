/**
 * Walk 2026-11-02 #17 follow-up — Mon compte's phone helper: a seller (shop owner / freelancer) reads « Requis : … »
 * (the phone can't be cleared — sellerPhoneClearBlocked / enforce_seller_phone_not_cleared); a consumer keeps
 * « Optionnel — … ». FR + AR.
 */
import { describe, it, expect } from 'vitest'
import { accountPhoneHelperKey } from '@/lib/seller/account-phone-helper'
import { t } from '@/lib/i18n'

describe('accountPhoneHelperKey', () => {
  it.each([['shop_owner'], ['freelancer']])('a %s reads the « Requis » helper', (sellerType) => {
    expect(accountPhoneHelperKey({ seller_type: sellerType })).toBe('monCompte.field.phoneHelpSeller')
  })

  it.each([[null], [undefined], ['unknown']])('a consumer (seller_type %s) keeps « Optionnel »', (sellerType) => {
    expect(accountPhoneHelperKey({ seller_type: sellerType })).toBe('monCompte.field.phoneHelp')
  })

  it('the texts, FR and AR', () => {
    expect(t('monCompte.field.phoneHelpSeller', 'fr')).toBe('Requis : les clients vous contactent sur WhatsApp à ce numéro.')
    expect(t('monCompte.field.phoneHelpSeller', 'ar')).toBe('مطلوب: يتواصل معك العملاء عبر واتساب على هذا الرقم.')
    expect(t('monCompte.field.phoneHelp', 'fr')).toMatch(/^Optionnel/)
    expect(t('monCompte.field.phoneHelp', 'ar')).toMatch(/^اختياري/)
  })
})
