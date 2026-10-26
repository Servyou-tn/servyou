import { describe, it, expect } from 'vitest'
import { isItemActive } from './active-route'
import { sidebarSectionsForRole } from './sidebar-items'

describe('isItemActive — activeOn prefixes', () => {
  const find = sidebarSectionsForRole('freelancer')
    .flatMap((s) => s.items)
    .find((i) => i.href === '/trouver-des-missions')!

  it('« Trouver des missions » stays lit on the mission detail, proposal form and confirmation', () => {
    expect(isItemActive('/trouver-des-missions', find)).toBe(true)
    expect(isItemActive('/missions/2594f4bd-355d-4e6b-86cc-a38daf739c38', find)).toBe(true)
    expect(isItemActive('/missions/abc/proposer', find)).toBe(true)
  })

  it('does not light on look-alike prefixes, or for other items', () => {
    expect(isItemActive('/missionsX', find)).toBe(false)
    expect(isItemActive('/mes-propositions', find)).toBe(false)
    expect(isItemActive('/missions/abc', { href: '/mes-propositions' })).toBe(false)
  })
})
