import { statusPillFor } from '@/lib/orders/order-status'

// Pure logic for /admin/litiges (Figma J7): tabs, the dispute reference, and the « Historique » timeline
// built from order_events plus the dispute itself. No Supabase here.

export const DISPUTE_TABS = ['open', 'under_review', 'resolved', 'dismissed'] as const
export type DisputeTab = (typeof DISPUTE_TABS)[number]

export function parseDisputeTab(value: unknown): DisputeTab {
  return typeof value === 'string' && (DISPUTE_TABS as readonly string[]).includes(value) ? (value as DisputeTab) : 'open'
}

// « Ouverts » is the work queue (open + claimed), as on /admin/signalements (PR-1 D2); its badge counts open only.
export function disputeStatusesForTab(tab: DisputeTab): string[] {
  return tab === 'open' ? ['open', 'under_review'] : [tab]
}

export function tabForStatus(status: string): DisputeTab {
  return status === 'resolved' || status === 'dismissed' ? status : 'open'
}

/** « #3f2a1b9c » — the id fragment (disputes have no human number). */
export function disputeRef(id: string): string {
  return id.slice(0, 8)
}

export type OrderEvent = {
  id: string
  event_type: string
  to_status: string | null
  actor_id: string | null
  created_at: string
}

export type TimelineEntry = {
  id: string
  at: string
  /** i18n key + optional quoted text appended by the view. */
  labelKey: string
  quote: string | null
  actorId: string | null
}

/**
 * The order's events (oldest first) followed by « Litige ouvert », sorted by time. `created` reads as « Demande
 * envoyée par l'acheteur » for a service and « Commande passée par l'acheteur » for a product; a status change
 * reuses the order status label; unknown event types get a neutral label, never a raw code.
 */
export function buildTimeline(
  events: readonly OrderEvent[],
  orderType: 'product' | 'service',
  dispute: { id: string; created_at: string; description: string | null; reasonKey: string; openerId: string | null },
): TimelineEntry[] {
  const entries: TimelineEntry[] = events.map((e) => {
    let labelKey = 'admin.disputes.event_other'
    if (e.event_type === 'created') labelKey = orderType === 'service' ? 'admin.disputes.event_created_service' : 'admin.disputes.event_created_product'
    else if (e.event_type === 'print') labelKey = 'admin.disputes.event_print'
    else if (e.event_type === 'status_change' && e.to_status) labelKey = statusPillFor(e.to_status, orderType)?.labelKey ?? 'admin.disputes.event_other'
    return { id: e.id, at: e.created_at, labelKey, quote: null, actorId: e.actor_id }
  })
  entries.push({
    id: `dispute-${dispute.id}`,
    at: dispute.created_at,
    labelKey: 'admin.disputes.event_opened',
    quote: dispute.description?.trim() || null,
    actorId: dispute.openerId,
  })
  return entries.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime())
}
