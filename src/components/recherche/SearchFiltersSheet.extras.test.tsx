/**
 * @vitest-environment jsdom
 *
 * The « Filtres » sheet with the Freelances lens's extras (Ville + Trier par): it writes ville / tri next to categorie / prix, keeps the other URL
 * params (vue, q), never writes the default sort, resets the page, and counts the extras in the badge. Without extras it is the old sheet.
 */
import '@testing-library/jest-dom/vitest'
import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const push = vi.fn()
let search = 'vue=freelances&q=aya&page=3'
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  useSearchParams: () => new URLSearchParams(search),
  usePathname: () => '/marche/services',
}))

import { LangProvider } from '@/components/LangProvider'
import { SearchFiltersSheet } from './SearchFiltersSheet'

afterEach(() => {
  cleanup()
  push.mockClear()
  search = 'vue=freelances&q=aya&page=3'
})

const extras = (over: Partial<{ ville: string | null; tri: string }> = {}) => ({
  cities: ['Sfax', 'Tunis'],
  ville: null as string | null,
  tri: 'recent',
  triDefault: 'recent',
  sortOptions: [
    { value: 'recent', labelKey: 'services.sort.recent' },
    { value: 'prix_asc', labelKey: 'services.sort.prix_asc' },
    { value: 'prix_desc', labelKey: 'services.sort.prix_desc' },
  ],
  ...over,
})

function mount(withExtras: ReturnType<typeof extras> | undefined, lang: 'fr' | 'ar' = 'fr') {
  return render(
    <LangProvider lang={lang}>
      <SearchFiltersSheet
        categories={[{ slug: 'design-graphique-logo', name_fr: 'Design graphique & logo', name_ar: 'التصميم' }]}
        selectedCategorie={[]}
        prixMin={null}
        prixMax={null}
        basePath="/marche/services"
        extras={withExtras}
      />
    </LangProvider>,
  )
}

describe('SearchFiltersSheet extras', () => {
  it('without extras there is no Ville / Trier par fieldset (the sheet every other surface uses)', async () => {
    const user = userEvent.setup()
    mount(undefined)
    await user.click(screen.getByRole('button', { name: /Filtres/ }))
    const dlg = screen.getByRole('dialog')
    expect(within(dlg).queryByText('Ville')).toBeNull()
    expect(within(dlg).queryByText('Trier par')).toBeNull()
  })

  it('with extras it offers Ville (all + the cities) and Trier par (three sorts)', async () => {
    const user = userEvent.setup()
    mount(extras())
    await user.click(screen.getByRole('button', { name: /Filtres/ }))
    const dlg = screen.getByRole('dialog')
    expect(within(dlg).getByText('Ville')).toBeInTheDocument()
    expect(within(dlg).getByLabelText('Toutes les villes')).toBeChecked()
    expect(within(dlg).getByLabelText('Sfax')).not.toBeChecked()
    expect(within(dlg).getByText('Trier par')).toBeInTheDocument()
    expect(within(dlg).getByLabelText('Plus récents')).toBeChecked()
    expect(within(dlg).getByLabelText('Prix croissant')).toBeInTheDocument()
    expect(within(dlg).getByLabelText('Prix décroissant')).toBeInTheDocument()
  })

  it('applying writes ville + tri (and categorie / prix), keeps vue and q, and drops the page', async () => {
    const user = userEvent.setup()
    mount(extras())
    await user.click(screen.getByRole('button', { name: /Filtres/ }))
    const dlg = screen.getByRole('dialog')
    await user.click(within(dlg).getByLabelText('Sfax'))
    await user.click(within(dlg).getByLabelText('Prix croissant'))
    await user.click(within(dlg).getByLabelText('Design graphique & logo'))
    await user.type(within(dlg).getByPlaceholderText('Min'), '40')
    await user.click(within(dlg).getByRole('button', { name: 'Appliquer' }))
    expect(push).toHaveBeenCalledTimes(1)
    const url = new URL(push.mock.calls[0][0] as string, 'http://x')
    expect(url.pathname).toBe('/marche/services')
    expect(Object.fromEntries(url.searchParams)).toEqual({
      vue: 'freelances',
      q: 'aya',
      ville: 'Sfax',
      tri: 'prix_asc',
      categorie: 'design-graphique-logo',
      prix_min: '40',
    })
  })

  it('the default sort is never written to the URL, and « Toutes les villes » removes ville', async () => {
    search = 'vue=freelances&ville=Sfax&tri=prix_desc'
    const user = userEvent.setup()
    mount(extras({ ville: 'Sfax', tri: 'prix_desc' }))
    await user.click(screen.getByRole('button', { name: /Filtres/ }))
    const dlg = screen.getByRole('dialog')
    await user.click(within(dlg).getByLabelText('Toutes les villes'))
    await user.click(within(dlg).getByLabelText('Plus récents'))
    await user.click(within(dlg).getByRole('button', { name: 'Appliquer' }))
    const url = new URL(push.mock.calls[0][0] as string, 'http://x')
    expect(Object.fromEntries(url.searchParams)).toEqual({ vue: 'freelances' })
  })

  it('the badge counts an active ville and a non-default sort', () => {
    mount(extras({ ville: 'Tunis', tri: 'prix_asc' }))
    expect(screen.getByRole('button', { name: /Filtres/ })).toHaveTextContent('2')
  })

  it('shows no badge when nothing is active, and reads in Arabic', () => {
    mount(extras(), 'ar')
    expect(screen.getByRole('button', { name: /تصفية/ }).textContent).not.toMatch(/\d/)
  })
})
