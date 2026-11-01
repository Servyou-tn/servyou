/**
 * @vitest-environment jsdom
 *
 * Regression for the founder-gate finding on PR #178 (2026-10-23): on /mon-profil-freelance/modifier
 * a mailto: link showed the French URL error, and after switching to Arabic the SAME French string
 * stayed under the field. Cause: the error was stored in React state as text translated at
 * validation time, and the language toggle re-renders client components with a new `lang` via
 * router.refresh() — which keeps their state. Fix: state holds keys / row ids; text is built at
 * render. These tests replay the exact sequence — error shown in FR, then the same mounted form
 * re-rendered with lang="ar" (what router.refresh does) — for both forms this PR touched.
 *
 * Server actions and the router are mocked: nothing here reaches the network or the database.
 */

import '@testing-library/jest-dom/vitest'
import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { LangProvider } from '@/components/LangProvider'
import { t, type Lang } from '@/lib/i18n'
import type { FreelancerProfileEditData } from '@/lib/marche/freelancer-profile-edit'

const h = vi.hoisted(() => ({
  submitServiceRequest: vi.fn(),
  saveProfileAction: vi.fn(),
  publishProfileAction: vi.fn(),
}))

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }))
vi.mock('@/app/demander/[id]/actions', () => ({ submitServiceRequest: h.submitServiceRequest }))
vi.mock('@/app/mon-profil-freelance/modifier/actions', () => ({
  saveProfileAction: h.saveProfileAction,
  publishProfileAction: h.publishProfileAction,
  uploadPortfolioImageAction: vi.fn(),
}))
vi.mock('@/app/mon-compte/actions', () => ({ uploadAvatarAction: vi.fn(), removeAvatarAction: vi.fn() }))

import { ServiceRequestForm } from '@/app/demander/[id]/_components/ServiceRequestForm'
import { ProfileEditForm } from '@/app/mon-profil-freelance/modifier/_components/ProfileEditForm'

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('E1 service form — errors re-translate on a language switch', () => {
  const ui = (lang: Lang) => (
    <LangProvider lang={lang}>
      <ServiceRequestForm serviceId="7a2d3b5f-4c6e-4d8f-8b2c-3e5a7b9d1f23" briefing={null} initialPhone="20123456" lang={lang} />
    </LangProvider>
  )

  it('a timeframe error shown in FR is shown in AR — not left in French — after the switch', () => {
    const view = render(ui('fr'))
    fireEvent.change(view.container.querySelector('textarea')!, {
      target: { value: 'Un besoin décrit avec assez de détails pour passer.' },
    })
    fireEvent.change(screen.getByPlaceholderText(t('demander.field.timeframe_ph', 'fr')), {
      target: { value: 'Vite] [Budget: 1' },
    })
    fireEvent.submit(view.container.querySelector('form')!)

    expect(screen.getByText(t('demander.error.timeframeChars', 'fr'))).toBeInTheDocument()
    expect(screen.getByText(t('demander.toast.error', 'fr'))).toBeInTheDocument()

    view.rerender(ui('ar'))

    expect(screen.getByText(t('demander.error.timeframeChars', 'ar'))).toBeInTheDocument()
    expect(screen.getByText(t('demander.toast.error', 'ar'))).toBeInTheDocument()
    expect(screen.queryByText(t('demander.error.timeframeChars', 'fr'))).toBeNull()
    expect(screen.queryByText(t('demander.toast.error', 'fr'))).toBeNull()
    expect(h.submitServiceRequest).not.toHaveBeenCalled()
  })
})

describe('H3 profile edit — URL errors re-translate on a language switch', () => {
  const initial: FreelancerProfileEditData = {
    freelancerProfileId: 'fp-1',
    headline: '',
    bio: '',
    yearsExperience: 0,
    workingHours: '',
    workplaceLocation: '',
    portfolioLink: '',
    isPublished: false,
    skills: [],
    languages: [],
    tools: [],
    links: [{ id: 'l1', label: 'Contact', url: 'mailto:contact@exemple.tn' }],
    portfolioItems: [],
    education: [],
    certifications: [],
    identity: { fullName: 'Test Freelance', city: 'Tunis', avatarUrl: null },
  }
  const ui = (lang: Lang) => (
    <LangProvider lang={lang}>
      <ProfileEditForm initial={initial} lang={lang} recommendedPlatforms={[]} />
    </LangProvider>
  )
  const summary = (lang: Lang) => t('freelance.edit.error_urls', lang, { sections: t('freelance.edit.trust_title', lang) })

  it('the founder’s case: a mailto: link error shown in FR is shown in AR after the switch', () => {
    const view = render(ui('fr'))
    fireEvent.click(screen.getByRole('button', { name: t('freelance.edit.save', 'fr') }))

    expect(screen.getByText(t('freelance.edit.error_url', 'fr'))).toBeInTheDocument()
    expect(screen.getByText(summary('fr'))).toBeInTheDocument()

    view.rerender(ui('ar'))

    expect(screen.getByText(t('freelance.edit.error_url', 'ar'))).toBeInTheDocument()
    expect(screen.getByText(summary('ar'))).toBeInTheDocument()
    expect(screen.queryByText(t('freelance.edit.error_url', 'fr'))).toBeNull()
    expect(screen.queryByText(summary('fr'))).toBeNull()
    expect(h.saveProfileAction).not.toHaveBeenCalled()
  })
})
