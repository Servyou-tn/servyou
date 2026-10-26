/**
 * @vitest-environment jsdom
 *
 * /connexion success path — an auth path (CLAUDE.md must-test). After a good sign-in SigninForm
 * reads the user's OWN profile and routes by role: freelancer → /tableau-de-bord, shop owner →
 * /tableau-de-bord-vendeur, consumer / admin → "/", a safe ?next= beats all of them, and a failed
 * profile read never blocks the login (falls back to "/" and is logged as message/code/details).
 *
 * The Supabase browser client and the router are mocked: nothing reaches the network.
 */

import '@testing-library/jest-dom/vitest'
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
import { render, cleanup, fireEvent, waitFor } from '@testing-library/react'
import { LangProvider } from '@/components/LangProvider'

const h = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
  maybeSingle: vi.fn(),
  eq: vi.fn(),
  select: vi.fn(),
  from: vi.fn(),
  push: vi.fn(),
}))

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({ auth: { signInWithPassword: h.signInWithPassword, signInWithOAuth: vi.fn() }, from: h.from }),
}))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: h.push }),
  useSearchParams: () => new URLSearchParams(),
}))

import { SigninForm } from '@/app/connexion/components/SigninForm'

beforeEach(() => {
  h.from.mockReturnValue({ select: h.select })
  h.select.mockReturnValue({ eq: h.eq })
  h.eq.mockReturnValue({ maybeSingle: h.maybeSingle })
  h.signInWithPassword.mockResolvedValue({ data: { user: { id: 'user-1' }, session: {} }, error: null })
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  window.history.replaceState({}, '', '/connexion')
})

function signIn() {
  const view = render(
    <LangProvider lang="fr">
      <SigninForm />
    </LangProvider>,
  )
  fireEvent.change(view.container.querySelector('#email')!, { target: { value: 'compte@example.com' } })
  fireEvent.change(view.container.querySelector('#password')!, { target: { value: 'Mot-de-passe-1' } })
  fireEvent.submit(view.container.querySelector('form')!)
}

describe('SigninForm — role-aware destination after a successful sign-in', () => {
  it.each([
    ['freelancer', { seller_type: 'freelancer', is_admin: false }, '/tableau-de-bord'],
    ['shop owner', { seller_type: 'shop_owner', is_admin: false }, '/tableau-de-bord-vendeur'],
    ['consumer', { seller_type: null, is_admin: false }, '/'],
    ['admin', { seller_type: null, is_admin: true }, '/'],
  ])('%s → %s', async (_label, profile, expected) => {
    h.maybeSingle.mockResolvedValue({ data: profile, error: null })
    signIn()
    await waitFor(() => expect(h.push).toHaveBeenCalledWith(expected))
  })

  it("reads the signed-in user's own profile row only", async () => {
    h.maybeSingle.mockResolvedValue({ data: { seller_type: 'freelancer', is_admin: false }, error: null })
    signIn()
    await waitFor(() => expect(h.push).toHaveBeenCalled())
    expect(h.from).toHaveBeenCalledWith('profiles')
    expect(h.select).toHaveBeenCalledWith('seller_type, is_admin')
    expect(h.eq).toHaveBeenCalledWith('id', 'user-1')
  })

  it('a safe ?next= beats the role dashboard', async () => {
    window.history.replaceState({}, '', '/connexion?next=' + encodeURIComponent('/mes-engagements'))
    h.maybeSingle.mockResolvedValue({ data: { seller_type: 'freelancer', is_admin: false }, error: null })
    signIn()
    await waitFor(() => expect(h.push).toHaveBeenCalledWith('/mes-engagements'))
  })

  it('an unsafe ?next= is ignored (open-redirect guard) and the role dashboard applies', async () => {
    window.history.replaceState({}, '', '/connexion?next=' + encodeURIComponent('//evil.example.com'))
    h.maybeSingle.mockResolvedValue({ data: { seller_type: 'shop_owner', is_admin: false }, error: null })
    signIn()
    await waitFor(() => expect(h.push).toHaveBeenCalledWith('/tableau-de-bord-vendeur'))
  })

  it('a failed profile read still signs in: falls back to "/" and logs message/code/details, never the raw error', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    h.maybeSingle.mockResolvedValue({ data: null, error: { message: 'boom', code: '42501', details: 'denied' } })
    signIn()
    await waitFor(() => expect(h.push).toHaveBeenCalledWith('/'))
    expect(spy).toHaveBeenCalledWith('[SigninForm] profile read failed:', 'boom', '42501', 'denied')
    spy.mockRestore()
  })
})
