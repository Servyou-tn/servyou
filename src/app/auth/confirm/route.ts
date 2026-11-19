import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { readNext } from '@/lib/auth/next-param'
import { CONTINUE_PATH, newLinkPath, parseConfirmParams, pathAfterConfirm, reasonForAuthError, type ConfirmInput } from '@/lib/auth/confirm-link'

// Where every e-mailed link lands (two-step sign-up, founder decision 1): the new-account link, the sign-in link sent to
// an existing account, and the « nouveau lien ». The link is verified HERE, on the server, and the session cookies are set
// on this response: it works on any device, unlike /verifier-email's browser-side PKCE exchange (plan §1).
//
// A template link (token_hash) is NOT spent on the GET: mail scanners and link previews open links, and a one-time hash
// they spend would read « expiré » to the person. The GET sends it to /inscription/confirmer, whose « Continuer » button
// POSTs it back here — the reset link does the same (NewPasswordForm). The POST must come from this origin, so another
// site cannot sign a visitor into an account of its choosing (login CSRF).
//
// Then: an incomplete account → « Finalisez votre compte »; a complete one → `next` (validated) or home; a failed link →
// « Recevoir un nouveau lien ». The decisions are in src/lib/auth/confirm-link.ts (tested).
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  const next = readNext(params.get('next') ?? undefined)
  const input = parseConfirmParams(params)
  if (input.kind === 'failed') return redirect(request, newLinkPath(input.reason, next))
  if (input.kind === 'token') {
    const target = new URLSearchParams({ token_hash: input.tokenHash, type: 'email' })
    if (next) target.set('next', next)
    return redirect(request, `${CONTINUE_PATH}?${target.toString()}`)
  }
  // A PKCE ?code= (GoTrue's default template) is safe to exchange at once: it needs this browser's own verifier cookie,
  // so a scanner cannot spend it and another site cannot use it.
  return verifyAndRoute(request, input, next)
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin')
  const form = await request.formData().catch(() => null)
  const params = new URLSearchParams()
  for (const key of ['token_hash', 'type', 'next']) {
    const value = form?.get(key)
    if (typeof value === 'string') params.set(key, value)
  }
  const next = readNext(params.get('next') ?? undefined)
  if (origin !== request.nextUrl.origin) {
    console.error('[auth/confirm] POST refused: cross-origin or no Origin header:', origin)
    return redirect(request, newLinkPath('invalide', next))
  }
  const input = parseConfirmParams(params)
  if (input.kind !== 'token') return redirect(request, newLinkPath(input.kind === 'failed' ? input.reason : 'invalide', next))
  return verifyAndRoute(request, input, next)
}

async function verifyAndRoute(request: NextRequest, input: Exclude<ConfirmInput, { kind: 'failed' }>, next: string | null) {
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
