'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getLang } from '@/lib/i18n/server'
import { t } from '@/lib/i18n'
import { resolveOwnedShopId } from '@/lib/shops/owner-shop'
import { reconcile } from '@/lib/shops/reconcile'
import { getProductCategories } from '@/lib/marche/product-categories'
import { SHOP_TYPES, DELIVERY_SETUPS, PAYMENT_METHODS } from '@/lib/types/shop-config'

// G2 step 2 "Configuration". Full reasoning: docs/design/g2-discovery.md §12-17.
//
// UPDATE, NOT INSERT — the shop row exists by the time this action runs (step 1 created it). The
// owning shop is re-derived from the session via `resolveOwnedShopId`, exactly like the page guard;
// the client NEVER supplies a shopId (unlike step 1's upload actions, which had to — the row didn't
// exist yet at the point those ran). That removes a client-supplied-id IDOR surface entirely.
//
// EVERY FIELD IS OPTIONAL (ruling 5) — saving with nothing filled in is a valid, expected call, not
// an error. There is no "at least one field" validation anywhere in this action.

const FREE_TEXT_MAX = 500

// '' from an untouched select/input collapses to null — the DB stores "never set" as NULL, not "".
const optionalText = z
  .string()
  .max(FREE_TEXT_MAX)
  .transform((v) => v.trim() || null)

const SaveConfigInput = z.object({
  shopType: z.union([z.enum(SHOP_TYPES), z.literal('')]).transform((v) => v || null),
  deliverySetup: z.union([z.enum(DELIVERY_SETUPS), z.literal('')]).transform((v) => v || null),
  workingHours: optionalText,
  locationDetail: optionalText,
  preferredCarriers: optionalText,
  // 'cod' is unioned in below regardless of what the client sends (ruling 3 — locked, un-uncheckable).
  paymentMethods: z.array(z.enum(PAYMENT_METHODS)).max(PAYMENT_METHODS.length),
  categoryIds: z.array(z.string().uuid()).max(200),
})

export type SaveShopConfigResult = { ok: true } | { ok: false; error: string }

export async function saveShopConfigAction(input: unknown): Promise<SaveShopConfigResult> {
  const lang = await getLang()
  const parsed = SaveConfigInput.safeParse(input)
  if (!parsed.success) {
    console.error(
      '[saveShopConfig] rejected: input failed validation — ' +
        parsed.error.issues.map((i) => `${i.path.join('.') || '(root)'}:${i.message}`).join(', '),
    )
    return { ok: false, error: t('common.error_generic', lang) }
  }
  const { shopType, deliverySetup, workingHours, locationDetail, preferredCarriers, paymentMethods, categoryIds } =
    parsed.data

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: t('shop.create.error.notAuth', lang) }

  const owned = await resolveOwnedShopId(supabase, user.id)
  if (!owned.ok) {
    console.error(`[saveShopConfig] rejected: user ${user.id} has no shop to configure (${owned.reason})`)
    return { ok: false, error: t('common.error_generic', lang) }
  }
  const shopId = owned.shopId

  const { error: shopErr } = await supabase
    .from('shops')
    .update({
      shop_type: shopType,
      delivery_setup: deliverySetup,
      working_hours: workingHours,
      location_detail: locationDetail,
      preferred_carriers: preferredCarriers,
    })
    .eq('id', shopId)
  if (shopErr) {
    console.error('[saveShopConfig] shops update failed:', shopErr.message, shopErr.code, shopErr.details)
    return { ok: false, error: t('common.error_generic', lang) }
  }

  const selectedMethods = new Set(paymentMethods)
  selectedMethods.add('cod')
  const paymentResult = await reconcileTable(supabase, {
    table: 'shop_payment_methods',
    shopId,
    column: 'method',
    selected: [...selectedMethods],
  })
  if (!paymentResult.ok) return { ok: false, error: t('common.error_generic', lang) }

  // shop_categories references the SAME flat `categories` table product/service/job picking share
  // (product-categories.ts's own header: "categories.kind is the only thing separating them"). The
  // UI only ever offers product-kind categories, but the action must not trust that — a crafted
  // payload could otherwise tag a shop with a service-only category id. Intersect against the real
  // product-kind set rather than trusting the client's list.
  const validCategoryIds = new Set((await getProductCategories()).map((c) => c.id))
  const scopedCategoryIds = categoryIds.filter((id) => validCategoryIds.has(id))

  const categoryResult = await reconcileTable(supabase, {
    table: 'shop_categories',
    shopId,
    column: 'category_id',
    selected: scopedCategoryIds,
  })
  if (!categoryResult.ok) return { ok: false, error: t('common.error_generic', lang) }

  revalidatePath('/tableau-de-bord-vendeur')
  return { ok: true }
}

// Shared reconcile-and-write for both child tables — same shape (shop_id + one other column,
// UNIQUE(shop_id, column), owner-only RLS via the shops.owner_id EXISTS check), same procedure:
// read current rows, diff against the new selection, delete what fell off, insert what's new.
async function reconcileTable(
  supabase: Awaited<ReturnType<typeof createClient>>,
  params: { table: 'shop_payment_methods' | 'shop_categories'; shopId: string; column: 'method' | 'category_id'; selected: string[] },
): Promise<{ ok: true } | { ok: false }> {
  const { table, shopId, column, selected } = params

  const { data: existing, error: fetchErr } = await supabase.from(table).select(column).eq('shop_id', shopId)
  if (fetchErr) {
    console.error(`[saveShopConfig] ${table} fetch failed:`, fetchErr.message, fetchErr.code, fetchErr.details)
    return { ok: false }
  }

  const previous = ((existing ?? []) as Record<string, string>[]).map((row) => row[column])
  const { toDelete, toInsert } = reconcile(previous, selected)

  if (toDelete.length > 0) {
    const { error: delErr } = await supabase.from(table).delete().eq('shop_id', shopId).in(column, toDelete)
    if (delErr) {
      console.error(`[saveShopConfig] ${table} delete failed:`, delErr.message, delErr.code, delErr.details)
      return { ok: false }
    }
  }

  if (toInsert.length > 0) {
    const { error: insErr } = await supabase.from(table).insert(toInsert.map((value) => ({ shop_id: shopId, [column]: value })))
    if (insErr) {
      console.error(`[saveShopConfig] ${table} insert failed:`, insErr.message, insErr.code, insErr.details)
      return { ok: false }
    }
  }

  return { ok: true }
}
