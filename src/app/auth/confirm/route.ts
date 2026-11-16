import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { readNext } from '@/lib/auth/next-param'
import { newLinkPath, parseConfirmParams, pathAfterConfirm, reasonForAuthError } from '@/lib/auth/confirm-link'

// Where every e-mailed link lands (two-step sign-up, founder decision 1): the new-account link, the sign-in link sent to
// an existing account, and the « nouveau lien ». The link is verified HERE, on the server, and the session cookies are set
// on this response: it works on any device, unlike /verifier-email's browser-side PKCE exchange (plan §1).
//
// Then: an incomplete account → « Finalisez votre compte »; a complete one → `next` (validated) or home; a failed link →
// « Recevoir un nouveau lien ». The decisions are in src/lib/auth/confirm-link.ts (tested).
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  const next = readNext(params.get('next') ?? undefined)
  const input = parseConfirmParams(params)
  if (input.kind === 'failed') return redirect(request, newLinkPath(input.reason, next))

  const supabase = await createClient()
  const { data, error } =
    input.kind === 'token'
      ? await supabase.auth.verifyOtp({ type: 'email', token_hash: input.tokenHash })
      : await supabase.auth.exchangeCodeForSession(input.code)
  if (error || !data.user) {
    console.error('[auth/confirm] link verification failed:', error?.message, error?.code, error?.status)
    return redirect(request, newLinkPath(reasonForAuthError(error?.code), next))
  }

  // One owner-read PK lookup. Unreadable → the step-2 page, which reads it again and moves on if it is complete.
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('completed_at')
    .eq('id', data.user.id)
    .maybeSingle()
  if (profileError) {
    console.error('[auth/confirm] completed_at lookup error:', profileError.message, profileError.code, profileError.details)
  }
  const completed = profileError || !profile ? null : profile.completed_at !== null
  return redirect(request, pathAfterConfirm(completed, next))
}

// 303: the target is always fetched with GET. Same origin only (paths come from confirm-link.ts / readNext).
function redirect(request: NextRequest, path: string): NextResponse {
  return NextResponse.redirect(new URL(path, request.nextUrl.origin), 303)
}
