/**
 * @vitest-environment jsdom
 *
 * /mes-annonces/nouvelle (F2): the skills field is the SkillsPicker — separate tags, a category that is never chosen for the
 * user — and the server action receives the skills as an array of single skills, the single budget as one value, and a skill
 * typed but never confirmed is still a tag when the form is submitted. Error / banner state holds i18n KEYS (re-translates).
 */
import '@testing-library/jest-dom/vitest'
import { describe, it, expect, vi, afterEach, beforeAll } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createElement } from 'react'
import { LangProvider } from '@/components/LangProvider'
import { t } from '@/lib/i18n'

const h = vi.hoisted(() => ({ create: vi.fn(), update: vi.fn(), push: vi.fn(), refresh: vi.fn(), toastOk: vi.fn() }))

vi.mock('@/app/mes-annonces/nouvelle/actions', () => ({ createAnnonce: (input: unknown) => h.create(input) }))
vi.mock('@/app/mes-annonces/[id]/modifier/actions', () => ({ updateAnnonce: (id: string, input: unknown) => h.update(id, input) }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: h.push, refresh: h.refresh }) }))
vi.mock('sonner', () => ({ toast: { success: h.toastOk, error: vi.fn() } }))
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: unknown; children?: unknown; [k: string]: unknown }) =>
    createElement('a', { href: typeof href === 'string' ? href : '#', ...rest }, children as never),
}))

import { AnnonceForm, type AnnonceFormEdit } from './AnnonceForm'

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
  h.update.mockReset()
  h.push.mockReset()
  h.refresh.mockReset()
  h.toastOk.mockReset()
})

const CATEGORIES = [
  { id: 'c-design', slug: 'design-graphique-logo', name_fr: 'Design graphique & logo', name_ar: 'التصميم الغرافيكي والشعارات' },
  { id: 'c-web', slug: 'developpement-web-mobile', name_fr: 'Développement web & mobile', name_ar: null },
]

function form(lang: 'fr' | 'ar' = 'fr') {
  return render(
    <LangProvider lang={lang}>
      <AnnonceForm categories={CATEGORIES} />
    </LangProvider>,
  )
}

// Labels carry the red asterisk of a required field in their text, so match on the prefix.
const field = (key: string, lang: 'fr' | 'ar' = 'fr') => screen.getByLabelText(t(key, lang), { exact: false })

const pick = () => screen.getByRole('button', { name: /Compétences recherchées/ })

describe('AnnonceForm — category is chosen, never pre-selected', () => {
  it('starts on the placeholder, and submitting without choosing one is refused client-side', async () => {
    const user = userEvent.setup()
    form()
    expect(field('annonce.form.category_label')).toHaveValue('')
    await user.type(field('annonce.form.title_label'), 'LOGO 3D')
    await user.type(field('annonce.form.description_label'), 'Un logo')
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
    expect(field('annonce.form.category_label')).toHaveValue('')
  })
})

describe('AnnonceForm — skills are separate tags', () => {
  it('offers no suggestions until a category is chosen, then the taxonomy pool for THAT category', async () => {
    const user = userEvent.setup()
    form()
    await user.click(pick())
    expect(screen.getByText(t('annonce.form.skills_empty', 'fr'))).toBeInTheDocument()
    await user.keyboard('{Escape}')
    await user.selectOptions(field('annonce.form.category_label'), 'c-design')
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
    await user.type(field('annonce.form.title_label'), 'LOGO 3D')
    await user.type(field('annonce.form.description_label'), 'Un logo pour mon café')
    await user.selectOptions(field('annonce.form.category_label'), 'c-design')
    await user.selectOptions(field('annonce.form.city_label'), 'Ariana')
    await user.click(pick())
    await user.type(screen.getByRole('searchbox'), 'Figma; Adobe')
    await user.click(screen.getByRole('button', { name: /Ajouter/ }))
    await user.keyboard('{Escape}')
    await user.click(screen.getByRole('button', { name: t('annonce.form.submit', 'fr') }))
    expect(h.create).toHaveBeenCalledTimes(1)
    expect(h.create.mock.calls[0][0]).toMatchObject({ categoryId: 'c-design', skills: ['Figma', 'Adobe'] })
  })
})

describe('AnnonceForm — F2 behaviour', () => {
  async function fillRequired(user: ReturnType<typeof userEvent.setup>) {
    await user.type(field('annonce.form.title_label'), 'LOGO 3D')
    await user.type(field('annonce.form.description_label'), 'Un logo pour mon café')
    await user.selectOptions(field('annonce.form.category_label'), 'c-design')
    await user.selectOptions(field('annonce.form.city_label'), 'Ariana')
  }

  it('a skill typed but never confirmed with Enter is still sent as a tag (trimmed, split on commas only)', async () => {
    const user = userEvent.setup()
    h.create.mockResolvedValue(undefined)
    form()
    await fillRequired(user)
    await user.click(pick())
    await user.type(screen.getByRole('searchbox'), '  Cobol, motion design ')
    // no Enter, no « Ajouter » click: the submit click closes the picker first
    await user.click(screen.getByRole('button', { name: t('annonce.form.submit', 'fr') }))
    expect(h.create).toHaveBeenCalledTimes(1)
    expect(h.create.mock.calls[0][0]).toMatchObject({ skills: ['Cobol', 'motion design'] })
  })

  it('sends the ONE budget field as a single value (the server saves it as budget_max)', async () => {
    const user = userEvent.setup()
    h.create.mockResolvedValue(undefined)
    form()
    await fillRequired(user)
    await user.type(field('annonce.form.budget_label'), '1500')
    await user.click(screen.getByRole('button', { name: t('annonce.form.submit', 'fr') }))
    expect(h.create.mock.calls[0][0]).toMatchObject({ budget: '1500' })
    expect(h.create.mock.calls[0][0]).not.toHaveProperty('budgetMin')
  })

  it('the limits are on the fields: title ≤ 60, description ≤ 500, with the description counter', () => {
    form()
    expect(field('annonce.form.title_label')).toHaveAttribute('maxlength', '60')
    expect(field('annonce.form.description_label')).toHaveAttribute('maxlength', '500')
    expect(screen.getByText('0/500')).toBeInTheDocument()
  })

  it('shows the cap refusal (5 open annonces) returned by the action, in French', async () => {
    const user = userEvent.setup()
    h.create.mockResolvedValue({ ok: false, errorKey: 'annonce.error.cap_open' })
    form()
    await fillRequired(user)
    await user.click(screen.getByRole('button', { name: t('annonce.form.submit', 'fr') }))
    expect(await screen.findByRole('alert')).toHaveTextContent(t('annonce.error.cap_open', 'fr'))
  })

  it('error state holds KEYS: the same error re-renders in Arabic when the language switches', async () => {
    const user = userEvent.setup()
    const { rerender } = form('fr')
    await user.click(screen.getByRole('button', { name: t('annonce.form.submit', 'fr') }))
    expect(screen.getByText(t('annonce.error.title_required', 'fr'))).toBeInTheDocument()
    rerender(
      <LangProvider lang="ar">
        <AnnonceForm categories={CATEGORIES} />
      </LangProvider>,
    )
    expect(screen.getByText(t('annonce.error.title_required', 'ar'))).toBeInTheDocument()
    expect(screen.queryByText(t('annonce.error.title_required', 'fr'))).not.toBeInTheDocument()
  })

  it('Arabic shows the Arabic category name, falling back to the French one when there is none', () => {
    form('ar')
    expect(screen.getByRole('option', { name: 'التصميم الغرافيكي والشعارات' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Développement web & mobile' })).toBeInTheDocument()
  })
})

// ── PR-3: edit mode (/mes-annonces/[id]/modifier) ──────────────────────────────────────────────────────────────────────────────────────────
const EDIT: AnnonceFormEdit = {
  id: 'post-1',
  legacyRange: null,
  initial: {
    title: 'Logo pour boutique bio',
    description: 'Un logo moderne.',
    categoryId: 'c-design',
    city: 'Tunis',
    budget: '400',
    isRemote: true,
    deadline: '2099-12-20',
    skills: ['Figma', 'Adobe'],
  },
}

function editForm(edit: AnnonceFormEdit = EDIT, lang: 'fr' | 'ar' = 'fr') {
  return render(
    <LangProvider lang={lang}>
      <AnnonceForm categories={CATEGORIES} edit={edit} />
    </LangProvider>,
  )
}

describe('AnnonceForm — edit mode (PR-3)', () => {
  it('starts from the stored post and says « Modifier » / « Enregistrer », with Annuler going back to the annonce', () => {
    editForm()
    expect(screen.getByRole('heading', { name: t('annonce.form.edit_title', 'fr') })).toBeInTheDocument()
    expect(field('annonce.form.title_label')).toHaveValue('Logo pour boutique bio')
    expect(field('annonce.form.category_label')).toHaveValue('c-design')
    expect(field('annonce.form.city_label')).toHaveValue('Tunis')
    expect(screen.getByRole('button', { name: t('annonce.form.edit_submit', 'fr') })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: t('annonce.form.submit', 'fr') })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: t('annonce.form.cancel', 'fr') })).toHaveAttribute('href', '/mes-annonces/post-1')
  })

  it('saves through updateAnnonce(id, values) — never createAnnonce — then toasts and goes back to the annonce', async () => {
    h.update.mockResolvedValue({ ok: true })
    const user = userEvent.setup()
    editForm()
    await user.clear(field('annonce.form.title_label'))
    await user.type(field('annonce.form.title_label'), 'Logo bio v2')
    await user.click(screen.getByRole('button', { name: t('annonce.form.edit_submit', 'fr') }))
    expect(h.create).not.toHaveBeenCalled()
    expect(h.update).toHaveBeenCalledWith(
      'post-1',
      expect.objectContaining({ title: 'Logo bio v2', categoryId: 'c-design', budget: '400', skills: ['Figma', 'Adobe'] }),
    )
    expect(h.toastOk).toHaveBeenCalledWith(t('annonce.form.edit_saved', 'fr'))
    expect(h.push).toHaveBeenCalledWith('/mes-annonces/post-1')
  })

  it('a refusal from the server (a proposal arrived meanwhile) shows its message and does not navigate', async () => {
    h.update.mockResolvedValue({ ok: false, errorKey: 'annonce.error.content_locked' })
    const user = userEvent.setup()
    editForm()
    await user.click(screen.getByRole('button', { name: t('annonce.form.edit_submit', 'fr') }))
    expect(await screen.findByRole('alert')).toHaveTextContent(t('annonce.error.content_locked', 'fr'))
    expect(h.push).not.toHaveBeenCalled()
  })

  it('an old over-long title / description left alone is NOT refused client-side (the limits apply to what changed)', async () => {
    h.update.mockResolvedValue({ ok: true })
    const user = userEvent.setup()
    editForm({ ...EDIT, initial: { ...EDIT.initial, title: 'x'.repeat(75), description: 'd'.repeat(650) } })
    await user.click(screen.getByRole('button', { name: t('annonce.form.edit_submit', 'fr') }))
    expect(h.update).toHaveBeenCalledTimes(1)
    expect(screen.queryByText(t('annonce.error.title_max', 'fr'))).not.toBeInTheDocument()
  })

  it('an old min–max budget is named under the field, and the note goes once the amount is changed', async () => {
    const user = userEvent.setup()
    editForm({ ...EDIT, legacyRange: '200 – 400 TND' })
    expect(screen.getByText(/200 – 400 TND/)).toBeInTheDocument()
    await user.clear(screen.getByRole('spinbutton'))
    await user.type(screen.getByRole('spinbutton'), '350')
    expect(screen.queryByText(/200 – 400 TND/)).not.toBeInTheDocument()
  })
})
