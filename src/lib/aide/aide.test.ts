import { describe, it, expect } from 'vitest'
import { t } from '@/lib/i18n'
import { aideGroupIdsForRole, AIDE_GROUP_ICON, AIDE_QUESTIONS_PER_GROUP, type AideGroupId } from './groups'
import { filterAideGroups, normalizeForSearch, countAideItems, type AideGroupView } from './search'

// Pure logic only (no Supabase, no DOM). The role → groups map decides which help a user sees; the
// filter decides what a search finds — both are easy to break silently.

describe('aideGroupIdsForRole', () => {
  it('a buyer (no seller_type) gets ONLY the four universal groups — no freelance or shop groups', () => {
    expect(aideGroupIdsForRole(null)).toEqual(['acheter', 'annonces', 'securite', 'compte'])
  })

  it('a freelancer gets the four freelance groups first, then the universal four', () => {
    expect(aideGroupIdsForRole('freelancer')).toEqual([
      'profil', 'services', 'engagements', 'missions', 'acheter', 'annonces', 'securite', 'compte',
    ])
  })

  it('a shop owner gets the four boutique groups first, then the universal four — never the freelance ones', () => {
    const ids = aideGroupIdsForRole('shop_owner')
    expect(ids).toEqual(['boutique', 'produits', 'commandes', 'livraison', 'acheter', 'annonces', 'securite', 'compte'])
    expect(ids).not.toContain('profil')
  })

  it('every group has an icon and no id repeats within a role', () => {
    for (const role of [null, 'freelancer', 'shop_owner'] as const) {
      const ids = aideGroupIdsForRole(role)
      expect(new Set(ids).size).toBe(ids.length)
      for (const id of ids) expect(AIDE_GROUP_ICON[id]).toBeTruthy()
    }
  })
})

describe('normalizeForSearch', () => {
  it('folds case and French accents', () => {
    expect(normalizeForSearch('Réponse À la Commande')).toBe('reponse a la commande')
  })

  it('folds Arabic diacritics, tatweel and the alef family', () => {
    expect(normalizeForSearch('أَرْسَلَ')).toBe(normalizeForSearch('ارسل'))
    expect(normalizeForSearch('إعلان')).toBe(normalizeForSearch('اعلان'))
    expect(normalizeForSearch('الـطلب')).toBe(normalizeForSearch('الطلب'))
  })
})

const GROUPS: AideGroupView[] = [
  {
    id: 'engagements',
    icon: 'file-check',
    title: 'Mes engagements',
    items: [{ id: 'e1', q: "Que signifient les statuts d'un engagement ?", a: "Un engagement est une commande de service confirmée." }],
  },
  {
    id: 'acheter',
    icon: 'shopping-bag',
    title: 'Acheter sur Servyou',
    items: [
      { id: 'a1', q: 'Comment passer une commande ?', a: 'Ouvrez la fiche et envoyez votre demande.' },
      { id: 'a2', q: 'Pourquoi la discussion se passe-t-elle sur WhatsApp ?', a: 'Pour suivre votre commande avec le vendeur.' },
    ],
  },
  {
    id: 'compte',
    icon: 'user',
    title: 'Mon compte',
    items: [{ id: 'c1', q: "J'ai oublié mon mot de passe", a: 'Utilisez « Mot de passe oublié » sur la page de connexion.' }],
  },
]

describe('filterAideGroups', () => {
  it('a blank query returns the groups untouched', () => {
    expect(filterAideGroups(GROUPS, '')).toBe(GROUPS)
    expect(filterAideGroups(GROUPS, '   ')).toBe(GROUPS)
  })

  it('matches the ANSWER as well as the question, across groups, and drops groups left empty', () => {
    const out = filterAideGroups(GROUPS, 'commande')
    expect(out.map((g) => g.id)).toEqual(['engagements', 'acheter'])
    expect(countAideItems(out)).toBe(3)
    expect(out[1].items.map((i) => i.id)).toEqual(['a1', 'a2'])
  })

  it('is accent- and case-insensitive on both sides', () => {
    expect(countAideItems(filterAideGroups(GROUPS, 'OUBLIE'))).toBe(1)
    expect(countAideItems(filterAideGroups(GROUPS, 'oublié'))).toBe(1)
  })

  it('requires EVERY term (AND), in any order', () => {
    expect(countAideItems(filterAideGroups(GROUPS, 'whatsapp commande'))).toBe(1)
    expect(countAideItems(filterAideGroups(GROUPS, 'commande mot de passe'))).toBe(0)
  })

  it('a query that matches nothing returns an empty list (the page shows the no-result state)', () => {
    expect(filterAideGroups(GROUPS, 'facture')).toEqual([])
  })
})

// The page builds these keys dynamically (aide.g.<id>.title / q<n> / a<n>), so a key missing from BOTH
// dictionaries would not trip the fr/ar parity test — it would just render the raw key on screen.
describe('aide content completeness', () => {
  const ALL: AideGroupId[] = [...new Set([null, 'freelancer', 'shop_owner'].flatMap((r) => aideGroupIdsForRole(r as never)))]

  it('covers all 12 groups across the three roles', () => {
    expect(ALL).toHaveLength(12)
  })

  it.each(['fr', 'ar'] as const)('every group has a title and %s question + answer for each of the 3 slots', (lang) => {
    for (const id of ALL) {
      const keys = [`aide.g.${id}.title`]
      for (let n = 1; n <= AIDE_QUESTIONS_PER_GROUP; n++) keys.push(`aide.g.${id}.q${n}`, `aide.g.${id}.a${n}`)
      for (const key of keys) {
        const text = t(key, lang)
        expect(text, `${lang}: ${key}`).not.toBe(key)
        expect(text.trim().length, `${lang}: ${key} is empty`).toBeGreaterThan(0)
      }
    }
  })

  it.each(['fr', 'ar'] as const)('has a search placeholder for every role (%s)', (lang) => {
    for (const role of ['freelancer', 'shop_owner', 'consumer']) {
      const key = `aide.search.placeholder.${role}`
      expect(t(key, lang), `${lang}: ${key}`).not.toBe(key)
    }
  })

  it('the results-count captions interpolate {q} and {n}', () => {
    expect(t('aide.search.countOne', 'fr', { q: 'x' })).toContain('« x »')
    const many = t('aide.search.countMany', 'fr', { n: 4, q: 'commande' })
    expect(many).toContain('4')
    expect(many).toContain('commande')
    expect(t('aide.search.countMany', 'ar', { n: 4, q: 'x' })).toContain('4')
  })
})
