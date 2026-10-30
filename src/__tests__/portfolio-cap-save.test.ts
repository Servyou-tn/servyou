/**
 * The 6-project portfolio cap reaching the freelancer: when the database refuses a 7th portfolio item
 * (trg_limit_portfolio_items, hint portfolio_items_cap → applyProfileSave's PORTFOLIO_CAP_REACHED), both
 * saveProfileAction and publishProfileAction answer « Limite atteinte : 6 projets au maximum », not the generic
 * error. The schema's .max(PORTFOLIO_CAP) stops a 7th item first in normal use; this is the concurrent-save path.
 * Supabase, the owner lookup and the core write are mocked.
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
const CAP = t('freelance.edit.portfolio_cap_reached', 'fr')
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

  it('the FR and AR messages exist and differ from the generic one', () => {
    expect(CAP).toContain('6')
    expect(t('freelance.edit.portfolio_cap_reached', 'ar')).toContain('6')
    expect(CAP).not.toBe(GENERIC)
  })
})
