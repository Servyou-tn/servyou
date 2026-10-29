import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Signs out and lands on K1 « À bientôt » (/a-bientot). 303, not the 307 redirect() would send: this is
// reached by a POST form, and 307 would replay the POST against the page.
//
// The sb-* cookies are deleted on the response whatever signOut() answers (pre-launch audit pass 3): on a GoTrue
// 5xx or a network error, auth-js returns before removing the session, and the user would land on « À bientôt »
// still signed in — on a shared phone or PC. Same cookie sweep as the middleware's suspended-account sign-out.
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { error } = await supabase.auth.signOut()
  if (error) {
    console.error('[signout] signOut failed, clearing the session cookies anyway:', error.message, error.code, error.status)
  }
  const response = NextResponse.redirect(new URL('/a-bientot', request.url), 303)
  for (const cookie of request.cookies.getAll()) {
    if (cookie.name.startsWith('sb-')) response.cookies.delete(cookie.name)
  }
  return response
}
