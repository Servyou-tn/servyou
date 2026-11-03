import { roleConfig, type SignupRole } from './signup-role'
import type { SellerType } from './layout/select-variant'
import { roleWorkspacePath } from './roles'
import { isValidInternalPath } from './internal-path'

// Where to send a user after their email is verified (the State-2 "Continuer").
// A safe `next` carried from /connexion?next= through the sign-up funnel wins (the visitor came to order a product, say — send them
// back to it). Otherwise prefer the signup role intent carried in sessionStorage; if it is absent — the
// link was opened on a different device than signup — fall back to the actual
// profile.seller_type. At first verification seller_type is null (consumer
// baseline), so the fallback normally lands on "/".
export function nextDestinationAfterVerify(
  role: SignupRole | null,
  sellerType: SellerType,
  next?: string | null,
): string {
  if (next && isValidInternalPath(next)) return next
  if (role) return roleConfig(role).destination
  return roleWorkspacePath(sellerType)
}
