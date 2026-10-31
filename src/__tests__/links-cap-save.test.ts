import { describe, expect, it, vi } from 'vitest'
import { applyProfileSave, LINKS_CAP_REACHED } from '@/app/mon-profil-freelance/modifier/apply-save'
import { SaveProfileInput } from '@/app/mon-profil-freelance/modifier/schema'
import { LINKS_CAP } from '@/lib/marche/freelancer-profile-edit'
import { LINKS_MAX } from '@/lib/social/platforms'
import { t } from '@/lib/i18n'

// Mocked only: the DB trigger that refuses a 6th link (hint freelancer_links_cap) is agent A's migration; this pins the app side — the schema's cap, and
// the hint → LINKS_CAP_REACHED mapping the actions turn into « 5 liens maximum ».

const link = (i: number) => ({ label: 'Site web', url: `https://site${i}.tn` })
const PROFILE = {
  headline: '', bio: '', yearsExperience: 0, workingHours: '', workplaceLocation: '', portfolioLink: '',
  skills: [], languages: [], tools: [], links: [link(1)], portfolio: [], education: [], certifications: [],
}

function fakeClient(linksInsertError: { message: string; code: string; hint?: string }) {
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
          Promise.resolve(table === 'freelancer_links' && op === 'insert' ? { data: null, error: linksInsertError } : { data: [], error: null }).then(resolve, reject),
      }
      return chain
    },
  }
}

describe('freelancer links cap — app side', () => {
  it('the cap is the one platforms.ts owns (5), and the schema enforces it', () => {
    expect(LINKS_CAP).toBe(LINKS_MAX)
    expect(LINKS_CAP).toBe(5)
    expect(SaveProfileInput.safeParse({ ...PROFILE, links: Array.from({ length: 5 }, (_, i) => link(i)) }).success).toBe(true)
    expect(SaveProfileInput.safeParse({ ...PROFILE, links: Array.from({ length: 6 }, (_, i) => link(i)) }).success).toBe(false)
  })

  it('hint freelancer_links_cap → LINKS_CAP_REACHED', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const client = fakeClient({ message: 'Vous ne pouvez pas avoir plus de 5 liens.', code: '23514', hint: 'freelancer_links_cap' })
    expect(await applyProfileSave(client as never, 'fp-1', SaveProfileInput.parse(PROFILE))).toEqual({ ok: false, error: LINKS_CAP_REACHED })
  })

  it('any other insert failure stays the generic core error', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const client = fakeClient({ message: 'boom', code: 'XX000' })
    expect(await applyProfileSave(client as never, 'fp-1', SaveProfileInput.parse(PROFILE))).toEqual({ ok: false, error: 'freelancer_links insert failed' })
  })

  it('« {max} liens maximum » in FR and AR, carrying the constant', () => {
    for (const lang of ['fr', 'ar'] as const) {
      const message = t('freelance.edit.links_cap_reached', lang, { max: 99 })
      expect(message).toContain('99')
      expect(message).not.toMatch(/\{max\}|\b5\b/)
    }
  })
})
