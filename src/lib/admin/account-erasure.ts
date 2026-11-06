import { createAdminClient } from '@/lib/supabase/admin'
import { SUSPENSION_BAN_DURATION } from '@/lib/auth/auth-ban'

// The auth + storage half of an approved account deletion (docs/discovery/admin-requests-backend.md D2).
//
// admin_process_deletion_request (migrations 20261106074610 + 20261106083409) commits FIRST: the profile becomes a
// tombstone (full_name « Compte supprimé », e-mail supprime-<id>@deleted.servyou.invalid, suspended), its lists and
// listings are deleted or hidden, and the request reads « approved ». The database cannot reach auth.users or Storage, so
// this module finishes the job with the service role:
//   1. guard  — the profile IS a tombstone, or nothing below runs (fail closed: never ban or wipe a live account);
//   2. auth   — the auth e-mail becomes the tombstone e-mail (GoTrue also rewrites the e-mail identity), every
//               user_metadata key is removed (full_name, date_of_birth, city, email…), and the account is banned for
//               100 years: sign-in and token refresh are refused. An access token issued before the ban can still READ
//               until it expires (≤ 3600 s, auth-ban.ts); every write is already refused (the profile is suspended).
//               An OAuth identity (Google) keeps its own identity_data, which no admin API rewrites or removes: the
//               run then ends 'identity_left' — files and rows still erased, never reported done
//               (docs/follow-ups/admin-deletion-auth.md #0);
//   3. files  — every object the person uploaded is removed from Storage, then its uploaded_objects row;
//   4. rows   — product_images rows of the person's products (hidden ones kept for orders) go: they point at the
//               removed files.
//
// Every step is idempotent and re-derives its work from the database, so a retry after a failure part-way finishes the
// rest: a file removed twice is not an error, the provenance rows are deleted only after their files, the image rows
// last. Nothing personal is logged: user ids, bucket names, counts and error messages only.
//
// Service role (src/lib/supabase/admin.ts): callers MUST be 'use server' admin actions that already passed checkAdmin().
// Deliberately NOT a 'use server' module — every export of one becomes a callable endpoint.

export const TOMBSTONE_NAME = 'Compte supprimé'

export function tombstoneEmail(userId: string): string {
  return `supprime-${userId}@deleted.servyou.invalid`
}

/** Every bucket a person's file can live in. `verifications` has no writer yet; swept anyway (per-user folder). */
export const ERASABLE_BUCKETS = ['avatars', 'product-images', 'shop-assets', 'portfolio-media', 'verifications'] as const
type Bucket = (typeof ERASABLE_BUCKETS)[number]

export type ErasureStep = 'guard' | 'auth' | 'files' | 'rows'

export type ErasureResult =
  | { ok: true; filesRemoved: number; imageRowsRemoved: number }
  /** identity_left: an OAuth identity (Google) still holds the real e-mail / name in auth.identities — the admin API
   * cannot remove it (docs/follow-ups/admin-deletion-auth.md #0). Files and rows ARE erased; the run is not « done ». */
  | { ok: false; step: ErasureStep; reason: 'not_tombstoned' | 'not_found' | 'failed' | 'identity_left' }

type Admin = ReturnType<typeof createAdminClient>

const REMOVE_CHUNK = 100
const IN_CHUNK = 200
const LIST_LIMIT = 1000
const MAX_DEPTH = 3

function thrown(e: unknown): string {
  return e instanceof Error ? e.message : String(e)
}

function chunks<T>(items: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size))
  return out
}

/** The object path inside `product-images` of a stored public URL, or null (same marker as src/app/actions/products.ts). */
export function productImagePath(imageUrl: string): string | null {
  const marker = '/object/public/product-images/'
  const at = imageUrl.indexOf(marker)
  if (at === -1) return null
  const path = decodeURIComponent(imageUrl.slice(at + marker.length).split('?')[0])
  return path.length > 0 ? path : null
}

async function isTombstone(admin: Admin, userId: string): Promise<'yes' | 'no' | 'not_found' | 'failed'> {
  const { data, error } = await admin.from('profiles').select('full_name, email, suspended_at').eq('id', userId).maybeSingle()
  if (error) {
    console.error(`[account-erasure] guard lookup failed for ${userId}:`, error.message, error.code, error.details)
    return 'failed'
  }
  if (!data) return 'not_found'
  const ok = data.full_name === TOMBSTONE_NAME && data.email === tombstoneEmail(userId) && data.suspended_at !== null
  return ok ? 'yes' : 'no'
}

// 'residual': done, but a non-e-mail identity (OAuth) keeps its own identity_data, which updateUserById never rewrites.
async function eraseAuth(admin: Admin, userId: string): Promise<'ok' | 'residual' | 'failed'> {
  const { data, error } = await admin.auth.admin.getUserById(userId)
  if (error || !data.user) {
    console.error(`[account-erasure] auth lookup failed for ${userId}:`, error?.message, error?.status, error?.code)
    return 'failed'
  }
  const oauthIdentities = (data.user.identities ?? []).filter((identity) => identity.provider !== 'email').length
  // GoTrue MERGES user_metadata on an admin update, and drops a key sent as null — so send every key as null.
  const cleared = Object.fromEntries(Object.keys(data.user.user_metadata ?? {}).map((key) => [key, null]))
  const { error: updateError } = await admin.auth.admin.updateUserById(userId, {
    email: tombstoneEmail(userId),
    email_confirm: true,
    ban_duration: SUSPENSION_BAN_DURATION,
    user_metadata: cleared,
  })
  if (updateError) {
    console.error(`[account-erasure] auth update failed for ${userId}:`, updateError.message, updateError.status, updateError.code)
    return 'failed'
  }
  if (oauthIdentities > 0) {
    console.error(`[account-erasure] ${oauthIdentities} OAuth identity row(s) left for ${userId}: needs the identity cleanup migration`)
    return 'residual'
  }
  return 'ok'
}

/** Every file under `prefix` (folders recursed, MAX_DEPTH levels). Storage's list() is one level, folders have id null. */
async function listUnder(admin: Admin, bucket: Bucket, prefix: string, depth = 0): Promise<string[] | null> {
  const files: string[] = []
  for (let offset = 0; ; offset += LIST_LIMIT) {
    const { data, error } = await admin.storage.from(bucket).list(prefix, { limit: LIST_LIMIT, offset })
    if (error) {
      console.error(`[account-erasure] list ${bucket} failed:`, error.message)
      return null
    }
    for (const entry of data ?? []) {
      const path = `${prefix}/${entry.name}`
      if (entry.id !== null) files.push(path)
      else if (depth >= MAX_DEPTH) {
        // Deeper than any upload path the app writes: fail rather than report « done » with files left behind.
        console.error(`[account-erasure] list ${bucket}: folder deeper than ${MAX_DEPTH} levels`)
        return null
      } else {
        const nested = await listUnder(admin, bucket, path, depth + 1)
        if (nested === null) return null
        files.push(...nested)
      }
    }
    if ((data ?? []).length < LIST_LIMIT) return files
  }
}

type Plan = { files: Map<Bucket, Set<string>>; productIds: string[] }

// What to remove, re-derived from the database on every run: the provenance rows the person owns, the product images
// of their products, and a sweep of the folders keyed on them (avatars / portfolio-media / verifications by user id,
// shop-assets / product-images by shop id) — so a file whose provenance row is missing still goes.
async function plan(admin: Admin, userId: string): Promise<Plan | null> {
  const files = new Map<Bucket, Set<string>>(ERASABLE_BUCKETS.map((b) => [b, new Set<string>()]))
  const add = (bucket: string, path: string) => {
    const set = files.get(bucket as Bucket)
    if (set && path) set.add(path)
  }

  const { data: owned, error: ownedErr } = await admin.from('uploaded_objects').select('bucket, path').eq('owner_id', userId)
  if (ownedErr) {
    console.error(`[account-erasure] uploaded_objects lookup failed for ${userId}:`, ownedErr.message, ownedErr.code, ownedErr.details)
    return null
  }
  for (const row of owned ?? []) add(row.bucket, row.path)

  const { data: shops, error: shopsErr } = await admin.from('shops').select('id').eq('owner_id', userId)
  if (shopsErr) {
    console.error(`[account-erasure] shops lookup failed for ${userId}:`, shopsErr.message, shopsErr.code, shopsErr.details)
    return null
  }
  const shopIds = (shops ?? []).map((s) => s.id)

  let productIds: string[] = []
  if (shopIds.length > 0) {
    const { data: products, error: productsErr } = await admin.from('products').select('id').in('shop_id', shopIds)
    if (productsErr) {
      console.error(`[account-erasure] products lookup failed for ${userId}:`, productsErr.message, productsErr.code, productsErr.details)
      return null
    }
    productIds = (products ?? []).map((p) => p.id)
  }
  for (const ids of chunks(productIds, IN_CHUNK)) {
    const { data: images, error: imagesErr } = await admin.from('product_images').select('image_url').in('product_id', ids)
    if (imagesErr) {
      console.error(`[account-erasure] product_images lookup failed for ${userId}:`, imagesErr.message, imagesErr.code, imagesErr.details)
      return null
    }
    for (const image of images ?? []) {
      const path = productImagePath(image.image_url)
      if (path) add('product-images', path)
    }
  }

  // The RPC deletes a shop left empty, so its id is gone from `shops`: recover it from the first folder of the person's
  // own shop-assets / product-images provenance rows — unless that shop now belongs to someone else (never sweep it).
  const pathShopIds = new Set(
    (owned ?? [])
      .filter((row) => row.bucket === 'shop-assets' || row.bucket === 'product-images')
      .map((row) => row.path.split('/')[0])
      .filter((id) => id && !shopIds.includes(id)),
  )
  const sweepShopIds = [...shopIds]
  if (pathShopIds.size > 0) {
    const { data: taken, error: takenErr } = await admin.from('shops').select('id').in('id', [...pathShopIds]).neq('owner_id', userId)
    if (takenErr) {
      console.error(`[account-erasure] shop owner check failed for ${userId}:`, takenErr.message, takenErr.code, takenErr.details)
      return null
    }
    const takenIds = new Set((taken ?? []).map((s) => s.id))
    sweepShopIds.push(...[...pathShopIds].filter((id) => !takenIds.has(id)))
  }

  const folders: [Bucket, string][] = [
    ['avatars', userId],
    ['portfolio-media', userId],
    ['verifications', userId],
    ...sweepShopIds.flatMap((id): [Bucket, string][] => [['shop-assets', id], ['product-images', id]]),
  ]
  for (const [bucket, prefix] of folders) {
    const found = await listUnder(admin, bucket, prefix)
    if (found === null) return null
    for (const path of found) add(bucket, path)
  }

  return { files, productIds }
}

async function removeFiles(admin: Admin, userId: string, files: Map<Bucket, Set<string>>): Promise<number | null> {
  let removed = 0
  for (const [bucket, set] of files) {
    for (const paths of chunks([...set], REMOVE_CHUNK)) {
      const { data, error } = await admin.storage.from(bucket).remove(paths)
      if (error) {
        console.error(`[account-erasure] remove from ${bucket} failed for ${userId}:`, error.message)
        return null
      }
      removed += (data ?? []).length
    }
  }
  return removed
}

// Only after the files are gone: a retry must still find them through these rows.
async function deleteProvenance(admin: Admin, userId: string, files: Map<Bucket, Set<string>>): Promise<boolean> {
  const { error } = await admin.from('uploaded_objects').delete().eq('owner_id', userId)
  if (error) {
    console.error(`[account-erasure] uploaded_objects delete failed for ${userId}:`, error.message, error.code, error.details)
    return false
  }
  // Rows another account owns for a file in the person's folders (e.g. a shop moved between accounts).
  for (const [bucket, set] of files) {
    for (const paths of chunks([...set], IN_CHUNK)) {
      const { error: pathErr } = await admin.from('uploaded_objects').delete().eq('bucket', bucket).in('path', paths)
      if (pathErr) {
        console.error(`[account-erasure] uploaded_objects path delete failed for ${userId}:`, pathErr.message, pathErr.code, pathErr.details)
        return false
      }
    }
  }
  return true
}

async function deleteImageRows(admin: Admin, userId: string, productIds: string[]): Promise<number | null> {
  let removed = 0
  for (const ids of chunks(productIds, IN_CHUNK)) {
    const { data, error } = await admin.from('product_images').delete().in('product_id', ids).select('id')
    if (error) {
      console.error(`[account-erasure] product_images delete failed for ${userId}:`, error.message, error.code, error.details)
      return null
    }
    removed += (data ?? []).length
  }
  return removed
}

/**
 * Finish an approved deletion: auth e-mail + ban + metadata, then files, then image rows. Idempotent — call it again
 * after any failure. Refuses (step 'guard') unless the profile is already a tombstone.
 */
export async function finishAccountErasure(userId: string): Promise<ErasureResult> {
  let step: ErasureStep = 'guard'
  try {
    const admin = createAdminClient()

    const guard = await isTombstone(admin, userId)
    if (guard !== 'yes') {
      return { ok: false, step: 'guard', reason: guard === 'no' ? 'not_tombstoned' : guard }
    }

    step = 'auth'
    const auth = await eraseAuth(admin, userId)
    if (auth === 'failed') return { ok: false, step: 'auth', reason: 'failed' }

    step = 'files'
    const todo = await plan(admin, userId)
    if (!todo) return { ok: false, step: 'files', reason: 'failed' }
    const filesRemoved = await removeFiles(admin, userId, todo.files)
    if (filesRemoved === null) return { ok: false, step: 'files', reason: 'failed' }
    if (!(await deleteProvenance(admin, userId, todo.files))) return { ok: false, step: 'files', reason: 'failed' }

    step = 'rows'
    const imageRowsRemoved = await deleteImageRows(admin, userId, todo.productIds)
    if (imageRowsRemoved === null) return { ok: false, step: 'rows', reason: 'failed' }

    // Files and rows are erased; the OAuth identity is not — never report that as done (no completion audit row).
    if (auth === 'residual') return { ok: false, step: 'auth', reason: 'identity_left' }
    return { ok: true, filesRemoved, imageRowsRemoved }
  } catch (e) {
    console.error(`[account-erasure] threw at ${step} for ${userId}:`, thrown(e))
    return { ok: false, step, reason: 'failed' }
  }
}
