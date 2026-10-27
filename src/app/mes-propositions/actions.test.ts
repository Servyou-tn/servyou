import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock-client tests for « Retirer ma proposition » (no live DB). A recording fake of the PostgREST builder: each call is logged and
// answered by `respond`, keyed on the table and whether a `delete` was chained.
type Op = [string, ...unknown[]]
type Call = { table: string; ops: Op[] }

const h = vi.hoisted(() => ({
  user: { id: 'me' } as { id: string } | null,
  calls: [] as { table: string; ops: [string, ...unknown[]][] }[],
  respond: (_c: { table: string; ops: [string, ...unknown[]][] }): { data?: unknown; error?: unknown } => ({ data: null, error: null }),
  revalidated: [] as string[],
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

const { withdrawProposalAction } = await import('./actions')

const RESPONSE = '22222222-2222-4222-8222-222222222222'
const POST = '11111111-1111-4111-8111-111111111111'
const isDelete = (c: Call) => c.ops.some(([n]) => n === 'delete')
const deletes = () => h.calls.filter(isDelete)

function respond(opts: { post?: { status: string; created_at: string } | null; row?: boolean; deleted?: unknown[]; readError?: boolean; deleteError?: boolean }) {
  h.respond = (c) => {
    if (isDelete(c)) return opts.deleteError ? { data: null, error: { message: 'boom', code: '42501' } } : { data: opts.deleted ?? [{ id: RESPONSE }], error: null }
    if (opts.readError) return { data: null, error: { message: 'boom', code: '500' } }
    if (opts.row === false) return { data: null, error: null }
    const post = opts.post === undefined ? { status: 'open', created_at: new Date().toISOString() } : opts.post
    return { data: { id: RESPONSE, job_post_id: POST, job_posts: post }, error: null }
  }
}

beforeEach(() => {
  h.user = { id: 'me' }
  h.calls.length = 0
  h.revalidated.length = 0
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('withdrawProposalAction', () => {
  it('deletes an own proposal on an open post, scoped to the session user, and revalidates the pages that show it', async () => {
    respond({})
    expect(await withdrawProposalAction({ responseId: RESPONSE })).toEqual({ ok: true })
    const del = deletes()[0]
    expect(del.ops).toContainEqual(['eq', 'id', RESPONSE])
    expect(del.ops).toContainEqual(['eq', 'freelancer_id', 'me'])
    expect(h.revalidated).toEqual(['/mes-propositions', '/trouver-des-missions', `/missions/${POST}`])
  })

  it('refuses a malformed id before touching the database', async () => {
    expect(await withdrawProposalAction({ responseId: 'nope' })).toEqual({ ok: false, reason: 'not_found' })
    expect(h.calls).toHaveLength(0)
  })

  it('refuses when signed out', async () => {
    h.user = null
    expect(await withdrawProposalAction({ responseId: RESPONSE })).toEqual({ ok: false, reason: 'not_found' })
    expect(h.calls).toHaveLength(0)
  })

  it("someone else's response (or none) is not found, and nothing is deleted", async () => {
    respond({ row: false })
    expect(await withdrawProposalAction({ responseId: RESPONSE })).toEqual({ ok: false, reason: 'not_found' })
    expect(deletes()).toHaveLength(0)
  })

  it.each([
    ['filled', { status: 'filled', created_at: new Date().toISOString() }],
    ['stored-expired', { status: 'expired', created_at: new Date().toISOString() }],
    ['past the 30-day window', { status: 'open', created_at: new Date(Date.now() - 31 * 86_400_000).toISOString() }],
    ['no longer readable', null],
  ])('does not withdraw once the post is %s', async (_label, post) => {
    respond({ post })
    expect(await withdrawProposalAction({ responseId: RESPONSE })).toEqual({ ok: false, reason: 'not_open' })
    expect(deletes()).toHaveLength(0)
  })

  it('a delete that removed 0 rows (RLS filtered it) is not reported as success', async () => {
    respond({ deleted: [] })
    expect(await withdrawProposalAction({ responseId: RESPONSE })).toEqual({ ok: false, reason: 'not_found' })
    expect(h.revalidated).toHaveLength(0)
  })

  it('a database error is technical, logged as message / code / details, and nothing is revalidated', async () => {
    respond({ deleteError: true })
    expect(await withdrawProposalAction({ responseId: RESPONSE })).toEqual({ ok: false, reason: 'technical' })
    expect(console.error).toHaveBeenCalledWith('[withdrawProposal] delete failed:', 'boom', '42501', undefined)
    expect(h.revalidated).toHaveLength(0)
  })

  it('a failed read is technical, not « not found »', async () => {
    respond({ readError: true })
    expect(await withdrawProposalAction({ responseId: RESPONSE })).toEqual({ ok: false, reason: 'technical' })
  })
})
