import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock-client tests for the H12 server action (no live DB). A recording fake of the PostgREST builder: each table answers
// through `respond`, every chained call is logged, and `insert` payloads are captured.
type Op = [string, ...unknown[]]
type Result = { data?: unknown; error?: { message: string; code?: string; hint?: string; details?: string } | null }
type Call = { table: string; ops: Op[] }

const h = vi.hoisted(() => ({
  user: { id: 'me' } as { id: string } | null,
  calls: [] as { table: string; ops: [string, ...unknown[]][] }[],
  respond: (_c: { table: string; ops: [string, ...unknown[]][] }): { data?: unknown; error?: unknown } => ({ data: null, error: null }),
  redirected: [] as string[],
  revalidated: [] as string[],
}))

vi.mock('next/navigation', () => ({
  redirect: (url: string) => {
    h.redirected.push(url)
    throw new Error(`NEXT_REDIRECT:${url}`)
  },
}))
vi.mock('next/cache', () => ({ revalidatePath: (p: string) => h.revalidated.push(p) }))
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: h.user } }) },
    from(table: string) {
      const call: Call = { table, ops: [] }
      h.calls.push(call)
      const q: unknown = new Proxy(
        {},
        {
          get(_t, prop: string) {
            if (prop === 'then') return (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) => Promise.resolve(h.respond(call)).then(res, rej)
            return (...args: unknown[]) => {
              call.ops.push([prop, ...args])
              return q
            }
          },
        },
      )
      return q
    },
  }),
}))

const { submitProposalAction } = await import('./actions')

const POST = '11111111-1111-4111-8111-111111111111'
const base = { jobPostId: POST, message: 'a'.repeat(30), links: [], price: '', timeframe: '', skills: [] as string[] }

const inserts = (table: string) => h.calls.filter((c) => c.table === table && c.ops.some(([n]) => n === 'insert'))
const payload = (c: Call) => c.ops.find(([n]) => n === 'insert')![1] as Record<string, unknown>

/** Resolve the action; a redirect throws, so report its target instead. */
async function run(input: unknown) {
  try {
    return { result: await submitProposalAction(input), redirect: null as string | null }
  } catch (e) {
    const m = /^NEXT_REDIRECT:(.*)$/.exec((e as Error).message)
    if (!m) throw e
    return { result: null, redirect: m[1] }
  }
}

function respondWith(overrides: Partial<Record<string, Result | ((c: Call) => Result)>> = {}) {
  h.respond = (c) => {
    const o = overrides[c.table]
    if (o) return typeof o === 'function' ? o(c) : o
    if (c.table === 'job_responses') return { data: { id: 'resp-1' }, error: null }
    if (c.table === 'freelancer_profiles') return { data: { id: 'fp-1' }, error: null }
    return { data: [], error: null }
  }
}

beforeEach(() => {
  h.user = { id: 'me' }
  h.calls = []
  h.redirected = []
  h.revalidated = []
  respondWith()
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('submitProposalAction — before any write', () => {
  it('a malformed payload never reaches the DB (zod shape)', async () => {
    for (const bad of [null, {}, { ...base, jobPostId: 'not-a-uuid' }, { ...base, links: 'x' }, { ...base, skills: [1] }, { ...base, message: 'x'.repeat(6000) }]) {
      const { result } = await run(bad)
      expect(result).toEqual({ ok: false, kind: 'failure', reason: 'technical' })
    }
    expect(h.calls).toEqual([])
  })

  it('business rules run before any query: a short message returns field errors and touches nothing', async () => {
    const { result } = await run({ ...base, message: 'trop court' })
    expect(result).toMatchObject({ ok: false, kind: 'invalid', errors: { message: 'proposal.error.message_short' } })
    expect(h.calls).toEqual([])
  })

  it('logged out → sent to sign-in with a way back, nothing written', async () => {
    h.user = null
    const { redirect } = await run(base)
    expect(redirect).toBe(`/connexion?next=${encodeURIComponent(`/missions/${POST}/proposer`)}`)
    expect(inserts('job_responses')).toEqual([])
  })
})

describe('submitProposalAction — the write', () => {
  it('freelancer_id is the SESSION user, whatever the input says', async () => {
    const forged = { ...base, freelancer_id: 'someone-else', freelancerId: 'someone-else' }
    await run(forged)
    const [call] = inserts('job_responses')
    expect(payload(call).freelancer_id).toBe('me')
    expect(JSON.stringify(payload(call))).not.toContain('someone-else')
  })

  it('writes the cleaned fields and redirects to H13, revalidating the pages that show the count', async () => {
    const { redirect } = await run({
      ...base,
      message: `  ${'b'.repeat(25)}  `,
      price: '800,5',
      timeframe: ' 10 jours ',
      links: [{ label: '', url: '' }, { label: 'Site', url: 'https://a.tn' }],
    })
    expect(payload(inserts('job_responses')[0])).toEqual({
      job_post_id: POST,
      freelancer_id: 'me',
      proposal_message: 'b'.repeat(25),
      proposed_price_tnd: 800.5,
      proposed_timeframe: '10 jours',
      portfolio_links: [{ url: 'https://a.tn', label: 'Site' }],
    })
    expect(redirect).toBe(`/missions/${POST}/proposition-envoyee`)
    expect(h.revalidated).toEqual(expect.arrayContaining([`/missions/${POST}`, '/trouver-des-missions', '/mes-propositions']))
  })

  it('no price / délai / links → nulls and an empty array, no skills insert', async () => {
    await run(base)
    expect(payload(inserts('job_responses')[0])).toMatchObject({ proposed_price_tnd: null, proposed_timeframe: null, portfolio_links: [] })
    expect(inserts('job_response_skills')).toEqual([])
  })
})

describe('submitProposalAction — skills', () => {
  const pool = () =>
    respondWith({
      job_post_skills: { data: [{ skill: 'React' }], error: null },
      freelancer_skills: { data: [{ skill: 'Figma' }], error: null },
    })

  it('inserts them as SEPARATE rows, canonicalised to the pool spelling', async () => {
    pool()
    await run({ ...base, skills: ['react', 'FIGMA', 'React'] })
    const [call] = inserts('job_response_skills')
    expect(payload(call as Call)).toEqual([
      { job_response_id: 'resp-1', skill: 'React' },
      { job_response_id: 'resp-1', skill: 'Figma' },
    ])
  })

  it('a skill outside (post skills ∪ mine) refuses the WHOLE submit — nothing is written', async () => {
    pool()
    const { result } = await run({ ...base, skills: ['React', 'Hacking'] })
    expect(result).toMatchObject({ ok: false, kind: 'invalid', errors: { skills: 'proposal.error.skills_invalid' } })
    expect(inserts('job_responses')).toEqual([])
  })

  it('a failed skills insert is NON-FATAL: the proposal stays and the freelancer still lands on H13', async () => {
    respondWith({
      job_post_skills: { data: [{ skill: 'React' }], error: null },
      freelancer_skills: { data: [], error: null },
      job_response_skills: { data: null, error: { message: 'boom', code: 'XX000' } },
    })
    const { redirect, result } = await run({ ...base, skills: ['React'] })
    expect(result).toBeNull()
    expect(redirect).toBe(`/missions/${POST}/proposition-envoyee`)
  })

  it('a failed pool read is a technical failure, not a silent empty pool', async () => {
    respondWith({ job_post_skills: { data: null, error: { message: 'boom', code: 'XX000' } } })
    const { result } = await run({ ...base, skills: ['React'] })
    expect(result).toEqual({ ok: false, kind: 'failure', reason: 'technical' })
    expect(inserts('job_responses')).toEqual([])
  })
})

describe('submitProposalAction — typed DB failures come back as a reason, the input is not lost', () => {
  const fail = (hint: string | undefined, extra: Record<string, unknown> = {}) =>
    respondWith({ job_responses: { data: null, error: { message: 'x', code: '23514', hint, ...extra } } })

  it.each([
    ['job_full', 'job_full'],
    ['job_filled', 'job_filled'],
    ['job_deleted', 'job_deleted'],
    ['job_expired', 'job_expired'],
    ['job_unavailable', 'job_unavailable'],
    ['cap_active', 'cap_active'],
    ['own_post', 'own_post'],
    ['invalid_links', 'invalid_links'],
    ['suspended', 'suspended'],
  ] as const)('hint %s → reason %s, no skills insert, no redirect', async (hint, reason) => {
    fail(hint)
    const { result, redirect } = await run({ ...base, skills: [] })
    expect(result).toEqual({ ok: false, kind: 'failure', reason })
    expect(redirect).toBeNull()
    expect(inserts('job_response_skills')).toEqual([])
  })

  it('« Ce compte est suspendu. » (42501, no hint) → suspended', async () => {
    respondWith({ job_responses: { data: null, error: { message: 'Ce compte est suspendu.', code: '42501' } } })
    expect((await run(base)).result).toEqual({ ok: false, kind: 'failure', reason: 'suspended' })
  })

  it('an unknown error is technical', async () => {
    respondWith({ job_responses: { data: null, error: { message: 'boom', code: 'XX000' } } })
    expect((await run(base)).result).toEqual({ ok: false, kind: 'failure', reason: 'technical' })
  })

  it('DUPLICATE is an idempotent SUCCESS: the first insert worked, so go to H13 — not a failure box', async () => {
    fail('duplicate', { code: '23505' })
    const { result, redirect } = await run(base)
    expect(result).toBeNull()
    expect(redirect).toBe(`/missions/${POST}/proposition-envoyee`)
  })

  it('logs message / code / details / hint, never the raw error object', async () => {
    fail('job_full', { details: 'd' })
    await run(base)
    const calls = vi.mocked(console.error).mock.calls
    expect(calls.length).toBeGreaterThan(0)
    for (const args of calls) for (const a of args) expect(typeof a === 'object' && a !== null && !Array.isArray(a)).toBe(false)
  })
})
