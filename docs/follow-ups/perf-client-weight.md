# Speed PR-1 — client weight (`perf/client-weight`, 2026-11-13)

## 1. MEDIUM — the Supabase browser client is in every public page's first load (pick 6, left out)

- **What:** `@supabase/*` is about 60 KB per page by the analyzer's estimate (roughly 40–45 KB gzip), on all 18 public pages.
  - On 7 pages `FavoriteButton` needs it at load: its mount effect calls `auth.getUser()` and reads the favourite. Those are `/marche/produits`, `/marche/services`, `/categories/[slug]`, `/freelance/[id]`, `/boutique/[id]`, `/produits/[id]` and `/services/[id]`.
  - On the other 11 (home, the 3 `devenir-vendeur` pages, the 7 marketing pages) only the language switch uses it, on click: `LanguageToggle` and `useLangSwitch` write `profiles.language` for a signed-in viewer.
- **Why deferred:** the brief allowed pick 6 only if nothing on a public page needs the client at load, and `FavoriteButton` does.
- **Where it lives:**
  - `src/components/FavoriteButton.tsx` (the mount effect);
  - `src/components/layout/LanguageToggle.tsx` and `src/components/landing/useLangSwitch.ts` (the click handlers);
  - `src/lib/supabase/client.ts`.
- **Trigger:** the founder's choice, Decision 2 in PR #366:
  - **(A)** `await import('@/lib/supabase/client')` inside the two click handlers: about −40 KB on the 11 pages;
  - **(B)** also inside `FavoriteButton`'s mount effect, which takes it off all 18 pages. The heart already starts in a loading state, so its filled state comes slightly later;
  - **(C)** keep it as it is.

## 2. LOW — local Lighthouse cannot be trusted on image pages on this machine

- **What:** the dev PC's DNS sometimes resolves `xggomcitqrkaylqezjjz.supabase.co` to NAT64 addresses (`64:ff9b::…`). Next's image optimiser then refuses the upstream as a private IP (`"url" parameter is not allowed`, 400; the server log says `hostname resolved to private IP`).
  - When it happens, the product images never load. The LCP element falls back to the cookie-banner text and the page scores better than it really is.
  - It happened in PR-1's baseline runs and not in its after runs, so LCP and score on `/marche/produits`, `/boutique/[id]` and `/produits/[id]` could not be compared there.
- **Why deferred:** an environment problem, not code. Never "fix" it with `images.dangerouslyAllowLocalIP`.
- **Where it lives:** the local measurement setup (Lighthouse against `next start`).
- **Trigger:** PR-2 (images) measures image pages.
  - Before each Lighthouse batch, check that no `/_next/image` request returns 400.
  - Or measure the image pages on the Vercel preview.

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
