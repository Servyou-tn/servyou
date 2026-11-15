# Security headers, audit M7 — what PR 16 leaves for later (`chore/security-headers`, 2026-11-15)

## A nonce-based CSP to drop 'unsafe-inline' from script-src

- **What:** the CSP still allows inline scripts (`'unsafe-inline'` in script-src), which Next.js needs for its inline
  bootstrapping unless every page carries a per-request nonce.
- **Why deferred:** a nonce makes every page dynamic, which conflicts with caching the public pages (audit M8, speed
  PR 14). The audit's own fix says to decide both together.
- **Where it lives:** `src/lib/security/headers.ts` (`contentSecurityPolicy`), `next.config.ts`, `src/middleware.ts`.
- **Trigger:** the page-caching decision of speed PR 14 (i18n Plan C, #377, lands first).

## HSTS `preload`

- **What:** `Strict-Transport-Security` is sent by the app (two years, `includeSubDomains`) without `preload`.
- **Why deferred:** a domain on the browsers' preload list is hard to remove. It waits until servyou.tn and every
  subdomain are settled on HTTPS (after domain day and the move to the German server).
- **Where it lives:** `src/lib/security/headers.ts` (`HSTS_VALUE`).
- **Trigger:** one month after servyou.tn goes live with no subdomain served over plain http; then add `preload` and
  submit the domain at hstspreload.org.

## Every servyou.tn subdomain must serve HTTPS (because of `includeSubDomains`)

- **What:** once a browser has seen servyou.tn's HSTS header, it refuses plain http on EVERY subdomain for two years
  (www, a Coolify panel, a webmail or status page on a subdomain…).
- **Why deferred:** nothing is served on servyou.tn yet; the check belongs to domain day and to the server move.
- **Where it lives:** the domain-day runbook and the Coolify move checklist; `HSTS_VALUE` in `src/lib/security/headers.ts`.
- **Trigger:** domain day (before the DNS switch), and each time a new subdomain is added.
