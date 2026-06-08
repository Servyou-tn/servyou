// Server runtime (Node.js) Sentry init — covers Server Components, Route Handlers, and
// Server Actions. Loaded by src/instrumentation.ts register() when NEXT_RUNTIME='nodejs'.
//
// Inert without a DSN: if NEXT_PUBLIC_SENTRY_DSN is unset (dev, CI, or pre-activation),
// Sentry.init is skipped and the app behaves exactly as today.
//
// Note: session-replay sample rates are intentionally NOT set here — replay is a
// browser-only concern (instrumentation-client.ts). They are not valid Node options.
import * as Sentry from '@sentry/nextjs'
import { scrubPII } from '@/lib/sentry/scrubber'

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN

if (dsn) {
  Sentry.init({
    dsn,
    // Errors are always captured (100%); performance traces sampled to 10% in
    // production, 100% in development.
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    environment: process.env.NODE_ENV,
    // PII scrubbing — strip known sensitive fields before any event leaves the app.
    beforeSend(event) {
      return scrubPII(event)
    },
    beforeSendTransaction(event) {
      return scrubPII(event)
    },
  })
}
