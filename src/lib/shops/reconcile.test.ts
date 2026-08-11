import { describe, it, expect } from 'vitest'
import { reconcile } from './reconcile'

describe('reconcile', () => {
  it('inserts everything when nothing was previously saved', () => {
    expect(reconcile([], ['cod', 'd17'])).toEqual({ toDelete: [], toInsert: ['cod', 'd17'] })
  })

  it('deletes everything when the new selection is empty', () => {
    expect(reconcile(['cod', 'd17'], [])).toEqual({ toDelete: ['cod', 'd17'], toInsert: [] })
  })

  it('is a no-op when the selection is unchanged', () => {
    expect(reconcile(['cod', 'd17'], ['cod', 'd17'])).toEqual({ toDelete: [], toInsert: [] })
  })

  it('unchecking one previously-saved value deletes only that row (the failure mode a naive insert-only save misses)', () => {
    expect(reconcile(['cod', 'bank_transfer', 'd17'], ['cod', 'd17'])).toEqual({
      toDelete: ['bank_transfer'],
      toInsert: [],
    })
  })

  it('handles a mixed add-and-remove selection independently', () => {
    expect(reconcile(['cod', 'bank_transfer'], ['cod', 'flouci'])).toEqual({
      toDelete: ['bank_transfer'],
      toInsert: ['flouci'],
    })
  })

  it('order in the selection does not affect the result', () => {
    expect(reconcile(['a', 'b'], ['b', 'c'])).toEqual({ toDelete: ['a'], toInsert: ['c'] })
  })

  it('deduplicates the selected set (defensive — callers should not send duplicates, but the diff must not insert twice)', () => {
    expect(reconcile([], ['cod', 'cod'])).toEqual({ toDelete: [], toInsert: ['cod'] })
  })
})
