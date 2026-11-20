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

const ADMIN_PATHS = [
  '/admin',
  '/admin/',
  '/admin/utilisateurs',
  '/admin/litiges/0c9a5e2e',
  '/verification-admin',
  '/verification-admin/code',
  // Spellings that may still route to the back office: percent-encoded, doubled slash, upper case.
  '/%61dmin',
  '//admin/journal',
  '/ADMIN/statistiques',
]
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
  // What the tracker hands over (document.title included) …
  const page = (path: string, referrer = '') => ({
    website: UMAMI_WEBSITE_ID,
    title: 'Amira Ben Salah — Graphiste | Servyou',
    url: `https://servyou.tn${path}`,
    referrer,
  })
  // … and what may leave the site: the same, with the title blanked.
  const sent = (path: string, referrer = '') => ({ ...page(path, referrer), title: '' })

  it('passes a public page through after a « yes » — only the title is blanked', () => {
    const payload = page('/produits/42', 'https://www.google.com/')
    expect(filterUmamiPayload(payload, `servyou_lang=ar; ${YES}`)).toEqual(sent('/produits/42', 'https://www.google.com/'))
  })

  it('never sends the page title: a public freelancer profile is titled with the person\'s full name (D3)', () => {
    for (const path of ['/freelance/0c9a5e2e', '/boutique/12', '/', '/confidentialite']) {
      const out = filterUmamiPayload(page(path), YES)
      expect(out?.title).toBe('')
      expect(JSON.stringify(out)).not.toContain('Amira')
    }
    // A payload without a title gets an empty one too, never the tracker's.
    expect(filterUmamiPayload({ url: 'https://servyou.tn/' }, YES)).toEqual({ url: 'https://servyou.tn/', title: '' })
  })

  it('cuts the query string and hash itself — from the URL and the referrer — whatever the live tracker script does', () => {
    const payload = page('/nouveau-mot-de-passe?code=s3cr3t#top', '/verifier-email?token_hash=abc')
    expect(filterUmamiPayload(payload, YES)).toEqual(sent('/nouveau-mot-de-passe', '/verifier-email'))
    expect(filterUmamiPayload(page('/', 'https://mail.example.com/inbox?token=1#m'), YES)).toEqual(sent('/', 'https://mail.example.com/inbox'))
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

  it('blanks an admin page given as the same-site referrer — a path, or a full URL from another production hostname', () => {
    expect(filterUmamiPayload(page('/', '/admin/utilisateurs/0c9a5e2e'), YES)).toEqual(sent('/', ''))
    expect(filterUmamiPayload(page('/', 'https://www.servyou.tn/admin/litiges/1'), YES)).toEqual(sent('/', ''))
    expect(filterUmamiPayload(page('/', '/marche'), YES)).toEqual(sent('/', '/marche'))
    // Another site's /admin is not ours: kept.
    expect(filterUmamiPayload(page('/', 'https://example.com/admin'), YES)).toEqual(sent('/', 'https://example.com/admin'))
  })

  it('is installed at MODULE scope — on import, before any render — and reads the live cookie', async () => {
    // A fresh module graph and no render: moving the install into an effect or the component body fails here.
    const globals = window as unknown as Record<string, unknown>
    delete globals[UMAMI_BEFORE_SEND]
    vi.resetModules()
    await import('@/components/analytics/UmamiScript')
    expect(typeof globals[UMAMI_BEFORE_SEND]).toBe('function')
    const send = globals[UMAMI_BEFORE_SEND] as (type: string, payload: object) => object | null
    expect(send('event', page('/'))).toBeNull()
    document.cookie = `${YES}; Path=/`
    expect(send('event', page('/'))).toEqual(sent('/'))
    expect(send('event', page('/admin'))).toBeNull()
  })

  it('consentFromCookieString finds the consent cookie among others', () => {
    expect(consentFromCookieString(`a=1; ${YES}; b=2`)?.audience).toBe(true)
    expect(consentFromCookieString('a=1; b=2')).toBeNull()
  })
})
