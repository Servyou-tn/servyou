/**
 * @vitest-environment jsdom
 *
 * The products and boutiques filter bars keep their typed text in local state. When the URL changes it (« Réinitialiser », a chip, Back) the box
 * follows, on the SAME element — the Boutiques lens used to remount the whole bar on every `q` change, which dropped the focus.
 */
import '@testing-library/jest-dom/vitest'
import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: () => {} }),
  useSearchParams: () => new URLSearchParams(),
}))

import { LangProvider } from '@/components/LangProvider'
import { BoutiquesFilterBar } from './BoutiquesFilterBar'
import { ProduitsFilterBar } from './ProduitsFilterBar'

afterEach(cleanup)

const boutiques = (q: string) => (
  <LangProvider lang="fr">
    <BoutiquesFilterBar categories={[]} cities={[]} selectedCategorie={[]} ville={null} tri="recent" q={q} basePath="/marche/produits" />
  </LangProvider>
)
const produits = (q: string, prixMin: number | null = null) => (
  <LangProvider lang="fr">
    <ProduitsFilterBar
      categories={[]}
      cities={[]}
      selectedCategorie={[]}
      ville={null}
      prixMin={prixMin}
      prixMax={null}
      tri="pertinence"
      q={q}
      basePath="/marche/produits"
    />
  </LangProvider>
)

describe.each([
  ['BoutiquesFilterBar', boutiques],
  ['ProduitsFilterBar', produits],
])('%s — search box vs the URL', (_name, bar) => {
  it('follows `q` when the URL clears it, on the same element (no remount, so the focus survives)', () => {
    const { rerender } = render(bar('zzz'))
    const input = screen.getByRole('searchbox') as HTMLInputElement
    expect(input.value).toBe('zzz')
    input.focus()
    rerender(bar(''))
    expect(screen.getByRole('searchbox')).toBe(input)
    expect(input.value).toBe('')
    expect(document.activeElement).toBe(input)
  })

  it('follows a new q too', () => {
    const { rerender } = render(bar(''))
    rerender(bar('logo'))
    expect((screen.getByRole('searchbox') as HTMLInputElement).value).toBe('logo')
  })
})
