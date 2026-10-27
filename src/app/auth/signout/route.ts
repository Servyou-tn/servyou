import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Signs out and lands on K1 « À bientôt » (/a-bientot). 303, not the 307 redirect() would send: this is
// reached by a POST form, and 307 would replay the POST against the page.
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  await supabase.auth.signOut()
  return NextResponse.redirect(new URL('/a-bientot', request.url), 303)
}
