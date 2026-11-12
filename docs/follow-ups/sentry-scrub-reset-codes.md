# Sentry URL-token scrub — leftovers (`fix/sentry-scrub-reset-codes`, 2026-11-12)

## 1. `event.logentry` and `exception.values[].mechanism.data` are not scrubbed

- **What:** `scrubPII` walks `message`, exception values and frames, request, breadcrumbs, extra, contexts, tags, spans
  and user, but not `logentry` (`message` + `params` of a parameterised `captureMessage`) nor `mechanism.data`. A URL
  placed there would keep its token / code value.
- **Why deferred:** nothing in the app calls `captureMessage` with params today, and the SDK's mechanism data holds
  handler names, not URLs. Pre-existing gap, outside audit H5's listed places (review of #359).
- **Where it lives:** `src/lib/sentry/scrubber.ts` (`scrubPII`).
- **Trigger:** the first `Sentry.captureMessage(…, { params })` or `logger.*` call, or a Sentry event seen carrying a
  URL in either field.
