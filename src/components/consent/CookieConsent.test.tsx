/**
 * @vitest-environment jsdom
 *
 * A7 — cookie banner + settings modal + « Gérer les cookies » (architect ruling R1/R2, docs/design/system-pages-cookie-deltas.md): the banner is a
 * card, not an overlay; « Refuser tout » and « Accepter tout » are identical buttons; audience is OFF unless chosen; the necessary categories have no
 * toggle; a choice is stored in the first-party `servyou_consent` cookie; withdrawing is as easy as giving.
 */
import '@testing-library/jest-dom/vitest'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, cleanup, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createElement } from 'react'
import { LangProvider } from '@/components/LangProvider'
import { t } from '@/lib/i18n'
import { CONSENT_COOKIE, CONSENT_VERSION, makeConsent, parseConsent, type Consent } from '@/lib/consent/consent'

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: unknown; children?: unknown; [k: string]: unknown }) =>
    createElement('a', { href: typeof href === 'string' ? href : '#', ...rest }, children as never),
}))

import { CookieConsentProvider, useConsent } from './CookieConsent'
import { ManageCookiesButton } from './ManageCookiesButton'

afterEach(() => {
  cleanup()
  document.cookie = `${CONSENT_COOKIE}=; Max-Age=0; Path=/`
})

function Probe() {
  const { hasConsent } = useConsent()
  return <p data-testid="probe">{hasConsent('audience') ? 'granted' : 'not-granted'}</p>
}

function mount(initial: Consent | null, lang: 'fr' | 'ar' = 'fr') {
  return render(
    <LangProvider lang={lang}>
      <CookieConsentProvider initial={initial}>
        <Probe />
        <ManageCookiesButton />
      </CookieConsentProvider>
    </LangProvider>,
  )
}

const stored = () => {
  const m = document.cookie.split('; ').find((c) => c.startsWith(`${CONSENT_COOKIE}=`))
  return m ? parseConsent(decodeURIComponent(m.slice(CONSENT_COOKIE.length + 1))) : null
}
const labelOf = (key: string, lang: 'fr' | 'ar' = 'fr') => t(key, lang)
const banner = () => screen.queryByRole('region', { name: labelOf('cookies.banner.title') })
const dialog = () => screen.queryByRole('dialog')

describe('the banner', () => {
  it('shows when there is no valid consent, with the three actions and the policy link', () => {
    mount(null)
    expect(banner()).toBeInTheDocument()
    for (const k of ['cookies.action.customize', 'cookies.action.refuse_all', 'cookies.action.accept_all']) {
      expect(within(banner()!).getByRole('button', { name: labelOf(k) })).toBeInTheDocument()
    }
    expect(within(banner()!).getByRole('link', { name: labelOf('cookies.banner.policy') })).toHaveAttribute('href', '/cookies')
  })

  it('is absent when the server found a valid choice (no flash: it is not in the first render)', () => {
    mount(makeConsent(false))
    expect(banner()).not.toBeInTheDocument()
  })

  it('does not block the page: no dialog, no scrim, nothing traps focus', () => {
    const { container } = mount(null)
    expect(dialog()).not.toBeInTheDocument()
    expect(container.ownerDocument.querySelector('.bg-overlay-scrim')).toBeNull()
    expect(banner()).not.toHaveAttribute('aria-modal')
  })

  it('« Refuser tout » and « Accepter tout » are IDENTICAL buttons — same variant, same size, neither nudged (D6)', () => {
    mount(null)
    const refuse = within(banner()!).getByRole('button', { name: labelOf('cookies.action.refuse_all') })
    const accept = within(banner()!).getByRole('button', { name: labelOf('cookies.action.accept_all') })
    expect(refuse.className).toBe(accept.className)
  })

  it('« Accepter tout » stores audience = true, closes the banner and grants the hook', async () => {
    const user = userEvent.setup()
    mount(null)
    expect(screen.getByTestId('probe')).toHaveTextContent('not-granted')
    await user.click(screen.getByRole('button', { name: labelOf('cookies.action.accept_all') }))
    expect(banner()).not.toBeInTheDocument()
    expect(stored()).toMatchObject({ v: CONSENT_VERSION, audience: true })
    expect(screen.getByTestId('probe')).toHaveTextContent('granted')
  })

  it('« Refuser tout » stores audience = false and the hook stays not-granted', async () => {
    const user = userEvent.setup()
    mount(null)
    await user.click(screen.getByRole('button', { name: labelOf('cookies.action.refuse_all') }))
    expect(banner()).not.toBeInTheDocument()
    expect(stored()).toMatchObject({ audience: false })
    expect(screen.getByTestId('probe')).toHaveTextContent('not-granted')
  })

  it('the hook answers « not granted » for a null consent and outside any provider (silence is not consent)', () => {
    render(<Probe />)
    expect(screen.getByTestId('probe')).toHaveTextContent('not-granted')
  })
})

describe('the settings modal', () => {
  it('« Personnaliser » opens it: audience OFF by default, the two necessary categories say « Toujours actif » and have no switch', async () => {
    const user = userEvent.setup()
    mount(null)
    await user.click(screen.getByRole('button', { name: labelOf('cookies.action.customize') }))
    const dlg = dialog()!
    expect(dlg).toHaveAttribute('aria-modal', 'true')
    expect(within(dlg).getByRole('heading', { name: labelOf('cookies.modal.title') })).toBeInTheDocument()
    const switches = within(dlg).getAllByRole('switch')
    expect(switches).toHaveLength(1) // only the audience category can be changed
    expect(switches[0]).toHaveAttribute('aria-checked', 'false')
    expect(within(dlg).getAllByText(labelOf('cookies.cat.always_on'))).toHaveLength(2)
    expect(within(dlg).getByText(/Supabase/)).toBeInTheDocument()
    expect(within(dlg).getByText(/Turnstile/)).toBeInTheDocument()
    expect(banner()).not.toBeInTheDocument() // the banner steps aside while the modal is open
    expect(stored()).toBeNull() // opening writes nothing
  })

  it('turning audience on and saving stores audience = true and closes everything', async () => {
    const user = userEvent.setup()
    mount(null)
    await user.click(screen.getByRole('button', { name: labelOf('cookies.action.customize') }))
    await user.click(within(dialog()!).getByRole('switch'))
    await user.click(within(dialog()!).getByRole('button', { name: labelOf('cookies.action.save') }))
    expect(dialog()).not.toBeInTheDocument()
    expect(banner()).not.toBeInTheDocument()
    expect(stored()).toMatchObject({ audience: true })
    expect(screen.getByTestId('probe')).toHaveTextContent('granted')
  })

  it('saving with audience left off stores a refusal; « Refuser tout » in the modal does too, whatever the switch says', async () => {
    const user = userEvent.setup()
    mount(null)
    await user.click(screen.getByRole('button', { name: labelOf('cookies.action.customize') }))
    await user.click(within(dialog()!).getByRole('button', { name: labelOf('cookies.action.save') }))
    expect(stored()).toMatchObject({ audience: false })

    await user.click(screen.getByRole('button', { name: labelOf('cookies.action.manage') }))
    await user.click(within(dialog()!).getByRole('switch')) // on…
    await user.click(within(dialog()!).getByRole('button', { name: labelOf('cookies.action.refuse_all') })) // …but « Refuser tout »
    expect(stored()).toMatchObject({ audience: false })
  })

  it('closing it hands focus back to the « Personnaliser » button that opened it (keyboard users do not restart at the top of the page)', async () => {
    const user = userEvent.setup()
    mount(null)
    const opener = screen.getByRole('button', { name: labelOf('cookies.action.customize') })
    await user.click(opener)
    expect(banner()).not.toBeInTheDocument() // hidden while the modal is open…
    await user.keyboard('{Escape}')
    expect(banner()).toBeInTheDocument()
    expect(opener).toHaveFocus() // …but the same element comes back and takes the focus
  })

  it('Escape and ✕ close it WITHOUT saving, and the banner comes back while there is still no choice', async () => {
    const user = userEvent.setup()
    mount(null)
    await user.click(screen.getByRole('button', { name: labelOf('cookies.action.customize') }))
    await user.keyboard('{Escape}')
    expect(dialog()).not.toBeInTheDocument()
    expect(banner()).toBeInTheDocument()
    expect(stored()).toBeNull()

    await user.click(screen.getByRole('button', { name: labelOf('cookies.action.customize') }))
    await user.click(screen.getByRole('button', { name: labelOf('cookies.modal.close') }))
    expect(dialog()).not.toBeInTheDocument()
    expect(stored()).toBeNull()
  })
})

describe('« Gérer les cookies » — withdrawing is as easy as giving', () => {
  it('reopens the modal reflecting the current choice, and switching audience off + saving withdraws it', async () => {
    const user = userEvent.setup()
    mount(makeConsent(true))
    expect(screen.getByTestId('probe')).toHaveTextContent('granted')
    await user.click(screen.getByRole('button', { name: labelOf('cookies.action.manage') }))
    const sw = within(dialog()!).getByRole('switch')
    expect(sw).toHaveAttribute('aria-checked', 'true')
    await user.click(sw)
    await user.click(within(dialog()!).getByRole('button', { name: labelOf('cookies.action.save') }))
    expect(stored()).toMatchObject({ audience: false })
    expect(screen.getByTestId('probe')).toHaveTextContent('not-granted')
  })

  it('closing the reopened modal without saving keeps the existing choice and shows no banner', async () => {
    const user = userEvent.setup()
    mount(makeConsent(true))
    await user.click(screen.getByRole('button', { name: labelOf('cookies.action.manage') }))
    await user.keyboard('{Escape}')
    expect(dialog()).not.toBeInTheDocument()
    expect(banner()).not.toBeInTheDocument()
    expect(screen.getByTestId('probe')).toHaveTextContent('granted')
  })
})

describe('Arabic', () => {
  it('renders the banner and the modal translated, with no raw key', async () => {
    const user = userEvent.setup()
    mount(null, 'ar')
    expect(screen.getByRole('region', { name: labelOf('cookies.banner.title', 'ar') })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: labelOf('cookies.action.customize', 'ar') }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(document.body.textContent).not.toMatch(/\bcookies\.[a-z_.]+/)
  })
})
