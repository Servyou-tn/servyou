# Found while gating `fix/suspension-enforcement` (2026-10-24) — not suspension

## HIGH — every `service_listings → categories` embed fails with PGRST201 (public service pages 404, `/mes-commandes` 500)

- **What:** `service_listings` now has two foreign keys to `categories` (`category_id` and
  `subcategory_id`, migration `20260909203226_service_listings_subcategory_id`), so PostgREST can
  no longer resolve an unqualified `categories ( … )` embed from it: "Could not embed because more
  than one relationship was found for 'service_listings' and 'categories'" (PGRST201).
- **Seen live 2026-10-24** (production build on localhost against the production DB, and
  https://servyou.vercel.app itself): `/services/<active listing id>` → 404 on production (the
  fetch error is treated as not-found), `/mes-commandes` → 500 for a signed-in consumer
  (`[my-orders] fetch error … PGRST201`), and `/demander/<id>` service fetch errors.
- **Call sites (unqualified embeds from service_listings):** `src/lib/marche/my-orders.ts:109`,
  `my-data.ts:83` and `:274`, `service-detail.ts:82` and `:173`, `order-detail.ts:214/218` (one
  of the two), `freelancer-detail.ts:166`, `demander.ts:93/126` (one of the two) — still
  unqualified on `origin/main` at `fa554fb`.
- **Fix (own PR, urgent):** qualify each embed as `categories!service_listings_category_id_fkey ( … )`
  (or the subcategory one where that is what the page wants), plus a live test that loads a
  service detail, a service order and the buyer orders list.
