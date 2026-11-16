import { describe, it, expect } from 'vitest'
import { MEMBER_ONLY_HREFS, sidebarSectionsForRole, sidebarSectionsForVisitor } from './sidebar-items'

const hrefs = (sections: ReturnType<typeof sidebarSectionsForVisitor>) => sections.flatMap((s) => s.items.map((i) => i.href))

describe('sidebarSectionsForVisitor — signed-out marketplace shell (journey walk J1)', () => {
  it('keeps Marketplace and Aide, drops the four member-only destinations', () => {
    const visitor = hrefs(sidebarSectionsForVisitor())
    expect(visitor).toEqual(['/marche/produits', '/aide'])
    for (const href of MEMBER_ONLY_HREFS) expect(visitor).not.toContain(href)
  })

  it('keeps the consumer sections and their order (Découvrir, then Outils)', () => {
    expect(sidebarSectionsForVisitor().map((s) => s.labelKey)).toEqual(
      sidebarSectionsForRole('consumer').map((s) => s.labelKey),
    )
  })

  it('leaves a signed-in consumer untouched', () => {
    expect(hrefs(sidebarSectionsForRole('consumer'))).toEqual(['/marche/produits', '/mes-commandes', '/mes-favoris', '/mes-annonces', '/parametres', '/aide'])
  })
})
