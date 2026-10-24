/**
 * @vitest-environment jsdom
 *
 * /connexion's sign-in error mapping — an auth path (CLAUDE.md must-test). A suspended account is
 * banned in Supabase Auth (src/lib/auth/auth-ban.ts), and GoTrue answers `user_banned` to its
 * sign-in; SigninForm shows the existing suspended banner for that ONE code and keeps the single
 * generic message for every other failure (anti-enumeration). These pin both directions, that the
 * banner clears on the next attempt, that a banned sign-in never navigates, and that the banner's
 * text is rendered from keys (AR as well as FR).
 *
 * The Supabase browser client and the router are mocked: nothing reaches the network.
 */

import '@testing-library/jest-dom/vitest'
import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react'
import { LangProvider } from '@/components/LangProvider'
import { t, type Lang } from '@/lib/i18n'

const h = vi.hoisted(() => ({ signInWithPassword: vi.fn(), push: vi.fn() }))

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({ auth: { signInWithPassword: h.signInWithPassword, signInWithOAuth: vi.fn() } }),
}))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: h.push }),
  useSearchParams: () => new URLSearchParams(),
}))

import { SigninForm } from '@/app/connexion/components/SigninForm'

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

function renderForm(lang: Lang = 'fr') {
  const view = render(
    <LangProvider lang={lang}>
      <SigninForm />
    </LangProvider>,
  )
  return view
}

function submit(view: ReturnType<typeof renderForm>, password = 'Mot-de-passe-1') {
  fireEvent.change(view.container.querySelector('#email')!, { target: { value: 'compte@example.com' } })
  fireEvent.change(view.container.querySelector('#password')!, { target: { value: password } })
  fireEvent.submit(view.container.querySelector('form')!)
}

const authError = (code: string | undefined) => ({ data: { user: null, session: null }, error: { code, status: 400, message: 'x' } })

describe('SigninForm — a banned sign-in shows the suspended banner', () => {
  it('user_banned → the suspended banner, never the generic error, and no navigation', async () => {
    h.signInWithPassword.mockResolvedValue(authError('user_banned'))
    const view = renderForm()
    submit(view)
    await waitFor(() => expect(screen.getByText(t('signin.suspended.title', 'fr'))).toBeInTheDocument())
    expect(screen.getByText(t('signin.suspended.message', 'fr'))).toBeInTheDocument()
    expect(screen.queryByText(t('signin.errors.invalidCredentials', 'fr'))).not.toBeInTheDocument()
    expect(h.push).not.toHaveBeenCalled()
  })

  it('renders the banner from keys — in Arabic for an Arabic session', async () => {
    h.signInWithPassword.mockResolvedValue(authError('user_banned'))
    const view = renderForm('ar')
    submit(view)
    await waitFor(() => expect(screen.getByText(t('signin.suspended.title', 'ar'))).toBeInTheDocument())
    expect(screen.queryByText(t('signin.suspended.title', 'fr'))).not.toBeInTheDocument()
  })

  it.each(['invalid_credentials', 'email_not_confirmed', 'over_request_rate_limit', undefined])(
    '%s → only the generic message (anti-enumeration holds for every other code)',
    async (code) => {
      h.signInWithPassword.mockResolvedValue(authError(code))
      const view = renderForm()
      submit(view)
      await waitFor(() => expect(screen.getByText(t('signin.errors.invalidCredentials', 'fr'))).toBeInTheDocument())
      expect(screen.queryByText(t('signin.suspended.title', 'fr'))).not.toBeInTheDocument()
      expect(h.push).not.toHaveBeenCalled()
    },
  )

  it('the banner clears on the next attempt: banned, then a wrong password, shows only the generic message', async () => {
    h.signInWithPassword.mockResolvedValueOnce(authError('user_banned')).mockResolvedValueOnce(authError('invalid_credentials'))
    const view = renderForm()
    submit(view)
    await waitFor(() => expect(screen.getByText(t('signin.suspended.title', 'fr'))).toBeInTheDocument())
    submit(view, 'Autre-mot-de-passe-2')
    await waitFor(() => expect(screen.getByText(t('signin.errors.invalidCredentials', 'fr'))).toBeInTheDocument())
    expect(screen.queryByText(t('signin.suspended.title', 'fr'))).not.toBeInTheDocument()
  })
})
