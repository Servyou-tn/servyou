import { AuthShell } from '@/components/auth/AuthShell'
import { SignupForm } from '../components/SignupForm'

// Step 2 — the "Freelance" signup form. Thin server wrapper: the role brands the
// title and routes to /devenir-freelance after email verification. The account is
// still created consumer-baseline (seller_type = null); becoming a freelancer
// happens later at /devenir-freelance (18+ gate enforced there).
export default function FreelancerSignupPage() {
  return (
    <AuthShell maxWidthClass="max-w-[560px]">
      <SignupForm role="freelancer" />
    </AuthShell>
  )
}
