import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock-client tests for the post owner's view of a mission (missions PR-4): the proposal's price / délai / links / skills
// reach the owner, and a failed responses read throws instead of reading « nobody answered ».
type Op = [string, ...unknown[]]
const h = vi.hoisted(() => ({
  ops: [] as { table: string; ops: [string, ...unknown[]][] }[],
  respond: (_t: string): { data?: unknown; error?: { message: string; code?: string; details?: string } | null } => ({ data: null, error: null }),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    from(table: string) {
      const rec: { table: string; ops: Op[] } = { table, ops: [] }
      h.ops.push(rec)
      const q: unknown = new Proxy(
        {},
        {
          get(_t, prop: string) {
            if (prop === 'then' || prop === 'maybeSingle') {
              const run = () => Promise.resolve(h.respond(table))
              return prop === 'then' ? (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) => run().then(res, rej) : () => run()
            }
            return (...args: unknown[]) => {
              rec.ops.push([prop, ...args])
              return q
            }
          },
        },
      )
      return q
    },
  }),
}))

const { getAnnonceDetail } = await import('./annonce-detail')

const OWNER = 'owner-1'
const post = {
  id: 'p1',
  consumer_id: OWNER,
  title: 'LOGO 3D',
  description: 'Logo pour mon café',
  budget_min: 60,
  budget_max: 100,
  city: 'Ariana',
  is_remote: false,
  deadline: null,
  status: 'open',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  admin_hidden_at: null,
  categories: { name_fr: 'Design', name_ar: 'تصميم', slug: 'design' },
  job_post_skills: [],
}
const response = (over: Record<string, unknown> = {}) => ({
  id: 'r1',
  freelancer_id: 'f1',
  proposal_message: 'Mon approche détaillée pour votre logo.',
  created_at: new Date().toISOString(),
  proposed_price_tnd: '80.00',
  proposed_timeframe: '5 jours',
  portfolio_links: [{ url: 'https://behance.net/x', label: 'Mon portfolio' }, { url: 'https://a.tn' }],
  job_response_skills: [{ skill: 'Figma' }, { skill: 'Adobe' }],
  ...over,
})

function respond(map: { job_responses?: unknown; responsesError?: boolean; freelancer_profiles?: unknown }) {
  h.respond = (table) => {
    if (table === 'job_posts') return { data: post, error: null }
    if (table === 'job_responses') {
      return map.responsesError ? { data: null, error: { message: 'boom', code: 'XX000' } } : { data: map.job_responses ?? [], error: null }
    }
    if (table === 'public_profiles') return { data: [{ id: 'f1', full_name: 'Moatez Sahbeni', city: 'Tunis' }], error: null }
    if (table === 'freelancer_profiles') return { data: map.freelancer_profiles ?? [], error: null }
    return { data: [], error: null }
  }
}

beforeEach(() => {
  h.ops = []
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('getAnnonceDetail — the proposal reaches the post owner', () => {
  it('selects the new columns and the skills embed, and maps them', async () => {
    respond({ job_responses: [response()] })
    const detail = await getAnnonceDetail('p1', OWNER)
    const q = h.ops.find((o) => o.table === 'job_responses')!
    const select = String(q.ops.find(([n]) => n === 'select')?.[1])
    for (const col of ['proposed_price_tnd', 'proposed_timeframe', 'portfolio_links', 'job_response_skills']) expect(select).toContain(col)
    expect(detail?.responses[0]).toMatchObject({
      proposedPrice: 80,
      proposedTimeframe: '5 jours',
      skills: ['Figma', 'Adobe'],
      links: [
        { url: 'https://behance.net/x', label: 'Mon portfolio' },
        { url: 'https://a.tn', label: null },
      ],
    })
  })

  it('a proposal with none of the extras maps to nulls / empty arrays (as every pre-M-C response does)', async () => {
    respond({ job_responses: [response({ proposed_price_tnd: null, proposed_timeframe: null, portfolio_links: [], job_response_skills: null })] })
    const detail = await getAnnonceDetail('p1', OWNER)
    expect(detail?.responses[0]).toMatchObject({ proposedPrice: null, proposedTimeframe: null, links: [], skills: [] })
  })

  it('a failed responses read THROWS — never « no responses yet »', async () => {
    respond({ responsesError: true })
    await expect(getAnnonceDetail('p2', OWNER)).rejects.toThrow(/annonce-detail responses/)
  })

  it('stays author-only: another user gets null and no responses query is made', async () => {
    respond({ job_responses: [response()] })
    expect(await getAnnonceDetail('p3', 'someone-else')).toBeNull()
    expect(h.ops.some((o) => o.table === 'job_responses')).toBe(false)
  })
})

describe('getAnnonceDetail — « Voir le profil » and the F4 header (PR-2)', () => {
  it('maps the responder to freelancer_profiles.id — the id /freelance/[id] resolves, NOT profiles.id (D15)', async () => {
    respond({ job_responses: [response()], freelancer_profiles: [{ id: 'fp-77', profile_id: 'f1', headline: 'Designer', city: 'Sfax' }] })
    const detail = await getAnnonceDetail('p4', OWNER)
    const q = h.ops.find((o) => o.table === 'freelancer_profiles')!
    expect(String(q.ops.find(([n]) => n === 'select')?.[1])).toContain('id, profile_id')
    expect(detail?.responses[0]).toMatchObject({ freelancerId: 'f1', freelancerProfileId: 'fp-77', headline: 'Designer' })
  })

  it('a responder with no readable freelancer_profiles row (moderated) has freelancerProfileId null — the link is hidden', async () => {
    respond({ job_responses: [response()], freelancer_profiles: [] })
    const detail = await getAnnonceDetail('p5', OWNER)
    expect(detail?.responses[0]).toMatchObject({ freelancerId: 'f1', freelancerProfileId: null })
  })

  it('returns the Arabic category name and one server clock for the relative times', async () => {
    respond({ job_responses: [] })
    const detail = await getAnnonceDetail('p6', OWNER)
    expect(detail).toMatchObject({ category: 'Design', categoryAr: 'تصميم', categorySlug: 'design', expiresInDays: 30 })
    expect(typeof detail?.fetchedAt).toBe('number')
  })
})
