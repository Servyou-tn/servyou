'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { DisputeReason, DisputeCreatedByRole } from '@/lib/types/dispute'

export type CreateDisputeResult =
  | { success: true; disputeId: string }
  | { success: false; error: string }

const VALID_REASONS: DisputeReason[] = [
  'not_delivered', 'wrong_item', 'damaged', 'payment_refused', 'buyer_unreachable', 'other',
]

// Party-facing dispute creation. The role is inferred server-side from the order's
// buyer_id / seller_id against auth.uid — never trusted from the client. RLS re-validates
// everything (party-only INSERT, role match, order != pending) and the partial unique
// index disputes_one_active_per_order blocks a second active dispute; the action
// translates those DB outcomes into user-facing i18n error keys.
//
// Pure-validation returns happen BEFORE createClient() so a malformed request never
// touches the database.
export async function createDispute(
  orderId: string,
  reason: string,
  description: string,
): Promise<CreateDisputeResult> {
  // 1. Validate reason + description (reason='other' needs a non-empty description so
  //    the admin has context; the DB CHECK disputes_other_requires_description backs it).
  if (!VALID_REASONS.includes(reason as DisputeReason)) {
    return { success: false, error: 'dispute.error_reason_required' }
  }
  const desc = description.trim()
  if (reason === 'other' && desc.length === 0) {
    return { success: false, error: 'dispute.error_description_required' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'dispute.error_not_authorized' }
  }

  // 2. Resolve role from the order. RLS lets a party read their own order; a non-party
  //    (or a bad id) gets no row.
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('buyer_id, seller_id, status, order_type')
    .eq('id', orderId)
    .maybeSingle()
  if (orderError) console.error('[createDispute] order fetch error:', orderError)
  if (!order) {
    return { success: false, error: 'dispute.error_order_not_eligible' }
  }

  let role: DisputeCreatedByRole
  if (order.buyer_id === user.id) role = 'buyer'
  else if (order.seller_id === user.id) role = 'seller'
  else return { success: false, error: 'dispute.error_not_authorized' }

  if (order.status === 'pending') {
    return { success: false, error: 'dispute.error_order_not_eligible' }
  }

  // 3. Insert. RLS INSERT policy re-validates (party + role match + order != pending);
  //    the partial unique index raises 23505 on a second active dispute.
  const { data, error: insertError } = await supabase
    .from('disputes')
    .insert({
      order_id: orderId,
      created_by_role: role,
      reason,
      description: desc.length > 0 ? desc : null,
    })
    .select('id')

  if (insertError) {
    if (insertError.code === '23505') {
      return { success: false, error: 'dispute.error_already_active' }
    }
    console.error('[createDispute] insert error:', insertError)
    return { success: false, error: 'dispute.error_generic' }
  }
  if (!data || data.length === 0) {
    // RLS-blocked insert (returns no row).
    return { success: false, error: 'dispute.error_generic' }
  }

  // Revalidate the caller's order surface so a server-rendered dispute view refreshes.
  // (The party-side dispute UI was removed as a v2-teardown orphan; the paths below are
  // the pre-v2 order surfaces and are rebuilt with the E3 order redesign.)
  if (role === 'buyer') {
    revalidatePath('/demande/confirmation/' + orderId)
  } else if (order.order_type === 'product') {
    revalidatePath('/ma-boutique/commandes')
  } else {
    revalidatePath('/mon-profil-freelance/demandes')
  }

  return { success: true, disputeId: data[0].id }
}
