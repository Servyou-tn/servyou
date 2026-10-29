/**
 * @vitest-environment jsdom
 *
 * NewPasswordForm (/nouveau-mot-de-passe) — pre-launch audit pass 3: the new-password form opens ONLY for a recovery
 * session. Before, any signed-in session got it, so a walk-up / stolen session could set a new password with no
 * re-authentication (Mon compte's changePasswordAction re-checks the current password; this page did not).
 *   • PASSWORD_RECOVERY (the reset link's code exchange) → form; remembered for a reload of the same tab;
 *   • an ordinary session (INITIAL_SESSION / SIGNED_IN) → the « lien invalide » state after the 2 s wait;
 *   • a remembered recovery for ANOTHER user does not open it.
 * Supabase is mocked: the test drives onAuthStateChange. Run by path.
 */

import '@testing-library/jest-dom/vitest'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, act } from '@testing-library/react'
import { t } from '@/lib/i18n'

type Listener = (event: string, session: { user: { id: string } } | null) => void
const h = vi.hoisted(() => ({ listener: null as Listener | null }))

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      onAuthStateChange: (cb: Listener) => {
        h.listener = cb
        return { data: { subscription: { unsubscribe: vi.fn() } } }
      },
      updateUser: vi.fn(async () => ({ error: null })),
      signOut: vi.fn(async () => ({ error: null })),
    },
  }),
}))

const { NewPasswordForm } = await import('./NewPasswordForm')

const FLAG = 'servyou:password-recovery'
// The form's submit button is the one control only the 'form' view renders.
const passwordField = () => screen.queryByRole('button', { name: t('newPassword.submit', 'fr') })
const invalidBody = () => screen.queryByText(t('newPassword.invalid.body', 'fr'))

function emit(event: string, userId: string | null) {
  act(() => h.listener?.(event, userId ? { user: { id: userId } } : null))
}

beforeEach(() => {
  vi.useFakeTimers()
  sessionStorage.clear()
  h.listener = null
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('NewPasswordForm — recovery sessions only', () => {
  it('PASSWORD_RECOVERY opens the form and remembers the recovery for this tab', () => {
    render(<NewPasswordForm initialView="checking" />)
    emit('PASSWORD_RECOVERY', 'user-1')
    expect(passwordField()).toBeInTheDocument()
    expect(sessionStorage.getItem(FLAG)).toBe('user-1')
  })

  it('an ordinary signed-in session does NOT get the form: invalid after the 2 s wait', () => {
    render(<NewPasswordForm initialView="checking" />)
    emit('INITIAL_SESSION', 'user-1')
    emit('SIGNED_IN', 'user-1')
    expect(passwordField()).not.toBeInTheDocument()
    act(() => vi.advanceTimersByTime(2100))
    expect(invalidBody()).toBeInTheDocument()
    expect(passwordField()).not.toBeInTheDocument()
  })

  it('a reload after the recovery keeps the form (same user, remembered in sessionStorage)', () => {
    sessionStorage.setItem(FLAG, 'user-1')
    render(<NewPasswordForm initialView="checking" />)
    emit('INITIAL_SESSION', 'user-1')
    expect(passwordField()).toBeInTheDocument()
  })

  it('a remembered recovery for another user does not open it', () => {
    sessionStorage.setItem(FLAG, 'user-2')
    render(<NewPasswordForm initialView="checking" />)
    emit('INITIAL_SESSION', 'user-1')
    act(() => vi.advanceTimersByTime(2100))
    expect(passwordField()).not.toBeInTheDocument()
    expect(invalidBody()).toBeInTheDocument()
  })

  it('no session at all stays « invalid » after the wait', () => {
    render(<NewPasswordForm initialView="checking" />)
    emit('INITIAL_SESSION', null)
    act(() => vi.advanceTimersByTime(2100))
    expect(invalidBody()).toBeInTheDocument()
  })
})
