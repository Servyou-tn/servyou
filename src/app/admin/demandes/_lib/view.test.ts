import { describe, expect, it } from 'vitest'
import { hoursLeft, mailtoHref, needsErasureFinish, parseRequestTab, sortRequests } from './view'

const NOW = Date.parse('2026-11-06T12:00:00Z')

describe('demandes view logic', () => {
  it('tabs fall back to deletion', () => {
    expect(parseRequestTab('contact')).toBe('contact')
    expect(parseRequestTab('x')).toBe('deletion')
  })
  it('counts the hours left on the 48 h promise, negative once overdue', () => {
    expect(hoursLeft('2026-11-05T19:00:00Z', NOW)).toBe(31)
    expect(hoursLeft('2026-11-04T12:00:00Z', NOW)).toBe(0)
    expect(hoursLeft('2026-11-04T10:30:00Z', NOW)).toBe(-2)
  })
  it('an approved request without an erasure audit row needs « Terminer la suppression »', () => {
    const erased = new Set(['u1'])
    expect(needsErasureFinish({ status: 'approved', user_id: 'u2' }, erased)).toBe(true)
    expect(needsErasureFinish({ status: 'approved', user_id: 'u1' }, erased)).toBe(false)
    expect(needsErasureFinish({ status: 'pending', user_id: 'u2' }, erased)).toBe(false)
    expect(needsErasureFinish({ status: 'rejected', user_id: 'u2' }, erased)).toBe(false)
  })
  it('pending first (oldest first), then the rest newest first', () => {
    const rows = [
      { id: 'a', status: 'approved', at: '2026-11-01T00:00:00Z' },
      { id: 'b', status: 'pending', at: '2026-11-05T00:00:00Z' },
      { id: 'c', status: 'pending', at: '2026-11-04T00:00:00Z' },
      { id: 'd', status: 'rejected', at: '2026-11-03T00:00:00Z' },
    ]
    expect(sortRequests(rows, 'pending').map((r) => r.id)).toEqual(['c', 'b', 'd', 'a'])
  })
  it('mailto only for a plausible address, subject encoded', () => {
    expect(mailtoHref('leila.m@example.tn', 'Votre demande ServYou')).toBe('mailto:leila.m@example.tn?subject=Votre%20demande%20ServYou')
    expect(mailtoHref('x" onclick="y', 'z')).toBeNull()
    // header injection from a sender-controlled address
    expect(mailtoHref('x@y.tn?bcc=a@evil.tn&body=hi', 'z')).toBeNull()
    expect(mailtoHref('a@b.tn,c@d.tn', 'z')).toBeNull()
    expect(mailtoHref('a%40b@c.tn', 'z')).toBeNull()
  })
})
