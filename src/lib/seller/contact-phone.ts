import type { SupabaseClient } from '@supabase/supabase-js'

// A seller's contact phone — the number buyers reach on WhatsApp (get_contact_phone). Required before a freelancer
// publishes (or reactivates) a service and before a shop is created (walk 2026-11-02 finding #17: a freelancer could
// finish every step with phone = NULL while each success page promised WhatsApp contact). The database enforces the
// same rule on the publish transitions (PENDING_seller_phone_and_product_checks.sql); this read lets the actions
// answer with a clear message first, and lets the pages show the gate before the click.

export type OwnContactPhone = { ok: true; phone: string | null } | { ok: false }

export async function readOwnContactPhone(supabase: SupabaseClient, userId: string): Promise<OwnContactPhone> {
  const { data, error } = await supabase.from('profiles').select('phone').eq('id', userId).maybeSingle()
  // Never destructure only `data`: a failed read must not pass as « no phone » (or as « has one »).
  if (error) {
    console.error('[readOwnContactPhone] profile read failed:', error.message, error.code, error.details)
    return { ok: false }
  }
  const phone = typeof data?.phone === 'string' && data.phone.trim() !== '' ? data.phone : null
  return { ok: true, phone }
}

/** The DB trigger's refusal (enforce_seller_contact_phone): errcode 23514, hint 'seller_phone_required'. */
export const SELLER_PHONE_REQUIRED_HINT = 'seller_phone_required'

export type PhoneClearCheck = { ok: true; blocked: boolean } | { ok: false }

/**
 * May this account CLEAR its phone (Mon compte / Paramètres saving an empty phone)? Not a seller who relies on it: a
 * shop owner, or a freelancer with at least one active service (walk #17 follow-up — after publishing, the number must
 * stay). « Clearing » means a stored phone going empty: an account that has no phone yet saves '' freely (Paramètres
 * passes its unchanged null phone as ''). The DB enforces the same on profiles (enforce_seller_phone_not_cleared).
 */
export async function sellerPhoneClearBlocked(supabase: SupabaseClient, userId: string): Promise<PhoneClearCheck> {
  const { data: profile, error } = await supabase.from('profiles').select('phone, seller_type').eq('id', userId).maybeSingle()
  if (error) {
    console.error('[sellerPhoneClearBlocked] profile read failed:', error.message, error.code, error.details)
    return { ok: false }
  }
  const stored = typeof profile?.phone === 'string' ? profile.phone.trim() : ''
  if (stored === '') return { ok: true, blocked: false }
  if (profile?.seller_type === 'shop_owner') return { ok: true, blocked: true }
  if (profile?.seller_type !== 'freelancer') return { ok: true, blocked: false }

  const { data: fp, error: fpError } = await supabase.from('freelancer_profiles').select('id').eq('profile_id', userId).maybeSingle()
  if (fpError) {
    console.error('[sellerPhoneClearBlocked] freelancer profile read failed:', fpError.message, fpError.code, fpError.details)
    return { ok: false }
  }
  if (!fp) return { ok: true, blocked: false }
  const { count, error: countError } = await supabase
    .from('service_listings')
    .select('id', { count: 'exact', head: true })
    .eq('freelancer_profile_id', fp.id)
    .eq('status', 'active')
  if (countError) {
    console.error('[sellerPhoneClearBlocked] active services count failed:', countError.message, countError.code, countError.details)
    return { ok: false }
  }
  return { ok: true, blocked: (count ?? 0) > 0 }
}
