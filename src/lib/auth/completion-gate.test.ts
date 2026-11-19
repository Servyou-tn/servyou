import { describe, it, expect } from 'vitest'
import { completionRedirect, type GateRequest } from './completion-gate'

// The app half of the two-step sign-up gate: an incomplete account is sent to « Finalisez votre compte » on every page
// navigation; everything else passes.
const nav = (pathname: string, search = '', over: Partial<GateRequest> = {}): GateRequest => ({
  pathname,
  search,
  method: 'GET',
  isNavigation: true,
  ...over,
})

describe('completionRedirect', () => {
  it('sends an incomplete account to step 2, keeping where it was going', () => {
    expect(completionRedirect(nav('/mes-commandes'), null)).toBe('/finaliser-mon-compte?next=%2Fmes-commandes')
    expect(completionRedirect(nav('/marche/produits', '?q=lampe'), null)).toBe('/finaliser-mon-compte?next=%2Fmarche%2Fproduits%3Fq%3Dlampe')
    expect(completionRedirect(nav('/'), null)).toBe('/finaliser-mon-compte')
  })

  it('lets a complete account, or an unread profile (fail open), through', () => {
    expect(completionRedirect(nav('/mes-commandes'), '2026-11-16T10:00:00Z')).toBeNull()
    expect(completionRedirect(nav('/mes-commandes'), undefined)).toBeNull()
  })

  it('keeps the step-2 page and the two legal pages its form links to reachable', () => {
    for (const path of ['/finaliser-mon-compte', '/conditions', '/confidentialite', '/contact', '/mentions-legales', '/cookies', '/accessibilite']) {
      expect(completionRedirect(nav(path), null), path).toBeNull()
    }
    // Anchored: a lookalike path is still gated.
    expect(completionRedirect(nav('/conditions-x'), null)).toBe('/finaliser-mon-compte?next=%2Fconditions-x')
  })

  it('never redirects a non-GET (a server action) or a non-navigation GET (JSON)', () => {
    expect(completionRedirect(nav('/mes-commandes', '', { method: 'POST' }), null)).toBeNull()
    expect(completionRedirect(nav('/api/x', '', { isNavigation: false }), null)).toBeNull()
  })
})
