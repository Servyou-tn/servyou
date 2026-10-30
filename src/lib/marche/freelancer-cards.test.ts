import { describe, it, expect, vi, beforeEach } from 'vitest'

// getFreelancerCards — mocked Supabase. The chips are the profile's skills first, then the tags of the freelancer's own ACTIVE, non-moderated
// services; the count uses the same services. The mock records the calls so the visibility filters can be asserted (it cannot prove RLS).
type Call = [string, ...unknown[]]
type Result = { data?: Record<string, unknown>[]; error?: { message: string } | null }
const state = { calls: {} as Record<string, Call[]>, results: {} as Record<string, Result> }

function builder(table: string) {
  const calls = (state.calls[table] ??= [])
  const b: Record<string, unknown> = {}
  for (const m of ['select', 'eq', 'is', 'in', 'order']) {
    b[m] = (...args: unknown[]) => {
      calls.push([m, ...args])
      return b
    }
  }
  b.then = (resolve: (v: unknown) => unknown) => {
    const res = state.results[table] ?? {}
    resolve({ data: res.data ?? [], error: res.error ?? null })
  }
  return b
}
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => ({ from: (t: string) => builder(t) }) }))

import { getFreelancerCards, mergeCardSkills } from './freelancer-cards'

const has = (table: string, ...call: unknown[]) =>
  (state.calls[table] ?? []).some((c) => c.length === call.length && c.every((v, i) => v === call[i]))

beforeEach(() => {
  state.calls = {}
  state.results = {}
})

describe('mergeCardSkills', () => {
  const frs = (xs: { fr: string }[]) => xs.map((x) => x.fr)

  it('profile skills first, then the service tags, in order', () => {
    expect(frs(mergeCardSkills(['React', 'Next.js'], ['Docker', 'GraphQL']))).toEqual(['React', 'Next.js', 'Docker', 'GraphQL'])
  })

  it('de-duplicates case-insensitively — a profile skill wins over the same tag', () => {
    expect(frs(mergeCardSkills(['React'], ['react', 'REACT', 'Vue', 'vue']))).toEqual(['React', 'Vue'])
  })

  it('a taxonomy id and its French label are ONE chip, shown as the label', () => {
    // `logo` is a skill id of the design sector whose labels are « logo » / « شعار »; `identite-de-marque` → « identité de marque »
    const out = mergeCardSkills(['identité de marque'], ['identite-de-marque', 'logo'])
    expect(out.map((x) => x.fr)).toEqual(['identité de marque', 'logo'])
    expect(out[1].ar).toBe('شعار')
  })

  it('drops blanks and trims; empty only when both sides are empty', () => {
    expect(mergeCardSkills(['  ', ''], ['  Figma  ']).map((x) => x.fr)).toEqual(['Figma'])
    expect(mergeCardSkills([], [])).toEqual([])
  })

  it('free text keeps its own text in both languages', () => {
    expect(mergeCardSkills([], ['Charte'])).toEqual([{ fr: 'Charte', ar: 'Charte' }])
  })
})

describe('getFreelancerCards', () => {
  const profile = (n: number) => ({ id: `f${n}`, profile_id: `p${n}`, headline: 'h', city: 'Tunis' })

  it('fills the chips from the tags of the freelancer\'s own active, non-moderated services when the profile has none', async () => {
    state.results.freelancer_profiles = { data: [profile(1)] }
    state.results.public_profiles = { data: [{ id: 'p1', full_name: 'Aya', avatar_url: null }] }
    state.results.freelancer_skills = { data: [] }
    state.results.service_listings = {
      data: [
        { id: 's1', freelancer_profile_id: 'f1', tags: ['Logo', 'Branding'], created_at: '2026-10-02' },
        { id: 's2', freelancer_profile_id: 'f1', tags: ['branding', 'Charte'], created_at: '2026-10-01' },
      ],
    }
    const [card] = await getFreelancerCards(['f1'])
    expect(card.skills.map((s) => s.fr)).toEqual(['Logo', 'Branding', 'Charte'])
    expect(card.serviceCount).toBe(2)
    // the same visibility rules as the count: active and not hidden by an admin
    expect(has('service_listings', 'eq', 'status', 'active')).toBe(true)
    expect(has('service_listings', 'is', 'admin_hidden_at', null)).toBe(true)
    // newest service first, with a stable tiebreak
    expect((state.calls.service_listings ?? []).some((c) => c[0] === 'order' && c[1] === 'created_at' && (c[2] as { ascending: boolean }).ascending === false)).toBe(true)
  })

  it('profile skills come first and the tags only fill after them', async () => {
    state.results.freelancer_profiles = { data: [profile(1)] }
    state.results.freelancer_skills = { data: [{ freelancer_profile_id: 'f1', skill: 'React' }, { freelancer_profile_id: 'f1', skill: 'Next.js' }] }
    state.results.service_listings = { data: [{ id: 's1', freelancer_profile_id: 'f1', tags: ['react', 'Docker'], created_at: '2026-10-01' }] }
    const [card] = await getFreelancerCards(['f1'])
    expect(card.skills.map((s) => s.fr)).toEqual(['React', 'Next.js', 'Docker'])
  })

  it('is empty only when the profile has no skills AND no service has tags', async () => {
    state.results.freelancer_profiles = { data: [profile(1)] }
    state.results.service_listings = { data: [{ id: 's1', freelancer_profile_id: 'f1', tags: [], created_at: '2026-10-01' }] }
    const [card] = await getFreelancerCards(['f1'])
    expect(card.skills).toEqual([])
    expect(card.serviceCount).toBe(1)
  })

  it('a tag list that is null on a service does not break the card', async () => {
    state.results.freelancer_profiles = { data: [profile(1)] }
    state.results.service_listings = { data: [{ id: 's1', freelancer_profile_id: 'f1', tags: null, created_at: '2026-10-01' }] }
    const [card] = await getFreelancerCards(['f1'])
    expect(card.skills).toEqual([])
  })

  it('a failed services read hides the count AND adds no chips, but the card still renders', async () => {
    state.results.freelancer_profiles = { data: [profile(1)] }
    state.results.freelancer_skills = { data: [{ freelancer_profile_id: 'f1', skill: 'React' }] }
    state.results.service_listings = { error: { message: 'boom' } }
    const [card] = await getFreelancerCards(['f1'])
    expect(card.serviceCount).toBeNull()
    expect(card.skills.map((s) => s.fr)).toEqual(['React'])
  })

  it('throws when the profile read itself fails — never an empty list', async () => {
    state.results.freelancer_profiles = { error: { message: 'boom' } }
    await expect(getFreelancerCards(['f1'])).rejects.toThrow()
  })
})
