import { describe, it, expect } from 'vitest'
import {
  DEFAULT_NOTIF_PREFS,
  NotifPrefsInput,
  changedKeys,
  keysForRole,
  rowsForRole,
  withDefaults,
} from './prefs'

describe('rowsForRole — which e-mail rows each role sees (Figma 558:38878 / 424:17442)', () => {
  const names = (role: Parameters<typeof rowsForRole>[0]) =>
    rowsForRole(role).map((r) => (r.kind === 'locked' ? 'security' : r.key))

  it('shop_owner: orders · proposals · reviews · security · low stock · newsletter', () => {
    expect(names('shop_owner')).toEqual([
      'email_new_orders',
      'email_proposals',
      'email_reviews',
      'security',
      'email_low_stock',
      'email_newsletter',
    ])
  })

  it('freelancer: no low-stock row (nothing to restock) but the missions-matching row, between security and the newsletter', () => {
    expect(names('freelancer')).toEqual([
      'email_new_orders',
      'email_proposals',
      'email_reviews',
      'security',
      'email_missions_matching',
      'email_newsletter',
    ])
    expect(keysForRole('freelancer')).not.toContain('email_low_stock')
  })

  it('missions-matching is a FREELANCER row only (a shop or a buyer receives no mission digest)', () => {
    expect(keysForRole('shop_owner')).not.toContain('email_missions_matching')
    expect(keysForRole(null)).not.toContain('email_missions_matching')
  })

  it('a consumer only sees what can reach a buyer: proposals, security, newsletter', () => {
    expect(names(null)).toEqual(['email_proposals', 'security', 'email_newsletter'])
  })

  it('the security row is locked and never maps to a stored key', () => {
    for (const role of ['shop_owner', 'freelancer', null] as const) {
      expect(keysForRole(role).every((k) => k.startsWith('email_'))).toBe(true)
      expect(rowsForRole(role).filter((r) => r.kind === 'locked')).toHaveLength(1)
    }
  })
})

describe('withDefaults — no row (or a partial one) reads as the column defaults', () => {
  it('null / undefined → the table defaults (low stock and newsletter OFF)', () => {
    expect(withDefaults(null)).toEqual(DEFAULT_NOTIF_PREFS)
    expect(withDefaults(undefined)).toEqual(DEFAULT_NOTIF_PREFS)
    // migration 103: the missions digest is ON by default (the frame drew it off; the column default wins).
    expect(DEFAULT_NOTIF_PREFS).toMatchObject({
      email_low_stock: false,
      email_newsletter: false,
      email_new_orders: true,
      email_missions_matching: true,
    })
  })

  it('keeps stored booleans and ignores anything that is not one', () => {
    const out = withDefaults({ email_new_orders: false, email_reviews: null, email_newsletter: true })
    expect(out.email_new_orders).toBe(false)
    expect(out.email_reviews).toBe(true) // null → default
    expect(out.email_newsletter).toBe(true)
  })

  it('returns a copy, never the shared defaults object', () => {
    const out = withDefaults(null)
    out.email_proposals = false
    expect(DEFAULT_NOTIF_PREFS.email_proposals).toBe(true)
  })
})

describe('changedKeys — only the role’s visible rows count towards « unsaved »', () => {
  it('lists the differing visible keys', () => {
    const saved = { ...DEFAULT_NOTIF_PREFS }
    const current = { ...saved, email_new_orders: false, email_newsletter: true }
    expect(changedKeys('freelancer', current, saved).sort()).toEqual(['email_new_orders', 'email_newsletter'])
  })

  it('ignores a hidden key (a consumer cannot have unsaved low-stock changes)', () => {
    const saved = { ...DEFAULT_NOTIF_PREFS }
    expect(changedKeys(null, { ...saved, email_low_stock: true }, saved)).toEqual([])
  })
})

describe('NotifPrefsInput — the server-side shape', () => {
  it('accepts any subset of the five booleans', () => {
    expect(NotifPrefsInput.safeParse({ email_newsletter: true }).success).toBe(true)
    expect(NotifPrefsInput.safeParse({ email_missions_matching: false }).success).toBe(true)
    expect(NotifPrefsInput.safeParse({}).success).toBe(true)
  })
  it('rejects unknown keys (no profile_id smuggling) and non-booleans', () => {
    expect(NotifPrefsInput.safeParse({ profile_id: 'x', email_newsletter: true }).success).toBe(false)
    expect(NotifPrefsInput.safeParse({ email_newsletter: 'yes' }).success).toBe(false)
  })
})
