import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock-only: Sentry is a spy, console.error is silenced and inspected.
const sentry = vi.hoisted(() => ({ captureException: vi.fn() }))
vi.mock('@sentry/nextjs', () => sentry)

import { QueryError, failQuery, isNoRowLike, reportQueryError, settle } from '@/lib/supabase/query-error'

// A PostgrestError is an Error with non-enumerable fields — build the same shape.
function pgError(message: string, code?: string, details?: string, hint?: string): Error & { code?: string; details?: string; hint?: string } {
  const e = new Error(message) as Error & { code?: string; details?: string; hint?: string }
  Object.defineProperty(e, 'code', { value: code, enumerable: false })
  Object.defineProperty(e, 'details', { value: details, enumerable: false })
  Object.defineProperty(e, 'hint', { value: hint, enumerable: false })
  return e
}

let log: ReturnType<typeof vi.spyOn>
beforeEach(() => {
  sentry.captureException.mockReset()
  log = vi.spyOn(console, 'error').mockImplementation(() => {})
})
afterEach(() => log.mockRestore())

describe('failQuery', () => {
  it('throws a QueryError carrying where, code and a prefixed message', () => {
    let caught: unknown
    try {
      failQuery('product-detail', pgError('boom', 'PGRST201'))
    } catch (e) {
      caught = e
    }
    expect(caught).toBeInstanceOf(QueryError)
    expect((caught as QueryError).message).toBe('product-detail: boom')
    expect((caught as QueryError).where).toBe('product-detail')
    expect((caught as QueryError).code).toBe('PGRST201')
  })

  it('logs message / code / details to the server log — never the raw object — and does not touch Sentry', () => {
    expect(() => failQuery('x', pgError('boom', '42501', 'row (1,secret)'))).toThrow(QueryError)
    expect(log).toHaveBeenCalledWith('[x] query failed:', 'boom', '42501', 'row (1,secret)')
    expect(sentry.captureException).not.toHaveBeenCalled()
  })

  it('accepts a plain Error with no code', () => {
    expect(() => failQuery('x', new Error('network'))).toThrow('x: network')
    expect(log).toHaveBeenCalledWith('[x] query failed:', 'network', undefined, undefined)
  })
})

describe('reportQueryError', () => {
  it('logs and sends message + code only to Sentry — never details or hint', () => {
    reportQueryError('related', pgError('boom', 'PGRST201', 'row (1,secret)', 'a hint'))
    expect(log).toHaveBeenCalledWith('[related] query failed:', 'boom', 'PGRST201', 'row (1,secret)')
    expect(sentry.captureException).toHaveBeenCalledTimes(1)
    const [err, ctx] = sentry.captureException.mock.calls[0]
    expect((err as Error).message).toBe('related: boom')
    expect(ctx).toEqual({ tags: { where: 'related', code: 'PGRST201' } })
    expect(JSON.stringify([err, ctx])).not.toMatch(/secret|hint/)
  })

  it('omits the code tag when there is none, and does not throw', () => {
    expect(() => reportQueryError('related', new Error('network'))).not.toThrow()
    expect(sentry.captureException.mock.calls[0][1]).toEqual({ tags: { where: 'related' } })
  })
})

describe('isNoRowLike', () => {
  it.each([['22P02', true], ['PGRST116', true], ['PGRST201', false], ['57014', false], ['42501', false]])(
    '%s → %s',
    (code, expected) => expect(isNoRowLike({ code })).toBe(expected),
  )
  it('is false for no error, no code or a null code', () => {
    expect(isNoRowLike(null)).toBe(false)
    expect(isNoRowLike(undefined)).toBe(false)
    expect(isNoRowLike({})).toBe(false)
    expect(isNoRowLike({ code: null })).toBe(false)
  })
})

describe('settle', () => {
  it('resolves { ok: true, data } when the loader succeeds', async () => {
    expect(await settle('list', Promise.resolve([1, 2]))).toEqual({ ok: true, data: [1, 2] })
    expect(sentry.captureException).not.toHaveBeenCalled()
  })

  it('turns a QueryError into { ok: false } and reports it', async () => {
    const failing = (async () => failQuery('inner', pgError('boom', 'PGRST201')))()
    expect(await settle('outer', failing)).toEqual({ ok: false })
    expect(sentry.captureException).toHaveBeenCalledTimes(1)
    expect(sentry.captureException.mock.calls[0][1]).toEqual({ tags: { where: 'outer', code: 'PGRST201' } })
  })

  it('re-throws anything that is not a QueryError (notFound / redirect / a real bug)', async () => {
    const redirectLike = Object.assign(new Error('NEXT_REDIRECT'), { digest: 'NEXT_REDIRECT;/connexion' })
    await expect(settle('list', Promise.reject(redirectLike))).rejects.toBe(redirectLike)
    await expect(settle('list', Promise.reject(new TypeError('bug')))).rejects.toThrow('bug')
    expect(sentry.captureException).not.toHaveBeenCalled()
  })
})
