import { describe, it, expect } from 'vitest'
import { annonceEditBlock, ANNONCE_EDIT_BLOCK_KEY } from './annonce-edit-rules'

const open = { displayStatus: 'open' as const, responseCount: 0, adminHiddenAt: null }

describe('annonceEditBlock', () => {
  it('an open, unmoderated post with no proposal can be edited', () => {
    expect(annonceEditBlock(open)).toBeNull()
  })

  it('one proposal freezes it (the DB lock: content_locked)', () => {
    expect(annonceEditBlock({ ...open, responseCount: 1 })).toBe('has_responses')
  })

  it('a closed or expired post has nothing left to edit', () => {
    expect(annonceEditBlock({ ...open, displayStatus: 'filled' })).toBe('not_open')
    expect(annonceEditBlock({ ...open, displayStatus: 'expired' })).toBe('not_open')
  })

  it('a moderated post is not edited around its moderation', () => {
    expect(annonceEditBlock({ ...open, adminHiddenAt: '2026-10-30T10:00:00Z' })).toBe('moderated')
  })

  it('closed wins over the other reasons (the plainest explanation first)', () => {
    expect(annonceEditBlock({ displayStatus: 'filled', responseCount: 3, adminHiddenAt: '2026-10-30T10:00:00Z' })).toBe('not_open')
  })

  it('every block has a refusal key', () => {
    expect(ANNONCE_EDIT_BLOCK_KEY).toEqual({
      not_open: 'annonce.error.edit_unavailable',
      moderated: 'annonce.error.edit_unavailable',
      has_responses: 'annonce.error.content_locked',
    })
  })
})
