// Next.js 16 instrumentation entry point. Lives in src/ because this project uses a
// src/ directory (same rule as src/middleware.ts). register() runs once per runtime at
// startup and loads the matching Sentry config. onRequestError forwards server-side
// rendering / route errors to Sentry (captureRequestError — the current v10 API).
import * as Sentry from '@sentry/nextjs'

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config')
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config')
  }
}

export const onRequestError = Sentry.captureRequestError
