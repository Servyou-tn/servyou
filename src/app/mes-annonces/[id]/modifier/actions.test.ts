import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock-client tests for updateAnnonce (PR-3): owner-scoped, refused while the post is closed / moderated / already answered, validated with the
// STORED row as `original`, and the skills written as a diff. No live DB — the live write guards are covered by job-posts-write-guards.
type Call = [string, ...unknown[]]
type Rec = { table: string; calls: Call[] }
type Res = { data?: unknown; error?: { message: string; code?: string; details?: string; hint?: string } | null }

const h = vi.hoisted(() => ({
  recs: [] as { table: string; calls: [string, ...unknown[]][] }[],
  user: { id: 'owner-1' } as { id: string } | null,
  respond: ((_table: string, _op: string): { data?: unknown; error?: { message: string; code?: string; details?: string; hint?: string } | null } => ({ data: null, error: null })),
  revalidated: [] as string[],
}))

vi.mock('next/cache', () => ({ revalidatePath: (p: string) => h.revalidated.push(p) }))
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: h.user } }) },
    from(table: string) {
      const rec: Rec = { table, calls: [] }
      h.recs.push(rec)
      const q: unknown = new Proxy(
        {},
        {
          get(_t, prop: string) {
            if (prop === 'then' || prop === 'maybeSingle') {
              const op = rec.calls.find(([n]) => ['select', 'update', 'insert', 'delete'].includes(n))?.[0] ?? 'select'
              const run = () => Promise.resolve(h.respond(table, op))
              return prop === 'then' ? (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) => run().then(res, rej) : () => run()
            }
            return (...args: unknown[]) => {
              rec.calls.push([prop, ...args])
              return q
            }
          },
        },
      )
      return q
    },
  }),
}))

const { updateAnnonce } = await import('./actions')

const ID = '11111111-1111-4111-8111-111111111111'
const DAY = 24 * 60 * 60 * 1000

const stored = (over: Record<string, unknown> = {}) => ({
  title: 'Logo pour boutique bio',
  description: 'Un logo moderne.',
  deadline: null,
  budget_min: null,
  budget_max: 400,
  status: 'open',
  created_at: new Date(Date.now() - 2 * DAY).toISOString(),
  response_count: 0,
  admin_hidden_at: null,
  job_post_skills: [{ skill: 'Figma' }, { skill: 'Adobe' }],
  ...over,
})

const input = {
  title: 'Logo bio v2',
  description: 'Un logo moderne.',
  categoryId: 'cat-1',
  city: 'Tunis',
  budget: '400',
  isRemote: false,
  deadline: '',
  skills: ['figma', 'Canva'],
}

// job_posts: the owner's read, then the update. job_post_skills: insert / delete.
function setup(opts: { post?: unknown; update?: Res; insert?: Res; remove?: Res } = {}) {
  h.respond = (table, op) => {
    if (table === 'job_posts' && op === 'select') return { data: opts.post === undefined ? stored() : opts.post, error: null }
    if (table === 'job_posts' && op === 'update') return opts.update ?? { data: [{ id: ID }], error: null }
    if (table === 'job_post_skills' && op === 'insert') return opts.insert ?? { error: null }
    if (table === 'job_post_skills' && op === 'delete') return opts.remove ?? { error: null }
    return { data: null, error: null }
  }
}
const on = (table: string, op: string) => h.recs.filter((r) => r.table === table && r.calls.some(([n]) => n === op))
const callsOf = (table: string, op: string) => on(table, op).flatMap((r) => r.calls)

beforeEach(() => {
  h.recs = []
  h.user = { id: 'owner-1' }
  h.revalidated = []
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('updateAnnonce — guards before any write', () => {
  it('a junk id never reaches the database', async () => {
    setup()
    expect(await updateAnnonce('not-a-uuid', input)).toEqual({ ok: false, errorKey: 'common.error_generic' })
    expect(h.recs).toHaveLength(0)
  })

  it('a logged-out caller is refused', async () => {
    setup()
    h.user = null
    expect(await updateAnnonce(ID, input)).toEqual({ ok: false, errorKey: 'annonce.error.not_authorized' })
    expect(h.recs).toHaveLength(0)
  })

  it('reads the post scoped to its owner, and a missing / foreign / deleted post is a plain failure with no write', async () => {
    setup({ post: null })
    expect(await updateAnnonce(ID, input)).toEqual({ ok: false, errorKey: 'common.error_generic' })
    const read = callsOf('job_posts', 'select')
    expect(read).toContainEqual(['eq', 'id', ID])
    expect(read).toContainEqual(['eq', 'consumer_id', 'owner-1'])
    expect(on('job_posts', 'update')).toHaveLength(0)

    setup({ post: stored({ status: 'deleted' }) })
    expect(await updateAnnonce(ID, input)).toEqual({ ok: false, errorKey: 'common.error_generic' })
  })

  it('a post that already has a proposal is content-locked (no update, no skills write)', async () => {
    setup({ post: stored({ response_count: 1 }) })
    expect(await updateAnnonce(ID, input)).toEqual({ ok: false, errorKey: 'annonce.error.content_locked' })
    expect(on('job_posts', 'update')).toHaveLength(0)
    expect(on('job_post_skills', 'insert')).toHaveLength(0)
  })

  it('a closed, expired or moderated post is not editable', async () => {
    for (const post of [
      stored({ status: 'filled' }),
      stored({ created_at: new Date(Date.now() - 40 * DAY).toISOString() }),
      stored({ admin_hidden_at: new Date().toISOString() }),
    ]) {
      setup({ post })
      expect(await updateAnnonce(ID, input)).toEqual({ ok: false, errorKey: 'annonce.error.edit_unavailable' })
    }
    expect(on('job_posts', 'update')).toHaveLength(0)
  })

  it('invalid input is refused before any write', async () => {
    setup()
    expect(await updateAnnonce(ID, { ...input, title: '  ' })).toEqual({ ok: false, errorKey: 'annonce.error.title_required' })
    expect(on('job_posts', 'update')).toHaveLength(0)
  })
})

describe('updateAnnonce — the write', () => {
  it('updates only the content columns, scoped to the owner and to an open post, and revalidates', async () => {
    setup()
    expect(await updateAnnonce(ID, input)).toEqual({ ok: true })
    const upd = callsOf('job_posts', 'update')
    const payload = upd.find(([n]) => n === 'update')![1] as Record<string, unknown>
    expect(payload).toEqual({
      title: 'Logo bio v2',
      description: 'Un logo moderne.',
      category_id: 'cat-1',
      city: 'Tunis',
      is_remote: false,
      budget_min: null,
      budget_max: 400,
      deadline: null,
    })
    expect(payload).not.toHaveProperty('status')
    expect(payload).not.toHaveProperty('consumer_id')
    expect(upd).toContainEqual(['eq', 'id', ID])
    expect(upd).toContainEqual(['eq', 'consumer_id', 'owner-1'])
    expect(upd).toContainEqual(['eq', 'status', 'open'])
    expect(h.revalidated).toEqual(['/mes-annonces', `/mes-annonces/${ID}`])
  })

  it('writes the skills as a diff, case-insensitively: « figma » is the stored « Figma », « Canva » is added, « Adobe » is dropped', async () => {
    setup()
    await updateAnnonce(ID, input)
    const ins = callsOf('job_post_skills', 'insert').find(([n]) => n === 'insert')![1]
    expect(ins).toEqual([{ job_post_id: ID, skill: 'Canva' }])
    const del = callsOf('job_post_skills', 'delete')
    expect(del).toContainEqual(['eq', 'job_post_id', ID])
    expect(del).toContainEqual(['in', 'skill', ['Adobe']])
  })

  it('unchanged skills write nothing to job_post_skills', async () => {
    setup()
    await updateAnnonce(ID, { ...input, skills: ['Adobe', 'Figma'] })
    expect(on('job_post_skills', 'insert')).toHaveLength(0)
    expect(on('job_post_skills', 'delete')).toHaveLength(0)
  })

  it('an old min–max budget is kept while the amount is left alone (the stored row is the original, not the client)', async () => {
    setup({ post: stored({ budget_min: 200, budget_max: 400 }) })
    await updateAnnonce(ID, input)
    const payload = callsOf('job_posts', 'update').find(([n]) => n === 'update')![1] as Record<string, unknown>
    expect(payload).toMatchObject({ budget_min: 200, budget_max: 400 })
  })

  it('an old over-long title and a deadline that has since passed do not block a save that leaves them alone', async () => {
    const longTitle = 'T'.repeat(75)
    setup({ post: stored({ title: longTitle, deadline: '2020-01-01' }) })
    expect(await updateAnnonce(ID, { ...input, title: longTitle, deadline: '2020-01-01' })).toEqual({ ok: true })
    // …but the stored text is the original only: a client cannot pass its own over-long title off as unchanged.
    setup()
    expect(await updateAnnonce(ID, { ...input, title: longTitle })).toEqual({ ok: false, errorKey: 'annonce.error.title_max' })
  })
})

describe('updateAnnonce — failures from the database', () => {
  it('a proposal that arrived after the form loaded: the DB lock (42501 content_locked) is mapped, not a generic error', async () => {
    setup({ update: { data: null, error: { message: 'locked', code: '42501', hint: 'content_locked' } } })
    expect(await updateAnnonce(ID, input)).toEqual({ ok: false, errorKey: 'annonce.error.content_locked' })
    expect(on('job_post_skills', 'insert')).toHaveLength(0)
  })

  it('a zero-row update (not the owner any more, no longer open) is a failure, never a false success', async () => {
    setup({ update: { data: [], error: null } })
    expect(await updateAnnonce(ID, input)).toEqual({ ok: false, errorKey: 'common.error_generic' })
    expect(h.revalidated).toHaveLength(0)
  })

  it('any other update error is generic and logged as message / code / details, never the raw object', async () => {
    setup({ update: { data: null, error: { message: 'boom', code: 'XX000', details: 'd' } } })
    expect(await updateAnnonce(ID, input)).toEqual({ ok: false, errorKey: 'common.error_generic' })
    expect(console.error).toHaveBeenCalledWith('[updateAnnonce] update error:', 'boom', 'XX000', 'd')
  })

  it('a failed skills insert is reported (the post row is already saved) and the delete is not attempted', async () => {
    setup({ insert: { error: { message: 'nope', code: 'XX000' } } })
    expect(await updateAnnonce(ID, input)).toEqual({ ok: false, errorKey: 'common.error_generic' })
    expect(on('job_post_skills', 'delete')).toHaveLength(0)
  })

  it('a skills write refused by the content lock is mapped too', async () => {
    setup({ remove: { error: { message: 'locked', code: '42501', hint: 'content_locked' } } })
    expect(await updateAnnonce(ID, input)).toEqual({ ok: false, errorKey: 'annonce.error.content_locked' })
  })
})
