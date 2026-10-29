import { z } from 'zod'
import type { Role } from '@/lib/roles'

// Paramètres → Notifications (B5): the e-mail preference rows, per role, over the live `notification_preferences` table
// (one row per profile; five boolean columns). Figma 424:17442 (freelancer) and 558:38878 (shop_owner).

export const NOTIF_KEYS = [
  'email_new_orders',
  'email_proposals',
  'email_reviews',
  'email_low_stock',
  'email_newsletter',
] as const

export type NotifKey = (typeof NOTIF_KEYS)[number]
export type NotifPrefs = Record<NotifKey, boolean>

/**
 * What a profile with NO row gets — it mirrors the table's own column defaults (new orders / proposals / reviews on,
 * low stock / newsletter off), so « no row yet » and « a row of defaults » look the same and the first save is a plain upsert.
 */
export const DEFAULT_NOTIF_PREFS: NotifPrefs = {
  email_new_orders: true,
  email_proposals: true,
  email_reviews: true,
  email_low_stock: false,
  email_newsletter: false,
}

/** A row of the list: a persisted toggle, or the « Alertes de sécurité » row that is always on and has no column. */
export type NotifRow = { kind: 'toggle'; key: NotifKey } | { kind: 'locked' }

export type NotifVariant = 'shop_owner' | 'freelancer' | 'consumer'

export function notifVariant(role: Role): NotifVariant {
  return role ?? 'consumer'
}

/**
 * The rows each role sees, in the frame's order.
 *   shop_owner (558:38878): commandes · propositions · avis · sécurité · stock faible · newsletter
 *   freelancer (424:17442): commandes · propositions · avis · sécurité · [missions — no column] · newsletter
 *   consumer   (no frame — derived): propositions · sécurité · newsletter. A buyer receives no orders, reviews or stock alerts.
 */
export function rowsForRole(role: Role): NotifRow[] {
  const security: NotifRow = { kind: 'locked' }
  const row = (key: NotifKey): NotifRow => ({ kind: 'toggle', key })
  switch (role) {
    case 'shop_owner':
      return [row('email_new_orders'), row('email_proposals'), row('email_reviews'), security, row('email_low_stock'), row('email_newsletter')]
    case 'freelancer':
      return [row('email_new_orders'), row('email_proposals'), row('email_reviews'), security, row('email_newsletter')]
    default:
      return [row('email_proposals'), security, row('email_newsletter')]
  }
}

/** The persisted keys a role can change — the only ones its save sends. */
export function keysForRole(role: Role): NotifKey[] {
  return rowsForRole(role).flatMap((r) => (r.kind === 'toggle' ? [r.key] : []))
}

/** Rows whose value differs between two states, limited to the keys the role can see. */
export function changedKeys(role: Role, current: NotifPrefs, saved: NotifPrefs): NotifKey[] {
  return keysForRole(role).filter((k) => current[k] !== saved[k])
}

/** Server-side input: any subset of the five booleans, nothing else. */
export const NotifPrefsInput = z
  .object({
    email_new_orders: z.boolean(),
    email_proposals: z.boolean(),
    email_reviews: z.boolean(),
    email_low_stock: z.boolean(),
    email_newsletter: z.boolean(),
  })
  .partial()
  .strict()

/** Fills what a row does not carry from the defaults (a malformed or partial row never yields `undefined`). */
export function withDefaults(row: Partial<Record<NotifKey, boolean | null>> | null | undefined): NotifPrefs {
  const out = { ...DEFAULT_NOTIF_PREFS }
  if (!row) return out
  for (const k of NOTIF_KEYS) {
    const v = row[k]
    if (typeof v === 'boolean') out[k] = v
  }
  return out
}
