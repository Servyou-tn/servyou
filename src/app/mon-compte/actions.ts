'use server'

import { randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getLang } from '@/lib/i18n/server'
import { t } from '@/lib/i18n'
import { isValidPhone, normalizePhone } from '@/lib/phone'
import { GOVERNORATES } from '@/lib/tunisia-governorates'
import { normalizeAvatar, MAX_INPUT_BYTES, MAX_INPUT_MB, type NormalizeFailure } from '@/lib/images/normalize'

export type AccountActionResult = { ok: true } | { ok: false; error: string }

// Updates the editable identity fields. RLS restricts authenticated UPDATE to exactly
// full_name / city / language / phone (email, date_of_birth, is_admin, etc. are locked),
// so this only touches the allowed columns. Phone is normalized; city must be a known
// governorate; language is constrained to fr/ar.
export async function updateProfileAction(input: {
  fullName: string
  phone: string
  city: string
  language: string
}): Promise<AccountActionResult> {
  const lang = await getLang()
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: t('monCompte.error.notAuth', lang) }

  const fullName = input.fullName.trim()
  if (!fullName) return { ok: false, error: t('monCompte.error.nameRequired', lang) }

  const phoneRaw = input.phone.trim()
  let phone: string | null = null
  if (phoneRaw) {
    if (!isValidPhone(phoneRaw)) return { ok: false, error: t('monCompte.error.phoneFormat', lang) }
    phone = normalizePhone(phoneRaw)
  }

  const city = input.city.trim() || null
  if (city && !GOVERNORATES.some((g) => g.value === city)) {
    return { ok: false, error: t('common.error_generic', lang) }
  }

  const language = input.language === 'ar' ? 'ar' : 'fr'

  const { error } = await supabase
    .from('profiles')
    .update({ full_name: fullName, phone, city, language })
    .eq('id', user.id)
  if (error) {
    console.error('[updateProfileAction] update error:', error)
    return { ok: false, error: t('common.error_generic', lang) }
  }

  revalidatePath('/mon-compte')
  return { ok: true }
}

const AVATAR_BUCKET = 'avatars'

// One year, matching next.config.ts's minimumCacheTTL. The remote-image TTL Vercel uses is
// max(this header, minimumCacheTTL) — setting only one side silently leaves the other as the
// floor, which is the whole defect described in docs/design/image-storage-discovery.md §2b.
// Safe only because we never overwrite an object in place: a replaced avatar goes to a NEW uuid.
const AVATAR_CACHE_CONTROL = '31536000'

// Zod validates the SHAPE that crossed the boundary. It is deliberately not presented as the
// content gate: a File's `type` is client-declared and trivially forged, so it stops accidents
// only. The real gate is normalizeAvatar's decode + re-encode, which arbitrary bytes cannot pass.
const avatarFileSchema = z
  .instanceof(File, { message: 'no_file' })
  .refine((f) => f.size > 0, 'no_file')
  .refine((f) => f.size <= MAX_INPUT_BYTES, 'too_large')

const FAILURE_KEY: Record<NormalizeFailure, string> = {
  unsupported_heic: 'monCompte.avatar.error.heic',
  not_an_image: 'monCompte.avatar.error.notImage',
  decode_failed: 'monCompte.avatar.error.decode',
  too_large: 'monCompte.avatar.error.tooLarge',
}

// Uploads a new avatar: normalize → store under the user's own path → point the profile at it →
// sweep the user's folder. Writes with the USER'S session client, never service_role, so both
// gates stay live — RLS ("Users can update their own profile") enforces the row and the column
// allow-list from 20260731073515 enforces the column.
export async function uploadAvatarAction(formData: FormData): Promise<AccountActionResult> {
  const lang = await getLang()
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: t('monCompte.error.notAuth', lang) }

  const parsed = avatarFileSchema.safeParse(formData.get('avatar'))
  if (!parsed.success) {
    const code = parsed.error.issues[0]?.message
    return {
      ok: false,
      error: t(code === 'too_large' ? 'monCompte.avatar.error.tooLarge' : 'monCompte.avatar.error.notImage', lang, { max: MAX_INPUT_MB }),
    }
  }

  const normalized = await normalizeAvatar(Buffer.from(await parsed.data.arrayBuffer()))
  if (!normalized.ok) {
    return { ok: false, error: t(FAILURE_KEY[normalized.reason], lang, { max: MAX_INPUT_MB }) }
  }

  // A NEW path every time. Never overwrite: on the free tier there is no Smart CDN
  // auto-invalidation, and both Vercel's optimizer and the storage CDN key on URL — an in-place
  // overwrite would serve the OLD image for the full one-year TTL. The storage policies enforce
  // this structurally by granting INSERT/DELETE and no UPDATE.
  const path = `${user.id}/${randomUUID()}.webp`

  const { error: uploadError } = await supabase.storage.from(AVATAR_BUCKET).upload(path, normalized.bytes, {
    contentType: 'image/webp',
    cacheControl: AVATAR_CACHE_CONTROL,
    upsert: false,
  })
  if (uploadError) {
    console.error('[uploadAvatarAction] storage upload failed:', uploadError.message)
    return { ok: false, error: t('monCompte.avatar.error.upload', lang) }
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path)

  const { error: updateError } = await supabase
    .from('profiles')
    .update({ avatar_url: publicUrl })
    .eq('id', user.id)
  if (updateError) {
    // The object is uploaded but unreferenced. Remove it rather than leave an orphan we would then
    // need the (not yet built) reconciliation sweep to find.
    await supabase.storage.from(AVATAR_BUCKET).remove([path])
    console.error('[uploadAvatarAction] profile update failed:', updateError.message, updateError.code)
    return { ok: false, error: t('common.error_generic', lang) }
  }

  await sweepAvatarFolder(supabase, user.id, path)
  revalidateAvatarSurfaces()
  return { ok: true }
}

// Clears the avatar and removes every stored object for the user.
export async function removeAvatarAction(): Promise<AccountActionResult> {
  const lang = await getLang()
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: t('monCompte.error.notAuth', lang) }

  const { error } = await supabase.from('profiles').update({ avatar_url: null }).eq('id', user.id)
  if (error) {
    console.error('[removeAvatarAction] profile update failed:', error.message, error.code)
    return { ok: false, error: t('common.error_generic', lang) }
  }

  await sweepAvatarFolder(supabase, user.id, null)
  revalidateAvatarSurfaces()
  return { ok: true }
}

// Deletes every object under the user's avatar folder except `keep`. Doubles as self-healing:
// a prior run that uploaded then failed to update the profile leaves a stray, and this clears it.
// Uses the user's session client, so the "avatars: owner reads own" / "owner deletes own" policies
// scope it to their own folder — it cannot touch anyone else's, by policy rather than by argument.
// Best-effort: a failure here leaves an orphaned object, which is untidy but not user-visible, so
// it is logged rather than surfaced.
async function sweepAvatarFolder(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  keep: string | null,
): Promise<void> {
  const { data, error } = await supabase.storage.from(AVATAR_BUCKET).list(userId)
  if (error) {
    console.error('[sweepAvatarFolder] list failed:', error.message)
    return
  }

  const stale = (data ?? []).map((o) => `${userId}/${o.name}`).filter((p) => p !== keep)
  if (stale.length === 0) return

  const { error: removeError } = await supabase.storage.from(AVATAR_BUCKET).remove(stale)
  if (removeError) console.error('[sweepAvatarFolder] remove failed:', removeError.message)
}

// The avatar renders in the Topbar on EVERY shell page, not just /mon-compte, so revalidating the
// single route would leave a stale avatar everywhere else. Layout-level is the correct scope.
function revalidateAvatarSurfaces(): void {
  revalidatePath('/', 'layout')
}

// Records an account-deletion request (admin-mediated; does NOT delete). The partial
// unique index blocks a second pending request (23505) → friendly "already pending".
export async function requestAccountDeletionAction(reason: string): Promise<AccountActionResult> {
  const lang = await getLang()
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: t('monCompte.error.notAuth', lang) }

  const { error } = await supabase
    .from('deletion_requests')
    .insert({ user_id: user.id, reason: reason.trim() || null })
  if (error) {
    if ((error as { code?: string }).code === '23505') {
      return { ok: false, error: t('monCompte.delete.alreadyPending', lang) }
    }
    console.error('[requestAccountDeletionAction] insert error:', error)
    return { ok: false, error: t('common.error_generic', lang) }
  }

  return { ok: true }
}
