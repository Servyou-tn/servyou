import { describe, it, expect } from 'vitest'
import { diffLanguages } from './diff-languages'

describe('diffLanguages', () => {
  it('inserts everything when nothing was previously saved', () => {
    expect(diffLanguages([], [{ language: 'fr', proficiency: 'natif' }])).toEqual({
      toDelete: [],
      toInsert: [{ language: 'fr', proficiency: 'natif' }],
    })
  })

  it('deletes everything when the new selection is empty', () => {
    expect(diffLanguages([{ language: 'fr', proficiency: 'natif' }], [])).toEqual({
      toDelete: ['fr'],
      toInsert: [],
    })
  })

  it('is a no-op when the selection is unchanged', () => {
    const rows = [{ language: 'fr', proficiency: 'natif' }, { language: 'ar', proficiency: 'natif' }]
    expect(diffLanguages(rows, rows)).toEqual({ toDelete: [], toInsert: [] })
  })

  // The case reconcile.ts's plain scalar-identity diff would miss (advisor-flagged): the language
  // SET is unchanged, only the proficiency on one row changes. A key on `language` alone yields
  // {toDelete: [], toInsert: []} here — this asserts the composite key catches it instead.
  it('a niveau-only change on an unchanged language produces a real delete+insert, not a no-op', () => {
    expect(
      diffLanguages(
        [{ language: 'fr', proficiency: 'natif' }],
        [{ language: 'fr', proficiency: 'courant' }],
      ),
    ).toEqual({
      toDelete: ['fr'],
      toInsert: [{ language: 'fr', proficiency: 'courant' }],
    })
  })

  it('handles a mixed add-and-remove selection independently', () => {
    expect(
      diffLanguages(
        [{ language: 'fr', proficiency: 'natif' }, { language: 'ar', proficiency: 'natif' }],
        [{ language: 'fr', proficiency: 'natif' }, { language: 'en', proficiency: 'courant' }],
      ),
    ).toEqual({
      toDelete: ['ar'],
      toInsert: [{ language: 'en', proficiency: 'courant' }],
    })
  })

  it('deduplicates an identical repeated entry in the selection (defensive — mirrors reconcile.ts)', () => {
    expect(
      diffLanguages([], [{ language: 'fr', proficiency: 'natif' }, { language: 'fr', proficiency: 'natif' }]),
    ).toEqual({
      toDelete: [],
      toInsert: [{ language: 'fr', proficiency: 'natif' }],
    })
  })
})
