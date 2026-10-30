import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { AUTH_COOKIE_OPTIONS } from '@/lib/supabase/cookie-options'

// Platform-wide session layer: session-refresh persistence, maintenance mode (K4), suspension (K3) and
// an expired session (K2), and nothing else. It does not duplicate the per-page login checks.
//
// Session refresh (the @supabase/ssr pattern): getUser() / getSession() refresh a session within ~90 s
// of expiry, and refresh tokens ROTATE. setAll() writes the rotated tokens twice: onto the REQUEST, so
// the Server Components and actions of this same request read the new session instead of refreshing
// again (their own setAll cannot write cookies), and onto the RESPONSE, so the browser keeps them.
// Before this, the rotation was thrown away: every later request re-refreshed the same, already-used
// refresh token — extra /token calls from Vercel's shared egress IPs, and, past GoTrue's reuse
// interval, reuse detection that revokes the whole session (a random logout). On the happy path (no
// refresh) nothing is written and the response is a plain pass-through.
//
// K4 — MAINTENANCE_MODE=1 (env var, so it works while the database is the thing under maintenance
// and costs no query): every matched GET is redirected to /maintenance and every other method gets
// a 503, BEFORE any auth round-trip. Toggling needs a redeploy. The auth pages and /maintenance
// itself are outside the matcher, so there is no loop.
//
// K3 — a suspended, logged-in user hitting any matched route is signed out (sb-* auth cookies
// cleared) and redirected to /compte-suspendu (K3), which is generic: the suspended_reason is the
// admin's internal note and is never shown. /connexion?suspended=1 and SigninForm's user_banned path
// still show their banner. Anonymous and active users sail through — their existing per-page checks
// handle "is the user logged in" for their own contexts. This is the session layer; the database
// refuses a suspended account's writes on its own (migration 20261024191215_suspension_enforcement),
// and the auth ban (src/lib/auth/auth-ban.ts) stops it signing in or refreshing.
//
// K2 — a visitor who still carries a Supabase auth cookie whose session can no longer be validated
// or refreshed is sent to /session-expiree?next=<page> with the cookies cleared. An expired ACCESS
// token with a valid refresh token is refreshed (and persisted) — this only fires once the refresh
// itself fails. Strictly gated so it can never hit a plain anonymous
// visitor or an auth outage: an auth cookie must be present (not just the PKCE code-verifier), the
// error code must be one of SESSION_GONE_CODES (a network error / 5xx carries none of them and
// passes through), and only GETs are redirected (a server action's POST fails its own auth check).

// Codes GoTrue / supabase-js answer when the session behind the cookie is gone for good. Measured
// read-only against the live project with forged cookies: an expired token with an unknown refresh
// token → refresh_token_not_found; an unexpired token with a bad signature → bad_jwt (403); no cookie
// or an unparsable one → AuthSessionMissingError with NO code (passes through). Deliberately absent:
// refresh_token_already_used — parallel requests (an RSC navigation plus its prefetches) can carry the
// same refresh token just as one of them rotates it, so a valid session can legitimately hit it; a
// redirect there would log it out.
const SESSION_GONE_CODES = new Set([
  'session_expired',
  'session_not_found',
  'refresh_token_not_found',
  'bad_jwt',
  'user_not_found',
])

// sb-<project-ref>-auth-token, optionally chunked as .0 / .1 …; NOT -code-verifier.
const AUTH_COOKIE = /^sb-.+-auth-token(\.\d+)?$/

// The Supabase client of one middleware run, and the pass-through response it writes a refresh onto.
// `pass()` is read AFTER the auth call: setAll() replaces the response so it carries the forwarded
// request cookies (NextResponse.next({ request })) as well as the Set-Cookie headers.
function sessionClient(request: NextRequest) {
  let response = NextResponse.next({ request })
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      // #257's Secure flag in production — the refreshed cookies get the same options as sign-in's.
      cookieOptions: AUTH_COOKIE_OPTIONS,
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet, headers) {
          // Persist a NEW session only. A removal-only write is supabase-js dropping the session after a
          // failed refresh: ignored, as before this change — K2 below owns clearing a gone session, gated
          // so an outage or a refresh race never logs anyone out.
          if (!cookiesToSet.some(({ value }) => value)) return
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
          // @supabase/ssr's no-store cache headers: a response carrying a session must never be cached.
          Object.entries(headers ?? {}).forEach(([key, value]) => response.headers.set(key, value))
        },
      },
    },
  )
  return { supabase, pass: () => response }
}

export async function middleware(request: NextRequest) {
  // Link prefetches skip the suspension / K2 checks (founder ruling 2026-10-24): every Next prefetch
  // sends next-router-prefetch and no navigation does, there is one per visible <Link>, they only
  // read, and the navigation that follows is checked. The header is client-set, so GET only — a
  // server-action POST never skips — and a forged header on a GET buys a read the API would serve that
  // token anyway. They still get the session refresh, via getSession(): local (no Auth call) unless
  // the access token is about to expire. Without it, a prefetch after expiry renders its Server
  // Components with the expired session, they refresh and cannot persist it, and the browser keeps a
  // refresh token GoTrue has already rotated.
  if (request.method === 'GET' && request.headers.has('next-router-prefetch')) {
    if (!request.cookies.getAll().some((c) => AUTH_COOKIE.test(c.name))) return NextResponse.next()
    const { supabase, pass } = sessionClient(request)
    await supabase.auth.getSession()
    return pass()
  }

  if (process.env.MAINTENANCE_MODE === '1') {
    if (request.method !== 'GET') {
      return new NextResponse('Service en maintenance', { status: 503, headers: { 'Retry-After': '300' } })
    }
    return NextResponse.redirect(new URL('/maintenance', request.url))
  }

  const { supabase, pass } = sessionClient(request)

  // getUser() validates the JWT with the auth server (never trust getSession() for a
  // security gate). Expired/absent session → no user → pass through as anonymous. A
  // banned account — the auth half of a suspension — gets 403 user_banned here even
  // while its access token is unexpired, so that is a suspension too.
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError?.code === 'user_banned') return signOutSuspended(request)
  if (!user) {
    const hasAuthCookie = request.cookies.getAll().some((c) => AUTH_COOKIE.test(c.name))
    // Page navigations only (HTML or an RSC fetch): a JSON/fetch GET keeps getting its own 401 instead
    // of an HTML redirect it cannot parse.
    const isNavigation = (request.headers.get('accept') ?? '').includes('text/html') || request.headers.has('rsc')
    if (hasAuthCookie && request.method === 'GET' && isNavigation && userError?.code && SESSION_GONE_CODES.has(userError.code)) {
      return sessionExpired(request)
    }
    return pass()
  }

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

  if (!profile || !profile.suspended_at) return pass()
  return signOutSuspended(request)
}

function clearAuthCookies(request: NextRequest, response: NextResponse): NextResponse {
  for (const cookie of request.cookies.getAll()) {
    if (cookie.name.startsWith('sb-')) {
      response.cookies.delete(cookie.name)
    }
  }
  return response
}

function signOutSuspended(request: NextRequest): NextResponse {
  // Clear the Supabase auth cookies so the next request is unauthenticated.
  // The specific suspended_reason is NOT exposed to the user (privacy/dignity);
  // it is the admin's internal note, visible only on the admin user detail page.
  return clearAuthCookies(request, NextResponse.redirect(new URL('/compte-suspendu', request.url)))
}

function sessionExpired(request: NextRequest): NextResponse {
  const redirectUrl = new URL('/session-expiree', request.url)
  const { pathname, search } = request.nextUrl
  if (pathname !== '/') redirectUrl.searchParams.set('next', pathname + search)
  return clearAuthCookies(request, NextResponse.redirect(redirectUrl))
}

export const config = {
  // Everything EXCEPT static assets, the auth pages and the Sentry tunnel — open by
  // default, so a new route is covered the day it ships (the closed allowlist this
  // replaces had drifted: it missed /demander, /mes-commandes, /mon-compte, /parametres
  // and every dashboard). Excluded:
  //   * Next's build assets and image optimizer, and a static-file extension only where
  //     public/ assets live — a root-level file (favicon, the root SVGs, robots.txt,
  //     sitemap.xml) or anything under /brand/. A dotted dynamic segment such as
  //     /admin/utilisateurs/x.png is a page and a server-action endpoint, so it stays matched;
  //   * /connexion — the bounce target, matching it would loop — and the other auth
  //     flows (/inscription, /mot-de-passe-oublie, /nouveau-mot-de-passe,
  //     /verifier-email, /auth/*), and the four K system pages (/a-bientot,
  //     /session-expiree, /compte-suspendu, /maintenance): they are bounce targets too;
  //   * /monitoring — next.config.ts's Sentry tunnelRoute.
  // Each excluded page segment is anchored to "/" or the end, so /connexion-x is still
  // matched. Pinned by src/__tests__/middleware-suspension.test.ts.
  matcher: [
    '/((?!_next/static/|_next/image(?:/|$)|(?:connexion|inscription|mot-de-passe-oublie|nouveau-mot-de-passe|verifier-email|auth|a-bientot|session-expiree|compte-suspendu|maintenance|monitoring)(?:/|$)|(?:[^/]+|brand/.+)\\.(?:ico|png|jpe?g|gif|webp|avif|svg|txt|xml|webmanifest|woff2?|ttf|otf|map)$).*)',
  ],
}
