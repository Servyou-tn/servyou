# Production sign-in outage — Supabase free-tier auto-pause (diagnosed 2026-09-01)

## Free-tier Supabase auto-pause on inactivity presents as "wrong password," with nothing logged anywhere obvious — the diagnostic path that actually worked

- **What:** production sign-in failed for every account with the generic
  `'signin.errors.invalidCredentials'` message ("E-mail ou mot de passe incorrect."). The Supabase
  project (`xggomcitqrkaylqezjjz`) had gone to `INACTIVE` (paused) — almost certainly the free-tier
  auto-pause after a period of no API activity, plausible given the ~2.5-month dead deploy pipeline
  documented above. A paused project is unreachable, and `SigninForm.tsx`'s `signInWithPassword`
  call maps *every* error it can receive — wrong password, unknown email, unconfirmed email, or a
  bare network failure — to that one identical message (see the next entry). Nothing about "the
  project is paused" surfaces anywhere a developer would naturally look first.
- **The diagnostic path that actually worked:** `signInWithPassword` runs entirely client-side in
  the browser (`SigninForm.tsx:60`) — it never touches a Vercel serverless function, so it is
  invisible to both Vercel's runtime logs and Sentry by design (the `if (error)` branch never calls
  `console.error` or any Sentry capture; see next entry). What *did* show the problem was
  `src/middleware.ts`, which runs server-side on every request and also calls Supabase — Vercel's
  `get_runtime_errors` showed a fresh cluster the moment the paused project was hit:
  `TypeError: fetch failed` with cause `Error: getaddrinfo ENOTFOUND xggomcitqrkaylqezjjz.supabase.co`
  (62 occurrences), `AuthRetryableFetchError: fetch failed` (10 occurrences), and middleware
  invocations killed after Vercel's 25s function limit trying to reach the paused project. The DNS
  failure was the first concrete signal in the whole investigation — everything before it (checking
  `NEXT_PUBLIC_SUPABASE_URL`, comparing env vars) was necessary elimination but came up clean,
  because none of it was the actual fault.
- **Why this matters going forward:** any silent, no-activity-triggered infrastructure state change
  (pause, key rotation, quota exhaustion) on a dependency the client talks to directly will produce
  this same blind spot — a generic user-facing error with no signal in the app's own observability,
  because the failing call never passes through server code. The fix isn't specific to Supabase's
  auto-pause; it's specific to *client-side-only* calls to any external service.
- **Trigger:** already fired. Logged so the next time production auth or any other client-direct
  external call fails mysteriously, "check whether the backing service itself is reachable, not just
  whether the app's config is correct" is the second thing tried, not the last.

## `SigninForm` collapses connectivity failures into the same anti-enumeration message as genuine auth failures

- **What:** `SigninForm.tsx:65-71` treats every error `signInWithPassword` can return as
  equivalent and shows one message (`'signin.errors.invalidCredentials'`). That's the correct,
  deliberate design for wrong-password, unknown-email, and unconfirmed-email — those three *must*
  stay indistinguishable from each other, or the form becomes an account-enumeration oracle.
- **Why a connectivity failure doesn't belong in that same bucket:** enumeration risk is about
  leaking whether a *given email* has an account. Whether Supabase itself is reachable has nothing
  to do with any specific email — telling every user "we can't reach our auth service right now" leaks
  no per-account information at all. Folding it into the same generic message doesn't protect
  anything; it just actively misleads every affected user into thinking their password is wrong
  during an outage, which sends them into the password-reset flow instead of "try again shortly" —
  the wrong remediation, at the exact moment volume to support/reset is worst.
- **Not fixed here:** logged, not fixed — this is a small, self-contained UX/error-handling change
  (distinguish a thrown/network-shaped failure from a returned `AuthApiError`, keep the three
  enumeration-sensitive cases merged, give connectivity failures their own message), not something
  to fold into an unrelated diagnosis session.
- **Trigger:** its own small PR. Suggested shape: Supabase JS distinguishes `AuthApiError` (has a
  `status` from the API — genuine auth rejection) from a thrown/network-level failure (no response
  at all) — branch on that distinction rather than introducing new state, and give the network case
  its own `t()` string (e.g. "Impossible de contacter le serveur, réessayez dans un instant.")
  instead of the credentials message.
