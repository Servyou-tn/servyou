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

const VALUE_PATTERNS: RegExp[] = [
  // Emails, including the %40-encoded form a URL carries.
  /[\w.+-]+(?:@|%40)[\w-]+(?:\.[\w-]+)+/gi,
  // JWTs (header.payload.signature, base64url) and bearer tokens.
  /\beyJ[\w-]{8,}\.[\w-]{8,}\.[\w-]{8,}/g,
  /\bbearer\s+[\w.~+/=-]{16,}/gi,
  // Tunisian phones: +216 / 00216 prefixes (any grouping), or a standalone 8-digit number starting 2-9 — not when
  // glued to letters, digits or a hyphen, so uuid segments and ids are left alone.
  /(?:\+|00)216[\s.-]?\d{2}[\s.-]?\d{3}[\s.-]?\d{3}/g,
  /(?<![\w-])[2-9]\d{7}(?![\w-])/g,
]

const normaliseKey = (k: string) => k.toLowerCase().replace(/[_-]/g, '')
const isSensitiveKey = (k: string) => {
  const key = normaliseKey(k)
  return SENSITIVE_FIELDS.some((s) => key.includes(s))
}

export function redactString(value: string): string {
  return VALUE_PATTERNS.reduce((s, pattern) => s.replace(pattern, REDACTED), value)
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
    const args = (crumb.data as { arguments?: unknown[] } | undefined)?.arguments
    const label = Array.isArray(args) && typeof args[0] === 'string' ? args[0] : crumb.message
    return { ...crumb, message: typeof label === 'string' ? redactString(label) : undefined, data: undefined }
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
    if (request.data !== undefined) request.data = redact(request.data)
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
  return event
}
