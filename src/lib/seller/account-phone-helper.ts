import { resolveRole } from '@/lib/roles'

// Mon compte's phone helper text (walk #17 follow-up): a seller — shop owner or freelancer — reads « Requis : … »,
// because buyers reach them on WhatsApp through the number and clearing it is refused (sellerPhoneClearBlocked,
// trigger enforce_seller_phone_not_cleared); a consumer keeps « Optionnel — … ». Pure and client-safe: MonCompteForm
// is a client component.
export type AccountPhoneHelperKey = 'monCompte.field.phoneHelp' | 'monCompte.field.phoneHelpSeller'

export function accountPhoneHelperKey(profile: { seller_type?: string | null }): AccountPhoneHelperKey {
  return resolveRole(profile) === null ? 'monCompte.field.phoneHelp' : 'monCompte.field.phoneHelpSeller'
}
