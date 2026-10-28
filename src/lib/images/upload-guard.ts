import type { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import type { ProvenanceBucket } from '@/lib/images/provenance'
import { reportQueryError } from '@/lib/supabase/query-error'

// S-3 (docs/follow-ups.md « storage provenance missing for avatars and shop assets »): clients can no
// longer INSERT into the four public image buckets, so every app upload writes its bytes through the
// service role -- after normalize.ts, never raw. The service role skips storage RLS entirely, which
// used to do two jobs the upload actions now own, BEFORE any byte is stored:
//   * folder ownership -- the path's first segment must come from server-side identity (user.id, or a
//     shop / freelancer profile re-read with owner = user.id), never from the client;
//   * suspension -- the RESTRICTIVE « Suspended accounts cannot upload » policy no longer applies, and a
//     suspended user's session JWT stays valid until it expires, so isCallerActive() is checked first.

type SessionClient = Awaited<ReturnType<typeof createClient>>

// The caller's own is_active_user() (EXECUTE: authenticated), tri-state so a caller can tell a failed
// check from a suspended account (loader-error-surfacing PR-2): both refuse the upload, but only
// 'inactive' may say « suspended ».
export type CallerActivity = 'active' | 'inactive' | 'error'

export async function callerActivity(supabase: SessionClient): Promise<CallerActivity> {
  const { data, error } = await supabase.rpc('is_active_user')
  if (error) {
    reportQueryError('is_active_user', error)
    return 'error'
  }
  return data === true ? 'active' : 'inactive'
}

// Fails closed: an error is "not active".
export async function isCallerActive(supabase: SessionClient): Promise<boolean> {
  return (await callerActivity(supabase)) === 'active'
}

// The one storage handle the upload actions write new objects through. Reads of public URLs and deletes
// of old objects stay on the user's session client (the owner read / delete policies remain).
export function uploadBucket(bucket: ProvenanceBucket) {
  return createAdminClient().storage.from(bucket)
}
