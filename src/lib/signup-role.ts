import { MIN_SIGNUP_AGE, MIN_SELLER_AGE } from './signup-validation'

// The role a visitor picks at /inscription (Step 1) and carries into the Step-2
// form. This is pure UI intent: it brands the form title, sets the client-side
// signup age gate, and decides where the user lands after verifying their email.
// It is NEVER written to the database — the handle_new_user trigger always creates
// accounts with seller_type = null (consumer baseline). Real role conversion happens later
// at /devenir-vendeur/boutique or /devenir-vendeur/freelance (which enforce 18+ in the DB) —
// landing straight on the pitch page since the visitor already picked a role here.
// See docs/audits/auth-migration-audit.md.
export type SignupRole = 'consumer' | 'shopOwner' | 'freelancer'

/** sessionStorage key holding the chosen role across the signup → verify hop. */
export const SIGNUP_ROLE_KEY = 'servyou.signupRole'

/** Narrow an arbitrary sessionStorage value back to a SignupRole (or null). */
export function asSignupRole(value: string | null | undefined): SignupRole | null {
  return value === 'consumer' || value === 'shopOwner' || value === 'freelancer'
    ? value
    : null
}

export interface RoleConfig {
  /** Client-side signup age gate (product.md: consumers 16+, sellers 18+). */
  minAge: number
  /** i18n key for the role-branded Step-2 title. */
  titleKey: string
  /** i18n key for the date-of-birth helper text. */
  ageHelperKey: string
  /** i18n key for the under-age error. */
  ageErrorKey: string
  /** Post-verification (and OAuth) redirect. */
  destination: string
}

// Per-role config. minAge follows product.md: a 17-year-old who picks "Vendre" is
// blocked at signup rather than signing up then failing the 18+ check later at
// /devenir-vendeur. seller_type is still null at signup regardless of role.
export const ROLE_CONFIG: Record<SignupRole, RoleConfig> = {
  consumer: {
    minAge: MIN_SIGNUP_AGE,
    titleKey: 'signup.form.titles.consumer',
    ageHelperKey: 'signup.form.fields.dateOfBirth.helper.consumer',
    ageErrorKey: 'signup.form.errors.tooYoung.consumer',
    destination: '/',
  },
  shopOwner: {
    minAge: MIN_SELLER_AGE,
    titleKey: 'signup.form.titles.shopOwner',
    ageHelperKey: 'signup.form.fields.dateOfBirth.helper.shopOwner',
    ageErrorKey: 'signup.form.errors.tooYoung.shopOwner',
    destination: '/devenir-vendeur/boutique',
  },
  freelancer: {
    minAge: MIN_SELLER_AGE,
    titleKey: 'signup.form.titles.freelancer',
    ageHelperKey: 'signup.form.fields.dateOfBirth.helper.freelancer',
    ageErrorKey: 'signup.form.errors.tooYoung.freelancer',
    destination: '/devenir-vendeur/freelance',
  },
}

export function roleConfig(role: SignupRole): RoleConfig {
  return ROLE_CONFIG[role]
}

/** Where each role lands after verifying their email (and after OAuth, later).
 *  Tolerates null (e.g. an unknown stored role) → home. */
export function roleDestination(role: SignupRole | null): string {
  return role ? ROLE_CONFIG[role].destination : '/'
}
