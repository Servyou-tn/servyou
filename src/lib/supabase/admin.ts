import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// service_role client -- bypasses RLS entirely. Per CLAUDE.md: "No client-side service_role
// Supabase client. Service role only in server actions and admin endpoints." Every caller of this
// MUST be inside a 'use server' module.
//
// First consumer: src/lib/images/provenance.ts. `uploaded_objects` denies INSERT/SELECT to both
// anon and authenticated by design (see db/migrations/20260903143928_uploaded_objects_provenance_gate.sql)
// -- the ordinary `owner_id = auth.uid()` RLS pattern is deliberately NOT used there, because it
// would let the exact attacker the table defends against forge their own provenance row. Only a
// service_role client can write to it.
//
// Not session-aware and not for user-scoped reads -- it sees every row in every table regardless of
// who is asking. Do not reach for this where the caller's own session client (src/lib/supabase/
// server.ts) already works; RLS enforcing the caller's real permissions is the point, not overhead
// to route around.
export function createAdminClient(): SupabaseClient {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
