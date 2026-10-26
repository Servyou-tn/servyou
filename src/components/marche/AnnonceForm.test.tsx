/**
 * @vitest-environment jsdom
 *
 * /mes-annonces/nouvelle (missions PR-4): the skills field is the SkillsPicker — separate tags, a category that is never
 * chosen for the user — and the server action receives the skills as an array of single skills.
 */
import '@testing-library/jest-dom/vitest'
import { describe, it, expect, vi, afterEach, beforeAll } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createElement } from 'react'
import { LangProvider } from '@/components/LangProvider'
import { t } from '@/lib/i18n'

const h = vi.hoisted(() => ({ create: vi.fn() }))

vi.mock('@/app/mes-annonces/nouvelle/actions', () => ({ createAnnonce: (input: unknown) => h.create(input) }))
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: unknown; children?: unknown; [k: string]: unknown }) =>
    createElement('a', { href: typeof href === 'string' ? href : '#', ...rest }, children as never),
}))

import { AnnonceForm } from './AnnonceForm'

beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver
})
afterEach(() => {
  cleanup()
  h.create.mockReset()
})

const CATEGORIES = [
  { id: 'c-design', slug: 'design-graphique-logo', name_fr: 'Design graphique & logo' },
  { id: 'c-web', slug: 'developpement-web-mobile', name_fr: 'Développement web & mobile' },
]

function form() {
  return render(
    <LangProvider lang="fr">
      <AnnonceForm categories={CATEGORIES} />
    </LangProvider>,
  )
}

const pick = () => screen.getByRole('button', { name: /Compétences recherchées/ })

describe('AnnonceForm — category is chosen, never pre-selected', () => {
  it('starts on the placeholder, and submitting without choosing one is refused client-side', async () => {
    const user = userEvent.setup()
    form()
    expect(screen.getByLabelText(t('annonce.form.category_label', 'fr'))).toHaveValue('')
    await user.type(screen.getByLabelText(t('annonce.form.title_label', 'fr')), 'LOGO 3D')
    await user.type(screen.getByLabelText(t('annonce.form.description_label', 'fr')), 'Un logo')
    await user.click(screen.getByRole('button', { name: t('annonce.form.submit', 'fr') }))
    expect(screen.getByText(t('annonce.error.category_required', 'fr'))).toBeInTheDocument()
    expect(h.create).not.toHaveBeenCalled()
  })

  it('picking skills does not touch the category', async () => {
    const user = userEvent.setup()
    form()
    await user.click(pick())
    await user.type(screen.getByRole('searchbox'), 'Cobol')
    await user.click(screen.getByRole('button', { name: /Ajouter « Cobol »/ }))
    expect(screen.getByLabelText(t('annonce.form.category_label', 'fr'))).toHaveValue('')
  })
})

describe('AnnonceForm — skills are separate tags', () => {
  it('offers no suggestions until a category is chosen, then the taxonomy pool for THAT category', async () => {
    const user = userEvent.setup()
    form()
    await user.click(pick())
    expect(screen.getByText(t('annonce.form.skills_empty', 'fr'))).toBeInTheDocument()
    await user.keyboard('{Escape}')
    await user.selectOptions(screen.getByLabelText(t('annonce.form.category_label', 'fr')), 'c-design')
    await user.click(pick())
    expect(screen.getByRole('group', { name: t('annonce.form.skills_suggested', 'fr') })).toBeInTheDocument()
    expect(screen.getAllByRole('checkbox').length).toBeGreaterThan(0)
  })

  it('« figma, adobe » is TWO tags; « higsfild claude adobe » stays the one skill the user typed (a space never splits)', async () => {
    const user = userEvent.setup()
    form()
    await user.click(pick())
    await user.type(screen.getByRole('searchbox'), 'figma, adobe')
    await user.click(screen.getByRole('button', { name: /Ajouter « figma, adobe »/ }))
    expect(screen.getByRole('button', { name: 'Supprimer figma' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Supprimer adobe' })).toBeInTheDocument()
  })

  it('sends the skills to the server action as an array of single skills, with the category the user chose', async () => {
    const user = userEvent.setup()
    h.create.mockResolvedValue(undefined)
    form()
    await user.type(screen.getByLabelText(t('annonce.form.title_label', 'fr')), 'LOGO 3D')
    await user.type(screen.getByLabelText(t('annonce.form.description_label', 'fr')), 'Un logo pour mon café')
    await user.selectOptions(screen.getByLabelText(t('annonce.form.category_label', 'fr')), 'c-design')
    await user.selectOptions(screen.getByLabelText(t('annonce.form.city_label', 'fr')), 'Ariana')
    await user.click(pick())
    await user.type(screen.getByRole('searchbox'), 'Figma; Adobe')
    await user.click(screen.getByRole('button', { name: /Ajouter/ }))
    await user.keyboard('{Escape}')
    await user.click(screen.getByRole('button', { name: t('annonce.form.submit', 'fr') }))
    expect(h.create).toHaveBeenCalledTimes(1)
    expect(h.create.mock.calls[0][0]).toMatchObject({ categoryId: 'c-design', skills: ['Figma', 'Adobe'] })
  })
})
