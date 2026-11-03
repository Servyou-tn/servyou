import { describe, it, expect } from 'vitest'
import { readNext, withNext, demanderTargetId } from './next-param'
import { nextDestinationAfterVerify } from '@/lib/verify-email'

const ID = '107392f2-55b3-4f53-aa72-9b90bf73fbff'

describe('readNext — the validated ?next= of a funnel page', () => {
  it('keeps a same-origin path', () => {
    expect(readNext(`/demander/${ID}`)).toBe(`/demander/${ID}`)
    expect(readNext(['/produits/x', '/ignored'])).toBe('/produits/x')
  })

  it('drops anything that is not a safe internal path (open-redirect guard)', () => {
    for (const bad of [undefined, '', 'https://evil.example', '//evil.example', '/\\evil.example', 'produits/x']) {
      expect(readNext(bad)).toBeNull()
    }
  })
})

describe('withNext — a funnel link that keeps ?next=', () => {
  it('appends an encoded next, with ? or & as the href needs', () => {
    expect(withNext('/inscription', `/demander/${ID}`)).toBe(`/inscription?next=${encodeURIComponent(`/demander/${ID}`)}`)
    expect(withNext('/connexion?x=1', '/produits/a?b=2')).toBe(`/connexion?x=1&next=${encodeURIComponent('/produits/a?b=2')}`)
  })

  it('leaves the href alone without a safe next', () => {
    expect(withNext('/inscription', null)).toBe('/inscription')
    expect(withNext('/inscription', '//evil.example')).toBe('/inscription')
  })
})

describe('demanderTargetId — the request form the visitor was going to', () => {
  it('reads the listing id of /demander/{uuid}', () => {
    expect(demanderTargetId(`/demander/${ID}`)).toBe(ID)
  })

  it('is null for any other page, a malformed id, or the confirmation page', () => {
    for (const other of [null, '/mes-commandes', '/demander/succes', '/demander/not-a-uuid', `/demander/${ID}/x`]) {
      expect(demanderTargetId(other)).toBeNull()
    }
  })
})

describe('nextDestinationAfterVerify — a safe next from the funnel wins over the role destination', () => {
  it('sends the new account back to the page it came from', () => {
    expect(nextDestinationAfterVerify('consumer', null, `/demander/${ID}`)).toBe(`/demander/${ID}`)
    expect(nextDestinationAfterVerify('shopOwner', null, '/produits/a')).toBe('/produits/a')
  })

  it('falls back to the role destination (or the workspace) when next is missing or unsafe', () => {
    expect(nextDestinationAfterVerify('consumer', null, null)).toBe('/')
    expect(nextDestinationAfterVerify('freelancer', null, '//evil.example')).toBe('/devenir-vendeur/freelance')
    expect(nextDestinationAfterVerify(null, null)).toBe(nextDestinationAfterVerify(null, null, undefined))
  })
})
