/**
 * @vitest-environment jsdom
 *
 * E1 service form at 375 (m375-e1-demander): the action stack's DOM is the visual order at both widths — « Envoyer » then « Annuler »
 * below lg, « Annuler » ⟷ « Envoyer » from lg — with one « Annuler » per width instead of a CSS reversal. Pixel geometry is measured in the
 * browser (docs/design/m375-e1-e2-deltas.md). Server action and router are mocked: nothing reaches the network.
 */
import '@testing-library/jest-dom/vitest'
import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { LangProvider } from '@/components/LangProvider'

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }))
vi.mock('@/app/demander/[id]/actions', () => ({ submitServiceRequest: vi.fn() }))
vi.mock('@/components/security/Turnstile', () => ({ Turnstile: () => <div data-testid="turnstile" /> }))

import { ServiceRequestForm } from './ServiceRequestForm'

afterEach(cleanup)

const SERVICE_ID = '7a2d3b5f-4c6e-4d8f-8b2c-3e5a7b9d1f23'
const mount = () =>
  render(
    <LangProvider lang="fr">
      <ServiceRequestForm serviceId={SERVICE_ID} briefing={null} initialPhone="20123456" lang="fr" />
    </LangProvider>,
  )

describe('E1 service form — action stack (m375-e1-demander)', () => {
  it('DOM order: desktop « Annuler » · Turnstile · « Envoyer » · mobile « Annuler » — each « Annuler » shown at one width only', () => {
    mount()
    const submit = screen.getByRole('button', { name: 'Envoyer la demande' })
    const stack = submit.parentElement!
    const [desktopCancel, turnstile, button, mobileCancel] = Array.from(stack.children) as HTMLElement[]
    expect(button).toBe(submit)
    expect(turnstile).toHaveAttribute('data-testid', 'turnstile')
    for (const link of [desktopCancel, mobileCancel]) {
      expect(link.tagName).toBe('A')
      expect(link).toHaveTextContent('Annuler')
      expect(link).toHaveAttribute('href', `/services/${SERVICE_ID}`)
    }
    expect(desktopCancel.className).toMatch(/\bmax-lg:hidden\b/)
    expect(mobileCancel.className).toMatch(/\blg:hidden\b/)
    expect(stack.className).not.toMatch(/flex-col-reverse/)
  })

  it('below lg the 12 between the buttons is the primary own margin, so the zero-height Turnstile node adds no gap', () => {
    mount()
    const submit = screen.getByRole('button', { name: 'Envoyer la demande' })
    expect(submit.className).toMatch(/\bmax-lg:mb-3\b/)
    expect(submit.parentElement!.className).toMatch(/\bmax-lg:gap-0\b/)
  })
})
