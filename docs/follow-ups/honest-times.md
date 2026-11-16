# Honest times — Arabic counts and the seller wait (`fix/honest-times`, 2026-11-15)

## Arabic counts whose noun is only implied keep their old 11-99 form

- **What:** `arPlurals` now has a `many` (11-99) form for every count whose noun is written in the string. Seven entries
  write only an adjective or a fixed phrase, with the noun implied by the screen, so their 11-99 form was left as it was
  (the plural `other`): `admin.users.tile_visible`, `admin.users.tile_hidden`, `admin.users.tile_open_reports`,
  `admin.requests.m_done_orders`, `admin.reports.dismissed_count`, `product.bulk.selected_count`, and
  `admin.nav.pending_count` (invariant on purpose).
- **Why deferred:** the right 11-99 form depends on the noun the reader has in mind (account, order, report, product);
  guessing it would trade one wrong form for another. These are admin and bulk-select labels, not buyer-facing text.
- **Where it lives:** `src/lib/i18n/plurals.ts`, `arPlurals`.
- **Trigger:** the Arabic review pass (a Tunisian speaker on every `REVIEW_AR_TRANSLATION` line), or a rewrite of those
  labels to name their noun.

## Arabic 100-102 still read the plural for counts whose `other` is plural

- **What:** CLDR puts 100-102 (and 200-202, …) in `other`, which takes the singular (« منذ 100 يوم »). Most entries keep
  their plural in `other`, so 100-102 read « منذ 100 أيام ». Only the entries whose `other` was already singular (the
  hour counts and `seller.orders.waiting_*`) are right at 100.
- **Why deferred:** moving every `other` to the singular means adding an explicit `few` (3-10) to ~70 entries and a
  `zero` where 0 should keep the plural. Counts of 100-102 are rare on today's screens (days since a post, list
  totals).
- **Where it lives:** `src/lib/i18n/plurals.ts`, `arPlurals`.
- **Trigger:** the same Arabic review pass, or the first screen where a count reaches 100.
