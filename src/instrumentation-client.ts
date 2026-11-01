// Client (browser) runtime Sentry init — covers Client Components and browser errors.
// In Sentry v10 + Next.js 16 this file (Next's native client-instrumentation hook) is
// what the SDK auto-loads; the older sentry.client.config.ts is no longer used. Inert
// without a DSN.
import * as Sentry from '@sentry/nextjs'
import { config as zodConfig } from 'zod/v4/core'
import { scrubPII } from '@/lib/sentry/scrubber'

// zod 4 probes `Function("")` when it builds an object schema, to decide whether it may compile a faster parser. The
// throw is caught, but the enforced CSP (no 'unsafe-eval', src/lib/security/headers.ts) still reports it as a blocked
// eval on every page that ships a schema to the browser (FavoriteHeart → lib/favorites/targets.ts, the service wizard…).
// `jitless` skips the probe — zod's documented switch for strict CSPs; parsing stays the same, only the compiled fast
// path is dropped. This file runs before hydration, so before any client module builds a schema.
zodConfig({ jitless: true })

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN

if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    // Session replay disabled — under Tunisian GDPR-equivalent law it needs an explicit
    // user-consent flow, deferred to post-launch. No replay integration is added, and
    // the rates are pinned to 0 as belt-and-suspenders (these are browser-only options).
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
    environment: process.env.NODE_ENV,
    beforeSend(event) {
      return scrubPII(event)
    },
    beforeSendTransaction(event) {
      return scrubPII(event)
    },
  })
}

// Instruments client-side App Router navigations (Next.js 15.3+/16). Safe to export
// even with no DSN — it's a no-op until the client is initialized.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
