// The bell, v1 (docs/follow-ups/bell-notifications-plan.md §1 and §3; migration 20261116201553_bell_notifications).
// A notifications row stores keys, never text: `kind`, `from_status`, `to_status`. This module is the PANEL'S CONTRACT:
// the item it renders, whatever the kind, and the client-side helpers. Rows become items in ./bell-kinds.ts (server
// side), the one place a later kind (plan §7: mission alerts, proposals, stock, moderation) is added. No imports, so the
// client hook that reads this module never pulls the kind map into the browser bundle. Pure: no I/O.

/** One notifications row with the columns its kind needs, as the loader selects it. v1: the order the event is about. */
export type BellRow = {
  id: string
  kind: string
  from_status: string | null
  to_status: string
  created_at: string
  read_at: string | null
  order: {
    id: string
    buyer_id: string
    seller_id: string
    order_type: string
    item_title: string | null
    refusal_reason: string | null
  } | null
}

/**
 * Icon KEYS (lucide names, kebab-case). The panel maps them to lucide components: a Server → Client prop must stay
 * serialisable (the AideIcon pattern, src/lib/aide/groups.ts). A new kind adds its key here, and the panel's
 * `Record<BellIcon, LucideIcon>` then fails to type-check until the icon is mapped.
 */
export type BellIcon = 'package' | 'inbox' | 'handshake'

/** Semantic tones. The panel maps them to tokens. */
export type BellTone = 'info' | 'success' | 'warning' | 'danger' | 'neutral'

/** A sentence variable: a KEY translated in the reader's language (a status label), or a plain value (a count). */
export type BellVar = { key: string } | { value: string | number }

/** A sentence key and its {variables}, translated at render (a language switch re-translates). */
export type BellSentence = { key: string; vars?: Record<string, BellVar> }

/** What the client panel gets, for every kind alike. Keys and data only: no text, no component. */
export type BellItem = {
  id: string
  kind: string
  icon: BellIcon
  tone: BellTone
  sentence: BellSentence
  /** What the event is about, as its owner wrote it (an order's item title snapshot), or null. Shown in an isolate. */
  title: string | null
  /** A reference for when there is no title (an order's « #A4F729 »), or null for a kind that has none. */
  ref: string | null
  href: string
  createdAt: string
  unread: boolean
}

/** The bell's data for one page load. `ok: false` = the read failed: the panel says so, never « no notifications ». */
export type BellFeed = { ok: true; items: BellItem[]; unreadCount: number } | { ok: false }

export const BELL_LIMIT = 20

type Translate = (key: string, vars?: Record<string, string | number>) => string

/** The item's line in the reader's language. The panel passes `(key, vars) => t(key, lang, vars)`. */
export function bellSentenceText(sentence: BellSentence, tr: Translate): string {
  if (!sentence.vars) return tr(sentence.key)
  const vars: Record<string, string | number> = {}
  for (const [name, v] of Object.entries(sentence.vars)) vars[name] = 'key' in v ? tr(v.key) : v.value
  return tr(sentence.key, vars)
}

export type BellOptimisticAction = { type: 'read'; id: string } | { type: 'all' }

/**
 * The panel's optimistic state while a mark-read call is in flight (useOptimistic). The server count stays the truth:
 * the next page load (or the refresh after « Tout marquer ») replaces this.
 */
export function applyBellAction(feed: BellFeed, action: BellOptimisticAction): BellFeed {
  if (!feed.ok) return feed
  if (action.type === 'all') {
    return { ok: true, unreadCount: 0, items: feed.items.map((i) => (i.unread ? { ...i, unread: false } : i)) }
  }
  const target = feed.items.find((i) => i.id === action.id)
  if (!target?.unread) return feed
  return {
    ok: true,
    unreadCount: Math.max(0, feed.unreadCount - 1),
    items: feed.items.map((i) => (i.id === action.id ? { ...i, unread: false } : i)),
  }
}
