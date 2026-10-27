# Next.js security patch — architectural follow-up (from fix/nextjs-security-16-2-11, 2026-07-23)

🟡 **Re-verify middleware authorization when multi-locale routing lands.** CVE-2026-64642 (middleware/proxy bypass, GHSA-6gpp-xcg3-4w24) targets **single-locale `config.i18n.locales`** specifically. Servyou was **not affected** at `16.2.7`→`16.2.11` because `next.config.ts` has no `i18n` block (FR/AR is handled in `src/lib/i18n`, not Next's built-in i18n routing). When the i18n foundation later adds real multi-locale routing (i18n config and/or locale-prefixed paths), **re-verify that `middleware.ts`'s suspended-state gate — and any auth added to it — cannot be bypassed via locale-prefixed request paths.** Trigger: the i18n multi-locale routing PR.

🟡 **Residual npm-audit advisories after `next@16.2.11` (all transitive; the patch cleared every `next` CVE).** `npm audit` still reports 8, none in `next` itself:
- **`sharp` <0.35.0** (high, GHSA-f88m libvips) — `next`'s **optional** image dep, pinned `0.34.5`; the next bump does not move it. **Verified not imported anywhere in `src`** (grep) and no server-side image-processing path exists — so it is reachable only via `/_next/image`, which Vercel serves on platform infra, **not** the bundled sharp. No app-runtime exposure. Fix = an explicit `sharp` bump or an `overrides` pin (**never** the `next@14.2.35` downgrade npm audit suggests). Low priority given the Vercel path.
- **`@opentelemetry/core`** (moderate, GHSA-8988) — via `@sentry/nextjs` (prod). Bump Sentry / OTel.
- **`brace-expansion` ×2 / `fast-uri` ×2 / `js-yaml`** (high, but **dev-scope** — eslint / typescript-eslint / webpack build chains; not in the production runtime). A plain `npm audit fix` resolves these non-breaking ("changed 8 packages").
- Optional: bump `eslint-config-next` `16.2.7` → `16.2.11` to match `next`.

Trigger: a dependency-hygiene chore, or when the Dependabot PRs land.
