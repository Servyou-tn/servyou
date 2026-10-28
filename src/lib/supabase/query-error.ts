import * as Sentry from '@sentry/nextjs'
import type { PostgrestError } from '@supabase/supabase-js'

// Loader error surfacing (docs/design/loader-error-surfacing-plan.md). A failed Supabase query used to be
// turned into « not found », an empty list or a false « 0 » — which is what hid the six-week PGRST201
// outage. The convention:
//   • the MAIN query of a page fails  → failQuery(): log + throw. A detail/form page lets the root
//     error.tsx show it (and Next's onRequestError reports it); a list page wraps its loader in settle().
//   • a SECONDARY query fails (related items, counts, sidebars) → reportQueryError() and keep the
//     partial display.
//   • « no such row » is NOT a failure: isNoRowLike() keeps junk URLs a plain 404.
//
// Privacy: error.details / error.hint go to the SERVER LOG only, never to Sentry — Postgres puts row
// values there and scrubPII only redacts by field name. Sentry gets the message and the code.
// Sentry is a no-op when no DSN is configured (src/sentry.*.config.ts), so the logs and the error
// states work regardless.

type ErrorLike = Pick<PostgrestError, 'message'> & Partial<Pick<PostgrestError, 'code' | 'details' | 'hint'>>

export class QueryError extends Error {
  readonly where: string
  readonly code?: string

  constructor(where: string, message: string, code?: string) {
    super(`${where}: ${message}`)
    this.name = 'QueryError'
    this.where = where
    this.code = code
  }
}

function describe(err: ErrorLike | Error): { message: string; code?: string; details?: string } {
  const e = err as { message?: string; code?: unknown; details?: unknown }
  return {
    message: e.message ?? String(err),
    code: typeof e.code === 'string' ? e.code : undefined,
    details: typeof e.details === 'string' ? e.details : undefined,
  }
}

// Never the raw object: a PostgrestError extends Error with non-enumerable properties and serialises to {}.
function logQueryError(where: string, err: ErrorLike | Error): ReturnType<typeof describe> {
  const f = describe(err)
  console.error(`[${where}] query failed:`, f.message, f.code, f.details)
  return f
}

/** Main-query failure: log (server only) and throw. Never returns. */
export function failQuery(where: string, err: ErrorLike | Error): never {
  const f = logQueryError(where, err)
  throw new QueryError(where, f.message, f.code)
}

function sendToSentry(where: string, message: string, code?: string): void {
  Sentry.captureException(new Error(message), { tags: code ? { where, code } : { where } })
}

/** Deliberate partial-data display: log and send the message + code (no details/hint) to Sentry. */
export function reportQueryError(where: string, err: ErrorLike | Error): void {
  const f = logQueryError(where, err)
  sendToSentry(where, `${where}: ${f.message}`, f.code)
}

// 22P02 = invalid_text_representation (a junk uuid in the URL); PGRST116 = no row from .single().
const NO_ROW_CODES = new Set(['22P02', 'PGRST116'])

/** True when the « error » just means « no such row » — the page should 404, and Sentry should stay quiet. */
export function isNoRowLike(err: { code?: string | null } | null | undefined): boolean {
  return !!err?.code && NO_ROW_CODES.has(err.code)
}

export type Settled<T> = { ok: true; data: T } | { ok: false }

/**
 * Wraps a LIST page's loader so a failure becomes an inline error state instead of a crash. Catches
 * ONLY QueryError (reporting it); everything else — notFound(), redirect(), a genuine bug — re-throws.
 */
export async function settle<T>(where: string, promise: Promise<T>): Promise<Settled<T>> {
  try {
    return { ok: true, data: await promise }
  } catch (e) {
    if (e instanceof QueryError) {
      // failQuery already logged it (details included) and the message already names the loader, so
      // this only reports: no second log line, no doubled « where: where: » prefix. `where` is the tag.
      sendToSentry(where, e.message, e.code)
      return { ok: false }
    }
    throw e
  }
}
