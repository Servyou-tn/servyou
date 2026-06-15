import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { GOVERNORATES } from '@/lib/tunisia-governorates'

// Single-order detail fetch for /mes-commandes/[id] — the buyer's view of one order.
// RLS already restricts SELECT to (buyer OR seller); this page is strictly the buyer's
// perspective, so getOrderDetail re-checks buyer_id === currentUserId and returns null
// otherwise (defense in depth — a seller, or anyone else, gets the not-found state).
// The orders table folds two values at creation (see demander/[id]/actions.ts): the
// governorate is appended to delivery_address as "{street}, {gov}", and a service request's
// timeframe/budget are appended to buyer_note. parseDeliveryAddress / parseServiceBuyerNote
// unfold them for clean display. Errors are captured and surfaced (never a silent return).

function one<T>(embed: T | T[] | null | undefined): T | null {
  if (Array.isArray(embed)) return embed[0] ?? null
  return embed ?? null
}

function primaryImage(images: { image_url: string; display_order: number }[] | null | undefined): string | null {
  if (!images || images.length === 0) return null
  return [...images].sort((a, b) => a.display_order - b.display_order)[0]?.image_url ?? null
}

const GOV_VALUES = new Set(GOVERNORATES.map((g) => g.value))

// "{street}, {governorate}" → split on the LAST ", " (governorate is appended last and
// contains no comma), but only when the tail is a known governorate value. A street that
// happens to end in ", X" where X is not a governorate stays whole (gov = null).
export function parseDeliveryAddress(address: string | null): { street: string; governorate: string | null } {
  if (!address) return { street: '', governorate: null }
  const idx = address.lastIndexOf(', ')
  if (idx === -1) return { street: address, governorate: null }
  const tail = address.slice(idx + 2)
  if (GOV_VALUES.has(tail)) return { street: address.slice(0, idx), governorate: tail }
  return { street: address, governorate: null }
}

// "{description}\n\n[Délai: ...]\n[Budget: ... TND]" → its three parts. The optional tags are
// appended in this exact format by submitServiceRequest; the description is everything before
// the first tag.
export function parseServiceBuyerNote(
  note: string | null,
): { description: string; timeframe: string | null; budget: string | null } {
  if (!note) return { description: '', timeframe: null, budget: null }
  const timeframeMatch = note.match(/\n\n\[Délai: ([^\]]*)\]/)
  const budgetMatch = note.match(/\n\[Budget: ([^\]]*) TND\]/)
  const tagStarts = [note.indexOf('\n\n[Délai:'), note.indexOf('\n[Budget:')].filter((i) => i !== -1)
  const cut = tagStarts.length ? Math.min(...tagStarts) : note.length
  return {
    description: note.slice(0, cut),
    timeframe: timeframeMatch ? timeframeMatch[1] : null,
    budget: budgetMatch ? budgetMatch[1] : null,
  }
}

export type OrderDetailSeller = {
  type: 'shop' | 'freelancer'
  /** seller_id — the WhatsApp reveal target (get_contact_phone) and the seller's profile id. */
  id: string
  /** shop.id (product) or freelancer_profiles.id (service) for the public shop/profile link. */
  linkId: string | null
  name: string
  city: string | null
  /** Shop logo. Freelancers have no public avatar field → null (initials fallback). */
  logoUrl: string | null
  /** Freelancer headline. null for a shop. */
  headline: string | null
}

export type OrderDetail = {
  id: string
  orderType: 'product' | 'service'
  status: string
  createdAt: string
  updatedAt: string
  receivedAt: string | null
  cancelledBy: 'buyer' | 'seller' | null
  cancellationReason: string | null
  quantity: number
  // Product delivery details (null for services).
  deliveryName: string | null
  deliveryStreet: string | null
  deliveryGovernorate: string | null
  deliveryPhone: string | null
  buyerNote: string | null
  // Service request details (null for products), unfolded from buyer_note.
  serviceDescription: string | null
  serviceTimeframe: string | null
  serviceBudget: string | null
  item: { title: string | null; imageUrl: string | null; category: string | null; price: number | null }
  seller: OrderDetailSeller
}

type OrderRow = {
  id: string
  order_type: 'product' | 'service'
  status: string
  quantity: number
  buyer_id: string
  seller_id: string
  delivery_name: string | null
  delivery_address: string | null
  delivery_phone: string | null
  buyer_note: string | null
  created_at: string
  updated_at: string
  cancelled_by: 'buyer' | 'seller' | null
  cancellation_reason: string | null
  received_at: string | null
  products:
    | {
        id: string
        title: string
        price_tnd: number | string
        shop_id: string | null
        categories: { name_fr: string } | { name_fr: string }[] | null
        shops: { id: string; name: string | null; city: string | null; logo_url: string | null } | { id: string; name: string | null; city: string | null; logo_url: string | null }[] | null
        product_images: { image_url: string; display_order: number }[] | null
      }
    | null
  service_listings:
    | {
        id: string
        title: string
        starting_price_tnd: number | string | null
        freelancer_profile_id: string | null
        categories: { name_fr: string } | { name_fr: string }[] | null
        freelancer_profiles: { id: string; city: string | null; headline: string | null } | { id: string; city: string | null; headline: string | null }[] | null
      }
    | null
}

// Wrapped in React cache() so generateMetadata + the page share a single fetch per request.
export const getOrderDetail = cache(
  async (orderId: string, currentUserId: string): Promise<OrderDetail | null> => {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('orders')
      .select(
        `id, order_type, status, quantity, buyer_id, seller_id,
         delivery_name, delivery_address, delivery_phone, buyer_note,
         created_at, updated_at, cancelled_by, cancellation_reason, received_at,
         products ( id, title, price_tnd, shop_id,
                    categories ( name_fr ),
                    shops ( id, name, city, logo_url ),
                    product_images ( image_url, display_order ) ),
         service_listings ( id, title, starting_price_tnd, freelancer_profile_id,
                    categories ( name_fr ),
                    freelancer_profiles ( id, city, headline ) )`,
      )
      .eq('id', orderId)
      .maybeSingle()

    if (error) {
      // Includes the invalid-UUID case (Postgres 22P02) → graceful not-found, no crash.
      console.error('[order-detail] fetch error:', error)
      return null
    }
    if (!data) return null

    const row = data as unknown as OrderRow
    // Buyer-only view (defense in depth on top of RLS).
    if (row.buyer_id !== currentUserId) return null

    const base = {
      id: row.id,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      receivedAt: row.received_at,
      cancelledBy: row.cancelled_by,
      cancellationReason: row.cancellation_reason,
      quantity: row.quantity,
    }

    if (row.order_type === 'product') {
      const p = one(row.products)
      const shop = one(p?.shops)
      const { street, governorate } = parseDeliveryAddress(row.delivery_address)
      return {
        ...base,
        orderType: 'product',
        deliveryName: row.delivery_name,
        deliveryStreet: street || null,
        deliveryGovernorate: governorate,
        deliveryPhone: row.delivery_phone,
        buyerNote: row.buyer_note,
        serviceDescription: null,
        serviceTimeframe: null,
        serviceBudget: null,
        item: {
          title: p?.title ?? null,
          imageUrl: primaryImage(p?.product_images),
          category: one(p?.categories)?.name_fr ?? null,
          price: p ? Number(p.price_tnd) : null,
        },
        seller: {
          type: 'shop',
          id: row.seller_id,
          linkId: shop?.id ?? null,
          name: shop?.name ?? '',
          city: shop?.city ?? null,
          logoUrl: shop?.logo_url ?? null,
          headline: null,
        },
      }
    }

    // Service order. The freelancer display name comes from the public_profiles view
    // (profiles is owner-only); seller_id IS the freelancer's profile id.
    const s = one(row.service_listings)
    const fp = one(s?.freelancer_profiles)
    const { data: prof, error: pErr } = await supabase
      .from('public_profiles')
      .select('full_name')
      .eq('id', row.seller_id)
      .maybeSingle()
    if (pErr) console.error('[order-detail] public_profiles error:', pErr)
    const parsed = parseServiceBuyerNote(row.buyer_note)

    return {
      ...base,
      orderType: 'service',
      deliveryName: null,
      deliveryStreet: null,
      deliveryGovernorate: null,
      deliveryPhone: null,
      buyerNote: row.buyer_note,
      serviceDescription: parsed.description,
      serviceTimeframe: parsed.timeframe,
      serviceBudget: parsed.budget,
      item: {
        title: s?.title ?? null,
        imageUrl: null,
        category: one(s?.categories)?.name_fr ?? null,
        price: s?.starting_price_tnd != null ? Number(s.starting_price_tnd) : null,
      },
      seller: {
        type: 'freelancer',
        id: row.seller_id,
        linkId: fp?.id ?? null,
        name: prof?.full_name ?? '',
        city: fp?.city ?? null,
        logoUrl: null,
        headline: fp?.headline ?? null,
      },
    }
  },
)
