// Dispute domain types — shared across the disputes feature series
// (PR-P2 admin queue, PR-P3 buyer create, PR-P4 seller create).
// The literal-string unions mirror the DB CHECK constraints on public.disputes
// (migration 20260608133656_disputes_schema_and_rls). The database is the
// authoritative guard (CHECKs + partial unique index + RLS); these types keep
// the enums in one place so a CHECK change is a single-file update, not five.

export type DisputeStatus =
  | 'open'
  | 'under_review'
  | 'resolved'
  | 'dismissed'

// The side the admin took on resolution. Only set when status='resolved'
// (disputes_outcome_only_when_resolved); a dismissed dispute favors no side.
export type DisputeOutcome =
  | 'sided_buyer'
  | 'sided_seller'
  | 'compromise'

// Which party of the order raised the dispute. Matched to the creator's
// identity on the order by the "Dispute creation by order party" RLS policy.
export type DisputeCreatedByRole = 'buyer' | 'seller'

export type DisputeReason =
  | 'not_delivered'
  | 'wrong_item'
  | 'damaged'
  | 'payment_refused'
  | 'buyer_unreachable'
  | 'other'

// A full disputes row as returned by select(). Mirrors the table columns
// (timestamps are ISO strings, as PostgREST returns timestamptz).
export type DisputeRow = {
  id: string
  order_id: string
  created_by_role: DisputeCreatedByRole
  reason: DisputeReason
  description: string | null
  status: DisputeStatus
  outcome: DisputeOutcome | null
  admin_note: string | null
  created_at: string
  updated_at: string
}

// Insert shape for a party creating a dispute (PR-P3 / PR-P4). The DB supplies
// id, created_at, updated_at, and the 'open' status default; outcome stays null
// until an admin resolves. admin_note is an admin-only field (set on update) so
// it is optional here.
export type DisputeInsert = {
  id?: string
  order_id: string
  created_by_role: DisputeCreatedByRole
  reason: DisputeReason
  description: string | null
  status?: DisputeStatus
  outcome?: DisputeOutcome | null
  admin_note?: string | null
  created_at?: string
  updated_at?: string
}

// Update shape for the admin resolution surface (PR-P2). Only status, outcome,
// and admin_note are admin-mutable; updated_at is stamped by the
// trg_disputes_set_updated_at trigger. All partial — a claim sets status alone,
// a resolution sets all three.
export type DisputeUpdate = {
  status?: DisputeStatus
  outcome?: DisputeOutcome | null
  admin_note?: string | null
}
