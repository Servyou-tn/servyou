import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { parseServiceBuyerNote } from '@/lib/marche/order-detail'
import type { OrderStatus } from '@/lib/types/order-status'
import {
  clientTypeOf,
  pageEngagements,
  type Engagement,
  type EngagementSort,
  type EngagementsPage,
  type EngagementTab,
} from './engagements'

// H8 « Mes engagements » data layer — the freelancer's inbox of SERVICE orders (Figma 273:8575,
// docs/design/h8-measurements.md). Read-only: transitions go through the server actions in
// app/actions/orders.ts, which are seller-agnostic (they authorise on orders.seller_id).
//
// A SIBLING of getSellerOrders (G8), not that function with a flag: G8's tabs and its « actionable » set
// are shaped around the 7-step product chain, and its rows carry no category, avatar or brief. Same scoping
// column though — `orders.seller_id = auth.uid()`, the one check_order_status_transition authorises on, so
// the list can never show a row the freelancer could not act on. For a freelancer that id is the
// freelancer's profile id (enforce_order_insert_integrity writes it from freelancer_profiles.profile_id).
//
// `order_type = 'service'` is asked for explicitly even though the one-seller-capability rule means a
// freelancer cannot own a product order: the page's contract should not depend on that.

type ListingEmbed = {
  title: string
  starting_price_tnd: number | string | null
  categories: { slug: string } | { slug: string }[] | null
}

type Row = {
  id: string
  status: string
  created_at: string
  received_at: string | null
  cancelled_at: string | null
  cancellation_reason: string | null
  buyer_id: string
  buyer_note: string | null
  item_title: string | null
  unit_price_tnd: number | string | null
  service_listings: ListingEmbed | ListingEmbed[] | null
}

type ProfileRow = {
  id: string
  full_name: string | null
  city: string | null
  avatar_url: string | null
  seller_type: string | null
}

function one<T>(embed: T | T[] | null | undefined): T | null {
  if (Array.isArray(embed)) return embed[0] ?? null
  return embed ?? null
}

/**
 * One page of the freelancer's engagements, plus the stat tiles.
 *
 * Never degrades to « you have no engagements » on a failed query — that reads as « nothing to do » and
 * the freelancer simply does not answer. It throws, like getSellerOrders.
 */
export const getEngagements = cache(
  async (
    userId: string,
    opts: { tab: EngagementTab; q: string; sort: EngagementSort; page: number },
  ): Promise<EngagementsPage> => {
    const supabase = await createClient()

    // `categories!service_listings_category_id_fkey`: service_listings has TWO foreign keys to categories
    // (category_id and subcategory_id), so an unhinted embed is PGRST201 and — caught by nothing — an empty
    // list (docs: project_pgrst201_category_embeds).
    const { data, error } = await supabase
      .from('orders')
      .select(
        `id, status, created_at, received_at, cancelled_at, cancellation_reason, buyer_id, buyer_note,
         item_title, unit_price_tnd,
         service_listings ( title, starting_price_tnd, categories!service_listings_category_id_fkey ( slug ) )`,
      )
      .eq('seller_id', userId)
      .eq('order_type', 'service')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[engagements] fetch error:', error.message, error.code, error.details)
      throw new Error(`engagements fetch failed: ${error.message}`)
    }

    const rows = (data ?? []) as unknown as Row[]

    // Client identity from public_profiles — profiles SELECT is owner-only, so an embed would return null
    // for every buyer. It carries exactly what the row shows: name, city, avatar, seller_type.
    const buyerIds = [...new Set(rows.map((r) => r.buyer_id).filter(Boolean))]
    const buyers = new Map<string, ProfileRow>()
    if (buyerIds.length > 0) {
      const { data: profiles, error: pErr } = await supabase
        .from('public_profiles')
        .select('id, full_name, city, avatar_url, seller_type')
        .in('id', buyerIds)
      if (pErr) console.error('[engagements] public_profiles error:', pErr.message, pErr.code)
      for (const p of (profiles ?? []) as ProfileRow[]) buyers.set(p.id, p)
    }

    const all: Engagement[] = rows.map((r) => {
      const buyer = buyers.get(r.buyer_id)
      const listing = one(r.service_listings)
      // Snapshot first; the live listing price is the self-retiring fallback for the pre-snapshot orders
      // (`??`, not `||`: a zero price must not fall through). « Dès » is true of either — it is a STARTING price.
      const price = r.unit_price_tnd ?? listing?.starting_price_tnd ?? null
      return {
        id: r.id,
        status: r.status as OrderStatus,
        // Snapshot wins; the live join is the self-retiring fallback for the pre-snapshot orders.
        title: r.item_title ?? listing?.title ?? '',
        categorySlug: one(listing?.categories)?.slug ?? null,
        clientId: r.buyer_id,
        clientName: buyer?.full_name ?? '',
        clientCity: buyer?.city ?? null,
        clientAvatarUrl: buyer?.avatar_url ?? null,
        clientType: clientTypeOf(buyer?.seller_type),
        createdAt: r.created_at,
        receivedAt: r.received_at,
        cancelledAt: r.cancelled_at,
        cancellationReason: r.cancellation_reason,
        startingPrice: price != null ? Number(price) : null,
        requestedTimeframe: parseServiceBuyerNote(r.buyer_note).timeframe,
      }
    })

    return pageEngagements(all, opts)
  },
)
