# Order flow from the journey walk — deferred items (`fix/order-flow-walk`, 2026-11-16)

## Arabic dual counts print the digit twice (« منذ 2 دقيقتين »)

- **What:** the member-screen relative times `activite.time_ago_minutes` / `_hours` / `_days` keep `{count}` in their `one`
  and `two` forms, so 2 reads « منذ 2 دقيقتين » / « منذ 2 يومين »: the dual already says « two ». The admin rows
  (`admin.dash.ago_*`) drop the number there (« منذ دقيقتين »). The new minutes row copies the hours / days shape.
- **Why deferred:** the hours and days rows and their tests predate this PR (H4, Ruling 8); changing all three is an
  Arabic copy call, and every line is already marked for the native review.
- **Where it lives:** `src/lib/i18n/plurals.ts` (`arPlurals`, `activite.time_ago_*`), `src/lib/relative-time.test.ts`.
- **Trigger:** the Arabic review pass (`REVIEW_AR_TRANSLATION`).

## A stale admin stats cache would print its date twice

- **What:** `admin.home.updated` is « Mis à jour {ago} · {stamp} ». If `generated_at` is 7 days old or more, `{ago}` is now
  « le 12 nov. » and the line reads « Mis à jour le 12 nov. · 12 nov., 14h12 ».
- **Why deferred:** the cache is rebuilt nightly; a week-old one means the job is broken, which is its own alert.
- **Where it lives:** `src/app/admin/_lib/overview-vm.ts` (`updated`), `src/lib/i18n/fr.ts` / `ar.ts` / `en`.
- **Trigger:** the first time the stats job is down for a week, or an admin copy pass.

## « le plus ancien : {ago} » shows a date after 7 days

- **What:** the admin queue line now reads « le plus ancien : 14 juil. » instead of « il y a 30 jours ». A date says how old
  the item is, but less directly than a count of days for a queue whose point is lateness.
- **Why deferred:** it follows the app's one rule as briefed (journey walk S4 + F5). A lateness wording (« en attente depuis
  30 jours ») is an admin copy decision.
- **Where it lives:** `src/app/admin/_lib/overview-vm.ts` (`q_oldest`).
- **Trigger:** founder feedback on the admin home, or the admin copy pass.

## On phones a visible Turnstile challenge would sit between the total and the button

- **What:** on /demander/[id] below lg, « Total à payer » is the last line before « Confirmer la demande » (walk B3). The
  Turnstile widget is between them in the DOM; it is invisible (`interaction-only`) unless Cloudflare demands a challenge,
  and then it shows there.
- **Why deferred:** the challenge is rare and short-lived; moving the widget changes the form's submit flow.
- **Where it lives:** `src/app/demander/[id]/_components/ProductRequestForm.tsx`, `src/components/security/Turnstile.tsx`.
- **Trigger:** a report of a visible challenge on a phone, or a sticky « total + confirm » bar if the founder wants one.
