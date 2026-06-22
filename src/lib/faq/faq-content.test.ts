import { describe, it, expect } from 'vitest'
import { filterFaq, type ResolvedCategory } from './faq-content'

const cats: ResolvedCategory[] = [
  {
    title: 'Compte',
    questions: [
      { id: 'a', q: "Qui peut s'inscrire ?", a: 'Toute personne de 16 ans ou plus.' },
      { id: 'b', q: 'Mot de passe oublié ?', a: 'Cliquez sur réinitialiser.' },
    ],
  },
  {
    title: 'Acheter',
    questions: [{ id: 'c', q: 'Comment payer ?', a: 'Paiement à la livraison (COD).' }],
  },
]

describe('filterFaq', () => {
  it('returns all categories for an empty / whitespace query', () => {
    expect(filterFaq(cats, '')).toEqual(cats)
    expect(filterFaq(cats, '   ')).toEqual(cats)
  })

  it('matches against question text (case-insensitive) and drops empty categories', () => {
    const out = filterFaq(cats, 'PAYER')
    expect(out).toHaveLength(1)
    expect(out[0].title).toBe('Acheter')
    expect(out[0].questions.map((q) => q.id)).toEqual(['c'])
  })

  it('matches against answer text too', () => {
    const out = filterFaq(cats, 'livraison')
    expect(out).toHaveLength(1)
    expect(out[0].questions[0].id).toBe('c')
  })

  it('narrows to the matching questions within a category', () => {
    const out = filterFaq(cats, 'inscrire')
    expect(out).toHaveLength(1)
    expect(out[0].title).toBe('Compte')
    expect(out[0].questions.map((q) => q.id)).toEqual(['a'])
  })

  it('returns [] when nothing matches', () => {
    expect(filterFaq(cats, 'zzznomatch')).toEqual([])
  })
})
