/**
 * Pure validation for the add/edit service form (src/lib/freelance/service-validation.ts). This is
 * the must-test layer per CLAUDE.md (data-write input validation): the server action and the form
 * both run it, and the bounds it enforces — required fields, max lengths, and the numeric(10,2)
 * price ceiling + 2-decimal rounding — are the real guard, since the action is directly invokable
 * and the client's maxLength isn't a guarantee. Framework-free, no DB.
 *
 * Run: npx vitest run src/__tests__/service-validation.test.ts
 */

import { describe, it, expect } from 'vitest'
import { validateServiceInput, type ServiceInput } from '@/lib/freelance/service-validation'

function valid(over: Partial<ServiceInput> = {}): ServiceInput {
  return {
    title: 'Logo design',
    categoryId: 'cat-123',
    description: 'A clean, memorable logo for your brand.',
    startingPrice: '150',
    deliveryTime: '3 jours',
    status: 'active',
    ...over,
  }
}

describe('validateServiceInput — valid input', () => {
  it('accepts a complete input and maps to DB values', () => {
    const r = validateServiceInput(valid())
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.value).toEqual({
        title: 'Logo design',
        category_id: 'cat-123',
        description: 'A clean, memorable logo for your brand.',
        starting_price_tnd: 150,
        delivery_time: '3 jours',
        status: 'active',
      })
    }
  })

  it('trims title, description, and delivery time', () => {
    const r = validateServiceInput(valid({ title: '  Logo  ', description: '  desc  ', deliveryTime: '  1 semaine  ' }))
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.value.title).toBe('Logo')
      expect(r.value.description).toBe('desc')
      expect(r.value.delivery_time).toBe('1 semaine')
    }
  })

  it('normalizes status: hidden preserved, anything else → active', () => {
    const hidden = validateServiceInput(valid({ status: 'hidden' }))
    expect(hidden.ok && hidden.value.status).toBe('hidden')
    const weird = validateServiceInput(valid({ status: 'whatever' }))
    expect(weird.ok && weird.value.status).toBe('active')
  })

  it('rounds the price to 2 decimals (numeric(10,2))', () => {
    const r = validateServiceInput(valid({ startingPrice: '10.999' }))
    expect(r.ok && r.value.starting_price_tnd).toBe(11)
    const r2 = validateServiceInput(valid({ startingPrice: '10.5' }))
    expect(r2.ok && r2.value.starting_price_tnd).toBe(10.5)
    const r3 = validateServiceInput(valid({ startingPrice: '0' }))
    expect(r3.ok && r3.value.starting_price_tnd).toBe(0)
  })
})

describe('validateServiceInput — per-field errors', () => {
  it('flags a missing title', () => {
    const r = validateServiceInput(valid({ title: '   ' }))
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.errors.title).toBe('freelance.services.form.error.required')
  })

  it('flags a too-long title (>100)', () => {
    const r = validateServiceInput(valid({ title: 'x'.repeat(101) }))
    expect(!r.ok && r.errors.title).toBe('freelance.services.form.error.title_too_long')
  })

  it('flags a missing category', () => {
    const r = validateServiceInput(valid({ categoryId: '' }))
    expect(!r.ok && r.errors.category).toBe('freelance.services.form.error.required')
  })

  it('flags a missing description and a too-long one (>2000)', () => {
    expect(
      (() => {
        const r = validateServiceInput(valid({ description: '' }))
        return !r.ok && r.errors.description
      })(),
    ).toBe('freelance.services.form.error.required')
    const long = validateServiceInput(valid({ description: 'x'.repeat(2001) }))
    expect(!long.ok && long.errors.description).toBe('freelance.services.form.error.description_too_long')
  })

  it('flags missing, negative, non-numeric, and over-ceiling prices', () => {
    expect((() => { const r = validateServiceInput(valid({ startingPrice: '' })); return !r.ok && r.errors.price })())
      .toBe('freelance.services.form.error.required')
    expect((() => { const r = validateServiceInput(valid({ startingPrice: '-5' })); return !r.ok && r.errors.price })())
      .toBe('freelance.services.form.error.price_invalid')
    expect((() => { const r = validateServiceInput(valid({ startingPrice: 'abc' })); return !r.ok && r.errors.price })())
      .toBe('freelance.services.form.error.price_invalid')
    // 100,000,000 exceeds numeric(10,2)'s 99,999,999.99 ceiling.
    expect((() => { const r = validateServiceInput(valid({ startingPrice: '100000000' })); return !r.ok && r.errors.price })())
      .toBe('freelance.services.form.error.price_invalid')
  })

  it('accepts the exact numeric(10,2) ceiling', () => {
    const r = validateServiceInput(valid({ startingPrice: '99999999.99' }))
    expect(r.ok && r.value.starting_price_tnd).toBe(99999999.99)
  })

  it('flags a missing delivery time', () => {
    const r = validateServiceInput(valid({ deliveryTime: '' }))
    expect(!r.ok && r.errors.delivery).toBe('freelance.services.form.error.required')
  })

  it('collects multiple field errors at once', () => {
    const r = validateServiceInput({ title: '', categoryId: '', description: '', startingPrice: '', deliveryTime: '', status: '' })
    expect(r.ok).toBe(false)
    if (!r.ok) {
      expect(Object.keys(r.errors).sort()).toEqual(['category', 'delivery', 'description', 'price', 'title'])
    }
  })
})
