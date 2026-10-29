/**
 * orderCapKey / jobPostCapKey (src/lib/marche/cap-refusal.ts) — which insert / update errors the order and annonce
 * actions explain. Only the four anti-abuse caps (23514 + their hint); a CHECK violation, the stock refusal, RLS or an
 * outage stays generic. Run by path.
 */

import { describe, it, expect } from 'vitest'
import { orderCapKey, jobPostCapKey } from '@/lib/marche/cap-refusal'
import { t } from '@/lib/i18n'

describe('orderCapKey', () => {
  it('maps the two order caps', () => {
    expect(orderCapKey({ code: '23514', hint: 'order_cap_seller' })).toBe('demander.error.cap_seller')
    expect(orderCapKey({ code: '23514', hint: 'order_cap_daily' })).toBe('demander.error.cap_daily')
  })

  it.each([
    ['the stock refusal (23514 hint stock)', { code: '23514', hint: 'stock' }],
    ['a CHECK violation (23514, no hint)', { code: '23514', hint: null }],
    ['a job-post hint', { code: '23514', hint: 'job_post_cap_open' }],
    ['the right hint on the wrong code', { code: 'P0001', hint: 'order_cap_daily' }],
    ['RLS', { code: '42501', hint: null }],
    ['a prototype key as hint', { code: '23514', hint: 'toString' }],
    ['no error', null],
  ])('leaves %s generic (null)', (_label, error) => {
    expect(orderCapKey(error)).toBeNull()
  })
})

describe('jobPostCapKey', () => {
  it('maps the two job-post caps', () => {
    expect(jobPostCapKey({ code: '23514', hint: 'job_post_cap_open' })).toBe('annonce.error.cap_open')
    expect(jobPostCapKey({ code: '23514', hint: 'job_post_cap_daily' })).toBe('annonce.error.cap_daily')
  })

  it.each([
    ['an expired post (23514 job_expired)', { code: '23514', hint: 'job_expired' }],
    ['an order hint', { code: '23514', hint: 'order_cap_seller' }],
    ['an invalid transition (42501)', { code: '42501', hint: 'invalid_transition' }],
  ])('leaves %s generic (null)', (_label, error) => {
    expect(jobPostCapKey(error)).toBeNull()
  })
})

it('all four keys exist in FR and AR', () => {
  for (const key of ['demander.error.cap_seller', 'demander.error.cap_daily', 'annonce.error.cap_open', 'annonce.error.cap_daily']) {
    expect(t(key, 'fr')).not.toBe(key)
    expect(t(key, 'ar')).not.toBe(key)
  }
})
