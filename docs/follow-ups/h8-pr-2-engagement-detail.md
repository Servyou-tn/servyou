# H8 PR-2 — engagement detail (`feat/h8-engagement-detail`, 2026-10-25)

## G9 still carries its own copy of the « Historique » timeline

- H8's detail uses the new shared `components/orders/OrderTimeline` (it counts displayable events AFTER the skips, so
  a heading never sits over a bare line). `commandes-recues/[id]/page.tsx` still has its inline copy and its own
  `eventLabel`; moving it onto the component (`createdLabel` = « Commande créée ») is mechanical but touches a shipped
  page that cannot be gated here without a shop-owner session — its own PR.

## Order dates are formatted in the server's timezone

- `shortDate` / `longDate` / `shortDateTime` (`lib/orders/order-status.ts`) call `toLocaleDateString` with no
  `timeZone`, so on Vercel (UTC) an order placed at 00:30 Tunis time shows the previous day and the « 09h12 » timeline
  stamps are an hour off (Tunisia is UTC+1, no DST). Affects E3, G8, G9 and H8. Fix: pass `timeZone: 'Africa/Tunis'`.

## `received_at` — the app side is done, the database side is not (DB-batch ruling #12)

- The two client writers are gone (`ReceiptConfirmButton`, E3's `OrdersList`). At the time of the PR **no trigger on
  `orders` stamps the column**, so new receipts would carry `received_at = NULL` until the DB role's migration lands.
  The H8 detail page dates a finished order from its receipt event as a fallback; the admin statistics export and the
  admin dispute view read the column directly and would show nothing. **Merge after the migration.**

## Page `<title>`s are static French strings

- `metadata.title` on the H-series pages (including this one) is a literal, so an Arabic visitor gets a French tab
  title. A `generateMetadata` reading `getLang()` fixes every page at once — its own cross-cutting PR.
