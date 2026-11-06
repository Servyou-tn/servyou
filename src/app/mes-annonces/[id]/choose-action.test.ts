import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock-client tests for « Choisir ce freelance » (G1, no live DB): the action validates the id, requires a session, calls the
// choose_job_response RPC with exactly that id, maps its refusals by hint, and revalidates the post + both list pages on success.
const h = vi.hoisted(() => ({
  user: { id: 'owner' } as { id: string } | null,
  rpcCalls: [] as { fn: string; args: unknown }[],
  rpcResult: { data: null, error: null } as { data: unknown; error: unknown },
  revalidated: [] as string[],
}))

vi.mock('next/cache', () => ({ revalidatePath: (p: string) => h.revalidated.push(p) }))
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: h.user } }) },
    rpc: async (fn: string, args: unknown) => {
      h.rpcCalls.push({ fn, args })
      return h.rpcResult
    },
  }),
}))

const { chooseProposalAction } = await import('./actions')

const RESPONSE = '22222222-2222-4222-8222-222222222222'
const POST = '11111111-1111-4111-8111-111111111111'

beforeEach(() => {
  h.user = { id: 'owner' }
  h.rpcCalls.length = 0
  h.revalidated.length = 0
  h.rpcResult = { data: POST, error: null }
  vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})

describe('chooseProposalAction', () => {
  it('a junk id is refused before any database call', async () => {
    expect(await chooseProposalAction({ responseId: 'not-a-uuid' })).toEqual({ ok: false, errorKey: 'common.error_generic' })
    expect(h.rpcCalls).toHaveLength(0)
  })

  it('signed out → not authorised, no RPC', async () => {
    h.user = null
    expect(await chooseProposalAction({ responseId: RESPONSE })).toEqual({ ok: false, errorKey: 'annonce.error.not_authorized' })
    expect(h.rpcCalls).toHaveLength(0)
  })

  it('calls choose_job_response with that proposal and revalidates the post, the list and the freelancer page', async () => {
    expect(await chooseProposalAction({ responseId: RESPONSE })).toEqual({ ok: true })
    expect(h.rpcCalls).toEqual([{ fn: 'choose_job_response', args: { p_response_id: RESPONSE } }])
    expect(h.revalidated).toEqual(expect.arrayContaining(['/mes-annonces', `/mes-annonces/${POST}`, '/mes-propositions']))
  })

  it.each([
    [{ code: '23514', hint: 'job_filled', message: 'x' }, 'annonces.choose.error_filled'],
    [{ code: '23514', hint: 'job_expired', message: 'x' }, 'annonces.choose.error_expired'],
    [{ code: '23514', hint: 'freelancer_unavailable', message: 'x' }, 'annonces.choose.error_freelancer'],
    [{ code: 'P0002', hint: 'not_found', message: 'x' }, 'annonces.choose.error_not_found'],
    [{ code: '57014', hint: null, message: 'timeout' }, 'common.error_generic'],
  ])('a refusal %o → %s, nothing revalidated', async (error, key) => {
    h.rpcResult = { data: null, error }
    expect(await chooseProposalAction({ responseId: RESPONSE })).toEqual({ ok: false, errorKey: key })
    expect(h.revalidated).toHaveLength(0)
  })

  it('a success with no post id back is not reported as a success', async () => {
    h.rpcResult = { data: null, error: null }
    expect(await chooseProposalAction({ responseId: RESPONSE })).toEqual({ ok: false, errorKey: 'common.error_generic' })
  })
})
