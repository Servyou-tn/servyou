import { createAdminClient } from '@/lib/supabase/admin'

// The four buckets a provenance row can ever be written for -- matches the four upload actions
// (uploadAvatarAction, uploadProductImageAction, uploadShopAsset, updateShopAsset) and the four
// buckets created in 20260731073614_storage_buckets_and_policies. portfolio-media and verifications
// have no writer yet and are deliberately excluded until one ships.
export type ProvenanceBucket = 'avatars' | 'product-images' | 'shop-assets'

export type RecordProvenanceResult = { ok: true } | { ok: false; error: string }

// Records that `ownerId` uploaded `path` in `bucket` through this app's own normalize + upload
// pipeline. This is the ONLY thing that lets `enforce_product_image_provenance()` (the DB trigger
// on product_images) tell a validated upload apart from an object a caller PUT directly into
// storage under their own permitted prefix -- bypassing normalizeProductImage's decode/re-encode
// gate entirely. See the migration's own table comment for why this uses service_role rather than
// the caller's session client: an `owner_id = auth.uid()` insert here would let a caller
// self-certify the very thing this table exists to verify independently.
//
// ⚑ CALL THIS, AWAIT IT, AND CHECK `ok` BEFORE THE NEXT WRITE THAT PUBLISHES THIS PATH ANYWHERE
// (a profiles/shops column update, or -- one call removed, in a different action -- a
// product_images insert). A refactor that fires this in parallel with that write (Promise.all or
// similar) reopens the exact race the ordering exists to close: the trigger's SELECT could run
// before this INSERT is visible, so a legitimate upload would randomly fail the same check that is
// supposed to catch only forged paths.
export async function recordUploadProvenance(
  bucket: ProvenanceBucket,
  path: string,
  ownerId: string,
): Promise<RecordProvenanceResult> {
  const admin = createAdminClient()
  const { error } = await admin.from('uploaded_objects').insert({ bucket, path, owner_id: ownerId })
  if (error) {
    console.error(`[recordUploadProvenance] insert failed for ${bucket}/${path}:`, error.message, error.code, error.details)
    return { ok: false, error: error.message }
  }
  return { ok: true }
}

// Best-effort cleanup for a compensating-delete site: the storage object at `bucket`/`path` is
// ALSO being removed at the call site (see uploadAvatarAction / uploadShopAsset / updateShopAsset),
// so its provenance row would otherwise strand pointing at nothing. Log-and-continue, matching
// every other compensating-delete site in this codebase (sweepAvatarFolder, updateShopAsset's
// old-object cleanup): never throws, because the caller has already decided to fail the action for
// its own reason, and a failed cleanup here should not overwrite or block that.
export async function deleteUploadProvenance(bucket: ProvenanceBucket, path: string): Promise<void> {
  const admin = createAdminClient()
  const { error } = await admin.from('uploaded_objects').delete().eq('bucket', bucket).eq('path', path)
  if (error) {
    console.error(`[deleteUploadProvenance] delete failed for ${bucket}/${path}:`, error.message, error.code)
  }
}
