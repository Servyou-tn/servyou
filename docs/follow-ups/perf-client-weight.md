# Speed PR-1 — client weight (`perf/client-weight`, 2026-11-13)

## 1. MEDIUM — the Supabase browser client is still in the first load of the 7 pages with a favourite heart (pick 6, option B open)

- **What:** the Supabase browser client (`@supabase/ssr` + `supabase-js`) is one 61.7 KB gzip chunk.
  - **Done in PR #366 (architect, option A):** `LanguageToggle` and `useLangSwitch` load it on click, so it left the first load of the 11 pages without a heart: home, the 3 `devenir-vendeur` pages and the 7 marketing pages. Those pages lost about 62 KB each.
  - **Still at load on 7 pages:** `FavoriteButton`'s mount effect calls `auth.getUser()` and reads the favourite. Those are `/marche/produits`, `/marche/services`, `/categories/[slug]`, `/freelance/[id]`, `/boutique/[id]`, `/produits/[id]` and `/services/[id]`. Since option A the client sits in its own chunk there, which costs them about +0.3 KB.
- **Why deferred:** the architect chose A only; the heart pages stay as they are.
- **Where it lives:** `src/components/FavoriteButton.tsx` (the mount effect) and `src/lib/supabase/client.ts`.
- **Trigger:** a later speed PR that wants about −60 KB on the 7 heart pages. Do (B): `await import('@/lib/supabase/client')` inside `FavoriteButton`'s mount effect. The heart already starts in a loading state, so only its filled state would come slightly later. Lower those 7 budgets in the same PR.

## 2. LOW — local Lighthouse on this machine: image pages break (NAT64) and TBT is noisy

- **What:** the dev PC's DNS sometimes resolves `xggomcitqrkaylqezjjz.supabase.co` to NAT64 addresses (`64:ff9b::…`). Next's image optimiser then refuses the upstream as a private IP (`"url" parameter is not allowed`, 400; the server log says `hostname resolved to private IP`).
  - When it happens, the product images never load. The LCP element falls back to the cookie-banner text and the page scores better than it really is.
  - It happened in PR-1's baseline runs and not in its after runs, so LCP and score on `/marche/produits`, `/boutique/[id]` and `/produits/[id]` could not be compared there.
- **Why deferred:** an environment problem, not code. Never "fix" it with `images.dangerouslyAllowLocalIP`.
- **Where it lives:** the local measurement setup (Lighthouse against `next start`).
- **Trigger:** PR-2 (images) measures image pages.
  - Before each Lighthouse batch, check that no `/_next/image` request returns 400.
  - Or measure the image pages on the Vercel preview.
- **Same machine, second problem: TBT is noisy here.** The dev PC carries 50–60% background CPU (editor, MCP servers, antivirus), and Lighthouse's simulated throttling multiplies real CPU time.
  - Home's TBT ranged 1005–2153 ms over 6 runs of one build.
  - The swing is in style & layout (0.8–2.3 s per run on every build). Script evaluation stays steady, so check `mainthread-work-breakdown` before reading a TBT change as a JS change.
  - For PR-2/PR-3: run more than 3 runs, or measure on a quiet machine.

## 3. LOW — browser Sentry events from previews are labelled `production`

- **What:** `client-init.ts` (and the server and edge configs, unchanged) set `environment: process.env.NODE_ENV`, which is `production` on every Vercel build, preview included. CSP reports already use `VERCEL_ENV`, so they say `preview`.
- **Why deferred:** pre-existing behaviour, copied unchanged from the old `instrumentation-client.ts`. Changing it touches the server and edge configs, which this PR keeps unchanged.
- **Where it lives:** `src/lib/sentry/client-init.ts`, `src/sentry.server.config.ts`, `src/sentry.edge.config.ts`.
- **Trigger:** when Sentry alerts or dashboards filter by environment. Use `process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV`, or drop the option and let `@sentry/nextjs` pick the Vercel environment itself.

## 4. LOW — early errors are dropped silently when the Sentry chunk cannot load

- **What:** if the deferred `client-init` chunk fails to load (offline, an ad blocker on `/_next/static`) or `Sentry.init` throws, the queue is never drained.
  - Its two window listeners stay for the life of the page, holding at most 20 errors, and nothing is reported.
  - This is the intended degraded mode: there is no Sentry to report to. But there is no console hint either.
- **Why deferred:** no user impact; a hint would only help debugging.
- **Where it lives:** `src/instrumentation-client.ts` (the `.catch`), `src/lib/sentry/early-errors.ts`.
- **Trigger:** if Sentry ever shows a gap that nothing else explains. Then add a `console.warn` in the catch.

## 5. LOW — withSentryConfig still injects the route manifest into every page

- **What:** `withSentryConfig` injects `_sentryRouteManifest` (the app's route list, used to name navigation transactions) into `instrumentation-client`. It stays in every page's first load, under 1 KB, although no transaction is sent any more.
- **Why deferred:** it is a build-time injection by `@sentry/nextjs` with no documented switch for Turbopack. The gain is under 1 KB.
- **Where it lives:** `node_modules/@sentry/nextjs/build/cjs/config/turbopack/generateValueInjectionRules.js`, `next.config.ts` (`withSentryConfig` options).
- **Trigger:** a `@sentry/nextjs` upgrade that adds an option to skip it, or a page within 1 KB of its budget.
