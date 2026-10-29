'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { isNoRowLike, reportQueryError } from '@/lib/supabase/query-error'
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
// touches the database. The three arguments arrive from the client: Zod checks their TYPES too (a
// non-string used to throw on .trim()), the order id's shape, and caps the description (pre-launch audit pass 2).
const DISPUTE_DESCRIPTION_MAX = 2000

const CreateDisputeInput = z.object({
  orderId: z.string().uuid(),
  reason: z.string(),
  description: z.string().max(DISPUTE_DESCRIPTION_MAX),
})

export async function createDispute(
  orderId: string,
  reason: string,
  description: string,
): Promise<CreateDisputeResult> {
  const parsed = CreateDisputeInput.safeParse({ orderId, reason, description })
  if (!parsed.success) {
    // A malformed id is « not eligible » (same answer as a non-party's order); a bad description is generic.
    const field = parsed.error.issues[0]?.path[0]
    return { success: false, error: field === 'orderId' ? 'dispute.error_order_not_eligible' : 'dispute.error_generic' }
  }
  // 1. Validate reason + description (reason='other' needs a non-empty description so
  //    the admin has context; the DB CHECK disputes_other_requires_description backs it).
  if (!VALID_REASONS.includes(parsed.data.reason as DisputeReason)) {
    return { success: false, error: 'dispute.error_reason_required' }
  }
  const desc = parsed.data.description.trim()
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
  // A failed read is the generic error, never « not eligible »; a junk id (22P02) stays « not eligible ».
  if (orderError && !isNoRowLike(orderError)) {
    reportQueryError('createDispute order', orderError)
    return { success: false, error: 'dispute.error_generic' }
  }
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
    console.error('[createDispute] insert error:', insertError.message, insertError.code, insertError.details)
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
