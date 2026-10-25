/**
 * @vitest-environment jsdom
 *
 * H7 « Modifier un service » — the H6 wizard in edit mode (docs/design/h7-deltas.md), server actions mocked:
 *   • NOTHING is autosaved on a live / paused service: not after a keystroke + the autosave delay, not on
 *     « Suivant » / « Précédent » (saveServiceDraftAction would insert a draft or hit « brouillon introuvable »);
 *   • no « Enregistrer le brouillon»; the step-5 primary is « Enregistrer les modifications »;
 *   • the footer says « Modifications non enregistrées » only while the form differs from what was loaded;
 *   • « Enregistrer les modifications » sends the whole form + the service id to updateServiceAction (never the
 *     draft actions), then toasts and returns to /mes-services;
 *   • a refusal flags the récap rows and keeps the page, exactly like the H6 publish refusal;
 *   • unsaved changes are guarded on exit (beforeunload + in-app links); clean forms leave freely.
 */

import '@testing-library/jest-dom/vitest'
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
import { render, screen, cleanup, fireEvent, waitFor, act } from '@testing-library/react'
import { LangProvider } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { EMPTY_DRAFT, type DraftForm, type ServiceWizardStep } from '@/lib/freelance/service-draft'

const h = vi.hoisted(() => ({
  save: vi.fn(),
  publish: vi.fn(),
  update: vi.fn(),
  replace: vi.fn(),
  push: vi.fn(),
  toastSuccess: vi.fn(),
}))
vi.mock('@/app/mes-services/creer/actions', () => ({ saveServiceDraftAction: h.save, publishServiceDraftAction: h.publish }))
vi.mock('@/app/mes-services/[id]/modifier/actions', () => ({ updateServiceAction: h.update }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: h.replace, push: h.push }) }))
vi.mock('sonner', () => ({ toast: { success: h.toastSuccess, error: vi.fn() } }))

import { ServiceWizard } from '@/app/mes-services/creer/_components/ServiceWizard'

const SERVICE_ID = '263c5565-687d-43b6-a354-a73a4b701f1b'
const FULL: DraftForm = {
  ...EMPTY_DRAFT,
  title: 'Business plan pour la banque',
  sectorId: 'developpement-web-mobile',
  subcategoryId: 'e-commerce',
  skills: ['react'],
  shortDescription: 'Business plan complet prêt pour la banque',
  description: 'x'.repeat(120),
  price: '800',
  deliverablesText: 'Design UI iOS\n3 écrans\nFichiers sources',
}

const ui = (form: DraftForm = FULL, step: ServiceWizardStep = 5) => (
  <LangProvider lang="fr">
    <ServiceWizard mode="edit" serviceId={SERVICE_ID} initialDraftId={null} initialForm={form} initialStep={step} />
  </LangProvider>
)
const button = (key: string) => screen.getByRole('button', { name: t(key, 'fr') })
const shortField = () => screen.getByLabelText(new RegExp(t('service.wizard.short.label', 'fr')))
const row = (labelKey: string) =>
  screen
    .getAllByText(t(labelKey, 'fr'))
    .map((el) => el.closest('li'))
    .find((li) => li?.querySelector('button')) as HTMLElement

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
})
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  vi.useRealTimers()
})

describe('H7 edit mode — no autosave', () => {
  it('never calls a draft action: not after an edit + the autosave delay, not on Suivant / Précédent', async () => {
    render(ui(FULL, 2))
    fireEvent.change(shortField(), { target: { value: 'Business plan complet, livré en 7 jours' } })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000)
    })
    fireEvent.click(button('service.wizard.footer.next'))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000)
    })
    // Suivant moved on without waiting for a save…
    expect(screen.getByLabelText(new RegExp(t('service.wizard.price.label', 'fr')))).toHaveValue('800')
    fireEvent.click(button('service.wizard.footer.previous'))
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000)
    })
    expect(shortField()).toHaveValue('Business plan complet, livré en 7 jours')
    expect(h.save).not.toHaveBeenCalled()
    expect(h.publish).not.toHaveBeenCalled()
    expect(h.update).not.toHaveBeenCalled()
  })

  it('has no « Enregistrer le brouillon » and no autosave caption; step 5 offers « Enregistrer les modifications »', () => {
    render(ui(FULL, 5))
    expect(screen.queryByRole('button', { name: t('service.wizard.footer.save_draft', 'fr') })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: t('service.wizard.footer.publish', 'fr') })).not.toBeInTheDocument()
    expect(screen.queryByText(t('service.wizard.footer.saved', 'fr'))).not.toBeInTheDocument()
    expect(button('service.edit.footer.save')).toBeEnabled()
  })

  it('does not announce a resumed draft', () => {
    render(ui(FULL, 5))
    expect(screen.queryByText(/Vous reprenez votre brouillon/)).not.toBeInTheDocument()
  })
})

describe('H7 edit mode — unsaved changes', () => {
  it('shows « Modifications non enregistrées » only while the form differs from what was loaded', () => {
    render(ui(FULL, 2))
    const caption = t('service.edit.footer.dirty', 'fr')
    expect(screen.queryByText(caption)).not.toBeInTheDocument()
    fireEvent.change(shortField(), { target: { value: 'Autre texte' } })
    expect(screen.getByText(caption)).toBeInTheDocument()
    fireEvent.change(shortField(), { target: { value: FULL.shortDescription } })
    expect(screen.queryByText(caption)).not.toBeInTheDocument()
  })

  it('asks the browser to confirm closing the tab only while dirty', () => {
    render(ui(FULL, 2))
    const clean = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(clean)
    expect(clean.defaultPrevented).toBe(false)

    fireEvent.change(shortField(), { target: { value: 'Autre texte' } })
    const dirty = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(dirty)
    expect(dirty.defaultPrevented).toBe(true)
  })

  it('confirms before an in-app link leaves dirty changes, and lets a declined click stay', () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    render(
      <>
        <a href="/mes-services">Mes services</a>
        {ui(FULL, 2)}
      </>,
    )
    const link = screen.getByText('Mes services')
    const onClick = (e: Event) => e.preventDefault() // jsdom would try to navigate

    // Clean: no question asked.
    const cleanClick = new MouseEvent('click', { bubbles: true, cancelable: true })
    link.addEventListener('click', onClick)
    link.dispatchEvent(cleanClick)
    expect(confirm).not.toHaveBeenCalled()

    fireEvent.change(shortField(), { target: { value: 'Autre texte' } })
    const declined = new MouseEvent('click', { bubbles: true, cancelable: true })
    let reached = false
    link.addEventListener('click', () => (reached = true))
    link.dispatchEvent(declined)
    expect(confirm).toHaveBeenCalledWith(t('service.edit.leave_confirm', 'fr'))
    expect(declined.defaultPrevented).toBe(true)
    expect(reached).toBe(false) // stopped in the capture phase, before Next's <Link> could navigate
    confirm.mockRestore()
  })
})

describe('H7 edit mode — « Enregistrer les modifications »', () => {
  it('sends the whole form and the service id to updateServiceAction, then toasts and returns to /mes-services', async () => {
    h.update.mockResolvedValue({ ok: true })
    render(ui(FULL, 2))
    fireEvent.change(shortField(), { target: { value: 'Business plan complet, livré en 7 jours' } })
    fireEvent.click(button('service.wizard.footer.next'))
    fireEvent.click(button('service.wizard.footer.next'))
    fireEvent.click(button('service.wizard.footer.next'))
    fireEvent.click(button('service.edit.footer.save'))

    await waitFor(() => expect(h.push).toHaveBeenCalledWith('/mes-services'))
    expect(h.update).toHaveBeenCalledTimes(1)
    expect(h.update).toHaveBeenCalledWith({
      serviceId: SERVICE_ID,
      ...FULL,
      shortDescription: 'Business plan complet, livré en 7 jours',
    })
    expect(h.toastSuccess).toHaveBeenCalledWith(t('service.edit.saved', 'fr'))
    expect(h.save).not.toHaveBeenCalled()
    expect(h.publish).not.toHaveBeenCalled()
  })

  it('leaving after a save is not guarded', async () => {
    h.update.mockResolvedValue({ ok: true })
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    render(
      <>
        <a href="/mes-services">Mes services</a>
        {ui(FULL, 5)}
      </>,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Modifier — Description' }))
    fireEvent.change(shortField(), { target: { value: 'Autre texte' } })
    for (let i = 0; i < 3; i++) fireEvent.click(button('service.wizard.footer.next'))
    fireEvent.click(button('service.edit.footer.save'))
    await waitFor(() => expect(h.push).toHaveBeenCalled())

    const link = screen.getByText('Mes services')
    link.addEventListener('click', (e) => e.preventDefault())
    link.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
    expect(confirm).not.toHaveBeenCalled()
    confirm.mockRestore()
  })

  it('a refusal flags the failing rows, keeps the page, and re-enables the button', async () => {
    h.update.mockResolvedValue({ ok: false, errorKey: 'service.edit.error.incomplete', fields: ['shortDescription', 'deliverables'] })
    render(ui(FULL, 5))
    fireEvent.click(button('service.edit.footer.save'))

    expect(await screen.findByRole('alert')).toHaveTextContent(t('service.edit.error.incomplete', 'fr'))
    expect(row('service.wizard.recap.description')).toHaveTextContent(t('service.wizard.recap.flagged', 'fr'))
    expect(row('service.wizard.recap.mode')).toHaveTextContent(t('service.wizard.recap.flagged', 'fr'))
    expect(row('service.wizard.recap.title')).not.toHaveTextContent(t('service.wizard.recap.flagged', 'fr'))
    expect(h.push).not.toHaveBeenCalled()
    expect(button('service.edit.footer.save')).toBeEnabled()

    // « Modifier » opens the flagged step.
    fireEvent.click(screen.getByRole('button', { name: 'Modifier — Description' }))
    expect(shortField()).toHaveValue(FULL.shortDescription)
  })

  it('shows a thrown save as the generic failure and stays', async () => {
    h.update.mockRejectedValue(new Error('network'))
    render(ui(FULL, 5))
    fireEvent.click(button('service.edit.footer.save'))
    expect(await screen.findByRole('alert')).toHaveTextContent(t('service.edit.error.save_failed', 'fr'))
    expect(h.push).not.toHaveBeenCalled()
  })

  it('cannot save while a step 1–4 gate fails', () => {
    render(ui({ ...FULL, shortDescription: '' }, 5))
    expect(button('service.edit.footer.save')).toBeDisabled()
  })
})

describe('H7 — read-only récapitulatif (a service hidden by the moderation)', () => {
  it('lists the rows without any « Modifier » button', async () => {
    const { StepPublication } = await import('@/app/mes-services/creer/_components/StepPublication')
    render(
      <LangProvider lang="fr">
        <StepPublication lang="fr" form={FULL} errorKey={null} failedFields={[]} disabled readOnly />
      </LangProvider>,
    )
    expect(screen.getByText('Business plan pour la banque')).toBeInTheDocument()
    expect(screen.queryAllByRole('button', { name: /^Modifier/ })).toHaveLength(0)
  })
})

describe('H7 — Délai hint (bug 2: « 7 jour » → « 7 jours »)', () => {
  it('shows « ex : 7 jours » as the placeholder and in the helper, in both languages', () => {
    expect(t('service.wizard.delivery_time.placeholder', 'fr')).toBe('ex : 7 jours')
    expect(t('service.wizard.delivery_time.helper', 'fr')).toContain('ex : 7 jours')
    expect(t('service.wizard.delivery_time.placeholder', 'ar')).toContain('7 أيام')
    expect(t('service.wizard.delivery_time.helper', 'ar')).toContain('7 أيام')
  })

  it('the step-3 field carries the placeholder', () => {
    render(ui(FULL, 3))
    expect(screen.getByPlaceholderText('ex : 7 jours')).toBeInTheDocument()
  })
})
