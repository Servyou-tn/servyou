/**
 * Every freelancer-entered URL is http(s)-only (src/lib/freelancer/http-url.ts). These values
 * render as `href` on the public D4 profile, and a bare Zod `.url()` accepts `javascript:`,
 * `data:` and friends — so this is a security-sensitive transformation, must-test per CLAUDE.md.
 *
 * Covers all three write paths: H3 modifier (SaveProfileInput — portfolioLink, links[].url,
 * portfolio[].url + imageUrl, certifications[].credentialUrl), H2 step 3 (SaveDetailsInput —
 * credentialUrl) and H2 step 2 (saveCompetencesAction — portfolioLink; its schema is private to a
 * 'use server' module, so it is driven through the action, which rejects before any DB call).
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'

const h = vi.hoisted(() => {
  const getUser = vi.fn(() => Promise.resolve({ data: { user: null } }))
  const createClient = vi.fn(async () => ({ auth: { getUser } }))
  return { createClient }
})

vi.mock('@/lib/supabase/server', () => ({ createClient: h.createClient }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/i18n/server', () => ({ getLang: vi.fn(async () => 'fr') }))

import { z } from 'zod'
import { SaveProfileInput } from '@/app/mon-profil-freelance/modifier/schema'
import { SaveDetailsInput } from '@/app/mon-profil-freelance/creer/details/schema'
import { saveCompetencesAction } from '@/app/mon-profil-freelance/creer/competences/actions'
import { saveProfileAction, publishProfileAction } from '@/app/mon-profil-freelance/modifier/actions'
import { LANGUAGE_CODES, PROFICIENCY_CODES } from '@/lib/freelancer/language-options'
import { HTTP_URL, isHttpUrl } from '@/lib/freelancer/http-url'
import { urlErrorSummary } from '@/lib/marche/freelancer-profile-edit'
import { t } from '@/lib/i18n'

const REJECTED = [
  'javascript:alert(1)',
  'JavaScript:alert(document.cookie)',
  '  javascript:alert(1)  ',
  'java\tscript:alert(1)', // the WHATWG parser strips the tab — still javascript:
  'data:text/html,<script>alert(1)</script>',
  'vbscript:msgbox(1)',
  'file:///etc/passwd',
  'ftp://exemple.tn/fichier',
  'mailto:contact@exemple.tn',
  'https:/missing-slash',
]

const ACCEPTED = ['https://www.behance.net/mon-portfolio', 'http://exemple.tn', 'https://exemple.tn/a?b=1#c']

const PROFILE_BASE = {
  headline: '',
  bio: '',
  yearsExperience: 0,
  workingHours: '',
  workplaceLocation: '',
  portfolioLink: '',
  skills: [],
  languages: [],
  tools: [],
  links: [],
  portfolio: [],
  education: [],
  certifications: [],
}

const profileWith = {
  portfolioLink: (url: string) => ({ ...PROFILE_BASE, portfolioLink: url }),
  linkUrl: (url: string) => ({ ...PROFILE_BASE, links: [{ label: 'Site', url }] }),
  portfolioUrl: (url: string) => ({
    ...PROFILE_BASE,
    portfolio: [{ imageUrl: 'https://cdn.exemple.tn/a.webp', title: '', url, description: '' }],
  }),
  portfolioImageUrl: (url: string) => ({
    ...PROFILE_BASE,
    portfolio: [{ imageUrl: url, title: '', url: '', description: '' }],
  }),
  credentialUrl: (url: string) => ({
    ...PROFILE_BASE,
    certifications: [{ name: 'Cert', issuingOrg: '', yearObtained: null, credentialUrl: url }],
  }),
}

const detailsWithCredential = (url: string) => ({
  education: [],
  certifications: [{ name: 'Cert', issuingOrg: '', yearObtained: null, credentialUrl: url }],
  tools: [],
  workingHours: '',
})

beforeEach(() => {
  vi.clearAllMocks()
})

describe('H3 modifier — SaveProfileInput', () => {
  it('accepts the empty base (every URL field optional or empty)', () => {
    expect(SaveProfileInput.safeParse(PROFILE_BASE).success).toBe(true)
  })

  for (const [field, build] of Object.entries(profileWith)) {
    it.each(REJECTED)(`${field} rejects %j`, (url) => {
      expect(SaveProfileInput.safeParse(build(url)).success).toBe(false)
    })
    it.each(ACCEPTED)(`${field} accepts %j`, (url) => {
      expect(SaveProfileInput.safeParse(build(url)).success).toBe(true)
    })
  }

  it('trims an accepted URL before storing it', () => {
    const parsed = SaveProfileInput.parse(profileWith.portfolioLink('  https://exemple.tn  '))
    expect(parsed.portfolioLink).toBe('https://exemple.tn')
  })

  it('still collapses an empty optional URL to null', () => {
    expect(SaveProfileInput.parse(PROFILE_BASE).portfolioLink).toBeNull()
  })
})

describe('H2 step 3 — SaveDetailsInput credentialUrl', () => {
  it.each(REJECTED)('rejects %j', (url) => {
    expect(SaveDetailsInput.safeParse(detailsWithCredential(url)).success).toBe(false)
  })
  it.each(ACCEPTED)('accepts %j', (url) => {
    expect(SaveDetailsInput.safeParse(detailsWithCredential(url)).success).toBe(true)
  })
})

describe('H2 step 2 — saveCompetencesAction portfolioLink', () => {
  const input = (portfolioLink: string) => ({
    skills: ['Figma', 'Illustrator', 'Photoshop'],
    languages: [{ language: LANGUAGE_CODES[0], proficiency: PROFICIENCY_CODES[0] }],
    yearsExperience: 2,
    portfolioLink,
  })

  it.each(REJECTED)('rejects %j on the portfolioLink field, before any DB call', async (url) => {
    const res = await saveCompetencesAction(input(url))
    expect(res).toMatchObject({ ok: false, field: 'portfolioLink' })
    expect(h.createClient).not.toHaveBeenCalled()
  })

  it.each(ACCEPTED)('lets %j through validation (stops later, at the mocked logged-out auth)', async (url) => {
    const res = await saveCompetencesAction(input(url))
    expect(res.ok).toBe(false)
    expect(res).not.toHaveProperty('field')
    expect(h.createClient).toHaveBeenCalledTimes(1)
  })
})

// The H3 form runs isHttpUrl (zod-free) in the browser so a bad URL gets a field-level error
// before the save; the server runs .url(HTTP_URL). If the two ever disagreed, the browser would
// pass a URL the server then rejects — the exact "server-only reject" this pairing exists to stop.
describe('isHttpUrl ≡ z.string().trim().url(HTTP_URL)', () => {
  const server = z.string().trim().url(HTTP_URL)
  const EDGES = [
    'https://',
    'https://a b',
    'http:example.com',
    'HTTPS://EXEMPLE.TN',
    'http://localhost:54321/storage/v1/object/public/x.webp',
    '\thttps://exemple.tn',
    'https://exemple.tn\n',
    '',
    '   ',
  ]
  it.each([...REJECTED, ...ACCEPTED, ...EDGES])('agrees with the server on %j', (url) => {
    expect(isHttpUrl(url)).toBe(server.safeParse(url).success)
  })
})

describe('H3 — a rejected URL names its section instead of a bare generic error', () => {
  it('urlErrorSummary lists each affected section once, in page order', () => {
    const summary = urlErrorSummary(['certifications', 'portfolioLink', 'portfolio', 'links'], 'fr')
    const sections = [t('freelance.edit.trust_title', 'fr'), t('freelance.edit.portfolio_title', 'fr'), t('freelance.edit.formation_title', 'fr')]
    expect(summary).toBe(t('freelance.edit.error_urls', 'fr', { sections: sections.join(', ') }))
  })

  it('urlErrorSummary is null when no URL field failed', () => {
    expect(urlErrorSummary([], 'fr')).toBeNull()
  })

  it('saveProfileAction: a javascript: link → the summary naming « Confiance & liens », before any DB call', async () => {
    const res = await saveProfileAction(profileWith.linkUrl('javascript:alert(1)'))
    expect(res).toEqual({ ok: false, error: t('freelance.edit.error_urls', 'fr', { sections: t('freelance.edit.trust_title', 'fr') }) })
    expect(h.createClient).not.toHaveBeenCalled()
  })

  it('publishProfileAction: a mailto: credential URL → the summary naming the Formation section', async () => {
    const res = await publishProfileAction(profileWith.credentialUrl('mailto:contact@exemple.tn'))
    expect(res).toMatchObject({
      ok: false,
      status: 'error',
      error: t('freelance.edit.error_urls', 'fr', { sections: t('freelance.edit.formation_title', 'fr') }),
    })
    expect(h.createClient).not.toHaveBeenCalled()
  })

  it('a non-URL validation failure still gets the generic error', async () => {
    const res = await saveProfileAction({ ...PROFILE_BASE, headline: 'x'.repeat(1000) })
    expect(res).toEqual({ ok: false, error: t('common.error_generic', 'fr') })
  })
})
