'use server'

import { createClient } from '@/lib/supabase/server'
import { checkAdmin } from '@/lib/auth/require-admin'

export type CsvExportResult = { csv: string; filename: string } | { error: string }

type ReceivedOrder = { id: string; order_type: string; received_at: string | null }

// Standard CSV cell escaping: wrap in double-quotes and double any internal quotes
// when the cell contains a comma, quote, or newline. Current columns (uuid, enum,
// date) never trigger it, but escape defensively so a future column can't corrupt
// the file.
function escapeCsvCell(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}

// ISO timestamp → YYYY-MM-DD (the first 10 chars). Empty string for a null timestamp.
function toDate(value: string | null): string {
  return value ? value.slice(0, 10) : ''
}

// Generates a CSV of completed (received) orders for founder export. Admin-gated at
// the action boundary by checkAdmin (the orders RLS would also restrict a non-admin to
// their own rows, but we fail closed with a friendly error first — including when the
// is_admin lookup itself fails). Ships only aggregate fields — order_id, order_type,
// received_at date — never buyer/seller IDs, delivery details, or notes.
export async function generateCompletedOrdersCsv(): Promise<CsvExportResult> {
  const supabase = await createClient()

  const admin = await checkAdmin(supabase)
  if (!admin.ok) {
    console.error(`[admin/statistiques] completed-orders CSV rejected: ${admin.reason}`)
    return { error: 'forbidden' }
  }

  const { data, error } = await supabase
    .from('orders')
    .select('id, order_type, received_at')
    .eq('status', 'received')
    .order('received_at', { ascending: false })

  if (error) {
    console.error('[admin/statistiques] completed-orders CSV query error:', error.message, error.code, error.details)
    return { error: 'error' }
  }

  const rows = (data as ReceivedOrder[] | null) ?? []
  const header = ['order_id', 'order_type', 'received_at_date']
  const lines = [header.join(',')]
  for (const o of rows) {
    lines.push([escapeCsvCell(o.id), escapeCsvCell(o.order_type), escapeCsvCell(toDate(o.received_at))].join(','))
  }
  const csv = lines.join('\n')

  const today = new Date().toISOString().slice(0, 10)
  const filename = rows.length === 0
    ? `servyou-commandes-terminees-vide-${today}.csv`
    : `servyou-commandes-terminees-${today}.csv`

  return { csv, filename }
}
