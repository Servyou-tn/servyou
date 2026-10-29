import type { Breadcrumb, Event } from '@sentry/nextjs'

// PII redaction applied in Sentry's beforeSend / beforeSendTransaction across all runtimes (server, edge, client).
// A defensive best-effort filter, NOT a perfect PII detector — it strips what Servyou is known to carry before the
// event leaves the app.
//
// Rationale: Tunisian Loi 2004-63 (GDPR-equivalent) requires data minimization, especially before the cross-border
// transfer to Sentry's processors.
//
// Layers (pre-launch audit pass 2 widened the first two and added the rest):
//   1. KEY names — a known PII field (`delivery_phone`, `deliveryName`, `email`…) is replaced wholesale, matched on the
//      key lower-cased with `_` / `-` removed, so snake_case columns and camelCase action fields both hit.
//   2. Auth material — `request.cookies` and the `cookie` / `authorization` / `x-supabase-*` request HEADERS are
//      deleted: Next's captureRequestError sends the raw request headers, and the Cookie header carries the Supabase
//      access + refresh token (sb-*).
//   3. VALUE patterns in every remaining string — emails (also `%40`-encoded, e.g. /verifier-email?email=…), Tunisian
//      phones (+216 / 00216 / a standalone 8-digit number starting 2-9), JWTs and bearer tokens.
//   4. Where — request data / url / query string / headers, message, exception values, breadcrumbs, extra, contexts,
//      tags.
//   5. CONSOLE breadcrumbs keep only their first argument (the `[scope] label` every console call here starts with):
//      the later arguments are error.message / code / details, and Postgres `details` quotes row values (a delivery
//      address cannot be caught by a pattern).
//
// Imported as `import type` only — this module pulls in NO Sentry runtime code, so it stays a pure, unit-testable
// function with no SDK side effects.

const SENSITIVE_FIELDS = [
  'password',
  'phone',
  'deliveryaddress',
  'deliveryphone',
  'deliveryname',
  'deliverystreet',
  'quartier',
  'buyernote',
  'cancellationreason',
  'adminnote',
  'email',
  'address',
  'description', // disputes & reports — may carry PII
  'fullname',
  'dateofbirth',
  'token',
  'secret',
  'authorization',
  'cookie',
]

const REDACTED = '[REDACTED]'

// Every pattern is BOUNDED (no unbounded `+` before a literal): beforeSend runs synchronously on every error and
// transaction, and an unbounded email pattern was quadratic — a 50k-character token / base64 run took ~7 s (review of
// #242). No lookbehind either: Safari < 16.4 cannot parse it, and this module ships in the client entry chunk.
// [pattern, replacement] — a `$1` keeps the boundary character a standalone-number pattern had to consume.
const VALUE_PATTERNS: [RegExp, string][] = [
  // Emails, including the %40-encoded form a URL carries. The last label must be letters, so `next@16.4.3` is kept.
  [/[\w.+-]{1,64}(?:@|%40)(?:[\w-]{1,63}\.){1,8}[a-z]{2,24}\b/gi, REDACTED],
  // JWTs (header.payload.signature, base64url) and bearer tokens.
  [/\beyJ[\w-]{8,4096}\.[\w-]{8,4096}\.[\w-]{8,4096}/g, REDACTED],
  [/\bbearer\s+[\w.~+/=-]{16,4096}/gi, REDACTED],
  // Tunisian phones: +216 / 00216 prefixes (any grouping).
  [/(?:\+|00)216[\s.-]?\d{2}[\s.-]?\d{3}[\s.-]?\d{3}/g, REDACTED],
  // A standalone 8-digit number starting 2-9, bare or grouped « 98 765 432 » / « 98-765-432 » / « 98.765.432 » — not
  // glued to letters, digits, a hyphen or a dot, so uuid segments, ids and decimals are left alone.
  [/(^|[^\w.-])([2-9]\d(?:[\s.-]?\d{3}){2})(?![\w-]|\.\d)/g, `$1${REDACTED}`],
]

// Strings longer than this are cut before any pattern runs: an error report never needs more, and it bounds the
// work beforeSend can do on one field.
export const MAX_SCRUBBED_STRING = 20_000

const normaliseKey = (k: string) => k.toLowerCase().replace(/[_-]/g, '')
const isSensitiveKey = (k: string) => {
  const key = normaliseKey(k)
  return SENSITIVE_FIELDS.some((s) => key.includes(s))
}

export function redactString(value: string): string {
  const bounded = value.length > MAX_SCRUBBED_STRING ? `${value.slice(0, MAX_SCRUBBED_STRING)}…[TRUNCATED]` : value
  return VALUE_PATTERNS.reduce((s, [pattern, replacement]) => s.replace(pattern, replacement), bounded)
}

// A raw string body that is JSON (a server-action payload) is parsed so its KEYS are redacted too, not just patterns.
function redactBody(value: unknown): unknown {
  if (typeof value === 'string') {
    const trimmed = value.trimStart()
    if ((trimmed.startsWith('{') || trimmed.startsWith('[')) && value.length <= MAX_SCRUBBED_STRING) {
      try {
        return JSON.stringify(redact(JSON.parse(value)))
      } catch {
        // not JSON after all — patterns only
      }
    }
  }
  return redact(value)
}

function redact(value: unknown): unknown {
  if (typeof value === 'string') return redactString(value)
  if (value === null || typeof value !== 'object') return value
  if (Array.isArray(value)) return value.map(redact)
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    out[k] = isSensitiveKey(k) ? REDACTED : redact(v)
  }
  return out
}

const AUTH_HEADER = /^(cookie|authorization|x-supabase.*|x-sb-.*)$/i

function scrubHeaders(headers: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(headers)) {
    if (AUTH_HEADER.test(k)) continue
    out[k] = typeof v === 'string' ? redactString(v) : v
  }
  return out
}

function scrubBreadcrumb(crumb: Breadcrumb): Breadcrumb {
  if (crumb.category === 'console') {
    // Only a string first argument is a label. Anything else (console.error(errObj)) is dropped, never the joined
    // message: that would carry the same row values.
    const args = (crumb.data as { arguments?: unknown[] } | undefined)?.arguments
    const label = Array.isArray(args) && typeof args[0] === 'string' ? args[0] : undefined
    return { ...crumb, message: label === undefined ? undefined : redactString(label), data: undefined }
  }
  return {
    ...crumb,
    message: typeof crumb.message === 'string' ? redactString(crumb.message) : crumb.message,
    data: crumb.data ? (redact(crumb.data) as Breadcrumb['data']) : crumb.data,
  }
}

// Generic over the event subtype so it satisfies both beforeSend (ErrorEvent) and beforeSendTransaction
// (TransactionEvent). Mutates and returns the same event object, which is what the Sentry hooks expect back.
export function scrubPII<T extends Event>(event: T): T {
  const request = event.request
  if (request) {
    if (request.data !== undefined) request.data = redactBody(request.data)
    if (request.env) delete request.env
    // Sentry v10 types cookies as Record<string,string>: delete rather than assign a marker string.
    if (request.cookies) delete request.cookies
    if (request.headers) request.headers = scrubHeaders(request.headers)
    if (typeof request.url === 'string') request.url = redactString(request.url)
    if (request.query_string !== undefined) {
      request.query_string = redact(request.query_string) as typeof request.query_string
    }
  }
  if (typeof event.message === 'string') event.message = redactString(event.message)
  for (const ex of event.exception?.values ?? []) {
    if (typeof ex.value === 'string') ex.value = redactString(ex.value)
  }
  if (event.breadcrumbs) event.breadcrumbs = event.breadcrumbs.map(scrubBreadcrumb)
  if (event.extra) event.extra = redact(event.extra) as Record<string, unknown>
  if (event.contexts) event.contexts = redact(event.contexts) as typeof event.contexts
  if (event.tags) event.tags = redact(event.tags) as typeof event.tags
  // Transactions: span descriptions / data carry URLs and query strings (outgoing Supabase REST calls, search text).
  for (const span of event.spans ?? []) {
    if (typeof span.description === 'string') span.description = redactString(span.description)
    if (span.data) span.data = redact(span.data) as typeof span.data
  }
  // No setUser anywhere today; if one is ever added, its email / ip / username must not travel.
  if (event.user) event.user = redact(event.user) as typeof event.user
  return event
}
