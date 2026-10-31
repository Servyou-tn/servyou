import { createAdminClient } from '@/lib/supabase/admin'
import type { ProvenanceBucket } from './provenance'

// The rolling 24-hour upload cap per account (pre-beta review M3; enforced in the database by
// trg_limit_daily_uploads on uploaded_objects, hint daily_upload_cap). Product images, portfolio and avatars count;
// shop-assets (one logo + one banner per shop) do not, as ruled.
//
// The upload actions call this BEFORE decoding or storing anything, so a refused upload leaves no orphan file: the
// trigger refuses the provenance row only AFTER the bytes are stored, which is the backstop for a concurrent burst,
// not the normal refusal. Counted with the service role, like the provenance rows themselves (uploaded_objects
// denies SELECT to clients by design).
export const DAILY_UPLOAD_CAP = 100
const CAPPED_BUCKETS: readonly ProvenanceBucket[] = ['product-images', 'portfolio-media', 'avatars']

export type UploadQuota = { ok: true; reached: boolean } | { ok: false }

export async function dailyUploadQuota(ownerId: string): Promise<UploadQuota> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { count, error } = await createAdminClient()
    .from('uploaded_objects')
    .select('id', { count: 'exact', head: true })
    .eq('owner_id', ownerId)
    .in('bucket', [...CAPPED_BUCKETS])
    .gt('created_at', since)
  if (error) {
    console.error('[dailyUploadQuota] count failed:', error.message, error.code, error.details)
    return { ok: false }
  }
  return { ok: true, reached: (count ?? 0) >= DAILY_UPLOAD_CAP }
}
