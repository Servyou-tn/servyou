import { roleConfig, type SignupRole } from './signup-role'
import type { SellerType } from './layout/select-variant'
import { roleWorkspacePath } from './roles'

// Where to send a user after their email is verified (the State-2 "Continuer").
// Prefer the signup role intent carried in sessionStorage; if it is absent — the
// link was opened on a different device than signup — fall back to the actual
// profile.seller_type. At first verification seller_type is null (consumer
// baseline), so the fallback normally lands on "/".
export function nextDestinationAfterVerify(
  role: SignupRole | null,
  sellerType: SellerType,
): string {
  if (role) return roleConfig(role).destination
  return roleWorkspacePath(sellerType)
}
