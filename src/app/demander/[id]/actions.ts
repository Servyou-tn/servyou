'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { getLang } from '@/lib/i18n/server'
import { t } from '@/lib/i18n'
import { normalizePhone } from '@/lib/phone'
import { encodeDeliveryAddress } from '@/lib/marche/order-detail'
import { ProductRequestSchema, ServiceRequestSchema } from './schema'

// Both actions create an order with status='pending'. RLS enforces buyer_id = auth.uid()
// on INSERT. seller_id is NOT sent: the BEFORE INSERT trigger enforce_order_insert_integrity
// (migration 20261023170918) sets it from the item's owner and discards any client value, and
// also rejects a non-live item or a self-order. The orders table has no total / governorate /
// timeframe / budget columns, so (per the agreed plan) the governorate is folded into
// delivery_address and the service timeframe/budget into buyer_note. A service request also
// fills delivery_phone — for a service that column carries the buyer's chosen contact number,
// not a delivery address.
// The buyer_note fold is a two-way contract with parseServiceBuyerNote (lib/marche/
// order-detail.ts); src/__tests__/service-buyer-note-roundtrip.test.ts guards it.
// Validation re-runs server-side via Zod (./schema.ts) — the client checks are UX only.

export type RequestResult = { ok: true; orderId: string } | { ok: false; error: string }

export type ProductRequestInput = {
  productId: string
  deliveryName: string
  /** Street + number — "Rue et numéro". */
  deliveryStreet: string
  /** Neighbourhood/district — often the only thing that makes a Tunisian address findable. */
  quartier: string
  /** Free-text city/town. No reference dataset exists for Tunisian villes (see the founder's
   *  ruling) — filter-cities.ts is the SELLER's shop-city list, a different concept entirely. */
  ville: string
  governorate: string
  deliveryPhone: string
  quantity: number
  note: string
}

export async function submitProductRequest(input: ProductRequestInput): Promise<RequestResult> {
  const lang = await getLang()

  // Server-side guard (client validates inline for UX; this is the real gate).
  const parsed = ProductRequestSchema.safeParse(input)
  if (!parsed.success) {
    console.error(
      '[submitProductRequest] rejected: input failed validation — ' +
        parsed.error.issues.map((i) => `${i.path.join('.') || '(root)'}:${i.message}`).join(', '),
    )
    if (parsed.error.issues[0]?.path[0] === 'productId') return { ok: false, error: t('demander.notFound', lang) }
    return { ok: false, error: t('demander.toast.error', lang) }
  }
  const p = parsed.data

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: t('demander.error.notAuth', lang) }

  // Authoritative re-fetch: stock + moderation gate. The seller is no longer read here — the DB
  // resolves it (see the header).
  const { data: product, error: pErr } = await supabase
    .from('products')
    .select('id, tracks_stock, stock_count, shops!inner ( admin_hidden_at )')
    .eq('id', p.productId)
    .eq('status', 'active')
    .is('shops.admin_hidden_at', null)
    .maybeSingle()
  if (pErr) console.error('[submitProductRequest] product fetch error:', pErr.message, pErr.code, pErr.details)
  if (!product) return { ok: false, error: t('demander.notFound', lang) }

  const tracksStock = Boolean((product as { tracks_stock: boolean | null }).tracks_stock)
  const stockCount = (product as { stock_count: number | null }).stock_count
  if (tracksStock && stockCount != null && p.quantity > stockCount) {
    return { ok: false, error: t('demander.error.stock', lang) }
  }

  const { data: order, error: insErr } = await supabase
    .from('orders')
    .insert({
      buyer_id: user.id,
      order_type: 'product',
      product_id: p.productId,
      service_listing_id: null,
      status: 'pending',
      delivery_name: p.deliveryName,
      // Four logically distinct pieces, ONE text column — encodeDeliveryAddress keeps them
      // parseable (order-detail.ts) rather than an ad-hoc concat here that could drift from what
      // parseDeliveryAddress actually expects. delivery_fee_tnd is deliberately NOT set here — the
      // BEFORE INSERT trigger (set_order_snapshot) reads it from products.delivery_fee_tnd and
      // discards any client-supplied value, same as unit_price_tnd/item_title below.
      delivery_address: encodeDeliveryAddress({
        street: p.deliveryStreet,
        quartier: p.quartier,
        ville: p.ville,
        governorate: p.governorate,
      }),
      delivery_phone: normalizePhone(p.deliveryPhone),
      quantity: p.quantity,
      buyer_note: p.note || null,
    })
    .select('id')
    .single()

  if (insErr || !order) {
    console.error('[submitProductRequest] insert error:', insErr?.message, insErr?.code, insErr?.details)
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
  /** Contact number for THIS request — prefilled from profiles.phone, editable. */
  phone: string
}

export async function submitServiceRequest(input: ServiceRequestInput): Promise<RequestResult> {
  const lang = await getLang()

  const parsed = ServiceRequestSchema.safeParse(input)
  if (!parsed.success) {
    console.error(
      '[submitServiceRequest] rejected: input failed validation — ' +
        parsed.error.issues.map((i) => `${i.path.join('.') || '(root)'}:${i.message}`).join(', '),
    )
    const field = parsed.error.issues[0]?.path[0]
    if (field === 'serviceId') return { ok: false, error: t('demander.notFound', lang) }
    // Per-order contact choice, not the account phone: the buyer picks which number this
    // freelancer gets. Required — a buyer with no profiles.phone is captured here.
    if (field === 'phone') return { ok: false, error: t('demander.error.phoneFormat', lang) }
    return { ok: false, error: t('demander.toast.error', lang) }
  }
  const s = parsed.data

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: t('demander.error.notAuth', lang) }

  const { data: service, error: sErr } = await supabase
    .from('service_listings')
    .select('id, freelancer_profiles!inner ( admin_hidden_at )')
    .eq('id', s.serviceId)
    .eq('status', 'active')
    .is('admin_hidden_at', null)
    .is('freelancer_profiles.admin_hidden_at', null)
    .maybeSingle()
  if (sErr) console.error('[submitServiceRequest] service fetch error:', sErr.message, sErr.code, sErr.details)
  if (!service) return { ok: false, error: t('demander.notFound', lang) }

  // Fold the optional timeframe/budget into buyer_note (no dedicated columns).
  let note = s.description
  if (s.timeframe) note += `\n\n[Délai: ${s.timeframe}]`
  if (s.budget != null) note += `\n[Budget: ${s.budget} TND]`

  const { data: order, error: insErr } = await supabase
    .from('orders')
    .insert({
      buyer_id: user.id,
      order_type: 'service',
      service_listing_id: s.serviceId,
      product_id: null,
      status: 'pending',
      // Stored on the order so the choice never leaks into the next request.
      delivery_phone: normalizePhone(s.phone),
      buyer_note: note,
    })
    .select('id')
    .single()

  if (insErr || !order) {
    console.error('[submitServiceRequest] insert error:', insErr?.message, insErr?.code, insErr?.details)
    return { ok: false, error: t('common.error_generic', lang) }
  }

  revalidatePath('/mes-commandes')
  return { ok: true, orderId: order.id }
}
