import { describe, expect, it } from 'vitest'
import { fr } from './fr'
import { frPlurals } from './plurals'
import { t, tn, toLang, LANGS, LOCALES } from './index'
import { enOwnerOf, type EnOwner } from './en/ownership'
import * as common from './en/common'
import * as freelancer from './en/freelancer'
import * as shop from './en/shop'

// Guards for the English rollout (three owners write three files in parallel — see en/ownership.ts).
const FILES: Record<Exclude<EnOwner, 'admin'>, { strings: Record<string, string>; plurals: Record<string, { other: string }> }> = {
  common,
  freelancer,
  shop,
}
const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort()

describe('English dictionary', () => {
  for (const [owner, file] of Object.entries(FILES)) {
    describe(`en/${owner}.ts`, () => {
      it('only holds French keys that belong to this owner', () => {
        for (const key of Object.keys(file.strings)) {
          expect(fr[key], `${key}: not a key of fr.ts`).toBeDefined()
          expect(enOwnerOf(key), `${key}: belongs to another owner`).toBe(owner)
        }
        for (const key of Object.keys(file.plurals)) {
          expect(frPlurals[key], `${key}: not a key of plurals.ts (French)`).toBeDefined()
          expect(enOwnerOf(key), `${key}: belongs to another owner`).toBe(owner)
        }
      })

      it('keeps the French {placeholders} and is never empty', () => {
        for (const [key, value] of Object.entries(file.strings)) {
          expect(value.trim(), `${key}: empty`).not.toBe('')
          expect(placeholders(value), `${key}: placeholders differ from French`).toEqual(placeholders(fr[key]))
        }
        for (const [key, variants] of Object.entries(file.plurals)) {
          const frOther = placeholders(frPlurals[key].other).filter((p) => p !== 'count')
          for (const v of Object.values(variants)) {
            expect(placeholders(v).filter((p) => p !== 'count'), `${key}: placeholders differ from French`).toEqual(frOther)
          }
        }
      })
    })
  }

  it('the three files never share a key', () => {
    const seen = new Map<string, string>()
    for (const [owner, file] of Object.entries(FILES)) {
      for (const key of [...Object.keys(file.strings), ...Object.keys(file.plurals)]) {
        expect(seen.get(key), `${key}: in ${seen.get(key)} and ${owner}`).toBeUndefined()
        seen.set(key, owner)
      }
    }
  })
})

describe('English fallback and helpers', () => {
  it('a key with no English yet shows the French text', () => {
    const key = Object.keys(fr).find((k) => enOwnerOf(k) === 'admin')!
    expect(t(key, 'en')).toBe(fr[key])
  })

  it('a plural with no English yet uses the French variants', () => {
    const key = Object.keys(frPlurals).find((k) => enOwnerOf(k) === 'admin')!
    expect(tn(key, 'en', 2)).toBe(tn(key, 'fr', 2))
  })

  it('toLang keeps fr / ar / en and maps anything else to fr', () => {
    expect(['fr', 'ar', 'en', 'de', null, undefined].map(toLang)).toEqual(['fr', 'ar', 'en', 'fr', 'fr', 'fr'])
  })

  it('switch order is FR | EN | AR and every language has a locale', () => {
    expect(LANGS).toEqual(['fr', 'en', 'ar'])
    for (const l of LANGS) expect(LOCALES[l]).toBeTruthy()
  })
})
