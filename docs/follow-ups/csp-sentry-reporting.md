# CSP violation reporting to Sentry (`feat/csp-sentry-reporting`, 2026-10-29)

## ACTION (founder): `NEXT_PUBLIC_SENTRY_DSN` is not set on Vercel
**What:** production and previews ship no Sentry DSN (verified by scanning the served JS chunks: the SDK is bundled, no `…@…ingest…sentry.io/<id>` string), so Sentry itself is inert and `cspReportUrl()` returns null → the CSP carries no `report-uri` / `report-to` and nothing is reported.
**Why it matters:** the report URL is DERIVED from that same public DSN at build time; there is no second variable.
**Trigger:** set `NEXT_PUBLIC_SENTRY_DSN` (Preview + Production) and redeploy → the Report-Only CSP gains `report-uri https://<host>/api/<id>/security/?sentry_key=<public key>&sentry_environment=<preview|production>` and a `Reporting-Endpoints` header. Then the deliberate-violation proof (below) can be run on the preview.

## Proof still owed once the DSN is set
Open a preview page with DevTools, run `document.head.append(Object.assign(document.createElement('script'), { src: 'https://evil.example/x.js' }))`, and confirm in Sentry → Issues a « Blocked 'script' from 'evil.example' (report-only) » issue tagged with the environment. The `securitypolicyviolation` event fires in the console either way; only Sentry receipt needs the DSN.

## Sentry-side setup (founder, once reports flow)
- Create an issue alert / filter for the `csp` issue type so a noisy third-party extension does not page anyone (extensions inject scripts and trip every policy).
- Browser extensions and `blob:` / `moz-extension:` sources are normal noise — the enforced-policy decision should ignore them.
- Report-only reports are rate-limited per project by Sentry; a hostile page cannot flood the quota because only violations on OUR origin are sent by the browser.

## Not changed
The ENFORCED `Content-Security-Policy: frame-ancestors 'none'` carries no report directive (only the watched policy reports). Promotion to an enforced policy, the `vercel.live` trim and nonces stay in security-headers.md items 2–3.
