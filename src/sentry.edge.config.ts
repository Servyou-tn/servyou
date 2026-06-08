// Edge runtime Sentry init — covers src/middleware.ts (the suspended-user gate) and any
// edge route handlers. Loaded by src/instrumentation.ts register() when
// NEXT_RUNTIME='edge'. Same shape as the server config (replay is browser-only and not
// configured here). Inert without a DSN.
import * as Sentry from '@sentry/nextjs'
import { scrubPII } from '@/lib/sentry/scrubber'

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN

if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    environment: process.env.NODE_ENV,
    beforeSend(event) {
      return scrubPII(event)
    },
    beforeSendTransaction(event) {
      return scrubPII(event)
    },
  })
}
