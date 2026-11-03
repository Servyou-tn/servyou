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
