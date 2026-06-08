'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { DisputeRow } from '@/lib/types/dispute'
import { DisputePanel } from './DisputePanel'
import { CreateDisputeButton } from './CreateDisputeButton'

type Props = {
  orderId: string
  status: string
}

// Self-contained dispute section that drops identically onto all three order surfaces:
// the buyer's confirmation page (a server component) and the two seller list cards
// (client components). It fetches its own dispute(s) for the order, so it dissolves the
// server/client refresh asymmetry — no server-side embed, no onCreated prop-drilling
// from the parent. RLS lets either party read disputes on their own order. One light
// query per order card is fine at MVP list sizes.
export function OrderDisputeSection({ orderId, status }: Props) {
  const supabase = useMemo(() => createClient(), [])
  // null = still loading (render nothing rather than flash the button then a panel).
  const [disputes, setDisputes] = useState<DisputeRow[] | null>(null)

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from('disputes')
      .select('id, order_id, created_by_role, reason, description, status, outcome, admin_note, created_at, updated_at')
      .eq('order_id', orderId)
      .order('created_at', { ascending: false })
    if (error) {
      console.error('[OrderDisputeSection] disputes fetch error:', error)
      setDisputes([])
      return
    }
    setDisputes((data as DisputeRow[]) ?? [])
  }, [supabase, orderId])

  useEffect(() => { load() }, [load])

  if (disputes === null) return null

  // Active = the one open/under_review dispute (the partial unique index allows at most
  // one). Display = the active one if present, else the most recent (rows are sorted
  // created_at desc) so a closed dispute stays visible as evidence.
  const active = disputes.find(d => d.status === 'open' || d.status === 'under_review') ?? null
  const display = active ?? disputes[0] ?? null
  const canCreate = status !== 'pending'

  // Nothing to show and nothing to do (order still pending, no dispute) → render nothing.
  if (!display && !canCreate) return null

  return (
    <div className="space-y-3">
      <DisputePanel dispute={display} />
      <CreateDisputeButton
        orderId={orderId}
        hasActiveDispute={!!active}
        canCreate={canCreate}
        onCreated={load}
      />
    </div>
  )
}
