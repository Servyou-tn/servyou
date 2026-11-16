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

/** sessionStorage key holding the funnel's validated `?next=` across the same hop (read back through isValidInternalPath). */
export const SIGNUP_NEXT_KEY = 'servyou.signupNext'

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
  /** Post-verification (and OAuth) redirect. */
  destination: string
}

// Per-role config. minAge follows product.md (consumers 16+, sellers 18+). Since the two-step sign-up the birth date is
// asked at « Finalisez votre compte » (16+ for everyone, decision 4), and 18+ is checked at the seller switch
// (/devenir-vendeur, enforced in the database): the per-role age helper and error strings went with step 1's field.
// seller_type is still null at signup regardless of role.
export const ROLE_CONFIG: Record<SignupRole, RoleConfig> = {
  consumer: {
    minAge: MIN_SIGNUP_AGE,
    titleKey: 'signup.form.titles.consumer',
    destination: '/',
  },
  shopOwner: {
    minAge: MIN_SELLER_AGE,
    titleKey: 'signup.form.titles.shopOwner',
    destination: '/devenir-vendeur/boutique',
  },
  freelancer: {
    minAge: MIN_SELLER_AGE,
    titleKey: 'signup.form.titles.freelancer',
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
