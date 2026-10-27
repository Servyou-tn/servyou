# Africa/Tunis — remaining date sites (`fix/ui-polish-1`, 2026-10-26)

`lib/datetime.ts` (`formatTunisDate` / `formatTunisDateTime` / `tunisDayKey`) now formats every ORDER and ANNONCE date in
`Africa/Tunis`; `order-status.ts`'s `shortDate` / `longDate` / `shortDateTime` delegate to it (E3, G8 detail, G9, H8 fixed
with no call-site change), and `AnnonceDetail`, `OrderLifecycleStepper` and admin `litiges` use it directly. Before, a
Server Component on Vercel (UTC) printed the previous day for anything stamped between 00:00 and 01:00 Tunis. What is NOT
covered yet — same bug class, none of them an order or annonce date:

- **Admin `signalements` list + detail and `utilisateurs` list + detail** — four copies of
  `new Date(v).toLocaleDateString('fr-TN' | 'ar-TN', { day: '2-digit', month: 'short', year: 'numeric' })`
  (`app/admin/signalements/page.tsx`, `…/[id]/page.tsx`, `app/admin/utilisateurs/page.tsx`, `…/[id]/page.tsx`).
  Replace each local `formatDate` with `formatTunisDate(value, lang, 'medium')`. Worst case today: a report or sign-up in
  the first hour after Tunis midnight shows the previous day.
- **`ShopDetail` and `FreelancerDetail` « member since »** — month + year only
  (`app/boutique/[id]/_components/ShopDetail.tsx`, `app/freelance/[id]/_components/FreelancerDetail.tsx`). Use
  `formatTunisDate(iso, lang, 'month-year')`. Only wrong at a month boundary (a profile created in the first hour of
  the 1st shows the previous month).
- **Annonce `deadline` validation uses the server's « today »** — `lib/marche/job-post-validation.ts` builds `today` from
  `now.getFullYear/Month/Date()` (UTC on Vercel) and `AnnonceForm.tsx` does the same from the browser clock. Between
  00:00 and 01:00 Tunis the server still thinks it is yesterday, so a deadline of « today » passes (lenient) and the
  server and the browser can disagree on a boundary date. Validation, not display — compare against `tunisDayKey(now)`
  and test it across the midnight boundary like `datetime.test.ts`.

Also noted while here (not date-related): `fetchServices` in `lib/search/search-marketplace.ts` logs a query error and
returns `[]`, i.e. a silent empty list — the rule is to surface the error.
