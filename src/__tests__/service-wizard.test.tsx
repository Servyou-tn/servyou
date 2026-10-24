/**
 * @vitest-environment jsdom
 *
 * H6 wizard (src/app/mes-services/creer/_components/ServiceWizard.tsx), server action mocked:
 *   • a field error shown in FR is shown in AR after the language switch (router.refresh keeps
 *     client state — reference_i18n_store_keys_not_text; same replay as form-errors-retranslate);
 *   • « Suivant » stays disabled until the current step passes; it moves one step on (2 → 3 since
 *     PR-3), and on step 4 it stays disabled with the wizard's own « Bientôt disponible » (step 5 is
 *     PR-4, ruling D21); « Précédent » moves one step back;
 *   • Unité / Mode are radio groups whose choice reaches the autosave (rulings D13, D15, D19);
 *   • nothing is saved before the title has text; « Enregistrer le brouillon » saves with the
 *     returned id reused on the next save (no second insert).
 */

import '@testing-library/jest-dom/vitest'
import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup, fireEvent, waitFor, act } from '@testing-library/react'
import { LangProvider } from '@/components/LangProvider'
import { t, type Lang } from '@/lib/i18n'
import { EMPTY_DRAFT, type DraftForm, type ServiceWizardStep } from '@/lib/freelance/service-draft'

const h = vi.hoisted(() => ({ save: vi.fn() }))
vi.mock('@/app/mes-services/creer/actions', () => ({ saveServiceDraftAction: h.save }))

import { ServiceWizard } from '@/app/mes-services/creer/_components/ServiceWizard'

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

const ui = (lang: Lang, form: DraftForm = EMPTY_DRAFT, step: ServiceWizardStep = 1, draftId: string | null = null) => (
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
const STEP2_OK: DraftForm = { ...READY, shortDescription: 'Boutique prête', description: 'x'.repeat(100) }
const DRAFT_ID = '7d6a2f0e-4b7a-4c51-9a55-2c0b1f5e9a10'
const next = () => screen.getByRole('button', { name: t('service.wizard.footer.next', 'fr') })

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

  it('on step 2, « Suivant » waits for the step-2 gate, then saves and opens step 3', async () => {
    h.save.mockResolvedValue({ ok: true, draftId: DRAFT_ID })
    render(ui('fr', READY, 2, DRAFT_ID))
    expect(next()).toBeDisabled()
    expect(screen.getByRole('button', { name: t('service.wizard.footer.previous', 'fr') })).toBeEnabled()
    expect(screen.getByText(t('service.wizard.footer.saved', 'fr'))).toBeInTheDocument()
    cleanup()

    render(ui('fr', STEP2_OK, 2, DRAFT_ID))
    fireEvent.change(screen.getByLabelText(new RegExp(t('service.wizard.short.label', 'fr'))), {
      target: { value: 'Boutique prête en 7 jours' },
    })
    fireEvent.click(next())
    expect(await screen.findByLabelText(new RegExp(t('service.wizard.price.label', 'fr')))).toBeInTheDocument()
    expect(h.save).toHaveBeenLastCalledWith(expect.objectContaining({ draftId: DRAFT_ID, shortDescription: 'Boutique prête en 7 jours' }))
  })

  it('on step 3, « Suivant » needs a valid price; the chosen unit reaches the autosave', async () => {
    h.save.mockResolvedValue({ ok: true, draftId: DRAFT_ID })
    render(ui('fr', STEP2_OK, 3, DRAFT_ID))
    const price = screen.getByLabelText(new RegExp(t('service.wizard.price.label', 'fr')))
    expect(price).toHaveAttribute('dir', 'ltr')
    expect(screen.getByText('TND')).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: t('service.wizard.unit.fixed', 'fr') })).toBeChecked()
    expect(next()).toBeDisabled()

    fireEvent.change(price, { target: { value: '800,505' } })
    fireEvent.blur(price)
    expect(screen.getByText(t('service.wizard.error.price_invalid', 'fr'))).toBeInTheDocument()
    expect(next()).toBeDisabled()

    fireEvent.change(price, { target: { value: '800,50' } })
    fireEvent.click(screen.getByRole('radio', { name: t('service.wizard.unit.month', 'fr') }))
    expect(screen.getByRole('radio', { name: t('service.wizard.unit.month', 'fr') })).toBeChecked()
    fireEvent.click(next())
    expect(await screen.findByLabelText(new RegExp(t('service.wizard.deliverables.label', 'fr')))).toBeInTheDocument()
    expect(h.save).toHaveBeenLastCalledWith(expect.objectContaining({ price: '800,50', priceUnit: 'month' }))
  })

  it('on step 4, « Suivant » stays disabled with the wizard\'s own « Bientôt disponible », in both languages', () => {
    const ready4 = { ...STEP2_OK, price: '800', deliverablesText: 'Design UI iOS\n3 écrans\nFichiers sources' }
    const view = render(ui('fr', ready4, 4, DRAFT_ID))
    expect(next()).toBeDisabled()
    expect(next().parentElement).toHaveAttribute('title', 'Bientôt disponible')
    expect(screen.getByRole('radio', { name: t('service.wizard.mode.remote', 'fr') })).toBeChecked()

    view.rerender(ui('ar', ready4, 4, DRAFT_ID))
    expect(screen.getByRole('button', { name: t('service.wizard.footer.next', 'ar') }).parentElement).toHaveAttribute('title', 'قريباً')
  })

  it('a « Précédent » clicked while « Suivant »\'s save is in flight wins — no jump to step 3', async () => {
    let finish: (v: unknown) => void = () => {}
    h.save.mockImplementation(() => new Promise((resolve) => (finish = resolve)))
    render(ui('fr', STEP2_OK, 2, DRAFT_ID))
    fireEvent.change(screen.getByLabelText(new RegExp(t('service.wizard.short.label', 'fr'))), {
      target: { value: 'Boutique prête en 7 jours' },
    })
    fireEvent.click(next())
    await waitFor(() => expect(h.save).toHaveBeenCalledTimes(1))
    fireEvent.click(screen.getByRole('button', { name: t('service.wizard.footer.previous', 'fr') }))
    await act(async () => finish({ ok: true, draftId: DRAFT_ID }))
    expect(screen.getByLabelText(new RegExp(t('service.wizard.title.label', 'fr')))).toBeInTheDocument()
    expect(screen.queryByLabelText(new RegExp(t('service.wizard.price.label', 'fr')))).not.toBeInTheDocument()
  })

  it('« Précédent » moves one step back (4 → 3), saving the step-4 choice', async () => {
    h.save.mockResolvedValue({ ok: true, draftId: DRAFT_ID })
    render(ui('fr', { ...STEP2_OK, price: '800' }, 4, DRAFT_ID))
    fireEvent.click(screen.getByRole('radio', { name: t('service.wizard.mode.hybrid', 'fr') }))
    fireEvent.click(screen.getByRole('button', { name: t('service.wizard.footer.previous', 'fr') }))
    expect(screen.getByLabelText(new RegExp(t('service.wizard.price.label', 'fr')))).toHaveValue('800')
    await waitFor(() => expect(h.save).toHaveBeenLastCalledWith(expect.objectContaining({ deliveryMode: 'hybrid' })))
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
