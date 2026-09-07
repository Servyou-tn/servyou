'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getLang } from '@/lib/i18n/server'
import { t } from '@/lib/i18n'
import { resolveOwnedFreelancerProfileId } from '@/lib/freelancer/owner-profile'

// Local, not exported — a 'use server' module may export only async functions (see
// src/lib/products/constants.ts's own header for why the equivalent product type lives in a
// separate file). A non-exported type declaration is erased at compile time, so it never becomes
// a runtime export and doesn't trip that rule.
type ServiceActionResult = { ok: true } | { ok: false; error: string }

// H5 « Mes services » write actions — mirrors products.ts's toggleProductStatusAction /
// deleteProductAction shape (ownership re-derived server-side, RLS backs it up, never trusted
// from the client). Two real deltas from the product version:
//   1. Every write revalidates `/freelance/[id]` too (D4) — a status change can flip
//      `freelancer_profiles.is_published` via `sync_freelancer_is_published`, and that route is a
//      dynamic segment: `revalidatePath` needs the CONCRETE path or it silently no-ops.
//   2. deleteServiceAction's zero-order gate exists for the SAME reason products' does —
//      `enforce_order_identity_lock` raises on the `orders.service_listing_id` ON DELETE SET NULL
//      cascade for ANY existing order, any status. Verified live against this exact schema shape
//      before this file was written (see PR body) — H7's own measured delete-modal copy claims
//      "vos engagements en cours ne sont pas affectés", which is false: a service with any order
//      cannot be deleted at all, so that copy was dropped rather than shipped (service.delete_modal
//      .body in fr.ts/ar.ts).

function revalidateServiceSurfaces(freelancerProfileId: string) {
  revalidatePath('/mes-services')
  revalidatePath('/tableau-de-bord')
  revalidatePath('/marche/services')
  revalidatePath(`/freelance/${freelancerProfileId}`)
}

const ToggleStatusInput = z.object({
  serviceId: z.string().uuid(),
  nextStatus: z.enum(['active', 'hidden']),
})

/**
 * Single-row status toggle (Activer / Mettre en pause). The is_published CASCADE — whether this
 * write leaves the freelancer with zero active listings — is decided CLIENT-side before this is
 * ever called (ServiceRow.tsx checks `isLastActive` and shows the confirm modal first); this
 * action does not re-derive that decision, it only performs the write once the caller has already
 * confirmed it. `enforce_admin_moderation_lock` blocks moving a moderated row's status away from
 * 'hidden' for a non-admin — that raise is the one error this distinguishes from a generic
 * failure, same shape as toggleProductStatusAction.
 */
export async function toggleServiceStatusAction(input: unknown): Promise<ServiceActionResult> {
  const lang = await getLang()
  const parsed = ToggleStatusInput.safeParse(input)
  if (!parsed.success) {
    console.error('[toggleServiceStatus] rejected: invalid input —', parsed.error.issues[0]?.message)
    return { ok: false, error: t('common.error_generic', lang) }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    console.error('[toggleServiceStatus] rejected: no authenticated user')
    return { ok: false, error: t('service.error.notAuth', lang) }
  }

  const owned = await resolveOwnedFreelancerProfileId(supabase, user.id)
  if (!owned.ok) {
    console.error(`[toggleServiceStatus] freelancer profile unresolved (${owned.reason}) for user ${user.id}`)
    return { ok: false, error: t('common.error_generic', lang) }
  }

  const { data, error } = await supabase
    .from('service_listings')
    .update({ status: parsed.data.nextStatus })
    .eq('id', parsed.data.serviceId)
    .eq('freelancer_profile_id', owned.freelancerProfileId)
    .select('id')
    .maybeSingle()

  if (error) {
    console.error('[toggleServiceStatus] update failed:', error.message, error.code, error.details)
    if (error.message.includes('admin-moderated')) {
      return { ok: false, error: t('owner.moderation_banner.service', lang) }
    }
    return { ok: false, error: t('service.error_update', lang) }
  }
  if (!data) {
    console.error(
      `[toggleServiceStatus] no row updated for service ${parsed.data.serviceId}, freelancer_profile ${owned.freelancerProfileId}`,
    )
    return { ok: false, error: t('common.error_generic', lang) }
  }

  revalidateServiceSurfaces(owned.freelancerProfileId)
  return { ok: true }
}

const DeleteServiceInput = z.object({ serviceId: z.string().uuid() })

/**
 * Single-row hard delete, zero-order services only — see the header note above. The row's
 * disabled "Supprimer" is UI-only affordance; eligibility is re-derived here, not trusted from the
 * client, same relationship as deleteProductAction.
 */
export async function deleteServiceAction(input: unknown): Promise<ServiceActionResult> {
  const lang = await getLang()
  const parsed = DeleteServiceInput.safeParse(input)
  if (!parsed.success) {
    console.error('[deleteService] rejected: invalid input —', parsed.error.issues[0]?.message)
    return { ok: false, error: t('common.error_generic', lang) }
  }
  const { serviceId } = parsed.data

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    console.error('[deleteService] rejected: no authenticated user')
    return { ok: false, error: t('service.error.notAuth', lang) }
  }

  const owned = await resolveOwnedFreelancerProfileId(supabase, user.id)
  if (!owned.ok) {
    console.error(`[deleteService] freelancer profile unresolved (${owned.reason}) for user ${user.id}`)
    return { ok: false, error: t('common.error_generic', lang) }
  }

  const { count, error: countError } = await supabase
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('service_listing_id', serviceId)
  if (countError) {
    console.error('[deleteService] order count failed:', countError.message, countError.code)
    return { ok: false, error: t('common.error_generic', lang) }
  }
  if ((count ?? 0) > 0) {
    console.error(`[deleteService] rejected: service ${serviceId} has ${count} order(s)`)
    return { ok: false, error: t('service.error_delete_has_orders', lang) }
  }

  const { data, error } = await supabase
    .from('service_listings')
    .delete()
    .eq('id', serviceId)
    .eq('freelancer_profile_id', owned.freelancerProfileId)
    .select('id')
    .maybeSingle()

  if (error) {
    console.error('[deleteService] delete failed:', error.message, error.code, error.details)
    // TOCTOU: an order landed between the count check above and this delete —
    // enforce_order_identity_lock raises on the cascading SET NULL, same as deleteProductAction.
    if (error.code === '42501') {
      return { ok: false, error: t('service.error_delete_has_orders', lang) }
    }
    return { ok: false, error: t('service.error_delete', lang) }
  }
  if (!data) {
    console.error(`[deleteService] no row deleted for service ${serviceId}, freelancer_profile ${owned.freelancerProfileId}`)
    return { ok: false, error: t('common.error_generic', lang) }
  }

  revalidateServiceSurfaces(owned.freelancerProfileId)
  return { ok: true }
}
