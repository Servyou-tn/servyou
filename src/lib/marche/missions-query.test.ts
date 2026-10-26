import { describe, it, expect, vi, beforeEach } from 'vitest'
import { DEFAULT_MISSION_SORT, type MissionFilters } from './missions'

// Mock-client tests for the H9 board loader (no live DB). A recording fake of the PostgREST builder: every
// chained call is logged on the query, and awaiting it resolves through `respond`.
type Op = [string, ...unknown[]]
type Call = { table: string; head: boolean; ops: Op[] }
type Result = { data?: unknown; error?: { message: string; code?: string; details?: string } | null; count?: number | null }

const state = vi.hoisted(() => ({
  calls: [] as Call[],
  respond: (_c: Call): Result => ({ data: [], error: null, count: 0 }),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    from(table: string) {
      const call: Call = { table, head: false, ops: [] }
      state.calls.push(call)
      const q: unknown = new Proxy(
        {},
        {
          get(_t, prop: string) {
            if (prop === 'then') {
              return (res: (v: Result) => unknown, rej: (e: unknown) => unknown) =>
                Promise.resolve(state.respond(call)).then(res, rej)
            }
            return (...args: unknown[]) => {
              if (prop === 'select' && (args[1] as { head?: boolean } | undefined)?.head) call.head = true
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

const { getMissionBoard, getMyResponseState } = await import('./missions-query')

const NOW = new Date('2026-10-26T12:00:00Z')
const filters = (patch: Partial<MissionFilters> = {}): MissionFilters => ({
  categorie: null,
  ville: null,
  budget: null,
  competence: null,
  teletravail: false,
  tri: DEFAULT_MISSION_SORT,
  page: 1,
  ...patch,
})

const has = (c: Call, name: string, ...args: unknown[]) =>
  c.ops.some(([n, ...a]) => n === name && args.every((x, i) => JSON.stringify(a[i]) === JSON.stringify(x)))

const postRow = (id: string) => ({
  id,
  title: 'LOGO 3D',
  description: 'desc',
  budget_min: 60,
  budget_max: '100.00',
  city: 'Ariana',
  is_remote: false,
  created_at: '2026-10-26T10:00:00Z',
  consumer_id: 'c1',
  response_count: 2,
  categories: { slug: 'design-graphique-logo', name_fr: 'Design', name_ar: 'تصميم' },
  job_post_skills: [{ skill: 'a' }, { skill: 'b' }, { skill: 'c' }, { skill: 'd' }],
})

function respondWith(opts: { available?: number; filtered?: number; rows?: unknown[]; answered?: unknown[] }) {
  state.respond = (c) => {
    if (c.table === 'job_responses') return { data: opts.answered ?? [], error: null }
    if (c.table === 'public_profiles') return { data: [{ id: 'c1', full_name: 'Karim Ben Ali', city: 'Tunis', avatar_url: null }], error: null }
    if (c.table === 'job_post_skills') return { data: [], error: null }
    if (c.table === 'job_posts' && c.head) {
      // The unfiltered « available » query carries no category / city / budget / remote predicate.
      const narrowed = c.ops.some(([n]) => n === 'or' || n === 'in') || c.ops.some(([n, k]) => n === 'eq' && ['city', 'is_remote', 'category_id'].includes(k as string))
      return { count: narrowed ? (opts.filtered ?? 0) : (opts.available ?? 0), error: null }
    }
    return { data: opts.rows ?? [], error: null }
  }
}

beforeEach(() => {
  state.calls = []
})

describe('getMissionBoard — every exclusion is asked for in the query (RLS is not the filter)', () => {
  it('open · not moderated · inside the 30-day window · not mine · not full · not already answered', async () => {
    respondWith({ available: 3, filtered: 3, rows: [postRow('p1')], answered: [{ job_post_id: 'a1', job_posts: null }, { job_post_id: 'a2', job_posts: null }] })
    await getMissionBoard('me', filters(), null, NOW)
    const page = state.calls.filter((c) => c.table === 'job_posts' && !c.head)[0]
    expect(has(page, 'eq', 'status', 'open')).toBe(true)
    expect(has(page, 'is', 'admin_hidden_at', null)).toBe(true)
    expect(has(page, 'gte', 'created_at', '2026-09-26T12:00:00.000Z')).toBe(true)
    expect(has(page, 'neq', 'consumer_id', 'me')).toBe(true)
    expect(has(page, 'lt', 'response_count', 10)).toBe(true)
    expect(has(page, 'not', 'id', 'in', '(a1,a2)')).toBe(true)
  })

  it('the « available » header count ignores the filters; the filtered count and the page carry them', async () => {
    respondWith({ available: 40, filtered: 2, rows: [postRow('p1'), postRow('p2')] })
    const board = await getMissionBoard('me', filters({ ville: 'Tunis', teletravail: true, budget: '200_500' }), 'cat-1', NOW)
    expect(board.totalAvailable).toBe(40)
    expect(board.totalCount).toBe(2)
    const heads = state.calls.filter((c) => c.table === 'job_posts' && c.head)
    expect(heads).toHaveLength(2)
    expect(heads.filter((c) => has(c, 'eq', 'city', 'Tunis'))).toHaveLength(1)
    const page = state.calls.find((c) => c.table === 'job_posts' && !c.head)!
    expect(has(page, 'eq', 'category_id', 'cat-1')).toBe(true)
    expect(has(page, 'eq', 'is_remote', true)).toBe(true)
    expect(page.ops.filter(([n]) => n === 'or')).toHaveLength(2) // the two budget groups, ANDed
  })
})

describe('getMissionBoard — paging', () => {
  it('clamps a stale ?page=99 to the last page BEFORE ranging (a range past the end is a 416, not an empty page)', async () => {
    respondWith({ available: 30, filtered: 30, rows: [postRow('p1')] })
    const board = await getMissionBoard('me', filters({ page: 99 }), null, NOW)
    expect(board.totalPages).toBe(3)
    expect(board.page).toBe(3)
    const page = state.calls.find((c) => c.table === 'job_posts' && !c.head)!
    expect(page.ops.find(([n]) => n === 'range')).toEqual(['range', 24, 35])
  })

  it('an empty filtered set makes no page query at all', async () => {
    respondWith({ available: 5, filtered: 0 })
    // `filtered: 0` is falsy → the narrowing branch returns 0 for filtered queries
    const board = await getMissionBoard('me', filters({ ville: 'Gabès' }), null, NOW)
    expect(board).toMatchObject({ missions: [], totalCount: 0, totalPages: 1, page: 1, totalAvailable: 5 })
    expect(state.calls.some((c) => c.table === 'job_posts' && !c.head)).toBe(false)
  })

  it('a skill that matches no post short-circuits to empty without a filtered count query', async () => {
    respondWith({ available: 5 })
    const board = await getMissionBoard('me', filters({ competence: 'Cobol' }), null, NOW)
    expect(board.totalCount).toBe(0)
    expect(state.calls.filter((c) => c.table === 'job_posts' && c.head)).toHaveLength(1) // only « available »
  })
})

describe('getMissionBoard — sorting is total (ties cannot swap between pages)', () => {
  const orders = async (tri: MissionFilters['tri']) => {
    respondWith({ available: 5, filtered: 5, rows: [postRow('p1')] })
    state.calls = []
    await getMissionBoard('me', filters({ tri }), null, NOW)
    return state.calls.find((c) => c.table === 'job_posts' && !c.head)!.ops.filter(([n, , o]) => n === 'order' && !(o as { referencedTable?: string })?.referencedTable)
  }

  it('moins de concurrence → response_count asc, then newest, then id', async () => {
    const o = await orders('concurrence')
    expect(o.map((x) => x[1])).toEqual(['response_count', 'created_at', 'id'])
    expect(o[0][2]).toEqual({ ascending: true })
  })
  it('budget décroissant puts budget-less posts last', async () => {
    const o = await orders('budget')
    expect(o[0]).toEqual(['order', 'budget_max', { ascending: false, nullsFirst: false }])
    expect(o.at(-1)).toEqual(['order', 'id'])
  })
  it('expire bientôt → oldest first; default → newest first', async () => {
    expect((await orders('expire'))[0]).toEqual(['order', 'created_at', { ascending: true }])
    expect((await orders('recent'))[0]).toEqual(['order', 'created_at', { ascending: false }])
  })
})

describe('getMissionBoard — card data', () => {
  it('keeps at most 3 skills, turns numerics into numbers and names the client by first name', async () => {
    respondWith({ available: 1, filtered: 1, rows: [postRow('p1')] })
    const { missions } = await getMissionBoard('me', filters(), null, NOW)
    expect(missions).toHaveLength(1)
    expect(missions[0]).toMatchObject({
      budgetMin: 60,
      budgetMax: 100,
      skills: ['a', 'b', 'c'],
      clientFirstName: 'Karim',
      clientCity: 'Tunis',
      isNew: true,
    })
  })
})

describe('getMissionBoard — a failed read throws, never an empty board', () => {
  it.each(['job_responses', 'job_posts', 'public_profiles'])('error on %s', async (table) => {
    state.respond = (c) => {
      if (c.table === table) return { data: null, error: { message: 'boom', code: 'XX000' }, count: null }
      if (c.table === 'job_posts' && c.head) return { count: 5, error: null }
      if (c.table === 'job_posts') return { data: [postRow('p1')], error: null }
      return { data: [], error: null }
    }
    await expect(getMissionBoard('me', filters(), null, NOW)).rejects.toThrow(/failed/)
  })
})

describe('getMyResponseState — « N sur 5 » counts only live proposals', () => {
  it('counts open posts inside the window; closed, expired and RLS-hidden (null) ones are answered but not active', async () => {
    const day = 86_400_000
    const at = (d: number) => new Date(NOW.getTime() - d * day).toISOString()
    state.respond = () => ({
      error: null,
      data: [
        { job_post_id: 'a', job_posts: { status: 'open', created_at: at(2) } },
        { job_post_id: 'b', job_posts: [{ status: 'open', created_at: at(29) }] },
        { job_post_id: 'c', job_posts: { status: 'open', created_at: at(31) } },
        { job_post_id: 'd', job_posts: { status: 'filled', created_at: at(1) } },
        { job_post_id: 'e', job_posts: null },
      ],
    })
    const { createClient } = await import('@/lib/supabase/server')
    const out = await getMyResponseState(await createClient(), 'me', NOW)
    expect(out.activeCount).toBe(2)
    expect(out.answeredIds).toEqual(['a', 'b', 'c', 'd', 'e'])
  })
})
