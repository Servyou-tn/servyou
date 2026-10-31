'use server'

import { randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { getLang } from '@/lib/i18n/server'
import { t } from '@/lib/i18n'
import { isValidPhone, normalizePhone } from '@/lib/phone'
import { isValidPassword } from '@/lib/signup-validation'
import { GOVERNORATES } from '@/lib/tunisia-governorates'
import { normalizeAvatar, MAX_INPUT_BYTES, MAX_INPUT_MB, type NormalizeFailure } from '@/lib/images/normalize'
import { recordUploadProvenance, deleteUploadProvenance } from '@/lib/images/provenance'
import { reservePasswordAttempt, releasePasswordAttempt } from '@/lib/auth/password-attempts'
import { callerActivity, uploadBucket } from '@/lib/images/upload-guard'

// `field` lets the form attach the message to the input it belongs to; callers that only toast
// (ParametresShell, AvatarUploadCard) ignore it.
export type AccountActionField = 'fullName' | 'phone' | 'city' | 'currentPassword' | 'newPassword'
export type AccountActionResult = { ok: true } | { ok: false; error: string; field?: AccountActionField }

// Updates the editable identity fields. The column UPDATE grants on profiles also cover avatar_url
// (its own actions below) and seller_type (never written here); email and date_of_birth are locked.
// Phone is normalized; city must be a known governorate; language is constrained to fr/ar.
// `''` means "no value" for phone and city: ParametresShell passes its unchanged null fields that way.
const profileInputSchema = z.object({
  fullName: z.string().trim().min(1, 'monCompte.error.nameRequired').max(120, 'common.error_generic'),
  phone: z.string().trim().max(32, 'monCompte.error.phoneFormat'),
  city: z.string().trim().max(60, 'common.error_generic'),
  // Optional: I1 never sends it (language is I2's), so a save here cannot revert a language change
  // that is still in flight from the topbar toggle. ParametresShell sends it.
  language: z.string().max(8).optional(),
})

const PROFILE_FIELD: Record<string, AccountActionField | undefined> = {
  fullName: 'fullName',
  phone: 'phone',
  city: 'city',
}

export async function updateProfileAction(input: {
  fullName: string
  phone: string
  city: string
  language?: string
}): Promise<AccountActionResult> {
  const lang = await getLang()
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: t('monCompte.error.notAuth', lang) }

  const parsed = profileInputSchema.safeParse(input)
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    return { ok: false, error: t(issue?.message ?? 'common.error_generic', lang), field: PROFILE_FIELD[String(issue?.path[0])] }
  }
  const { fullName, phone: phoneRaw, language: languageRaw } = parsed.data

  let phone: string | null = null
  if (phoneRaw) {
    if (!isValidPhone(phoneRaw)) return { ok: false, error: t('monCompte.error.phoneFormat', lang), field: 'phone' }
    phone = normalizePhone(phoneRaw)
  }

  const city = parsed.data.city || null
  if (city && !GOVERNORATES.some((g) => g.value === city)) {
    return { ok: false, error: t('common.error_generic', lang), field: 'city' }
  }

  const { error } = await supabase
    .from('profiles')
    .update({
      full_name: fullName,
      phone,
      city,
      ...(languageRaw === undefined ? {} : { language: languageRaw === 'ar' ? 'ar' : 'fr' }),
    })
    .eq('id', user.id)
  if (error) {
    console.error('[updateProfileAction] update error:', error.message, error.code, error.details)
    return { ok: false, error: t('common.error_generic', lang) }
  }

  revalidatePath('/mon-compte')
  revalidatePath('/', 'layout')
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
// sweep the user's folder. The bytes go through the service role (uploadBucket, S-3); the profile write uses the
// USER'S session client, never service_role, so both
// gates stay live — RLS ("Users can update their own profile") enforces the row and the column
// allow-list from 20260731073515 enforces the column.
export async function uploadAvatarAction(formData: FormData): Promise<AccountActionResult> {
  const lang = await getLang()
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: t('monCompte.error.notAuth', lang) }
  // S-3: the bytes below are written by the service role, which skips the RESTRICTIVE « Suspended accounts
  // cannot upload » storage policy -- so a suspended account is refused here, before anything is stored.
  // A failed check refuses too (fail closed), but with the generic error, not « suspended ». Anything
  // but an explicit 'active' is refused.
  const activity = await callerActivity(supabase)
  if (activity !== 'active') {
    return { ok: false, error: t(activity === 'error' ? 'common.error_generic' : 'auth.suspended_banner', lang) }
  }

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
  // Since S-3 the bytes go through the service role (uploadBucket), which skips storage RLS: this first segment is
  // safe because it is the caller's own user.id, never a value from the client.
  const path = `${user.id}/${randomUUID()}.webp`

  const { error: uploadError } = await uploadBucket(AVATAR_BUCKET).upload(path, normalized.blob, {
    contentType: 'image/webp',
    cacheControl: AVATAR_CACHE_CONTROL,
    upsert: false,
  })
  if (uploadError) {
    console.error('[uploadAvatarAction] storage upload failed:', uploadError.message)
    return { ok: false, error: t('monCompte.avatar.error.upload', lang) }
  }

  // ⚑ PROVENANCE RIGHT AFTER THE BYTES LAND, BEFORE ANYTHING ELSE CAN REFERENCE THIS PATH. Written
  // with a service_role client, never this action's own session client — see recordUploadProvenance's
  // header. No trigger reads this for avatars today (only product_images has one), but the write
  // happens unconditionally anyway so the four upload actions stay structurally identical, and so a
  // future PR that starts accepting a client-supplied avatar path cannot reopen the same gap
  // uploaded_objects exists to close for product images. Awaited and confirmed before the profile
  // update below runs — do not parallelize the two.
  const provenance = await recordUploadProvenance('avatars', path, user.id)
  if (!provenance.ok) {
    console.error(`[uploadAvatarAction] provenance insert failed, removing orphaned object at ${path}`)
    await uploadBucket(AVATAR_BUCKET).remove([path])
    return { ok: false, error: t('monCompte.avatar.error.upload', lang) }
  }

  // ⚑ READ THE STORED SIZE BACK AND COMPARE — see the twin check in actions/products.ts for the
  // full reasoning. Short version: upload() returning ok proves the request was accepted, not that
  // the bytes survived, and every body-encoding fault changes the object's length.
  //
  // This path had ZERO objects in storage when the corruption was found, so it was never observed
  // failing — but it fed the same Buffer through the same storage-js branch as the product path and
  // would have corrupted the first avatar anyone uploaded. The check goes in for that reason: it is
  // guarding a defect that had not surfaced yet, not one already seen here.
  const { data: stored, error: infoError } = await uploadBucket(AVATAR_BUCKET).info(path)
  if (infoError || !stored || stored.size !== normalized.blob.size) {
    console.error(
      `[uploadAvatarAction] INTEGRITY CHECK FAILED — sent ${normalized.blob.size} bytes, ` +
        `stored ${stored?.size ?? 'unknown'} at ${path}` +
        (infoError ? ` (info error: ${infoError.message})` : ''),
    )
    // Unlike the product path, this one CAN clean up safely: the object is unreferenced and this
    // action already removes it on the adjacent profile-update failure (below), so the behaviour
    // stays consistent within the file.
    await uploadBucket(AVATAR_BUCKET).remove([path])
    await deleteUploadProvenance('avatars', path)
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
    await uploadBucket(AVATAR_BUCKET).remove([path])
    await deleteUploadProvenance('avatars', path)
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

// Records an account-deletion request (admin-mediated; does NOT delete anything). The partial
// unique index blocks a second pending request (23505) → friendly "already pending".
const deletionReasonSchema = z.string().trim().max(500)

export async function requestAccountDeletionAction(reason: string): Promise<AccountActionResult> {
  const lang = await getLang()
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: t('monCompte.error.notAuth', lang) }

  const parsed = deletionReasonSchema.safeParse(reason)
  if (!parsed.success) return { ok: false, error: t('monCompte.delete.reasonTooLong', lang) }

  const { error } = await supabase
    .from('deletion_requests')
    .insert({ user_id: user.id, reason: parsed.data || null })
  if (error) {
    if (error.code === '23505') {
      return { ok: false, error: t('monCompte.delete.alreadyPending', lang) }
    }
    console.error('[requestAccountDeletionAction] insert error:', error.message, error.code, error.details)
    return { ok: false, error: t('common.error_generic', lang) }
  }

  revalidatePath('/mon-compte')
  return { ok: true }
}

// Supabase Auth's rate limits answer 429 with an over_…_rate_limit code (over_request_rate_limit for sign-ins).
function isAuthRateLimit(error: { status?: number; code?: string }): boolean {
  return error.status === 429 || /^over_.*_rate_limit$/.test(error.code ?? '')
}

const passwordInputSchema = z.object({
  currentPassword: z.string().min(1, 'monCompte.password.required').max(200),
  newPassword: z.string().max(200).refine(isValidPassword, 'monCompte.password.invalid'),
})

// Inline password change. The email used to re-authenticate is the SESSION user's, never a client
// value. signInWithPassword proves the current password (and gives the session the "secure password
// change" setting asks for, whether or not it is on); updateUser then writes the new one.
//
// Guessing the current password from a stolen session (pre-beta review M1): every attempt needs a fresh Turnstile
// token (Supabase Auth's CAPTCHA on the password grant — refused here first when the token is missing), and an
// account gets at most 5 wrong current passwords per 15 minutes (reservePasswordAttempt, a service-role table). This
// sign-in runs from the server, so Supabase Auth's own per-IP limit sees the server's egress IP — only a coarse
// global backstop (its 429 reads as « trop de tentatives »).
export async function changePasswordAction(
  input: {
    currentPassword: string
    newPassword: string
  },
  turnstileToken?: string,
): Promise<AccountActionResult> {
  const lang = await getLang()
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user || !user.email) return { ok: false, error: t('monCompte.error.notAuth', lang) }

  const parsed = passwordInputSchema.safeParse(input)
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    const field: AccountActionField = issue?.path[0] === 'newPassword' ? 'newPassword' : 'currentPassword'
    const key = issue?.message.startsWith('monCompte.') ? issue.message : 'monCompte.password.invalid'
    return { ok: false, error: t(key, lang), field }
  }
  const { currentPassword, newPassword } = parsed.data
  if (newPassword === currentPassword) {
    return { ok: false, error: t('monCompte.password.same', lang), field: 'newPassword' }
  }

  // The browser's Turnstile token rides along for Supabase Auth's CAPTCHA check: the password grant is
  // CAPTCHA-guarded, even from this server-side client. Without a token the attempt would only fail there, so it is
  // refused here, before any Auth call.
  if (!turnstileToken) return { ok: false, error: t('common.error_bot_check', lang) }

  // The per-account limit, checked before the guess reaches Auth. Fails closed: no record, no attempt.
  const attempt = await reservePasswordAttempt(user.id)
  if (!attempt.ok) return { ok: false, error: t('monCompte.password.error', lang) }
  if (attempt.blocked) return { ok: false, error: t('monCompte.password.tooManyAttempts', lang) }

  const { error: reauthError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
    options: { captchaToken: turnstileToken },
  })
  // Only a wrong current password keeps its attempt row; every other outcome releases it.
  if (reauthError?.code !== 'invalid_credentials') await releasePasswordAttempt(attempt.id)
  if (reauthError) {
    if (reauthError.code === 'captcha_failed') return { ok: false, error: t('common.error_bot_check', lang) }
    if (isAuthRateLimit(reauthError)) return { ok: false, error: t('common.rate_limit', lang) }
    if (reauthError.code === 'invalid_credentials') {
      return { ok: false, error: t('monCompte.password.wrongCurrent', lang), field: 'currentPassword' }
    }
    console.error('[changePasswordAction] re-auth failed:', reauthError.message, reauthError.code, reauthError.status)
    return { ok: false, error: t('monCompte.password.error', lang) }
  }

  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) {
    if (error.code === 'same_password') return { ok: false, error: t('monCompte.password.same', lang), field: 'newPassword' }
    if (error.code === 'weak_password') return { ok: false, error: t('monCompte.password.invalid', lang), field: 'newPassword' }
    console.error('[changePasswordAction] update failed:', error.message, error.code, error.status)
    return { ok: false, error: t('monCompte.password.error', lang) }
  }

  // A changed password must end every OTHER session (a stolen one included); this one stays. Best
  // effort: the password change itself already succeeded, so a failure is logged, not surfaced.
  const { error: othersError } = await supabase.auth.signOut({ scope: 'others' })
  if (othersError) {
    console.error('[changePasswordAction] sign-out of other sessions failed:', othersError.message, othersError.code, othersError.status)
  }

  return { ok: true }
}
