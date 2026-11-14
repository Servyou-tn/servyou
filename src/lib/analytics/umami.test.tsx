/**
 * @vitest-environment jsdom
 *
 * Umami gating — src/lib/analytics/umami.ts, src/components/analytics/UmamiScript.tsx and its mount in src/app/layout.tsx. Privacy config,
 * so a loosened lock fails here, not in production:
 *   • the root layout mounts the tracker only when VERCEL_ENV is 'production' — never a preview, `vercel dev` or localhost;
 *   • the script renders only after a « yes » to audience measurement, and never on /admin or /verification-admin;
 *   • the before-send filter drops admin pages (client-side navigation after load) and every event once consent is withdrawn;
 *   • the query string and hash never leave the site (data-exclude-search / data-exclude-hash), and data-domains is exact.
 * Run by path.
 */
import '@testing-library/jest-dom/vitest'
import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { isValidElement, type ReactNode } from 'react'

let pathname = '/'
vi.mock('next/navigation', () => ({ usePathname: () => pathname }))
// next/script injects the tag from an effect; a plain <script> keeps the attributes inspectable (jsdom never fetches it).
vi.mock('next/script', () => ({
  default: ({ strategy, ...props }: Record<string, string>) => <script data-testid="umami" data-strategy={strategy} {...props} />,
}))
// The root layout's server-only and build-only imports.
vi.mock('next/font/local', () => ({ default: () => ({ variable: 'font' }) }))
vi.mock('@/lib/i18n/server', () => ({ getLang: async () => 'fr' }))
vi.mock('@/lib/consent/server', () => ({ getConsent: async () => null }))

import { LangProvider } from '@/components/LangProvider'
import { CookieConsentProvider } from '@/components/consent/CookieConsent'
import { UmamiScript } from '@/components/analytics/UmamiScript'
import { CONSENT_COOKIE, consentFromCookieString, makeConsent, type Consent } from '@/lib/consent/consent'
import {
  UMAMI_BEFORE_SEND,
  UMAMI_SCRIPT_URL,
  UMAMI_WEBSITE_ID,
  filterUmamiPayload,
  isExcludedPath,
  umamiEnabled,
  umamiScriptAttributes,
} from '@/lib/analytics/umami'
import RootLayout from '@/app/layout'

afterEach(() => {
  cleanup()
  vi.unstubAllEnvs()
  pathname = '/'
  document.cookie = `${CONSENT_COOKIE}=; Max-Age=0; Path=/`
})

const ADMIN_PATHS = ['/admin', '/admin/', '/admin/utilisateurs', '/admin/litiges/0c9a5e2e', '/verification-admin', '/verification-admin/code']
const PUBLIC_PATHS = ['/', '/connexion', '/nouveau-mot-de-passe', '/produits/42', '/administrateur', '/admins', '/marche/admin']

const cookieFor = (consent: Consent) => `${CONSENT_COOKIE}=${encodeURIComponent(JSON.stringify(consent))}`
const YES = cookieFor(makeConsent(true))
const NO = cookieFor(makeConsent(false))

function containsType(node: ReactNode, type: unknown): boolean {
  if (Array.isArray(node)) return node.some((child) => containsType(child, type))
  if (!isValidElement(node)) return false
  if (node.type === type) return true
  return containsType((node.props as { children?: ReactNode }).children, type)
}

describe('production only — the root layout gate', () => {
  it('umamiEnabled is true for VERCEL_ENV=production and nothing else', () => {
    expect(umamiEnabled('production')).toBe(true)
    for (const env of ['preview', 'development', 'Production', '', undefined]) expect(umamiEnabled(env)).toBe(false)
  })

  it('the layout mounts <UmamiScript /> on a production deploy', async () => {
    vi.stubEnv('VERCEL_ENV', 'production')
    expect(containsType(await RootLayout({ children: <main /> }), UmamiScript)).toBe(true)
  })

  it('never on a preview, `vercel dev` or localhost (VERCEL_ENV unset)', async () => {
    for (const env of ['preview', 'development', undefined]) {
      vi.stubEnv('VERCEL_ENV', env)
      expect(containsType(await RootLayout({ children: <main /> }), UmamiScript)).toBe(false)
    }
  })
})

describe('<UmamiScript /> — consent and admin routes', () => {
  const renderAt = (path: string, consent: Consent | null) => {
    pathname = path
    render(
      <LangProvider lang="fr">
        <CookieConsentProvider initial={consent}>
          <UmamiScript />
        </CookieConsentProvider>
      </LangProvider>,
    )
    return screen.queryByTestId('umami')
  }

  it('renders the tracker after a « yes » to audience measurement, with the exact attributes', () => {
    const script = renderAt('/', makeConsent(true))
    expect(script).toHaveAttribute('src', UMAMI_SCRIPT_URL)
    expect(script).toHaveAttribute('data-strategy', 'afterInteractive')
    expect(script).toHaveAttribute('data-website-id', UMAMI_WEBSITE_ID)
    expect(script).toHaveAttribute('data-domains', 'servyou.vercel.app,servyou.tn,www.servyou.tn')
    expect(script).toHaveAttribute('data-exclude-search', 'true')
    expect(script).toHaveAttribute('data-exclude-hash', 'true')
    expect(script).toHaveAttribute('data-before-send', UMAMI_BEFORE_SEND)
  })

  it('nothing without consent: never asked, or said no', () => {
    expect(renderAt('/', null)).toBeNull()
    cleanup()
    expect(renderAt('/', makeConsent(false))).toBeNull()
  })

  it.each(ADMIN_PATHS)('never on %s, even with consent', (path) => {
    expect(isExcludedPath(path)).toBe(true)
    expect(renderAt(path, makeConsent(true))).toBeNull()
  })

  it.each(PUBLIC_PATHS)('%s is tracked — a look-alike is not an admin page', (path) => {
    expect(isExcludedPath(path)).toBe(false)
    expect(renderAt(path, makeConsent(true))).not.toBeNull()
  })
})

describe('no query string or hash ever leaves the site', () => {
  it('exclude-search (REQUIRED: reset / confirm codes ride in query strings) and exclude-hash are on', () => {
    expect(umamiScriptAttributes()['data-exclude-search']).toBe('true')
    expect(umamiScriptAttributes()['data-exclude-hash']).toBe('true')
  })
})

describe('before-send filter', () => {
  const page = (path: string, referrer = '') => ({ website: UMAMI_WEBSITE_ID, url: `https://servyou.vercel.app${path}`, referrer })

  it('passes a public page through unchanged after a « yes »', () => {
    const payload = page('/produits/42', 'https://www.google.com/')
    expect(filterUmamiPayload(payload, `servyou_lang=ar; ${YES}`)).toBe(payload)
  })

  it('drops everything once consent is withdrawn, absent, expired or forged', () => {
    const expired = cookieFor(makeConsent(true, Date.now() - 200 * 24 * 60 * 60 * 1000))
    for (const cookies of ['', NO, expired, `${CONSENT_COOKIE}=%E0%A4%A`, `${CONSENT_COOKIE}=${encodeURIComponent('{"v":1,"audience":"yes","ts":1}')}`]) {
      expect(filterUmamiPayload(page('/'), cookies)).toBeNull()
    }
  })

  it.each(ADMIN_PATHS)('drops %s — the tracker follows client-side navigation into the back office', (path) => {
    expect(filterUmamiPayload(page(path), YES)).toBeNull()
  })

  it('fails closed on a payload without a readable URL', () => {
    expect(filterUmamiPayload({ website: UMAMI_WEBSITE_ID }, YES)).toBeNull()
    expect(filterUmamiPayload({ url: 42 }, YES)).toBeNull()
  })

  it('blanks an admin page given as the same-site referrer, keeps any other referrer', () => {
    expect(filterUmamiPayload(page('/', '/admin/utilisateurs/0c9a5e2e'), YES)).toEqual(page('/', ''))
    expect(filterUmamiPayload(page('/', '/marche'), YES)).toEqual(page('/', '/marche'))
  })

  it('is installed on window under the data-before-send name and reads the live cookie', async () => {
    await import('@/components/analytics/UmamiScript')
    const beforeSend = (window as unknown as Record<string, unknown>)[UMAMI_BEFORE_SEND]
    expect(typeof beforeSend).toBe('function')
    const send = beforeSend as (type: string, payload: object) => object | null
    expect(send('event', page('/'))).toBeNull()
    document.cookie = `${YES}; Path=/`
    expect(send('event', page('/'))).toEqual(page('/'))
    expect(send('event', page('/admin'))).toBeNull()
  })

  it('consentFromCookieString finds the consent cookie among others', () => {
    expect(consentFromCookieString(`a=1; ${YES}; b=2`)?.audience).toBe(true)
    expect(consentFromCookieString('a=1; b=2')).toBeNull()
  })
})
