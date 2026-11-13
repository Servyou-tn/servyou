// Browser Sentry, ERRORS ONLY (speed PR-1, founder pick 1, 2026-11-13). Loaded as its own chunk by
// src/instrumentation-client.ts once the page has loaded and the browser is idle, so the SDK is off the critical path.
// Server and edge Sentry are unchanged (src/sentry.server.config.ts, src/sentry.edge.config.ts).
//
// No performance tracing: no tracesSampleRate (so no transaction is sampled) and no BrowserTracing integration (so nothing
// instruments page loads, navigations, fetch timings or web vitals). No release-health session either: BrowserSession sent
// a « session » envelope on EVERY page view, one /monitoring call (a Vercel function) per view — errors only means only
// errors leave the browser. @sentry/nextjs still adds its Next.js pieces: the
// /monitoring tunnel and the release (both injected into instrumentation-client by withSentryConfig), stack-frame
// normalisation, and the NEXT_REDIRECT filter.
import * as Sentry from '@sentry/nextjs'
import { scrubPII } from '@/lib/sentry/scrubber'
import type { EarlyErrorQueue } from '@/lib/sentry/early-errors'

/** Default integrations dropped in the browser: performance tracing, and the per-page-view release-health session. */
const DROPPED_INTEGRATIONS = new Set(['BrowserTracing', 'BrowserSession'])

export function initClientSentry(dsn: string, queue: EarlyErrorQueue): void {
  Sentry.init({
    dsn,
    integrations: (defaults) => defaults.filter((integration) => !DROPPED_INTEGRATIONS.has(integration.name)),
    // Session replay disabled — under Tunisian GDPR-equivalent law it needs an explicit
    // user-consent flow, deferred to post-launch. No replay integration is added, and
    // the rates are pinned to 0 as belt-and-suspenders (these are browser-only options).
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
    environment: process.env.NODE_ENV,
    beforeSend(event) {
      return scrubPII(event)
    },
    // No transaction is sent any more; kept so one could never leave unscrubbed.
    beforeSendTransaction(event) {
      return scrubPII(event)
    },
  })
  // Same task as init: Sentry's global handlers are now installed, so the queue hands over with no gap and no duplicate.
  // The mechanism types Sentry's own GlobalHandlers use (@sentry/browser 10, globalhandlers.js), so replayed errors group
  // and filter exactly like live ones.
  queue.drain((error, kind) =>
    Sentry.captureException(error, { mechanism: { type: `auto.browser.global_handlers.${kind}`, handled: false } }),
  )
}
