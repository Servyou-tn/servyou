/**
 * @vitest-environment jsdom
 *
 * The filter bar keeps its typed text and price fields in local state; when the URL changes them (« Réinitialiser », a chip, Back) they follow,
 * without remounting the bar (so a submit keeps the focus).
 */
import '@testing-library/jest-dom/vitest'
import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: () => {} }),
  useSearchParams: () => new URLSearchParams(),
}))

import { LangProvider } from '@/components/LangProvider'
import { ServicesFilterBar } from './ServicesFilterBar'

afterEach(cleanup)

const bar = (q: string) => (
  <LangProvider lang="fr">
    <ServicesFilterBar
      categories={[]}
      cities={[]}
      selectedCategorie={[]}
      ville={null}
      prixMin={null}
      prixMax={null}
      tri="recent"
      q={q}
      basePath="/marche/services"
    />
  </LangProvider>
)

describe('ServicesFilterBar — stale text after a reset', () => {
  it('the search box follows `q` when the URL clears it, on the SAME element (no remount)', () => {
    const { rerender } = render(bar('zzz'))
    const input = screen.getByRole('searchbox') as HTMLInputElement
    expect(input.value).toBe('zzz')
    rerender(bar(''))
    expect(screen.getByRole('searchbox')).toBe(input)
    expect(input.value).toBe('')
  })

  it('follows a new q too', () => {
    const { rerender } = render(bar(''))
    rerender(bar('logo'))
    expect((screen.getByRole('searchbox') as HTMLInputElement).value).toBe('logo')
  })
})
