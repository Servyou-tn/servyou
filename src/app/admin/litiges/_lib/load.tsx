import { t, type Lang } from '@/lib/i18n'
import type { createClient } from '@/lib/supabase/server'
import { reportQueryError } from '@/lib/supabase/query-error'
import { relativeTimeLabel } from '@/lib/relative-time'
import { formatTunisDate, formatTunisDateTime } from '@/lib/datetime'
import { tndPrice } from '@/components/listings/listing-utils'
import { getInitials } from '@/components/ui/initials'
import type { AdminTab } from '@/components/AdminTabs'
import type { DisputeRow } from '@/lib/types/dispute'
import { DISPUTE_TABS, buildTimeline, disputeRef, disputeStatusesForTab, tabForStatus, type DisputeTab } from './disputes'
import type { DisputeListRow, Party, SelectedDispute } from '../_components/DisputesView'
import { ClaimDisputeButton } from '../[id]/ClaimDisputeButton'
import { DisputeDecisionPanel } from '../[id]/DisputeDecisionPanel'

type Supabase = Awaited<ReturnType<typeof createClient>>
type Dispute = Pick<DisputeRow, 'id' | 'order_id' | 'created_by_role' | 'reason' | 'description' | 'status' | 'outcome' | 'admin_note' | 'created_at' | 'updated_at'>
type Order = {
  id: string
  buyer_id: string
  seller_id: string
  item_title: string | null
  quantity: number
  unit_price_tnd: number | null
  order_type: string
  status: string
  cancellation_reason: string | null
}
type Person = { id: string; full_name: string | null; city: string | null; seller_type: string | null }

const DISPUTE_COLS = 'id, order_id, created_by_role, reason, description, status, outcome, admin_note, created_at, updated_at'
const TAB_LABEL: Record<DisputeTab, string> = {
  open: 'admin.reports.tab.open',
  under_review: 'admin.reports.tab.under_review',
  resolved: 'admin.reports.tab.resolved',
  dismissed: 'admin.reports.tab.dismissed',
}
const SELLER_ROLE: Record<string, string> = { freelancer: 'shell.topbar.role.freelance', shop_owner: 'admin.users.role_shop_owner' }

/** « F1B220 » — the order's id fragment (orders have no human number). */
function orderRef(id: string): string {
  return id.replace(/-/g, '').slice(0, 6).toUpperCase()
}

export type DisputesViewProps = {
  tabs: AdminTab[]
  rows: DisputeListRow[]
  failed: boolean
  emptyKey: string
  selected: SelectedDispute | null
}

/**
 * Everything J7 renders. `selectedId` = /admin/litiges/[id] (its tab follows the dispute's status); without it the
 * first dispute of the `?statut=` tab is selected. Returns `notFound` for an unknown / junk id. Every failed read
 * is reported; the list read failing is the error state, a failed timeline or party read shows « — ».
 */
export async function loadDisputesView(
  supabase: Supabase,
  lang: Lang,
  opts: { tabParam: DisputeTab; selectedId: string | null; now: number },
): Promise<DisputesViewProps | { notFound: true }> {
  let selectedDispute: Dispute | null = null
  if (opts.selectedId) {
    const { data, error } = await supabase.from('disputes').select(DISPUTE_COLS).eq('id', opts.selectedId).maybeSingle()
    if (error && error.code !== '22P02') reportQueryError('admin/litiges selected dispute', error)
    if (!data) return { notFound: true }
    selectedDispute = data as Dispute
  }
  const tab = selectedDispute ? tabForStatus(selectedDispute.status) : opts.tabParam

  const [list, openCount] = await Promise.all([
    supabase.from('disputes').select(DISPUTE_COLS).in('status', disputeStatusesForTab(tab)).order('created_at', { ascending: false }).limit(100),
    supabase.from('disputes').select('id', { count: 'exact', head: true }).eq('status', 'open'),
  ])
  if (list.error) reportQueryError('admin/litiges list', list.error)
  if (openCount.error) reportQueryError('admin/litiges open count', openCount.error)
  const disputes = (list.data as Dispute[] | null) ?? []
  const selected = selectedDispute ?? disputes[0] ?? null

  const orderIds = [...new Set([...disputes.map((d) => d.order_id), ...(selected ? [selected.order_id] : [])])]
  const { data: ordersData, error: ordersError } = orderIds.length
    ? await supabase.from('orders').select('id, buyer_id, seller_id, item_title, quantity, unit_price_tnd, order_type, status, cancellation_reason').in('id', orderIds)
    : { data: [], error: null }
  if (ordersError) reportQueryError('admin/litiges orders', ordersError)
  const orderById = new Map(((ordersData as Order[] | null) ?? []).map((o) => [o.id, o]))

  const selectedOrder = selected ? orderById.get(selected.order_id) : undefined
  const { data: eventsData, error: eventsError } = selectedOrder
    ? await supabase.from('order_events').select('id, event_type, to_status, actor_id, created_at').eq('order_id', selectedOrder.id).order('created_at', { ascending: true })
    : { data: [], error: null }
  if (eventsError) reportQueryError('admin/litiges order events', eventsError)
  const events = eventsData ?? []

  const personIds = [
    ...[...orderById.values()].flatMap((o) => [o.buyer_id, o.seller_id]),
    ...events.map((e) => e.actor_id).filter((id): id is string => Boolean(id)),
  ]
  const people = new Map<string, Person>()
  if (personIds.length > 0) {
    const { data, error } = await supabase.from('profiles').select('id, full_name, city, seller_type').in('id', [...new Set(personIds)])
    if (error) reportQueryError('admin/litiges profiles', error)
    for (const p of (data as Person[] | null) ?? []) people.set(p.id, p)
  }
  const nameOf = (id: string | null | undefined) => (id ? people.get(id)?.full_name : null) ?? '—'
  const openerOf = (d: Dispute) => {
    const o = orderById.get(d.order_id)
    return o ? (d.created_by_role === 'buyer' ? o.buyer_id : o.seller_id) : null
  }
  const motifOf = (d: Dispute) => (d.description?.trim() ? `« ${d.description.trim()} »` : t(`admin.disputes.reason_${d.reason}`, lang))

  const tabHref = (key: DisputeTab) => (key === 'open' ? '/admin/litiges' : `/admin/litiges?statut=${key}`)
  const tabs: AdminTab[] = DISPUTE_TABS.map((key) => ({
    key,
    label: t(TAB_LABEL[key], lang),
    href: tabHref(key),
    active: key === tab,
    count: key === 'open' && !openCount.error && openCount.count ? openCount.count : undefined,
  }))

  // The selected dispute stays first-class even when its row is not in this tab's first 100.
  const listed = selected && !disputes.some((d) => d.id === selected.id) ? [selected, ...disputes] : disputes
  const rows: DisputeListRow[] = listed.map((d) => {
    const opener = openerOf(d)
    return {
      id: d.id,
      href: `/admin/litiges/${d.id}`,
      ref: disputeRef(d.id),
      selected: d.id === selected?.id,
      openerName: nameOf(opener),
      openerInitials: getInitials(opener ? people.get(opener)?.full_name : null),
      openerLine: `${t(`admin.disputes.role_${d.created_by_role}`, lang)} · ${relativeTimeLabel(d.created_at, lang, opts.now)}`,
      motif: motifOf(d),
      status: d.status,
    }
  })

  let selectedView: SelectedDispute | null = null
  if (selected) {
    const o = selectedOrder
    const party = (id: string | undefined, roleKey: string): Party | null => {
      if (!id) return null
      const p = people.get(id)
      return { name: p?.full_name ?? '—', initials: getInitials(p?.full_name), line: [t(roleKey, lang), p?.city].filter(Boolean).join(' · ') }
    }
    const sellerType = o ? people.get(o.seller_id)?.seller_type ?? '' : ''
    const orderType = o?.order_type === 'product' ? 'product' : 'service'
    const timeline = o
      ? buildTimeline(events, orderType, {
          id: selected.id,
          created_at: selected.created_at,
          description: selected.description,
          reasonKey: `admin.disputes.reason_${selected.reason}`,
          openerId: openerOf(selected),
        })
      : []
    const open = selected.status === 'open' || selected.status === 'under_review'
    selectedView = {
      orderRef: orderRef(o?.id ?? selected.order_id),
      item: o?.item_title ?? '—',
      buyer: party(o?.buyer_id, 'admin.disputes.role_buyer'),
      seller: party(o?.seller_id, SELLER_ROLE[sellerType] ?? 'admin.disputes.role_seller'),
      amount: o?.unit_price_tnd != null ? `${tndPrice(o.unit_price_tnd * o.quantity, lang)} · ${t('admin.disputes.cod', lang)}` : null,
      timeline: timeline.map((e) => ({
        id: e.id,
        when: formatTunisDateTime(e.at, lang),
        label: e.labelKey === 'admin.disputes.event_opened'
          ? `${t(e.labelKey, lang)}${e.quote ? ` : « ${e.quote} »` : ` : ${t(`admin.disputes.reason_${selected.reason}`, lang)}`}`
          : t(e.labelKey, lang),
        actor: nameOf(e.actorId),
      })),
      // Kept from the built page: the order's cancellation reason is part of the evidence.
      cancellation: o?.cancellation_reason ? `${t('admin.disputes.field_cancellation_reason', lang)} : ${o.cancellation_reason}` : null,
      timelineFailed: Boolean(eventsError || ordersError),
      status: selected.status,
      claim: selected.status === 'open' ? <ClaimDisputeButton disputeId={selected.id} /> : null,
      decision: open ? <DisputeDecisionPanel disputeId={selected.id} /> : null,
      closed: open
        ? null
        : {
            headerKey: selected.status === 'resolved' ? 'admin.disputes.resolved_header' : 'admin.disputes.dismissed_header',
            outcome: selected.outcome ? t(`admin.disputes.outcome_${selected.outcome}`, lang) : null,
            note: selected.admin_note,
            date: formatTunisDate(selected.updated_at, lang, 'medium'),
          },
    }
  }

  return { tabs, rows, failed: Boolean(list.error), emptyKey: tab === 'open' ? 'admin.disputes.empty' : 'admin.disputes.empty_tab', selected: selectedView }
}
