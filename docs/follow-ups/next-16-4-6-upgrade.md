# Next.js 16.4.6 upgrade — build deprecations (`chore/next-16-4-6`, 2026-11-18)

The 16.4.6 build (`npm run build`, exit 0) prints three deprecation notices. None is new with this PR and none is caused by
it: the `middleware` notice is Next 16's own, and the two Sentry ones come from `@sentry/nextjs` 10.75.2, which this PR
does not change. Ranked by risk of a future break.

## 1. MEDIUM — `withSentryConfig` must be imported from `@sentry/nextjs/config` before Sentry v11

- **What:** the build prints « Importing `withSentryConfig` from `@sentry/nextjs` is deprecated and will stop working in v11.
  Import it from `@sentry/nextjs/config` instead ». A Sentry v11 bump without this one-line import change breaks `next.config.ts`,
  which means every build.
- **Why deferred:** this PR changes only `next` and `eslint-config-next` (one focus). The import change is not a version bump.
- **Where it lives:** `next.config.ts` line 2.
- **Trigger:** the next `@sentry/nextjs` bump, or any Sentry config PR. Do it before moving to v11.

## 2. LOW — `middleware.ts` → `proxy.ts` (Next 16 file convention)

- **What:** « The "middleware" file convention is deprecated. Please use "proxy" instead. » `src/middleware.ts` still works on
  16.4.6, and the build lists it as `ƒ Proxy (Middleware)`.
- **Why deferred:** the rename touches the file that holds the suspension gate, maintenance mode, K2/K3 and the auth-cookie
  sweep, plus the tests that pin its matcher (`src/__tests__/middleware-suspension.test.ts` and others). That is its own
  reviewed PR, not part of a security bump. The brief also ruled out codemods (the notice suggests
  `npx @next/codemod@canary middleware-to-proxy`).
- **Where it lives:** `src/middleware.ts`, plus the comments in `next.config.ts` that name it.
- **Trigger:** before the Next major that drops the `middleware` convention, or a dedicated chore PR.
  Note: a `proxy.ts` runs on the Node.js runtime, while `middleware.ts` runs on Edge. Re-check the runtime assumptions
  (cookies, `fetch`) in that PR.

## 3. LOW — Sentry `disableLogger` is deprecated, and its replacement is not supported under Turbopack

- **What:** « disableLogger is deprecated … Use webpack.treeshake.removeDebugLogging instead. (Not supported with Turbopack.) »
  `next.config.ts` already documents this as benign, because no Turbopack-compatible replacement exists today.
- **Why deferred:** there is nothing to switch to under Turbopack yet.
- **Where it lives:** `next.config.ts`, `withSentryConfig` options (`disableLogger: true`).
- **Trigger:** a Sentry release that supports debug-log removal under Turbopack, or Sentry v11, whichever comes first.
