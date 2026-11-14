# Umami analytics — follow-ups (`feat/umami-analytics`, 2026-11-14)

Ideas and loose ends from the Umami PR. Out of its scope by the brief (no custom events, goals, funnels, no cookie-banner change,
no other analytics tool) or waiting for a founder decision.

## Cookie policy row « Cookies de mesure d'audience anonymisée » does not name Umami

**What:** `legal.cookies.s2.body` (FR + AR) still describes audience measurement as a *cookie* row and ends « Aucun cookie de ce
type n'est déposé aujourd'hui ». That stays true (Umami sets no cookie), but the row could name Umami and say it uses no cookie
and runs only behind the « Mesure d'audience » choice.
**Why deferred:** the brief keeps cookie-banner and cookie-policy copy unchanged; it depends on the founder's D1 ruling (consent
gate or always on). If the ruling is « always on », this row, `cookies.banner.body` and `cookies.cat.audience.desc` become false
and must change in the same PR as the flip.
**Where it lives:** `src/lib/i18n/fr.ts` / `ar.ts` — `legal.cookies.s2.body`, `cookies.banner.body`, `cookies.cat.audience.desc`.
**Trigger:** the founder's D1 ruling, or the legal-pages lawyer review (`open-legal-pages-lawyer-review-cookie-consent-redaction-consistency.md`).

## Legal pages' « Mise à jour » date not bumped

**What:** the privacy policy gained a paragraph, but `legal.updatedDate` (« 17 juin 2026 ») is one key shared by all four legal
documents, so bumping it would date the terms, cookie and accessibility pages too.
**Why deferred:** a shared-key, all-documents change; the documents are still marked draft (pending legal review).
**Where it lives:** `src/lib/i18n/fr.ts` / `ar.ts` — `legal.updatedDate`; `src/components/legal/LegalPageShell.tsx`.
**Trigger:** the founder's call, or a per-document date when the lawyer review lands.

## Admin statistics: replace the « after the audience measurement is installed » note

**What:** `admin.stats.audience_note` says visits and search conversion are « disponibles après l'installation de la mesure
d'audience (bêta) ». Once Umami runs in production, the note could point the founder to the Umami dashboard (no share link was
made on purpose, so a plain mention, not an embed).
**Why deferred:** admin UI, out of this PR's scope; and the numbers only exist once the PR is merged and visitors opt in.
**Where it lives:** `src/lib/i18n/fr.ts` / `ar.ts` — `admin.stats.audience_note`; the admin statistics page.
**Trigger:** first week of real Umami data.

## Custom events, goals and funnels

**What:** Umami can count events (`data-umami-event` attributes or `umami.track()`): e.g. « Commander » submits, WhatsApp
contact clicks, sign-up completions, search → listing conversion — which is what `admin.stats.audience_note` promises.
**Why deferred:** explicitly out of scope in the brief.
**Where it lives:** would extend `src/lib/analytics/umami.ts`; every event payload still passes through `filterUmamiPayload`
(consent + admin exclusion), so the gates hold for events too.
**Trigger:** the founder picks the 3–5 events that matter for the beta.

## Signed-in private pages are tracked by path

**What:** with consent, private pages are counted too (`/mes-commandes/<id>`, `/mes-engagements/<id>`…). Only the path is sent
(no query string, no hash) and the ids are opaque UUIDs, not personal data — but a stricter reading could exclude the signed-in
areas, or collapse `[id]` segments to `/:id` in `filterUmamiPayload` so the stats group by page type.
**Why deferred:** the brief excludes only the admin routes; grouping is a reporting nicety.
**Where it lives:** `UMAMI_EXCLUDED_PATH_PREFIXES` / `filterUmamiPayload` in `src/lib/analytics/umami.ts`.
**Trigger:** the first review of the Umami pages report, or the lawyer review.

## Do Not Track

**What:** the tracker supports `data-do-not-track="true"` (skips visitors whose browser sends DNT). Consent already gates it,
so this would only matter if D1 is ruled « always on ».
**Why deferred:** not in the brief; redundant behind the consent gate.
**Where it lives:** `umamiScriptAttributes()` in `src/lib/analytics/umami.ts`.
**Trigger:** a D1 « always on » ruling.

## Re-granting consent without a reload under-counts one page

**What:** a visitor who withdraws « Mesure d'audience » and then grants it again on the same page load is not counted for that
page: next/script remembers the tracker already ran and does not re-run it, so the next pageview is sent on the next navigation.
Nothing leaks (the before-send filter re-reads the consent cookie on every send); one page is under-counted.
**Why deferred:** a rare path with no privacy impact (review finding, low).
**Where it lives:** `src/components/analytics/UmamiScript.tsx`; a fix would call `window.umami.track()` once when consent flips to yes.
**Trigger:** only if the numbers ever look off for visitors who toggle consent.

## /verification-admin does not exist yet

**What:** the exclusion list covers `/verification-admin` (and everything under it) ahead of the route, which is presumably the
parked admin-MFA step (audit H7).
**Why deferred:** nothing to do now; the gate and its test already cover the path.
**Where it lives:** `UMAMI_EXCLUDED_PATH_PREFIXES` in `src/lib/analytics/umami.ts`.
**Trigger:** the H7 PR — confirm its route name matches, or add it to the list.
