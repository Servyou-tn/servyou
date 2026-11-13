import { describe, it, expect, vi } from 'vitest'
import { startEarlyErrorQueue, EARLY_ERROR_LIMIT } from './early-errors'

// A window stand-in that records its listeners, so the test can fire events and check they are removed.
function fakeWindow() {
  const listeners = new Map<string, Set<(event: unknown) => void>>()
  return {
    addEventListener: vi.fn((type: string, fn: (event: unknown) => void) => {
      if (!listeners.has(type)) listeners.set(type, new Set())
      listeners.get(type)!.add(fn)
    }),
    removeEventListener: vi.fn((type: string, fn: (event: unknown) => void) => {
      listeners.get(type)?.delete(fn)
    }),
    fire(type: string, event: unknown) {
      for (const fn of listeners.get(type) ?? []) fn(event)
    },
    count(type: string) {
      return listeners.get(type)?.size ?? 0
    },
  }
}

describe('startEarlyErrorQueue', () => {
  it('holds uncaught errors and rejections until drained, then hands them over oldest first', () => {
    const win = fakeWindow()
    const queue = startEarlyErrorQueue(win as unknown as Window)
    const boom = new Error('hydration boom')
    win.fire('error', { error: boom, message: 'hydration boom' })
    win.fire('unhandledrejection', { reason: 'rejected' })

    const captured: unknown[] = []
    queue.drain((error, kind) => captured.push([error, kind]))

    // Each keeps the event it came from, so Sentry sees the same mechanism as for a live error / rejection.
    expect(captured).toEqual([
      [boom, 'onerror'],
      ['rejected', 'onunhandledrejection'],
    ])
  })

  it('keeps the message when the browser gives no error object (cross-origin « Script error. »)', () => {
    const win = fakeWindow()
    const queue = startEarlyErrorQueue(win as unknown as Window)
    win.fire('error', { error: null, message: 'Script error.' })

    const captured: unknown[] = []
    queue.drain((error) => captured.push(error))

    expect(captured).toEqual(['Script error.'])
  })

  it('stops listening once drained: a later error is left to Sentry and never replayed', () => {
    const win = fakeWindow()
    const queue = startEarlyErrorQueue(win as unknown as Window)
    expect(win.count('error')).toBe(1)
    expect(win.count('unhandledrejection')).toBe(1)

    const capture = vi.fn()
    queue.drain(capture)
    expect(win.count('error')).toBe(0)
    expect(win.count('unhandledrejection')).toBe(0)

    win.fire('error', { error: new Error('after init'), message: 'after init' })
    queue.drain(capture)
    expect(capture).not.toHaveBeenCalled()
  })

  it('replays exactly once even if drain is called twice', () => {
    const win = fakeWindow()
    const queue = startEarlyErrorQueue(win as unknown as Window)
    win.fire('error', { error: new Error('once'), message: 'once' })

    const capture = vi.fn()
    queue.drain(capture)
    queue.drain(capture)

    expect(capture).toHaveBeenCalledTimes(1)
  })

  it(`holds at most ${EARLY_ERROR_LIMIT} errors, so an error loop cannot grow memory before Sentry loads`, () => {
    const win = fakeWindow()
    const queue = startEarlyErrorQueue(win as unknown as Window)
    for (let i = 0; i < EARLY_ERROR_LIMIT + 5; i++) win.fire('error', { error: new Error(`e${i}`), message: `e${i}` })

    const capture = vi.fn()
    queue.drain(capture)

    expect(capture).toHaveBeenCalledTimes(EARLY_ERROR_LIMIT)
    expect((capture.mock.calls[0][0] as Error).message).toBe('e0')
  })
})
