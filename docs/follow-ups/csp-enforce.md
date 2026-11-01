# CSP enforced — logged, not fixed (`chore/csp-enforce`, 2026-11-01)

Ranked. From the pre-beta CSP check (a Vercel preview, Report-Only, then a production build and `next dev` of this
branch with the policy enforced).

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

## 4. LOW — tighten the policy (from security-headers.md item 3, unchanged)
`https://vercel.live` ships on production too; `media-src` lists Supabase with no `<video>` / `<audio>`; the Supabase
`wss://` entry is headroom. Nonces (to drop `'unsafe-inline'`) are a later step. This PR enforces exactly the
policy that was watched, nothing narrower.
