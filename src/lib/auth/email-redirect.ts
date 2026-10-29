// Where Supabase's sign-up confirmation email sends the user: /verifier-email on the SAME origin the user signed up
// from. Passed as `emailRedirectTo` by SignupForm (signUp) and VerifyEmailFlow (resend).
//
// Without it GoTrue uses the project's Site URL, which was still http://localhost:3000 until 2026-10-29 (pre-launch
// audit pass 3, founder action A1), so production confirmation links pointed at localhost. GoTrue only honours a
// redirect that is on the dashboard's Redirect URLs allow list (prod + localhost /verifier-email); for any other
// origin (a Vercel preview) it falls back to the Site URL — production — so this can never send a link anywhere
// unlisted.

export const VERIFY_EMAIL_PATH = '/verifier-email'

export function verifyEmailRedirectUrl(origin: string): string {
  return `${origin.replace(/\/+$/, '')}${VERIFY_EMAIL_PATH}`
}
