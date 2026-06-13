import { AuthShell } from '@/components/auth/AuthShell'
import { SignupForm } from '../components/SignupForm'

// Step 2 — the "Acheter" (consumer) signup form. Thin server wrapper: the chrome
// is AuthShell, the role brands the title and the post-verification redirect. The
// account is created consumer-baseline (seller_type = null) regardless of role.
export default function ConsumerSignupPage() {
  return (
    <AuthShell maxWidthClass="max-w-[560px]">
      <SignupForm role="consumer" />
    </AuthShell>
  )
}
