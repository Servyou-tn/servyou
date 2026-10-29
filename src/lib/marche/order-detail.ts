import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { failQuery, isNoRowLike, reportQueryError } from '@/lib/supabase/query-error'
import { GOVERNORATES } from '@/lib/tunisia-governorates'
import type { OrderEvent } from '@/lib/marche/seller-order-detail'
import type { OrderStatus } from '@/lib/types/order-status'

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

// ⚑ TWO FORMATS, ONE COLUMN. `orders.delivery_address` has always been the single text field
// both the street and the governorate get folded into — there is no dedicated column for either,
// and per the founder's ruling (fix/e1-grid-overflow discovery pass) there will not be one for
// quartier/ville either: "extend the input type, do not fold into one string" was about keeping
// the four pieces LOGICALLY distinct, not about adding columns.
//
// LEGACY (4 real seed rows, predating this form): "{street}, {governorate}" — one line, comma-fold.
// CURRENT (this PR on): "{street}\n{quartier}\n{ville}, {governorate}" — three lines, newline-
// delimited. Newlines are the safe delimiter BECAUSE every piece is typed into a single-line
// `<input>`: a browser cannot put a literal newline into one (pasted text collapses it), so a
// street/quartier/ville containing a comma — completely normal in a real address — can never be
// mistaken for the delimiter. The comma-fold survives only on the LAST line, matching the format
// already live in 4 real rows, so the SAME `GOV_VALUES` disambiguation both formats already share
// needed no changes — just applying it to the tail line instead of the whole string.
export function encodeDeliveryAddress(parts: {
  street: string
  quartier: string
  ville: string
  governorate: string
}): string {
  return `${parts.street}\n${parts.quartier}\n${parts.ville}, ${parts.governorate}`
}

export type ParsedDeliveryAddress = {
  street: string
  /** null on every LEGACY row (predates the quartier field) — never null on a row this form wrote. */
  quartier: string | null
  /** Same legacy caveat as quartier. */
  ville: string | null
  governorate: string | null
}

export function parseDeliveryAddress(address: string | null): ParsedDeliveryAddress {
  if (!address) return { street: '', quartier: null, ville: null, governorate: null }

  const lines = address.split('\n')
  if (lines.length >= 3) {
    const [street, quartier, tail] = lines
    const idx = tail.lastIndexOf(', ')
    if (idx !== -1) {
      const gov = tail.slice(idx + 2)
      if (GOV_VALUES.has(gov)) return { street, quartier, ville: tail.slice(0, idx), governorate: gov }
    }
    // Tail doesn't end in a known governorate value — still a 3-line row, just an unrecognised
    // (or missing) governorate tag. Keep quartier; don't silently drop it to look like a legacy row.
    return { street, quartier, ville: tail, governorate: null }
  }

  // LEGACY one-line format — identical logic to before this change, additively returning
  // quartier/ville as null rather than omitting them from the shape.
  const single = lines[0]
  const idx = single.lastIndexOf(', ')
  if (idx === -1) return { street: single, quartier: null, ville: null, governorate: null }
  const tail = single.slice(idx + 2)
  if (GOV_VALUES.has(tail)) {
    return { street: single.slice(0, idx), quartier: null, ville: null, governorate: tail }
  }
  return { street: single, quartier: null, ville: null, governorate: null }
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
  /** null on the 4 pre-E1 seed rows; always set on a row this form wrote. */
  deliveryQuartier: string | null
  /** Same legacy caveat as deliveryQuartier. */
  deliveryVille: string | null
  deliveryGovernorate: string | null
  /**
   * Product: the delivery contact. Service: the number the buyer chose for THIS request
   * (E1 prefills profiles.phone but the buyer may override it), so it is set on both types.
   */
  deliveryPhone: string | null
  buyerNote: string | null
  /**
   * `orders.carrier` — read-only today: NOTHING writes it (the shop's « transporteur » is informational). Product orders only;
   * null on every real row, so E4's « Société de livraison » falls back to a neutral line.
   */
  carrier: string | null
  /** `orders.tracking_number` — the seller types it at dispatch (setOrderTrackingAction). Readable by the buyer: column SELECT is
   *  granted to `authenticated` and the « Buyer and seller read their orders » policy scopes the row. */
  trackingNumber: string | null
  /**
   * The order's `order_events`, oldest first — the buyer reads them through « Order events visible to parties and admin ».
   * Feeds E4's stepper dates, its « Historique » and where a cancelled order's rail stops. EMPTY for every order that predates
   * the events trigger, and also when the secondary read fails (reported, partial display) — a missing event reads as « not
   * recorded », never as an error.
   */
  events: OrderEvent[]
  /**
   * `orders.unit_price_tnd` — frozen at insert, never a live re-fetch. E2 shows what was
   * actually charged, not what the catalogue says today; a seller editing the price five
   * minutes after checkout must not change what the buyer's own confirmation page reports.
   * Null only for orders older than migration 20260729111547 — cannot occur for an order this
   * screen navigates to straight from `submitProductRequest`, but the type stays honest either way.
   */
  unitPriceFrozen: number | null
  /** `orders.delivery_fee_tnd` — frozen at insert, same reasoning as unitPriceFrozen. Null for
   *  every service order and for orders older than migration 20260801112027. */
  deliveryFeeFrozen: number | null
  // Service request details (null for products), unfolded from buyer_note.
  serviceDescription: string | null
  serviceTimeframe: string | null
  serviceBudget: string | null
  item: {
    title: string | null
    imageUrl: string | null
    category: string | null
    price: number | null
    /** `service_listings.delivery_time` (« 3 jours ») — free text; null for a product and when the listing set none. */
    deliveryTime: string | null
  }
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
  carrier: string | null
  tracking_number: string | null
  unit_price_tnd: number | string | null
  delivery_fee_tnd: number | string | null
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
        delivery_time: string | null
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
         carrier, tracking_number, unit_price_tnd, delivery_fee_tnd,
         products ( id, title, price_tnd, shop_id,
                    categories ( name_fr ),
                    shops ( id, name, city, logo_url ),
                    product_images ( image_url, display_order ) ),
         service_listings ( id, title, starting_price_tnd, delivery_time, freelancer_profile_id,
                    categories!service_listings_category_id_fkey ( name_fr ),
                    freelancer_profiles ( id, city, headline ) )`,
      )
      .eq('id', orderId)
      .maybeSingle()

    // The invalid-UUID case (22P02) and « no row » stay a graceful not-found; any other failure throws.
    if (error && !isNoRowLike(error)) failQuery('order-detail', error)
    if (!data) return null

    const row = data as unknown as OrderRow
    // Buyer-only view (defense in depth on top of RLS).
    if (row.buyer_id !== currentUserId) return null

    // The order's events — SECONDARY (the page renders without them: no stepper dates, no history). A failure is
    // reported and degrades to an empty list; it never turns a readable order into an error page.
    const { data: eventRows, error: eventsError } = await supabase
      .from('order_events')
      .select('event_type, from_status, to_status, actor_role, note, created_at')
      .eq('order_id', row.id)
      .order('created_at', { ascending: true })
    if (eventsError) reportQueryError('order-detail events', eventsError)
    const events: OrderEvent[] = (eventRows ?? []).map((e) => ({
      eventType: e.event_type as OrderEvent['eventType'],
      fromStatus: e.from_status as OrderStatus | null,
      toStatus: e.to_status as OrderStatus | null,
      actorRole: e.actor_role as OrderEvent['actorRole'],
      note: e.note,
      createdAt: e.created_at,
    }))

    const base = {
      id: row.id,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      receivedAt: row.received_at,
      cancelledBy: row.cancelled_by,
      cancellationReason: row.cancellation_reason,
      quantity: row.quantity,
      carrier: row.carrier,
      trackingNumber: row.tracking_number,
      events,
    }

    if (row.order_type === 'product') {
      const p = one(row.products)
      const shop = one(p?.shops)
      const { street, quartier, ville, governorate } = parseDeliveryAddress(row.delivery_address)
      return {
        ...base,
        orderType: 'product',
        deliveryName: row.delivery_name,
        deliveryStreet: street || null,
        deliveryQuartier: quartier,
        deliveryVille: ville,
        deliveryGovernorate: governorate,
        deliveryPhone: row.delivery_phone,
        buyerNote: row.buyer_note,
        // NO `??` fallback on either — see the field docs. A recap built on a live re-fetch would
        // report a price or fee the buyer was never actually charged.
        unitPriceFrozen: row.unit_price_tnd != null ? Number(row.unit_price_tnd) : null,
        deliveryFeeFrozen: row.delivery_fee_tnd != null ? Number(row.delivery_fee_tnd) : null,
        serviceDescription: null,
        serviceTimeframe: null,
        serviceBudget: null,
        item: {
          title: p?.title ?? null,
          imageUrl: primaryImage(p?.product_images),
          category: one(p?.categories)?.name_fr ?? null,
          price: p ? Number(p.price_tnd) : null,
          deliveryTime: null,
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
    if (pErr) reportQueryError('order-detail public_profiles', pErr)
    const parsed = parseServiceBuyerNote(row.buyer_note)

    return {
      ...base,
      orderType: 'service',
      deliveryName: null,
      deliveryStreet: null,
      deliveryQuartier: null,
      deliveryVille: null,
      deliveryGovernorate: null,
      // Service orders carry a contact number, not an address (E1 writes it).
      deliveryPhone: row.delivery_phone,
      buyerNote: row.buyer_note,
      // orders_delivery_fee_requires_product forbids a fee on a service row. unit_price_tnd IS frozen for services too:
      // E2's service Recap still reads the live join (item.price) and ignores this, but E4's « Service » price row prints
      // what the order was priced at when it was placed, not today's listing price.
      unitPriceFrozen: row.unit_price_tnd != null ? Number(row.unit_price_tnd) : null,
      deliveryFeeFrozen: null,
      serviceDescription: parsed.description,
      serviceTimeframe: parsed.timeframe,
      serviceBudget: parsed.budget,
      item: {
        title: s?.title ?? null,
        imageUrl: null,
        category: one(s?.categories)?.name_fr ?? null,
        price: s?.starting_price_tnd != null ? Number(s.starting_price_tnd) : null,
        deliveryTime: s?.delivery_time ?? null,
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

/**
 * The seller's phone, for the « Téléphone » row of E4's Vendeur / Freelance panel — `get_contact_phone` (SECURITY DEFINER, relationship-gated:
 * it answers only when an order links the caller to the seller, and NULL when either account is suspended or the seller has no number).
 *
 * NULL is a normal answer, not an error: the row simply does not render. An RPC FAILURE is reported and degrades to null too — the
 * page keeps its WhatsApp button, whose own click-time reveal is independent of this read.
 *
 * ⚑ The seller-side detail (G9) deliberately never prints the BUYER's number (reveal on click only). The buyer frame DOES print the
 * seller's (Figma 1469:23519 « +216 71 555 210 » + « Coordonnées visibles car vous avez une commande »), per the founder's brief.
 */
export const getSellerContactPhone = cache(async (sellerId: string): Promise<string | null> => {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('get_contact_phone', { target: sellerId })
  if (error) {
    reportQueryError('order-detail get_contact_phone', error)
    return null
  }
  return (data as string | null) ?? null
})

/**
 * Whether an OPEN dispute already exists on this order (`open` / `under_review`) — E4 then shows « Votre signalement est en cours
 * d'examen » instead of « Signaler un problème », because `disputes_one_active_per_order` would refuse a second one and the buyer would
 * only meet an error. Readable by the buyer through « Disputes visible to parties and admin ».
 *
 * SECONDARY: a failed read is reported and answers `false` (the button stays; the unique index is still the authority).
 */
export const hasActiveDispute = cache(async (orderId: string): Promise<boolean> => {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('disputes')
    .select('id')
    .eq('order_id', orderId)
    .in('status', ['open', 'under_review'])
    .limit(1)
  if (error) {
    reportQueryError('order-detail active dispute', error)
    return false
  }
  return (data ?? []).length > 0
})
