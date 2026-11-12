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
import { render, screen, cleanup, act, fireEvent } from '@testing-library/react'
import { t } from '@/lib/i18n'

type Listener = (event: string, session: { user: { id: string } } | null) => void
type VerifyResult = {
  data: { session: { user: { id: string } } | null }
  error: { message: string; code?: string; status?: number } | null
}
const OK: VerifyResult = { data: { session: { user: { id: 'user-1' } } }, error: null }
const fail = (code: string, status: number): VerifyResult => ({ data: { session: null }, error: { message: code, code, status } })
const h = vi.hoisted(() => ({
  listener: null as Listener | null,
  verifyOtp: null as unknown as import('vitest').Mock<(params: { token_hash: string; type: string }) => Promise<VerifyResult>>,
  updateUser: null as unknown as import('vitest').Mock<(attrs: Record<string, unknown>) => Promise<{ error: null }>>,
}))

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      onAuthStateChange: (cb: Listener) => {
        h.listener = cb
        return { data: { subscription: { unsubscribe: vi.fn() } } }
      },
      verifyOtp: (params: { token_hash: string; type: string }) => h.verifyOtp(params),
      updateUser: (attrs: Record<string, unknown>) => h.updateUser(attrs),
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
  h.verifyOtp = vi.fn(async () => OK)
  h.updateUser = vi.fn(async () => ({ error: null }))
})
afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.restoreAllMocks()
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

// Audit H2: Mon compte's change now sends current_password for Supabase Auth's « Require current password when
// updating ». The reset must NOT: the user has forgotten it, and Auth exempts sessions opened from an email link.
describe('NewPasswordForm — the reset sends only the new password', () => {
  it('a recovery session sets the new password with updateUser({ password }) — no current_password', async () => {
    render(<NewPasswordForm initialView="checking" />)
    emit('PASSWORD_RECOVERY', 'user-1')
    fireEvent.change(screen.getByLabelText(t('newPassword.fields.password.label', 'fr')), { target: { value: 'NewPass456' } })
    fireEvent.change(screen.getByLabelText(t('newPassword.fields.confirmPassword.label', 'fr')), { target: { value: 'NewPass456' } })
    await act(async () => {
      fireEvent.click(passwordField()!)
    })
    expect(h.updateUser).toHaveBeenCalledTimes(1)
    expect(h.updateUser.mock.calls[0][0]).toEqual({ password: 'NewPass456' })
    expect(h.updateUser.mock.calls[0][0]).not.toHaveProperty('current_password')
  })
})

describe('NewPasswordForm — expired link (?error_code=otp_expired)', () => {
  it('shows « Lien expiré, demandez-en un nouveau » with the request-new link, no form', () => {
    render(<NewPasswordForm initialView="expired" />)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Lien expiré, demandez-en un nouveau')
    expect(screen.getByRole('link', { name: t('newPassword.invalid.requestNew', 'fr') })).toHaveAttribute('href', '/mot-de-passe-oublie')
    act(() => vi.advanceTimersByTime(2100))
    expect(passwordField()).not.toBeInTheDocument()
  })
})

describe('NewPasswordForm — cross-device token_hash link (verifyOtp on click only)', () => {
  const HASH = `pkce_${'a'.repeat(56)}`
  const continueBtn = () => screen.queryByRole('button', { name: t('newPassword.confirm.cta', 'fr') })
  const click = async (el: HTMLElement) => {
    await act(async () => {
      fireEvent.click(el)
    })
  }

  it('shows « Continuer », no form, and does NOT spend the token on load (scanner-safe)', () => {
    render(<NewPasswordForm initialView="confirm" tokenHash={HASH} />)
    expect(continueBtn()).toBeInTheDocument()
    expect(passwordField()).not.toBeInTheDocument()
    act(() => vi.advanceTimersByTime(2100))
    expect(continueBtn()).toBeInTheDocument() // the 2 s « invalid » timer leaves confirm alone
    expect(h.verifyOtp).not.toHaveBeenCalled()
  })

  it('the click verifies the recovery hash, then the form opens and the hash leaves the URL', async () => {
    window.history.replaceState(null, '', `/nouveau-mot-de-passe?token_hash=${HASH}&type=recovery`)
    h.verifyOtp.mockImplementation(async () => {
      h.listener?.('PASSWORD_RECOVERY', { user: { id: 'user-1' } }) // supabase-js emits it inside verifyOtp
      return OK
    })
    render(<NewPasswordForm initialView="confirm" tokenHash={HASH} />)
    await click(continueBtn()!)
    expect(h.verifyOtp).toHaveBeenCalledWith({ token_hash: HASH, type: 'recovery' })
    expect(passwordField()).toBeInTheDocument()
    expect(sessionStorage.getItem(FLAG)).toBe('user-1')
    expect(window.location.search).toBe('')
  })

  it('a used / expired hash (otp_expired) shows « Lien expiré, demandez-en un nouveau »', async () => {
    window.history.replaceState(null, '', `/nouveau-mot-de-passe?token_hash=${HASH}&type=recovery`)
    h.verifyOtp.mockResolvedValue(fail('otp_expired', 403))
    vi.spyOn(console, 'error').mockImplementation(() => {})
    render(<NewPasswordForm initialView="confirm" tokenHash={HASH} />)
    await click(continueBtn()!)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(t('newPassword.expired.title', 'fr'))
    expect(passwordField()).not.toBeInTheDocument()
    expect(window.location.search).not.toContain('token_hash') // a reload shows « expiré », not « Continuer »
  })

  it('verifyOtp without a session does not open the form', async () => {
    h.verifyOtp.mockResolvedValue({ data: { session: null }, error: null })
    vi.spyOn(console, 'error').mockImplementation(() => {})
    render(<NewPasswordForm initialView="confirm" tokenHash={HASH} />)
    await click(continueBtn()!)
    expect(screen.getByRole('alert')).toHaveTextContent(t('newPassword.errors.verifyFailed', 'fr'))
    expect(passwordField()).not.toBeInTheDocument()
  })

  it('an unfinished recovery remembered in this tab does not skip a new link (confirm or expired)', () => {
    sessionStorage.setItem(FLAG, 'user-1')
    render(<NewPasswordForm initialView="confirm" tokenHash={HASH} />)
    emit('INITIAL_SESSION', 'user-1')
    expect(passwordField()).not.toBeInTheDocument()
    expect(continueBtn()).toBeInTheDocument()
    cleanup()
    render(<NewPasswordForm initialView="expired" />)
    emit('INITIAL_SESSION', 'user-1')
    expect(passwordField()).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(t('newPassword.expired.title', 'fr'))
  })

  it('any other failure keeps the button for a retry and says so', async () => {
    h.verifyOtp.mockResolvedValue(fail('over_request_rate_limit', 429))
    vi.spyOn(console, 'error').mockImplementation(() => {})
    render(<NewPasswordForm initialView="confirm" tokenHash={HASH} />)
    await click(continueBtn()!)
    expect(screen.getByRole('alert')).toHaveTextContent(t('newPassword.errors.verifyFailed', 'fr'))
    expect(continueBtn()).toBeEnabled()
    expect(passwordField()).not.toBeInTheDocument()
  })

  it('the button is disabled while verifying, so a double click spends the token once', async () => {
    let resolve: (r: VerifyResult) => void = () => {}
    h.verifyOtp.mockImplementation(() => new Promise<VerifyResult>((r) => (resolve = r)))
    render(<NewPasswordForm initialView="confirm" tokenHash={HASH} />)
    const btn = continueBtn()!
    await click(btn)
    const verifying = screen.getByRole('button', { name: t('newPassword.confirm.verifying', 'fr') })
    expect(verifying).toBeDisabled()
    await click(verifying)
    expect(h.verifyOtp).toHaveBeenCalledTimes(1)
    await act(async () => resolve(OK))
    expect(passwordField()).toBeInTheDocument()
  })
})
