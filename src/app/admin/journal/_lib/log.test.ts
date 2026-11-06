import { describe, expect, it } from 'vitest'
import { logActionGroup, logActionKey, logTone, matchesLogQuery, periodSince, stateTransition } from './log'

describe('journal action labels', () => {
  it('maps hide/unhide by prefix and falls back to a neutral key', () => {
    expect(logActionKey('hide_content_product')).toBe('admin.log.action.hide_content')
    expect(logActionKey('unhide_content_shop')).toBe('admin.log.action.unhide_content')
    expect(logActionKey('dismiss_report')).toBe('admin.log.action.dismiss_report')
    expect(logActionKey('test')).toBe('admin.log.action.other')
  })
  it('groups and tones', () => {
    expect(logActionGroup('hide_content_service')).toBe('hide')
    expect(logActionGroup('claim_dispute')).toBe('dispute')
    expect(logActionGroup('approve_deletion_request')).toBe('request')
    expect(logTone('hide_content_product')).toBe('danger')
    expect(logTone('resolve_report')).toBe('success')
    expect(logTone('claim_report')).toBe('info')
  })
})

describe('stateTransition', () => {
  it('reads status, suspension or moderation from the JSON, never a raw value', () => {
    expect(stateTransition({ status: 'open' }, { status: 'dismissed' })).toEqual({ from: 'admin.reports.status_open', to: 'admin.reports.status_dismissed' })
    expect(stateTransition({ suspended_at: 'x' }, { suspended_at: null })).toEqual({ from: 'admin.log.state.suspended', to: 'admin.log.state.active' })
    expect(stateTransition({ admin_hidden_at: null }, { admin_hidden_at: 'x' })).toEqual({ from: 'admin.log.state.active', to: 'admin.reports.pill_hidden' })
    expect(stateTransition({ status: 'weird' }, { status: 'open' })).toBeNull()
    expect(stateTransition(null, ['x'])).toBeNull()
  })
})

describe('period + search', () => {
  it('period window', () => {
    expect(periodSince('all', 0)).toBeNull()
    expect(periodSince('7d', Date.parse('2026-11-08T00:00:00Z'))).toBe('2026-11-01T00:00:00.000Z')
  })
  it('search ignores case and accents', () => {
    expect(matchesLogQuery(['Prix et marque suspects', 'Montre Rolex'], 'rolex prix')).toBe(true)
    expect(matchesLogQuery(['Doublon'], 'doublé')).toBe(false)
  })
})
