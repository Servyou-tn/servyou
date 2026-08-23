/**
 * Unit tests for pluralCategory() (selection) and tn() (lookup + interpolation).
 *
 * Pure unit tests — no DB, no Supabase, no browser.
 * Run: npx vitest run src/lib/i18n/plurals.test.ts
 */

import { describe, it, expect } from 'vitest'
import { pluralCategory, tn } from './plurals'

describe('pluralCategory() — selection table', () => {
  it('French: only ever one or other (few/many/two never occur)', () => {
    // FRENCH ZERO OVERRIDE — CLDR's fr rule puts n=0 in `one`; this app forces it to `other`
    // ("0 produits", not "0 produit").
    expect(pluralCategory('fr', 0)).toBe('other')
    expect(pluralCategory('fr', 1)).toBe('one')
    expect(pluralCategory('fr', 2)).toBe('other')
    expect(pluralCategory('fr', 3)).toBe('other')
    expect(pluralCategory('fr', 10)).toBe('other')
    expect(pluralCategory('fr', 11)).toBe('other')
    expect(pluralCategory('fr', 99)).toBe('other')
    expect(pluralCategory('fr', 100)).toBe('other')
  })

  it('Arabic: real zero/one/two, with few (3-10) and many (11-99) folded into other', () => {
    expect(pluralCategory('ar', 0)).toBe('zero')
    expect(pluralCategory('ar', 1)).toBe('one')
    expect(pluralCategory('ar', 2)).toBe('two')
    expect(pluralCategory('ar', 3)).toBe('other')   // few, folded
    expect(pluralCategory('ar', 10)).toBe('other')  // few, folded
    expect(pluralCategory('ar', 11)).toBe('other')  // many, folded
    expect(pluralCategory('ar', 99)).toBe('other')  // many, folded
    expect(pluralCategory('ar', 100)).toBe('other')
  })
})

describe('tn() — French', () => {
  it('picks the singular at 1, plural everywhere else (including 0)', () => {
    expect(tn('mesannonces.count', 'fr', 0)).toBe('0 annonces')
    expect(tn('mesannonces.count', 'fr', 1)).toBe('1 annonce')
    expect(tn('mesannonces.count', 'fr', 2)).toBe('2 annonces')
    expect(tn('mesannonces.count', 'fr', 11)).toBe('11 annonces')
  })

  it('interpolates extra vars alongside count', () => {
    expect(tn('page_header.categories.subtitle', 'fr', 1, { category: 'Beauté' })).toBe(
      '1 produit dans Beauté',
    )
    expect(tn('page_header.categories.subtitle', 'fr', 5, { category: 'Beauté' })).toBe(
      '5 produits dans Beauté',
    )
  })

  it('falls back to the raw key when missing', () => {
    expect(tn('totally.unknown.plural.key', 'fr', 3)).toBe('totally.unknown.plural.key')
  })
})

describe('tn() — Arabic', () => {
  it('selects one / two / other exactly as specced (1 / 2 / 3+)', () => {
    expect(tn('mesannonces.count', 'ar', 1)).toBe('1 إعلان')
    expect(tn('mesannonces.count', 'ar', 2)).toBe('2 إعلانان')
    expect(tn('mesannonces.count', 'ar', 3)).toBe('3 إعلانات')
    expect(tn('mesannonces.count', 'ar', 11)).toBe('11 إعلانات')
  })

  it('falls back to `other` at zero when no zero variant is supplied', () => {
    expect(tn('mesannonces.count', 'ar', 0)).toBe('0 إعلانات')
  })
})

// These two keys could not be screenshot-verified in situ (see docs/follow-ups.md,
// feat/i18n-plurals): expiry_countdown's countdown only renders in the last 7 of a post's 30 days
// and no real job_post's age happens to fall in that window; consumer.dashboard.orders.count's
// component (ActiveOrdersSnapshot) has no page importer today. This is the deterministic proof of
// their exact wording in place of a screenshot.
describe('tn() — surfaces not reachable via real data (unit-test is the only proof)', () => {
  it('mesannonces.expiry_countdown: French stays invariant, Arabic takes real dual/plural', () => {
    expect(tn('mesannonces.expiry_countdown', 'fr', 1)).toBe('Expire dans 1 j')
    expect(tn('mesannonces.expiry_countdown', 'fr', 2)).toBe('Expire dans 2 j')
    expect(tn('mesannonces.expiry_countdown', 'fr', 7)).toBe('Expire dans 7 j')
    expect(tn('mesannonces.expiry_countdown', 'ar', 1)).toBe('تنتهي خلال 1 يوم')
    expect(tn('mesannonces.expiry_countdown', 'ar', 2)).toBe('تنتهي خلال 2 يومين')
    expect(tn('mesannonces.expiry_countdown', 'ar', 7)).toBe('تنتهي خلال 7 أيام')
  })

  it('consumer.dashboard.orders.count: French one/other, Arabic one/two/other', () => {
    expect(tn('consumer.dashboard.orders.count', 'fr', 1)).toBe('1 commande en cours')
    expect(tn('consumer.dashboard.orders.count', 'fr', 2)).toBe('2 commandes en cours')
    expect(tn('consumer.dashboard.orders.count', 'ar', 1)).toBe('1 طلب قيد التنفيذ')
    expect(tn('consumer.dashboard.orders.count', 'ar', 2)).toBe('2 طلبان قيد التنفيذ')
    expect(tn('consumer.dashboard.orders.count', 'ar', 5)).toBe('5 طلبات قيد التنفيذ')
  })
})

// PageHeader (src/components/shared/PageHeader.tsx) finds emphasisWord as a literal substring of
// subtitle (`subtitle.indexOf(emphasisWord)`) to highlight it. recherche.* and categories.* build
// subtitle and emphasis from two INDEPENDENT tn() lookups sharing the same count — if the wording
// ever drifts between the two dictionaries, the emphasis silently stops highlighting (no crash,
// no other test would catch it). This asserts the invariant holds for every category in both
// languages, for both key pairs.
describe('tn() — PageHeader emphasis stays a substring of its subtitle', () => {
  const pairs: [string, string][] = [
    ['page_header.recherche.subtitle', 'page_header.recherche.emphasis'],
    ['page_header.categories.subtitle', 'page_header.categories.emphasis'],
  ]
  const vars = { query: 'chaise', category: 'Beauté' }

  for (const [subtitleKey, emphasisKey] of pairs) {
    for (const lang of ['fr', 'ar'] as const) {
      for (const count of [0, 1, 2, 3, 11]) {
        it(`${subtitleKey} / ${lang} / n=${count}`, () => {
          const subtitle = tn(subtitleKey, lang, count, vars)
          const emphasis = tn(emphasisKey, lang, count)
          expect(subtitle).toContain(emphasis)
        })
      }
    }
  }
})
