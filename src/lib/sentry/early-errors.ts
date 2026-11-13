// Holds the browser's uncaught errors and unhandled promise rejections from page start until Sentry is running.
//
// The browser Sentry SDK now starts after hydration, when the page is idle (speed PR-1, founder pick 1, see
// src/instrumentation-client.ts). An error thrown before that, during hydration for example, would otherwise never reach
// Sentry. This module imports nothing, so it adds a few hundred bytes to the critical path instead of the whole SDK.

/** Which browser event held the error: an uncaught error, or an unhandled promise rejection. */
export type EarlyErrorKind = 'onerror' | 'onunhandledrejection'

export type EarlyErrorQueue = {
  /**
   * Stops listening and hands every held error to `capture`, oldest first, exactly once. Call it right after Sentry.init, in
   * the same task, so Sentry's own handlers take over with no gap and no error is reported twice.
   */
  drain(capture: (error: unknown, kind: EarlyErrorKind) => void): void
}

type ErrorTarget = Pick<Window, 'addEventListener' | 'removeEventListener'>

/** At most this many errors are held: a page stuck in an error loop must not grow memory until Sentry loads. */
export const EARLY_ERROR_LIMIT = 20

export function startEarlyErrorQueue(target: ErrorTarget, limit = EARLY_ERROR_LIMIT): EarlyErrorQueue {
  const held: { error: unknown; kind: EarlyErrorKind }[] = []
  // A cross-origin script error has no `error` object, only the message « Script error. ».
  const onError = (event: ErrorEvent) => {
    if (held.length < limit) held.push({ error: event.error ?? event.message, kind: 'onerror' })
  }
  const onRejection = (event: PromiseRejectionEvent) => {
    if (held.length < limit) held.push({ error: event.reason, kind: 'onunhandledrejection' })
  }
  target.addEventListener('error', onError)
  target.addEventListener('unhandledrejection', onRejection)

  let drained = false
  return {
    drain(capture) {
      if (drained) return
      drained = true
      target.removeEventListener('error', onError)
      target.removeEventListener('unhandledrejection', onRejection)
      for (const { error, kind } of held.splice(0)) capture(error, kind)
    },
  }
}
