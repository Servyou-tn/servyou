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
import { shortRef } from '@/lib/orders/order-status'
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

// ── shortRef — one reference, everywhere it appears ───────────────────────────────────────────

describe('shortRef', () => {
  // Changed shape in the G9 delta pass: it was `id.slice(0, 8)` — eight LOWERCASE characters, no
  // hash — which nothing rendered on screen, only WhatsApp message bodies. G9 is the first
  // surface to display a reference, and Figma shows "#A4F729". A seller reading "#A4F729" while
  // the message they just sent quotes "f14bbb38" is two names for one order; the reference exists
  // to make the conversation traceable, so it must be ONE string on screen and in the message.
  it('renders as # + six UPPERCASE hex characters', () => {
    expect(shortRef('f14bbb38-82c5-44ac-9b8b-fc0547848b98')).toBe('#F14BBB')
  })

  it('ignores the uuid hyphens rather than counting them as characters', () => {
    expect(shortRef('ab-cdef-0123')).toBe('#ABCDEF')
  })

  it('is stable — the same order always yields the same reference', () => {
    const id = 'b6817c30-ac14-4f04-a058-8623827f6c91'
    expect(shortRef(id)).toBe(shortRef(id))
  })

  it('is what the WhatsApp templates interpolate, so both sides quote one string', () => {
    const ref = shortRef('f14bbb38-82c5-44ac-9b8b-fc0547848b98')
    const composed = (fr as Record<string, string>)[TEMPLATE_KEY].replace('{ref}', ref)
    expect(composed).toContain('#F14BBB')
  })
})
