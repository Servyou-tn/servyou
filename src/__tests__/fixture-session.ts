/**
 * Signs a live-suite fixture in WITHOUT the password grant, so the suites keep working once Supabase Auth's
 * CAPTCHA protection is on (it guards /token?grant_type=password, /signup, /recover, /resend, /otp — every one
 * of them would need a real Turnstile token, which a test cannot produce against the production secret).
 *
 * The path: the service role mints a magic-link token for the fixture (POST /admin/generate_link — admin, never
 * CAPTCHA-checked, sends no email), then the fixture's OWN anon client redeems it (POST /verify — not
 * CAPTCHA-checked). The client ends up with an ordinary authenticated session for that user, exactly what
 * signInWithPassword gave it: every RLS assertion still runs as the user, never as the service role.
 *
 * Drop-in for `client.auth.signInWithPassword({ email, password })`: same client in, same `{ error }` out.
 * Never disable CAPTCHA on production for tests (founder ruling, 2026-10-30).
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let admin: SupabaseClient | null = null

function serviceClient(): SupabaseClient {
  admin ??= createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  return admin
}

export async function fixtureSignIn(
  client: Pick<SupabaseClient, 'auth'>,
  email: string,
): Promise<{ error: { message: string } | null }> {
  const { data, error } = await serviceClient().auth.admin.generateLink({ type: 'magiclink', email })
  const tokenHash = data?.properties?.hashed_token
  if (error || !tokenHash) return { error: { message: `generateLink: ${error?.message ?? 'no hashed_token'}` } }
  const { data: verified, error: verifyError } = await client.auth.verifyOtp({ type: 'email', token_hash: tokenHash })
  if (verifyError || !verified.session) return { error: { message: `verifyOtp: ${verifyError?.message ?? 'no session'}` } }
  return { error: null }
}
