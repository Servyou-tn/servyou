# CSP enforced — logged, not fixed (`chore/csp-enforce`, 2026-11-01)

Ranked. From the pre-beta CSP check (a Vercel preview, Report-Only, then a production build and `next dev` of this
branch with the policy enforced).

## 0. MEDIUM — confirm one real Turnstile token under the enforced policy, before merging
**What:** the widget uses `execution: 'execute'`, so a token is only minted at submit. On this PR's preview
(enforced), the scan called the widget's own `turnstile.execute()` on `/connexion` and `/contact` (nothing
submitted). The script loaded and there were 0 violations, but no token came within 30 s. The same probe on a
Report-Only preview also gave no token: Cloudflare does not hand headless Chrome a token, with or without the
policy. So the scan proves nothing on our page is blocked, but not that a token arrives.
`connect-src` has no `challenges.cloudflare.com`. The policy follows Cloudflare's CSP reference (script-src +
frame-src), and its iframe runs under Cloudflare's own policy.
**If it were blocked:** `onError` → no token → the server refuses the sign-in / sign-up / order / report.
**Trigger:** before merging, sign in once on the preview in a normal browser. If it fails, add `TURNSTILE_ORIGIN`
to `connect-src`.

## 1. MEDIUM — the shop-owner pages were not browsed under the policy
**What:** `/tableau-de-bord-vendeur`, `/ma-boutique` (+ `creer`, `modifier`), `/mes-produits` (+ `ajouter`,
`[id]/modifier`) and `/commandes-recues` (+ `[id]`) were not opened. The only shop owner in production is the
founder's personal account, and a temporary test shop owner is a production write that needs approval.
**Why it is probably fine:** they load the same origins as the pages that were checked: Supabase storage images
(`img-src`), `blob:` previews of an image being uploaded (`img-src blob:`) and same-origin server actions. The public
shop page and the shop cards were checked, and are clean.
**Trigger:** before the beta. Either the founder opens those pages on the preview with DevTools open, or approve a
temporary `@rls-smoke.servyou.invalid` shop owner (created by the service role, deleted after, cleanup checked) and
the scan is re-run as that account.

## 2. LOW — nothing was submitted or uploaded
**What:** the scan only loads pages (no prod writes). Submits go to same-origin server actions (`form-action 'self'`,
`connect-src 'self'`), and the Supabase browser client calls the project origin, which is allowed. An upload's
preview is `blob:`, also allowed. The order, proposal and upload submits themselves were not exercised.
**Trigger:** the founder's pre-beta click-through. Any block appears in Sentry (`report-uri` is live).

## 3. LOW — admin pages not browsed
**What:** `/admin/*` needs an admin session (none minted). Same origins as the rest.

## 4. LOW — Sentry quota (from review)
**What:** reports now come from an enforced policy. A visitor's browser extension that injects scripts or inline
handlers files a report on every page. Watch the Sentry security-report volume in the first days. If it eats the
quota, filter extension sources (`chrome-extension:`, `moz-extension:`) in Sentry's inbound filters.

## 5. LOW — external avatar URLs would be blocked (from review)
**What:** `img-src` allows Supabase only. No code writes an external `avatar_url` today (the avatar action stores a
Supabase public URL), but an OAuth sign-in that copied a Google picture would need that host in `img-src`.

## 6. LOW — tighten the policy (from security-headers.md item 3, unchanged)
`https://vercel.live` ships on production too; `media-src` lists Supabase with no `<video>` / `<audio>`; the Supabase
`wss://` entry is headroom. Nonces (to drop `'unsafe-inline'`) are a later step. This PR enforces exactly the
policy that was watched, nothing narrower.
