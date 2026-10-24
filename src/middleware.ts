import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

// Platform-wide enforcement of the suspended state, and ONLY that. This middleware
// does not refresh sessions, does not duplicate the per-page login checks, and does
// no other auth work. On the happy path it reads cookies and passes through WITHOUT
// mutating them (no updateSession boilerplate — that would change session-refresh
// behavior platform-wide). Only the suspended branch writes to the response.
//
// A suspended, logged-in user hitting any matched route is signed out (sb-* auth
// cookies cleared) and redirected to /connexion?suspended=1, where a generic banner
// explains. Anonymous and active users sail through — their existing per-page checks
// handle "is the user logged in" for their own contexts. This is the session layer;
// the database refuses a suspended account's writes on its own (migration
// 20261024191215_suspension_enforcement), and the auth ban (src/lib/auth/auth-ban.ts)
// stops it signing in or refreshing.
export async function middleware(request: NextRequest) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        // Read-only: middleware does not refresh sessions. Intentional no-op.
        setAll() {},
      },
    },
  )

  // getUser() validates the JWT with the auth server (never trust getSession() for a
  // security gate). Expired/absent session → no user → pass through as anonymous. A
  // banned account — the auth half of a suspension — gets 403 user_banned here even
  // while its access token is unexpired, so that is a suspension too.
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError?.code === 'user_banned') return signOutSuspended(request)
  if (!user) return NextResponse.next()

  // One indexed PK lookup. Owner-read RLS lets the user read their own row's
  // suspended_at. Active (or unreadable) → pass through; only a confirmed
  // suspended_at bounces.
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('suspended_at')
    .eq('id', user.id)
    .maybeSingle()
  if (profileError) {
    console.error('[middleware] suspended_at lookup error:', profileError.message, profileError.code, profileError.details)
  }

  if (!profile || !profile.suspended_at) return NextResponse.next()
  return signOutSuspended(request)
}

function signOutSuspended(request: NextRequest): NextResponse {
  const redirectUrl = new URL('/connexion', request.url)
  redirectUrl.searchParams.set('suspended', '1')
  const response = NextResponse.redirect(redirectUrl)
  // Clear the Supabase auth cookies so the next request is unauthenticated.
  // The specific suspended_reason is NOT exposed to the user (privacy/dignity);
  // it is the admin's internal note, visible only on the admin user detail page.
  for (const cookie of request.cookies.getAll()) {
    if (cookie.name.startsWith('sb-')) {
      response.cookies.delete(cookie.name)
    }
  }
  return response
}

export const config = {
  // Everything EXCEPT static assets, the auth pages and the Sentry tunnel — open by
  // default, so a new route is covered the day it ships (the closed allowlist this
  // replaces had drifted: it missed /demander, /mes-commandes, /mon-compte, /parametres
  // and every dashboard). Excluded:
  //   * Next's build assets and image optimizer, and any path ending in a static-file
  //     extension (public/ assets, favicon, robots.txt, sitemap.xml);
  //   * /connexion — the bounce target, matching it would loop — and the other auth
  //     flows (/inscription, /mot-de-passe-oublie, /nouveau-mot-de-passe,
  //     /verifier-email, /auth/*);
  //   * /monitoring — next.config.ts's Sentry tunnelRoute.
  // Each excluded page segment is anchored to "/" or the end, so /connexion-x is still
  // matched. Pinned by src/__tests__/middleware-suspension.test.ts.
  matcher: [
    '/((?!_next/static/|_next/image(?:/|$)|(?:connexion|inscription|mot-de-passe-oublie|nouveau-mot-de-passe|verifier-email|auth|monitoring)(?:/|$)|.*\\.(?:ico|png|jpe?g|gif|webp|avif|svg|txt|xml|webmanifest|woff2?|ttf|otf|map)$).*)',
  ],
}
