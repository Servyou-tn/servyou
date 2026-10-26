import { describe, it, expect } from 'vitest'
import { resolveMissionCta, type MissionCtaInput } from './mission-cta'

const NOW = new Date('2026-10-26T12:00:00Z')
const fresh = new Date(NOW.getTime() - 2 * 3_600_000).toISOString()
const old = new Date(NOW.getTime() - 31 * 86_400_000).toISOString()

const ok: MissionCtaInput = {
  isOwnPost: false,
  answered: false,
  hasFreelancerProfile: true,
  postStatus: 'open',
  hidden: false,
  createdAt: fresh,
  responseCount: 2,
  activeResponses: 3,
}
const cta = (patch: Partial<MissionCtaInput>) => resolveMissionCta({ ...ok, ...patch }, NOW)

describe('resolveMissionCta', () => {
  it('can respond in the happy path', () => {
    expect(cta({})).toBe('can_respond')
  })

  it.each([
    [{ isOwnPost: true }, 'own_post'],
    [{ answered: true }, 'answered'],
    [{ postStatus: 'deleted' as const }, 'closed'],
    [{ hidden: true }, 'closed'],
    [{ postStatus: 'filled' as const }, 'filled'],
    [{ postStatus: 'expired' as const }, 'expired'],
    [{ createdAt: old }, 'expired'],
    [{ hasFreelancerProfile: false }, 'no_profile'],
    [{ responseCount: 10 }, 'full'],
    [{ activeResponses: 5 }, 'cap_active'],
  ] as const)('%j → %s', (patch, state) => {
    expect(cta(patch)).toBe(state)
  })

  it('9 responses still leaves room; 4 actives is under the cap', () => {
    expect(cta({ responseCount: 9, activeResponses: 4 })).toBe('can_respond')
  })

  describe('precedence', () => {
    it('own post beats everything, including answered and closed', () => {
      expect(cta({ isOwnPost: true, answered: true, postStatus: 'deleted' })).toBe('own_post')
    })
    it('answered beats every closed / limit state', () => {
      expect(cta({ answered: true, postStatus: 'filled', responseCount: 10, activeResponses: 5 })).toBe('answered')
    })
    it('closed beats pourvue, and pourvue beats expired (a filled post stays pourvue after 30 days)', () => {
      expect(cta({ postStatus: 'filled', hidden: true })).toBe('closed')
      expect(cta({ postStatus: 'filled', createdAt: old })).toBe('filled')
    })
    it('a closed post never asks for a profile; a missing profile beats the limits', () => {
      expect(cta({ postStatus: 'filled', hasFreelancerProfile: false })).toBe('filled')
      expect(cta({ hasFreelancerProfile: false, responseCount: 10, activeResponses: 5 })).toBe('no_profile')
    })
    it('a full post beats the personal cap (the post is the thing that cannot be answered)', () => {
      expect(cta({ responseCount: 10, activeResponses: 5 })).toBe('full')
    })
  })
})
