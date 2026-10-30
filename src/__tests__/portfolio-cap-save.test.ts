/**
 * The 6-project portfolio cap reaching the freelancer: when the database refuses a 7th portfolio item
 * (trg_limit_portfolio_items, hint portfolio_items_cap → applyProfileSave's PORTFOLIO_CAP_REACHED), both
 * saveProfileAction and publishProfileAction answer « Limite atteinte : 6 projets au maximum », not the generic
 * error. The schema's .max(PORTFOLIO_CAP) stops a 7th item first in normal use; this is the concurrent-save path.
 * Supabase, the owner lookup and the core write are mocked; the last block runs the REAL applyProfileSave against a
 * fake client, to pin the hint → PORTFOLIO_CAP_REACHED mapping itself.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'

const h = vi.hoisted(() => ({
  applyResult: { ok: false, error: 'portfolio_items_cap' } as { ok: true } | { ok: false; error: string },
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({ auth: { getUser: async () => ({ data: { user: { id: 'u_free' } } }) } })),
}))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('@/lib/i18n/server', () => ({ getLang: vi.fn(async () => 'fr') }))
vi.mock('@/lib/freelancer/owner-profile', () => ({
  resolveOwnedFreelancerProfileId: vi.fn(async () => ({ ok: true, freelancerProfileId: 'fp-1' })),
}))
vi.mock('@/app/mon-profil-freelance/modifier/apply-save', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/app/mon-profil-freelance/modifier/apply-save')>()),
  applyProfileSave: vi.fn(async () => h.applyResult),
}))

import { saveProfileAction, publishProfileAction } from '@/app/mon-profil-freelance/modifier/actions'
import { PORTFOLIO_CAP_REACHED } from '@/app/mon-profil-freelance/modifier/apply-save'
import { t } from '@/lib/i18n'
import { PORTFOLIO_CAP } from '@/lib/marche/freelancer-profile-edit'

const PROFILE = {
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
const CAP = t('freelance.edit.portfolio_cap_reached', 'fr', { max: PORTFOLIO_CAP })
const GENERIC = t('common.error_generic', 'fr')

beforeEach(() => {
  h.applyResult = { ok: false, error: PORTFOLIO_CAP_REACHED }
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('the portfolio cap refusal reads as « limite atteinte »', () => {
  it('saveProfileAction', async () => {
    expect(await saveProfileAction(PROFILE)).toEqual({ ok: false, error: CAP })
  })

  it('publishProfileAction', async () => {
    expect(await publishProfileAction(PROFILE)).toEqual({ ok: false, status: 'error', error: CAP })
  })

  it('any other save failure stays the generic error', async () => {
    h.applyResult = { ok: false, error: 'freelancer_portfolio_items insert failed' }
    expect(await saveProfileAction(PROFILE)).toEqual({ ok: false, error: GENERIC })
  })

  it('the FR and AR messages carry the cap constant, not a hard-coded number', () => {
    for (const lang of ['fr', 'ar'] as const) {
      const message = t('freelance.edit.portfolio_cap_reached', lang, { max: 99 })
      expect(message).toContain('99')
      expect(message).not.toMatch(/\{max\}|6/)
    }
    expect(CAP).toContain(String(PORTFOLIO_CAP))
    expect(CAP).not.toBe(GENERIC)
  })
})

// The real core write, against a chainable fake client: every call resolves { data: [], error: null } except the
// freelancer_portfolio_items insert, which returns `portfolioInsertError`.
function fakeClient(portfolioInsertError: { message: string; code: string; hint?: string }) {
  return {
    from(table: string) {
      let op = 'select'
      const chain = {
        select: () => chain,
        insert: () => ((op = 'insert'), chain),
        update: () => ((op = 'update'), chain),
        delete: () => ((op = 'delete'), chain),
        eq: () => chain,
        in: () => chain,
        then: (resolve: (v: unknown) => unknown, reject?: (e: unknown) => unknown) =>
          Promise.resolve(
            table === 'freelancer_portfolio_items' && op === 'insert'
              ? { data: null, error: portfolioInsertError }
              : { data: [], error: null },
          ).then(resolve, reject),
      }
      return chain
    },
  }
}

describe('applyProfileSave maps the database cap refusal', () => {
  const INPUT = { ...PROFILE, portfolio: [{ imageUrl: 'https://cdn.test/portfolio-media/a.webp', title: 'Projet', url: '', description: '' }] }

  it('hint portfolio_items_cap → PORTFOLIO_CAP_REACHED', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { applyProfileSave } = await vi.importActual<typeof import('@/app/mon-profil-freelance/modifier/apply-save')>(
      '@/app/mon-profil-freelance/modifier/apply-save',
    )
    const client = fakeClient({ message: 'Votre portfolio compte déjà 6 projets, le maximum.', code: '23514', hint: 'portfolio_items_cap' })
    expect(await applyProfileSave(client as never, 'fp-1', INPUT)).toEqual({ ok: false, error: PORTFOLIO_CAP_REACHED })
  })

  it('any other insert failure stays the generic core error', async () => {
    const { applyProfileSave } = await vi.importActual<typeof import('@/app/mon-profil-freelance/modifier/apply-save')>(
      '@/app/mon-profil-freelance/modifier/apply-save',
    )
    const client = fakeClient({ message: 'boom', code: 'XX000' })
    expect(await applyProfileSave(client as never, 'fp-1', INPUT)).toEqual({ ok: false, error: 'freelancer_portfolio_items insert failed' })
  })
})
