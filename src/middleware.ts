import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

// Platform-wide enforcement of the suspended state, and ONLY that. This middleware
// does not refresh sessions, does not duplicate the per-page login checks, and does
// no other auth work. On the happy path it reads cookies and passes through WITHOUT
// mutating them (no updateSession boilerplate — that would change session-refresh
// behavior platform-wide). Only the suspended branch writes to the response.
//
// A suspended, logged-in user hitting any matched (authenticated-only) route is
// signed out (sb-* auth cookies cleared) and redirected to /connexion?suspended=1, where
// a generic banner explains. Anonymous and active users sail through — their existing
// per-page checks handle "is the user logged in" for their own contexts.
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
  // security gate). Expired/absent session → no user → pass through as anonymous.
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.next()

  // One indexed PK lookup. Owner-read RLS lets the user read their own row's
  // suspended_at. Active (or unreadable) → pass through; only a confirmed
  // suspended_at bounces.
  const { data: profile } = await supabase
    .from('profiles')
    .select('suspended_at')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile || !profile.suspended_at) return NextResponse.next()

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
  // Closed-by-default allowlist of authenticated-only prefixes. /foo/:path* matches
  // the base /foo and its children. Public browse pages, the auth flows, and
  // /connexion (the bounce target — matching it would loop) are deliberately excluded.
  matcher: [
    '/admin/:path*',
    '/ma-boutique/:path*',
    '/mon-profil-freelance/:path*',
    '/mes-demandes/:path*',
    '/mes-favoris/:path*',
    '/mes-missions/:path*',
    '/mes-reponses/:path*',
    '/missions/:path*',
    '/profile/:path*',
    '/devenir-vendeur/:path*',
    '/poster-mission/:path*',
    '/demande/:path*',
    '/produit/:id/demande',
    '/service/:id/demande',
  ],
}
