// The role a visitor picks at /inscription (Step 1) and carries into the Step-2
// form. This is pure UI intent: it brands the form title and decides where the
// user lands after verifying their email. It is NEVER written to the database —
// the handle_new_user trigger always creates accounts with seller_type = null
// (consumer baseline). Real role conversion happens later at /devenir-vendeur
// and /devenir-freelance. See docs/audits/auth-migration-audit.md.
export type SignupRole = 'consumer' | 'shopOwner' | 'freelancer'

/** sessionStorage key holding the chosen role across the signup → verify hop. */
export const SIGNUP_ROLE_KEY = 'servyou.signupRole'

/** Narrow an arbitrary sessionStorage value back to a SignupRole (or null). */
export function asSignupRole(value: string | null | undefined): SignupRole | null {
  return value === 'consumer' || value === 'shopOwner' || value === 'freelancer'
    ? value
    : null
}

/** Where each role lands after verifying their email (and after OAuth, later). */
export function roleDestination(role: SignupRole | null): string {
  switch (role) {
    case 'shopOwner':
      return '/devenir-vendeur'
    case 'freelancer':
      return '/devenir-freelance'
    default:
      return '/'
  }
}
