/**
 * Parity + placeholder-token integrity between fr.ts and ar.ts.
 *
 * The translation strings themselves are data (founder reviews wording in
 * follow-up PRs). But the *invariant* that every fr key has an ar twin, and
 * that every {token} survives translation, is data-integrity logic — a
 * must-test category per CLAUDE.md. A raw key count cannot catch this: a
 * duplicated or typo'd key in a Record<string,string> silently overwrites and
 * leaves the total unchanged while a real key goes missing (and then renders
 * as the raw key-string in AR). These assertions are what actually guard the
 * bilingual promise, and they guard every future fr.ts edit too.
 *
 * Run: npx vitest run src/__tests__/i18n-parity.test.ts
 */

import { describe, it, expect } from 'vitest'
import { fr } from '@/lib/i18n/fr'
import { ar } from '@/lib/i18n/ar'

const frKeys = Object.keys(fr).sort()
const arKeys = Object.keys(ar).sort()

/** Extract the set of {placeholder} tokens from a string. */
function tokens(value: string): string[] {
  return (value.match(/\{(\w+)\}/g) ?? []).sort()
}

describe('i18n parity — fr.ts ⇄ ar.ts', () => {
  it('ar.ts has exactly the same keys as fr.ts (no missing)', () => {
    const missingInAr = frKeys.filter((k) => !(k in ar))
    expect(missingInAr).toEqual([])
  })

  it('ar.ts has no extra keys beyond fr.ts', () => {
    const extraInAr = arKeys.filter((k) => !(k in fr))
    expect(extraInAr).toEqual([])
  })

  it('the two key sets are identical', () => {
    expect(arKeys).toEqual(frKeys)
  })

  it('no ar value is left empty', () => {
    const empty = frKeys.filter((k) => !ar[k] || ar[k].trim() === '')
    expect(empty).toEqual([])
  })
})

describe('i18n parity — placeholder tokens preserved', () => {
  it('every {token} in a fr value also appears in its ar value', () => {
    const mismatches = frKeys.filter(
      (k) => tokens(fr[k]).join(',') !== tokens(ar[k] ?? '').join(','),
    )
    expect(mismatches).toEqual([])
  })
})
