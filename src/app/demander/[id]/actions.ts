'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getLang } from '@/lib/i18n/server'
import { t } from '@/lib/i18n'
import { isValidPhone, normalizePhone } from '@/lib/phone'
import { GOVERNORATES } from '@/lib/tunisia-governorates'

// Both actions create an order with status='pending'. RLS enforces buyer_id = auth.uid()
// on INSERT; the lifecycle trigger only governs UPDATE, so the initial insert passes.
// The orders table has no total / governorate / timeframe / budget columns, so (per the
// agreed plan) the governorate is folded into delivery_address and the service timeframe/
// budget into buyer_note. Validation re-runs server-side — the client checks are UX only.

export type RequestResult = { ok: true; orderId: string } | { ok: false; error: string }

function one<T>(embed: T | T[] | null | undefined): T | null {
  if (Array.isArray(embed)) return embed[0] ?? null
  return embed ?? null
}

export type ProductRequestInput = {
  productId: string
  deliveryName: string
  deliveryAddress: string
  governorate: string
  deliveryPhone: string
  quantity: number
  note: string
}

export async function submitProductRequest(input: ProductRequestInput): Promise<RequestResult> {
  const lang = await getLang()
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: t('demander.error.notAuth', lang) }

  // Authoritative re-fetch: seller (shop owner), price/stock, moderation gate.
  const { data: product, error: pErr } = await supabase
    .from('products')
    .select('id, tracks_stock, stock_count, shops!inner ( owner_id, admin_hidden_at )')
    .eq('id', input.productId)
    .eq('status', 'active')
    .is('shops.admin_hidden_at', null)
    .maybeSingle()
  if (pErr) console.error('[submitProductRequest] product fetch error:', pErr)
  if (!product) return { ok: false, error: t('demander.notFound', lang) }

  const shop = one(product.shops as unknown as { owner_id: string; admin_hidden_at: string | null } | { owner_id: string; admin_hidden_at: string | null }[] | null)
  const sellerId = shop?.owner_id
  if (!sellerId) return { ok: false, error: t('common.error_generic', lang) }

  const name = input.deliveryName.trim()
  const address = input.deliveryAddress.trim()
  const gov = input.governorate.trim()
  const qty = Math.floor(Number(input.quantity))

  // Server-side guard (client validates inline for UX; this is the real gate).
  if (!name || !address || !gov || !isValidPhone(input.deliveryPhone)) {
    return { ok: false, error: t('demander.toast.error', lang) }
  }
  if (!GOVERNORATES.some((g) => g.value === gov)) {
    return { ok: false, error: t('demander.toast.error', lang) }
  }
  if (!Number.isFinite(qty) || qty < 1) {
    return { ok: false, error: t('demander.toast.error', lang) }
  }
  const tracksStock = Boolean((product as { tracks_stock: boolean | null }).tracks_stock)
  const stockCount = (product as { stock_count: number | null }).stock_count
  if (tracksStock && stockCount != null && qty > stockCount) {
    return { ok: false, error: t('demander.error.stock', lang) }
  }

  const { data: order, error: insErr } = await supabase
    .from('orders')
    .insert({
      buyer_id: user.id,
      seller_id: sellerId,
      order_type: 'product',
      product_id: input.productId,
      service_listing_id: null,
      status: 'pending',
      delivery_name: name,
      delivery_address: `${address}, ${gov}`, // governorate folded in (no dedicated column)
      delivery_phone: normalizePhone(input.deliveryPhone),
      quantity: qty,
      buyer_note: input.note.trim() || null,
    })
    .select('id')
    .single()

  if (insErr || !order) {
    console.error('[submitProductRequest] insert error:', insErr)
    return { ok: false, error: t('common.error_generic', lang) }
  }

  revalidatePath('/mes-commandes')
  return { ok: true, orderId: order.id }
}

export type ServiceRequestInput = {
  serviceId: string
  description: string
  timeframe: string
  budget: string
}

const MIN_DESCRIPTION = 20

export async function submitServiceRequest(input: ServiceRequestInput): Promise<RequestResult> {
  const lang = await getLang()
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: t('demander.error.notAuth', lang) }

  const { data: service, error: sErr } = await supabase
    .from('service_listings')
    .select('id, freelancer_profiles!inner ( profile_id, admin_hidden_at )')
    .eq('id', input.serviceId)
    .eq('status', 'active')
    .is('admin_hidden_at', null)
    .is('freelancer_profiles.admin_hidden_at', null)
    .maybeSingle()
  if (sErr) console.error('[submitServiceRequest] service fetch error:', sErr)
  if (!service) return { ok: false, error: t('demander.notFound', lang) }

  const fp = one(service.freelancer_profiles as unknown as { profile_id: string | null } | { profile_id: string | null }[] | null)
  const sellerId = fp?.profile_id
  if (!sellerId) return { ok: false, error: t('common.error_generic', lang) }

  const description = input.description.trim()
  if (description.length < MIN_DESCRIPTION) {
    return { ok: false, error: t('demander.toast.error', lang) }
  }

  const timeframe = input.timeframe.trim()
  const budgetRaw = input.budget.trim()
  let budgetNum: number | null = null
  if (budgetRaw) {
    const n = Number(budgetRaw)
    if (!Number.isFinite(n) || n < 0) return { ok: false, error: t('demander.toast.error', lang) }
    budgetNum = n
  }

  // Fold the optional timeframe/budget into buyer_note (no dedicated columns).
  let note = description
  if (timeframe) note += `\n\n[Délai: ${timeframe}]`
  if (budgetNum != null) note += `\n[Budget: ${budgetNum} TND]`

  const { data: order, error: insErr } = await supabase
    .from('orders')
    .insert({
      buyer_id: user.id,
      seller_id: sellerId,
      order_type: 'service',
      service_listing_id: input.serviceId,
      product_id: null,
      status: 'pending',
      buyer_note: note,
    })
    .select('id')
    .single()

  if (insErr || !order) {
    console.error('[submitServiceRequest] insert error:', insErr)
    return { ok: false, error: t('common.error_generic', lang) }
  }

  revalidatePath('/mes-commandes')
  return { ok: true, orderId: order.id }
}
