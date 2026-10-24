/**
 * @vitest-environment jsdom
 *
 * H6 wizard (src/app/mes-services/creer/_components/ServiceWizard.tsx), server action mocked:
 *   • a field error shown in FR is shown in AR after the language switch (router.refresh keeps
 *     client state — reference_i18n_store_keys_not_text; same replay as form-errors-retranslate);
 *   • « Suivant » stays disabled until step 1 passes, and on step 2 stays disabled (step 3 is PR-3);
 *   • nothing is saved before the title has text; « Enregistrer le brouillon » saves with the
 *     returned id reused on the next save (no second insert).
 */

import '@testing-library/jest-dom/vitest'
import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react'
import { LangProvider } from '@/components/LangProvider'
import { t, type Lang } from '@/lib/i18n'
import { EMPTY_DRAFT, type DraftForm } from '@/lib/freelance/service-draft'

const h = vi.hoisted(() => ({ save: vi.fn() }))
vi.mock('@/app/mes-services/creer/actions', () => ({ saveServiceDraftAction: h.save }))

import { ServiceWizard } from '@/app/mes-services/creer/_components/ServiceWizard'

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

const ui = (lang: Lang, form: DraftForm = EMPTY_DRAFT, step: 1 | 2 = 1, draftId: string | null = null) => (
  <LangProvider lang={lang}>
    <ServiceWizard initialDraftId={draftId} initialForm={form} initialStep={step} />
  </LangProvider>
)

const READY: DraftForm = {
  ...EMPTY_DRAFT,
  title: 'Je crée votre boutique',
  sectorId: 'developpement-web-mobile',
  subcategoryId: 'e-commerce',
  skills: ['react'],
}

describe('H6 wizard', () => {
  it('re-translates a visible field error after an FR → AR switch', () => {
    const view = render(ui('fr'))
    const title = screen.getByLabelText(new RegExp(t('service.wizard.title.label', 'fr')))
    fireEvent.change(title, { target: { value: 'Court' } })
    fireEvent.blur(title)
    expect(screen.getByText(t('service.wizard.error.title_min', 'fr', { min: 10 }))).toBeInTheDocument()

    view.rerender(ui('ar'))
    expect(screen.getByText(t('service.wizard.error.title_min', 'ar', { min: 10 }))).toBeInTheDocument()
    expect(screen.queryByText(t('service.wizard.error.title_min', 'fr', { min: 10 }))).not.toBeInTheDocument()
  })

  it('keeps « Suivant » disabled until step 1 passes', () => {
    render(ui('fr', { ...READY, skills: [] }))
    expect(screen.getByRole('button', { name: t('service.wizard.footer.next', 'fr') })).toBeDisabled()
    cleanup()
    render(ui('fr', READY))
    expect(screen.getByRole('button', { name: t('service.wizard.footer.next', 'fr') })).toBeEnabled()
  })

  it('on step 2, « Suivant » is disabled (step 3 not built) and « Précédent » is offered', () => {
    render(ui('fr', READY, 2, '7d6a2f0e-4b7a-4c51-9a55-2c0b1f5e9a10'))
    expect(screen.getByRole('button', { name: t('service.wizard.footer.next', 'fr') })).toBeDisabled()
    expect(screen.getByRole('button', { name: t('service.wizard.footer.previous', 'fr') })).toBeEnabled()
    expect(screen.getByText(t('service.wizard.footer.saved', 'fr'))).toBeInTheDocument()
  })

  it('does not save before the title has text', () => {
    render(ui('fr'))
    fireEvent.click(screen.getByRole('button', { name: t('service.wizard.footer.save_draft', 'fr') }))
    expect(h.save).not.toHaveBeenCalled()
  })

  it('saves on « Enregistrer le brouillon » and reuses the returned id on the next save', async () => {
    h.save.mockResolvedValue({ ok: true, draftId: '7d6a2f0e-4b7a-4c51-9a55-2c0b1f5e9a10' })
    render(ui('fr'))
    const title = screen.getByLabelText(new RegExp(t('service.wizard.title.label', 'fr')))
    const saveDraft = screen.getByRole('button', { name: t('service.wizard.footer.save_draft', 'fr') })

    fireEvent.change(title, { target: { value: 'Je crée votre boutique' } })
    fireEvent.click(saveDraft)
    await waitFor(() => expect(screen.getByText(t('service.wizard.footer.saved', 'fr'))).toBeInTheDocument())
    expect(h.save).toHaveBeenLastCalledWith(expect.objectContaining({ draftId: null, title: 'Je crée votre boutique' }))

    fireEvent.change(title, { target: { value: 'Je crée votre boutique en ligne' } })
    fireEvent.click(saveDraft)
    await waitFor(() => expect(h.save).toHaveBeenCalledTimes(2))
    expect(h.save).toHaveBeenLastCalledWith(
      expect.objectContaining({ draftId: '7d6a2f0e-4b7a-4c51-9a55-2c0b1f5e9a10', title: 'Je crée votre boutique en ligne' }),
    )
  })

  it('shows a refused save as the translated error, in the live caption', async () => {
    h.save.mockResolvedValue({ ok: false, errorKey: 'service.wizard.error.draft_gone' })
    render(ui('fr', READY, 1, '7d6a2f0e-4b7a-4c51-9a55-2c0b1f5e9a10'))
    const title = screen.getByLabelText(new RegExp(t('service.wizard.title.label', 'fr')))
    fireEvent.change(title, { target: { value: 'Je crée votre boutique en ligne' } })
    fireEvent.click(screen.getByRole('button', { name: t('service.wizard.footer.save_draft', 'fr') }))
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(t('service.wizard.error.draft_gone', 'fr')))
  })
})
