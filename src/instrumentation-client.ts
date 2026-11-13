// Client (browser) runtime instrumentation. In Sentry v10 + Next.js 16 this file (Next's native client-instrumentation hook)
// runs before hydration on every page; the older sentry.client.config.ts is no longer used.
//
// Sentry in the browser is ERRORS ONLY and starts AFTER HYDRATION (speed PR-1, founder pick 1, 2026-11-13). This file used
// to import @sentry/nextjs and call Sentry.init, which put the whole browser SDK (about half of it performance tracing) on
// the critical path of every page. Now it imports nothing from Sentry:
//   • a tiny queue holds uncaught errors / unhandled rejections from the first moment (src/lib/sentry/early-errors.ts);
//   • once the page has loaded and the browser is idle, src/lib/sentry/client-init.ts is loaded as its own chunk, calls
//     Sentry.init without tracing, and replays the queue;
//   • `onRouterTransitionStart` (navigation spans) is no longer exported: there is no tracing to attach them to.
// withSentryConfig still injects its build values (release, /monitoring tunnel) into THIS module, on the global object, where
// the deferred init reads them. Inert without a DSN. Server and edge Sentry are unchanged.
import { enableZodJitless } from '@/lib/security/zod-jitless'
import { startEarlyErrorQueue } from '@/lib/sentry/early-errors'

// zod's CSP switch (no eval probe), set without importing zod — see src/lib/security/zod-jitless.ts. This file runs before
// hydration, so before any client module builds a schema.
enableZodJitless()

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN

if (dsn) {
  const queue = startEarlyErrorQueue(window)
  const start = () => {
    import('@/lib/sentry/client-init')
      .then(({ initClientSentry }) => initClientSentry(dsn, queue))
      .catch(() => {
        // The chunk could not load (offline, blocked): there is no Sentry to report to, and nothing else to do.
      })
  }
  // After `load` (every page script has run and hydration has started), then when the main thread is idle — at most 4 s
  // later. Safari has no requestIdleCallback: a plain timeout still lets the current work finish first.
  const whenIdle = () => {
    if (typeof window.requestIdleCallback === 'function') window.requestIdleCallback(start, { timeout: 4000 })
    else window.setTimeout(start, 1)
  }
  if (document.readyState === 'complete') whenIdle()
  else window.addEventListener('load', whenIdle, { once: true })
}
