import type { Event } from '@sentry/nextjs'

// Field-name-based PII redaction applied in Sentry's beforeSend / beforeSendTransaction
// across all runtimes (server, edge, client). Case-insensitive substring match on the
// explicit PII columns Servyou collects; cookies are redacted wholesale. This is a
// defensive best-effort filter, NOT a perfect PII detector — it strips known field
// names before the event leaves the app.
//
// Rationale: Tunisian Loi 2004-63 (GDPR-equivalent) requires data minimization,
// especially before the cross-border transfer to Sentry's processors. We strip these
// fields rather than ship raw request bodies / context to a third party.
//
// Imported as `import type` only — this module pulls in NO Sentry runtime code, so it
// stays a pure, unit-testable function with no SDK side effects.
const SENSITIVE_FIELDS = [
  'password',
  'phone',
  'delivery_address',
  'delivery_phone',
  'delivery_name',
  'buyer_note',
  'cancellation_reason',
  'admin_note',
  'email',
  'address',
  'description', // disputes & reports — may carry PII
]

function redact(value: unknown): unknown {
  if (value === null || typeof value !== 'object') return value
  if (Array.isArray(value)) return value.map(redact)
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    const lower = k.toLowerCase()
    if (SENSITIVE_FIELDS.some(s => lower.includes(s))) {
      out[k] = '[REDACTED]'
    } else {
      out[k] = redact(v)
    }
  }
  return out
}

// Generic over the event subtype so it satisfies both beforeSend (ErrorEvent) and
// beforeSendTransaction (TransactionEvent). Mutates and returns the same event object,
// which is what the Sentry hooks expect back.
export function scrubPII<T extends Event>(event: T): T {
  if (event.request?.data) {
    event.request.data = redact(event.request.data)
  }
  // Cookies are dropped wholesale — they carry the Supabase auth token (sb-*) and any
  // other client cookies; none of it belongs in an error report. (Sentry v10 types
  // cookies as Record<string,string>, so we delete rather than assign a marker string.)
  if (event.request && event.request.cookies) {
    delete event.request.cookies
  }
  if (event.extra) {
    event.extra = redact(event.extra) as Record<string, unknown>
  }
  return event
}
