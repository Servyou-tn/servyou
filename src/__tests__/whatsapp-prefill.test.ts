/**
 * WhatsApp prefill — URL composition and the Arabic length budget.
 *
 * The budget is the point of this file. Percent-encoding is per UTF-8 byte: a Latin letter costs
 * 1 URL character, an accented French letter 6 (`é` → `%C3%A9`), and EVERY Arabic character 6
 * (`ا` → `%D8%A7`). So the same sentence costs ~1.5x in French and ~4x in Arabic, and a template
 * written to the French budget overflows only in Arabic — which is exactly the kind of defect
 * that ships. The ceiling is asserted here rather than trusted.
 */

import { describe, it, expect } from 'vitest'
import { buildWhatsAppUrl, toWaDigits, WHATSAPP_MESSAGE_MAX } from '@/lib/orders/whatsapp'
import { fr } from '@/lib/i18n/fr'
import { ar } from '@/lib/i18n/ar'

const TEMPLATE_KEY = 'seller.orders.whatsapp_message'

// Deliberately hostile but realistic values: a long Tunisian shop name, a long product title.
const VARS = {
  buyer: 'Mohamed Amine Ben Abdallah',
  shop: 'Atelier Sahbeni — Artisanat de Sfax',
  ref: '#A4F729',
  product: 'Coussin brodé main — motif berbère grand format',
}

function fill(template: string): string {
  return Object.entries(VARS).reduce((s, [k, v]) => s.replace(`{${k}}`, v), template)
}

describe('toWaDigits', () => {
  it('strips everything but digits, keeping the country code', () => {
    expect(toWaDigits('+216 20 123 456')).toBe('21620123456')
    expect(toWaDigits('(+216) 20-123-456')).toBe('21620123456')
  })
})

describe('encoding — verified, not assumed', () => {
  it('encodes a newline as %0A so WhatsApp renders a line break', () => {
    expect(buildWhatsAppUrl('+21620123456', 'a\nb')).toContain('a%0Ab')
  })

  it('round-trips French accents and Arabic identically', () => {
    for (const msg of ['Coussin brodé — motif berbère', 'وسادة مطرزة — نمط أمازيغي']) {
      const url = buildWhatsAppUrl('+21620123456', msg)
      const text = decodeURIComponent(url.split('?text=')[1])
      expect(text).toBe(msg)
    }
  })

  it('builds the wa.me shape both existing call sites already use', () => {
    expect(buildWhatsAppUrl('+216 20 123 456', 'hi')).toBe('https://wa.me/21620123456?text=hi')
  })
})

describe('the Arabic budget', () => {
  it('Arabic costs ~4x its character count once encoded, French ~1.5x', () => {
    const frCost = encodeURIComponent('Bonjour, votre commande est prête').length / 33
    const arCost = encodeURIComponent('مرحبا، طلبك جاهز الآن للتسليم').length / 29
    expect(arCost).toBeGreaterThan(frCost * 2)
  })

  it('truncates past the ceiling instead of emitting an unbounded URL', () => {
    const long = 'ا'.repeat(WHATSAPP_MESSAGE_MAX + 50)
    const url = buildWhatsAppUrl('+21620123456', long)
    const text = decodeURIComponent(url.split('?text=')[1])
    expect(text.length).toBe(WHATSAPP_MESSAGE_MAX)
    expect(text.endsWith('…')).toBe(true)
  })

  it('a seller pressing the button always reaches the conversation', () => {
    // Truncation, never rejection — a clipped sentence beats a dead button.
    const url = buildWhatsAppUrl('+21620123456', 'x'.repeat(5000))
    expect(url.startsWith('https://wa.me/21620123456?text=')).toBe(true)
  })
})

describe('the shipped seller template fits the budget in BOTH locales', () => {
  it.each([
    ['fr', fr as Record<string, string>],
    ['ar', ar as Record<string, string>],
  ])('%s stays within WHATSAPP_MESSAGE_MAX with hostile values', (_lang, dict) => {
    const template = dict[TEMPLATE_KEY]
    expect(template, `${TEMPLATE_KEY} missing`).toBeDefined()
    const composed = fill(template)
    expect(
      composed.length,
      `composed message is ${composed.length} chars, ceiling is ${WHATSAPP_MESSAGE_MAX}`,
    ).toBeLessThanOrEqual(WHATSAPP_MESSAGE_MAX)
  })

  it('the whole wa.me URL stays inside the ~2000-char safe ceiling in Arabic', () => {
    const composed = fill((ar as Record<string, string>)[TEMPLATE_KEY])
    const url = buildWhatsAppUrl('+21620123456', composed)
    expect(url.length).toBeLessThan(2000)
  })

  it('keeps Latin tokens at the END, inside « », so the ref never lands mid-RTL', () => {
    const template = (ar as Record<string, string>)[TEMPLATE_KEY]
    const refPos = template.indexOf('{ref}')
    const buyerPos = template.indexOf('{buyer}')
    expect(refPos).toBeGreaterThan(buyerPos)
    expect(template).toContain('«')
    expect(template).toContain('»')
  })

  it('both locales carry every placeholder the call sites pass', () => {
    for (const dict of [fr as Record<string, string>, ar as Record<string, string>]) {
      for (const k of Object.keys(VARS)) {
        expect(dict[TEMPLATE_KEY]).toContain(`{${k}}`)
      }
    }
  })
})
