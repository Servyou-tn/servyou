/**
 * @vitest-environment jsdom
 *
 * H12 form — controlled state, client validation before any server call, typed failures rendered in place with the
 * message preserved (D-H13-3). The action is mocked: its own behaviour is pinned in actions.test.ts.
 */
import '@testing-library/jest-dom/vitest'
import { describe, it, expect, vi, afterEach, beforeAll } from 'vitest'
import { render, screen, cleanup, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createElement } from 'react'
import { LangProvider } from '@/components/LangProvider'
import { t } from '@/lib/i18n'

const h = vi.hoisted(() => ({
  action: vi.fn(),
  copied: [] as string[],
}))

vi.mock('../actions', () => ({ submitProposalAction: (input: unknown) => h.action(input) }))
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))
vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: unknown; children?: unknown; [k: string]: unknown }) =>
    createElement('a', { href: typeof href === 'string' ? href : '#', ...rest }, children as never),
}))

import { ProposalForm } from './ProposalForm'

beforeAll(() => {
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver
})
afterEach(() => {
  cleanup()
  h.action.mockReset()
  h.copied = []
})

const MESSAGE = 'Bonjour, voici comment je réaliserais votre logo.'
const SEND = t('missiondetail.cta.send', 'fr')

function renderForm(over: Partial<React.ComponentProps<typeof ProposalForm>> = {}, lang: 'fr' | 'ar' = 'fr') {
  return render(
    <LangProvider lang={lang}>
      <ProposalForm
        jobPostId="11111111-1111-4111-8111-111111111111"
        clientFirstName="Mehdi"
        budgetMin={60}
        budgetMax={100}
        requiredSkills={['Figma', 'Adobe']}
        mySkills={['figma', 'Node']}
        {...over}
      />
    </LangProvider>,
  )
}

async function fillMessage(user: ReturnType<typeof userEvent.setup>, text = MESSAGE) {
  await user.type(screen.getByRole('textbox', { name: t('proposal.form.message_label', 'fr') }), text)
}

describe('ProposalForm — client side', () => {
  it('pre-selects my skills that the mission asks for (accent/case-insensitive), with the post spelling', () => {
    renderForm()
    expect(screen.getByRole('button', { name: /1 compétence sélectionnée/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Retirer la compétence Figma' })).toBeInTheDocument()
  })

  it('shows the placeholder when nothing matches', () => {
    renderForm({ requiredSkills: ['Logo'], mySkills: ['Node'] })
    expect(screen.getByRole('button', { name: new RegExp(t('proposal.form.skills_ph', 'fr')) })).toBeInTheDocument()
  })

  it('hides the skills field when there is no pool at all', () => {
    renderForm({ requiredSkills: [], mySkills: [] })
    expect(screen.queryByText(t('proposal.form.skills_label', 'fr'))).not.toBeInTheDocument()
  })

  it('refuses a message under 20 characters WITHOUT calling the server', async () => {
    const user = userEvent.setup()
    renderForm()
    await fillMessage(user, 'trop court')
    await user.click(screen.getByRole('button', { name: SEND }))
    expect(screen.getByText(t('proposal.error.message_short', 'fr', { min: 20 }))).toBeInTheDocument()
    expect(h.action).not.toHaveBeenCalled()
  })

  it('shows the budget caption (range, or none)', () => {
    const { unmount } = renderForm()
    expect(screen.getByText(/Le budget indiqué est 60 – 100 TND/)).toBeInTheDocument()
    unmount()
    renderForm({ budgetMin: null, budgetMax: null })
    expect(screen.getByText(t('proposal.form.price_caption_none', 'fr'))).toBeInTheDocument()
  })

  it('links: starts with one row (no delete on it), adds up to 3, and removes rows 2–3', async () => {
    const user = userEvent.setup()
    renderForm()
    expect(screen.getByText('1 / 3')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Supprimer le lien/ })).not.toBeInTheDocument()
    const add = screen.getByRole('button', { name: t('proposal.form.link_add', 'fr') })
    await user.click(add)
    await user.click(add)
    expect(screen.getByText('3 / 3')).toBeInTheDocument()
    expect(add).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Supprimer le lien 3' }))
    expect(screen.getByText('2 / 3')).toBeInTheDocument()
    expect(add).toBeEnabled()
  })

  it('a javascript: link is refused on its row, client side, before the server', async () => {
    const user = userEvent.setup()
    renderForm()
    await fillMessage(user)
    await user.type(screen.getByRole('textbox', { name: 'Adresse du lien 1' }), 'javascript:alert(1)')
    await user.click(screen.getByRole('button', { name: SEND }))
    expect(screen.getByText(t('proposal.error.link_url', 'fr'))).toBeInTheDocument()
    expect(h.action).not.toHaveBeenCalled()
  })

  it('sends exactly what was typed, the pre-selected skill included', async () => {
    const user = userEvent.setup()
    h.action.mockResolvedValue(undefined)
    renderForm()
    await fillMessage(user)
    await user.type(screen.getByRole('textbox', { name: t('proposal.form.price_label', 'fr') }), '80')
    await user.type(screen.getByRole('textbox', { name: t('proposal.form.timeframe_label', 'fr') }), '5 jours')
    await user.click(screen.getByRole('button', { name: SEND }))
    await waitFor(() => expect(h.action).toHaveBeenCalledTimes(1))
    expect(h.action.mock.calls[0][0]).toMatchObject({
      jobPostId: '11111111-1111-4111-8111-111111111111',
      message: MESSAGE,
      price: '80',
      timeframe: '5 jours',
      skills: ['Figma'],
    })
  })
})

describe('ProposalForm — typed failures in place (D-H13-3)', () => {
  async function submitWith(result: unknown) {
    const user = userEvent.setup()
    h.action.mockResolvedValue(result)
    renderForm()
    await fillMessage(user)
    await user.click(screen.getByRole('button', { name: SEND }))
    return user
  }

  it.each([
    'job_full',
    'job_filled',
    'job_deleted',
    'job_expired',
    'job_unavailable',
    'cap_active',
    'own_post',
    'suspended',
    'no_profile',
    'not_allowed',
  ])('%s: amber notice, the message stays and can be copied, the form goes read-only', async (reason) => {
    await submitWith({ ok: false, kind: 'failure', reason })
    const notice = await screen.findByRole('alert')
    expect(notice).toHaveTextContent(t(`proposal.fail.${reason}.title`, 'fr', { max: 5, full: 10 }))
    expect(screen.getByText(t('proposal.fail.preserved', 'fr'))).toBeInTheDocument()
    expect(screen.getByRole('button', { name: t('proposal.fail.copy', 'fr') })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: t('proposal.form.message_label', 'fr') })).toBeDisabled()
    expect(screen.getByRole('textbox', { name: t('proposal.form.message_label', 'fr') })).toHaveValue(MESSAGE)
    expect(screen.getByRole('button', { name: SEND })).toBeDisabled()
  })

  it('the notice carries a way forward: other missions / my proposals / manage', async () => {
    await submitWith({ ok: false, kind: 'failure', reason: 'cap_active' })
    expect(await screen.findByRole('link', { name: t('proposal.fail.manage', 'fr') })).toHaveAttribute('href', '/mes-propositions')
  })

  it('technical: amber « Réessayer », the form stays EDITABLE and the input intact, retry calls the action again', async () => {
    const user = await submitWith({ ok: false, kind: 'failure', reason: 'technical' })
    const retry = await screen.findByRole('button', { name: t('proposal.fail.retry', 'fr') })
    expect(screen.getByRole('textbox', { name: t('proposal.form.message_label', 'fr') })).toBeEnabled()
    expect(screen.getByRole('textbox', { name: t('proposal.form.message_label', 'fr') })).toHaveValue(MESSAGE)
    expect(screen.queryByText(t('proposal.fail.preserved', 'fr'))).not.toBeInTheDocument()
    await user.click(retry)
    await waitFor(() => expect(h.action).toHaveBeenCalledTimes(2))
  })

  it('a field failure lands on its field, not in an amber notice', async () => {
    await submitWith({ ok: false, kind: 'failure', reason: 'invalid_price' })
    expect(await screen.findByText(t('proposal.error.price_invalid', 'fr'))).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('server-side field errors (kind: invalid) are shown on the fields', async () => {
    await submitWith({ ok: false, kind: 'invalid', errors: { timeframe: 'proposal.error.timeframe_long' } })
    expect(await screen.findByText(t('proposal.error.timeframe_long', 'fr'))).toBeInTheDocument()
  })

  it('the stored error is a KEY: switching language re-translates it', async () => {
    const user = userEvent.setup()
    renderForm()
    await fillMessage(user, 'court')
    await user.click(screen.getByRole('button', { name: SEND }))
    expect(screen.getByText(t('proposal.error.message_short', 'fr', { min: 20 }))).toBeInTheDocument()
    cleanup()
    const ar = renderForm({}, 'ar')
    expect(ar.container.textContent).not.toMatch(/proposal\./)
  })
})
