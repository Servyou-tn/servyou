'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getLang } from '@/lib/i18n/server'
import { t } from '@/lib/i18n'
import { isValidPhone, normalizePhone } from '@/lib/phone'
import { GOVERNORATES } from '@/lib/tunisia-governorates'

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
