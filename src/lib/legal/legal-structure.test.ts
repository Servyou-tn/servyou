import { describe, it, expect } from 'vitest'
import { parseLegalBody, splitLines, LEGAL_DOCS } from './legal-structure'

describe('parseLegalBody', () => {
  it('splits paragraphs on a blank line', () => {
    const out = parseLegalBody('Premier paragraphe.\n\nDeuxième paragraphe.')
    expect(out).toEqual([
      { type: 'p', text: 'Premier paragraphe.' },
      { type: 'p', text: 'Deuxième paragraphe.' },
    ])
  })

  it('turns a "- " block into a bullet list', () => {
    const out = parseLegalBody('Vous pouvez :\n\n- A\n- B\n- C')
    expect(out[0]).toEqual({ type: 'p', text: 'Vous pouvez :' })
    expect(out[1]).toEqual({ type: 'ul', items: ['A', 'B', 'C'] })
  })

  it('handles a body mixing paragraphs and lists', () => {
    const out = parseLegalBody('Intro.\n\n- un\n- deux\n\nConclusion.')
    expect(out.map((b) => b.type)).toEqual(['p', 'ul', 'p'])
  })
})

describe('splitLines', () => {
  it('splits a newline-separated block and strips any "- " prefix', () => {
    expect(splitLines('Ligne 1\nLigne 2\n- Ligne 3')).toEqual(['Ligne 1', 'Ligne 2', 'Ligne 3'])
  })
})

describe('LEGAL_DOCS structure', () => {
  it('has the four documents with the expected section counts', () => {
    expect(LEGAL_DOCS.conditions.sections).toHaveLength(14)
    expect(LEGAL_DOCS.confidentialite.sections).toHaveLength(13)
    expect(LEGAL_DOCS.confidentialite.rightsKey).toBeTruthy()
    expect(LEGAL_DOCS.cookies.sections).toHaveLength(6)
    expect(LEGAL_DOCS.accessibilite.sections).toHaveLength(6)
  })
})
