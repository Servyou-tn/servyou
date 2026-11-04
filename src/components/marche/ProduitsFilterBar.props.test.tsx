/**
 * @vitest-environment jsdom
 *
 * ProduitsFilterBar's opt-in props (PR-2b, shared for /recherche). The defaults must keep /marche/produits exactly as
 * it was: the browse three sorts with « Plus récents » shown for the default `pertinence`, the « q » chip, and
 * « Tout effacer » clearing the query. /recherche opts into Pertinence and drops the « q » chip, and its clear-all keeps
 * the query.
 */
import '@testing-library/jest-dom/vitest'
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'

const nav = vi.hoisted(() => ({ push: vi.fn(), search: '' }))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: nav.push }),
  useSearchParams: () => new URLSearchParams(nav.search),
}))

import { LangProvider } from '@/components/LangProvider'
import { ProduitsFilterBar } from './ProduitsFilterBar'
import type { SearchSort } from '@/lib/search/search-params'

type Extra = Partial<{ sortOptions: SearchSort[]; triDefault: SearchSort; showQueryChip: boolean; basePath: string }>

const bar = (extra: Extra = {}) => (
  <LangProvider lang="fr">
    <ProduitsFilterBar
      categories={[]}
      cities={['Sfax']}
      selectedCategorie={[]}
      ville="Sfax"
      prixMin={null}
      prixMax={null}
      tri="pertinence"
      q="coussin"
      basePath={extra.basePath ?? '/marche/produits'}
      {...extra}
    />
  </LangProvider>
)

const RECHERCHE: Extra = {
  basePath: '/recherche',
  sortOptions: ['pertinence', 'recent', 'prix_asc', 'prix_desc'],
  triDefault: 'pertinence',
  showQueryChip: false,
}

beforeEach(() => {
  nav.push.mockClear()
  nav.search = 'q=coussin&ville=Sfax'
})
afterEach(cleanup)

describe('ProduitsFilterBar — defaults (/marche/produits, unchanged)', () => {
  it('shows « Plus récents » for the parsed default `pertinence`', () => {
    render(bar())
    expect(screen.getByText('Trier par : Plus récents')).toBeInTheDocument()
  })

  it('shows the « q » chip, and « Tout effacer » clears the query with the filters', () => {
    render(bar())
    expect(screen.getByText('« coussin »')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Tout effacer' }))
    expect(nav.push).toHaveBeenCalledWith('/marche/produits')
  })
})

describe('ProduitsFilterBar — /recherche opt-ins', () => {
  it('keeps « Pertinence » as the shown default', () => {
    render(bar(RECHERCHE))
    expect(screen.getByText('Trier par : Pertinence')).toBeInTheDocument()
  })

  it('a sort outside the offered list folds to the surface default', () => {
    render(bar({ ...RECHERCHE, sortOptions: ['pertinence', 'recent'] }))
    expect(screen.getByText('Trier par : Pertinence')).toBeInTheDocument()
  })

  it('no « q » chip, and « Tout effacer » clears the filters but keeps the query', () => {
    render(bar(RECHERCHE))
    expect(screen.queryByText('« coussin »')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Tout effacer' }))
    expect(nav.push).toHaveBeenCalledWith('/recherche?q=coussin')
  })
})
