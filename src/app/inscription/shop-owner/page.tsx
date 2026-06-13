import { AuthShell } from '@/components/auth/AuthShell'
import { SignupForm } from '../components/SignupForm'

// Step 2 — the "Vendre" (shop owner) signup form. Thin server wrapper: the role
// brands the title and routes to /devenir-vendeur after email verification. The
// account is still created consumer-baseline (seller_type = null); becoming a
// shop owner happens later at /devenir-vendeur (18+ gate enforced there).
export default function ShopOwnerSignupPage() {
  return (
    <AuthShell maxWidthClass="max-w-[560px]">
      <SignupForm role="shopOwner" />
    </AuthShell>
  )
}
